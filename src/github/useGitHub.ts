import { useCallback, useEffect, useState } from 'react'
import type { ProjectFile } from '../project/useProject'
import { blobSha } from './blobSha'
import {
  downloadFiles,
  fetchHeadSha,
  listCommits,
  listEntries,
  parseRepo,
  pushChanges,
} from './githubApi'
import type { CommitInfo, RepoRef } from './githubApi'

export type ChangeStatus = 'M' | 'U' | 'D'

export interface Change {
  path: string
  status: ChangeStatus
}

interface Connection {
  ref: RepoRef
  headSha: string
}

const readStorage = (storage: Storage, key: string) => {
  try {
    return storage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

const writeStorage = (storage: Storage, key: string, value: string) => {
  try {
    storage.setItem(key, value)
  } catch {
    return
  }
}

async function hashFiles(files: ProjectFile[]) {
  const hashes = new Map<string, string>()
  for (const file of files) {
    hashes.set(file.path, await blobSha(file.content))
  }
  return hashes
}

export function useGitHub(files: ProjectFile[], replaceAll: (files: ProjectFile[]) => void) {
  const [repoInput, setRepoInput] = useState(() => readStorage(localStorage, 'gh-repo'))
  const [branch, setBranch] = useState(() => readStorage(localStorage, 'gh-branch') || 'main')
  const [token, setToken] = useState(() => readStorage(sessionStorage, 'gh-token'))
  const [connection, setConnection] = useState<Connection | null>(null)
  const [baseline, setBaseline] = useState<Map<string, string>>(new Map())
  const [changes, setChanges] = useState<Change[]>([])
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (!connection) {
      setChanges([])
      return
    }
    let cancelled = false
    hashFiles(files).then((current) => {
      const list: Change[] = []
      for (const [path, sha] of current) {
        const base = baseline.get(path)
        if (base === undefined) list.push({ path, status: 'U' })
        else if (base !== sha) list.push({ path, status: 'M' })
      }
      for (const path of baseline.keys()) {
        if (!current.has(path)) list.push({ path, status: 'D' })
      }
      if (!cancelled) setChanges(list)
    })
    return () => {
      cancelled = true
    }
  }, [files, baseline, connection])

  const run = useCallback(async (label: string, action: () => Promise<void>) => {
    let succeeded = false
    setBusy(label)
    setError('')
    setInfo('')
    try {
      await action()
      succeeded = true
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy('')
    }
    return succeeded
  }, [])

  const buildRef = useCallback((): RepoRef => {
    const parsed = parseRepo(repoInput)
    if (!parsed) {
      throw new Error('Repository must look like owner/repo')
    }
    return { ...parsed, branch: branch.trim() || 'main', token: token.trim() }
  }, [repoInput, branch, token])

  const connect = useCallback(
    () =>
      run('Connecting…', async () => {
        const ref = buildRef()
        const headSha = await fetchHeadSha(ref)
        const entries = await listEntries(ref, headSha)
        writeStorage(localStorage, 'gh-repo', repoInput)
        writeStorage(localStorage, 'gh-branch', ref.branch)
        writeStorage(sessionStorage, 'gh-token', ref.token)
        setBaseline(new Map(entries.map((entry) => [entry.path, entry.sha])))
        setConnection({ ref, headSha })
        setCommits(await listCommits(ref))
        setInfo(`Connected to ${ref.owner}/${ref.repo}@${ref.branch}`)
      }),
    [run, buildRef, repoInput],
  )

  const disconnect = useCallback(() => {
    setConnection(null)
    setBaseline(new Map())
    setCommits([])
    setInfo('')
    setError('')
  }, [])

  const pull = useCallback(
    () =>
      run('Pulling…', async () => {
        if (!connection) return
        const headSha = await fetchHeadSha(connection.ref)
        const entries = await listEntries(connection.ref, headSha)
        replaceAll(await downloadFiles(connection.ref, entries))
        setBaseline(new Map(entries.map((entry) => [entry.path, entry.sha])))
        setConnection({ ref: connection.ref, headSha })
        setCommits(await listCommits(connection.ref))
        setInfo(`Pulled ${entries.length} files`)
      }),
    [run, connection, replaceAll],
  )

  const commit = useCallback(
    (message: string) =>
      run('Committing…', async () => {
        if (!connection) return
        if (!connection.ref.token) {
          throw new Error('A token with repo write access is required to push')
        }
        const headSha = await fetchHeadSha(connection.ref)
        if (headSha !== connection.headSha) {
          throw new Error('Remote has new commits. Pull first.')
        }
        const changed = changes
          .filter((change) => change.status !== 'D')
          .map((change) => files.find((file) => file.path === change.path) as ProjectFile)
        const deleted = changes.filter((change) => change.status === 'D').map((change) => change.path)
        const newSha = await pushChanges(connection.ref, headSha, changed, deleted, message)
        setBaseline(await hashFiles(files))
        setConnection({ ref: connection.ref, headSha: newSha })
        setCommits(await listCommits(connection.ref))
        setInfo(`Pushed ${newSha.slice(0, 7)}`)
      }),
    [run, connection, changes, files],
  )

  const restore = useCallback(
    (commitSha: string) =>
      run('Restoring…', async () => {
        if (!connection) return
        const entries = await listEntries(connection.ref, commitSha)
        replaceAll(await downloadFiles(connection.ref, entries))
        setInfo(`Restored ${commitSha.slice(0, 7)} into the working copy. Commit to keep it.`)
      }),
    [run, connection, replaceAll],
  )

  return {
    repoInput,
    branch,
    token,
    setRepoInput,
    setBranch,
    setToken,
    connection,
    changes,
    commits,
    busy,
    error,
    info,
    connect,
    disconnect,
    pull,
    commit,
    restore,
  }
}

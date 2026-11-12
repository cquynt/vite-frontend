import { isTextPath } from '../project/useProject'
import type { ProjectFile } from '../project/useProject'
import { toBytes } from './blobSha'

const apiBase = 'https://api.github.com'
const maxFiles = 300
const maxFileBytes = 5 * 1024 * 1024
const downloadBatch = 6

export interface RepoRef {
  owner: string
  repo: string
  branch: string
  token: string
}

export interface TreeEntry {
  path: string
  sha: string
}

export interface CommitInfo {
  sha: string
  message: string
  author: string
  date: string
}

export function parseRepo(input: string) {
  const match = /^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(input.trim())
  return match ? { owner: match[1], repo: match[2] } : null
}

async function request<T>(ref: RepoRef, path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (ref.token) {
    headers.Authorization = `Bearer ${ref.token}`
  }
  if (init.body) {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(`${apiBase}/repos/${ref.owner}/${ref.repo}${path}`, { ...init, headers })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(`GitHub ${response.status}: ${body.message ?? response.statusText}`)
  }
  return (await response.json()) as T
}

export async function fetchHeadSha(ref: RepoRef) {
  const data = await request<{ object: { sha: string } }>(ref, `/git/ref/heads/${encodeURI(ref.branch)}`)
  return data.object.sha
}

export async function listEntries(ref: RepoRef, commitSha: string): Promise<TreeEntry[]> {
  const commit = await request<{ tree: { sha: string } }>(ref, `/git/commits/${commitSha}`)
  const tree = await request<{
    tree: { path: string; type: string; sha: string; size?: number }[]
  }>(ref, `/git/trees/${commit.tree.sha}?recursive=1`)
  const entries = tree.tree
    .filter((entry) => entry.type === 'blob' && (entry.size ?? 0) <= maxFileBytes)
    .map((entry) => ({ path: entry.path, sha: entry.sha }))
  if (entries.length > maxFiles) {
    throw new Error(`Repository has ${entries.length} files, the limit is ${maxFiles}`)
  }
  return entries
}

async function downloadOne(ref: RepoRef, entry: TreeEntry): Promise<ProjectFile> {
  const blob = await request<{ content: string }>(ref, `/git/blobs/${entry.sha}`)
  const binary = atob(blob.content.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return {
    path: entry.path,
    content: isTextPath(entry.path) ? new TextDecoder().decode(bytes) : bytes,
  }
}

export async function downloadFiles(ref: RepoRef, entries: TreeEntry[]) {
  const files: ProjectFile[] = []
  for (let start = 0; start < entries.length; start += downloadBatch) {
    const batch = entries.slice(start, start + downloadBatch)
    files.push(...(await Promise.all(batch.map((entry) => downloadOne(ref, entry)))))
  }
  return files
}

export async function listCommits(ref: RepoRef): Promise<CommitInfo[]> {
  const data = await request<
    { sha: string; commit: { message: string; author: { name: string; date: string } } }[]
  >(ref, `/commits?sha=${encodeURIComponent(ref.branch)}&per_page=30`)
  return data.map((item) => ({
    sha: item.sha,
    message: item.commit.message,
    author: item.commit.author.name,
    date: item.commit.author.date,
  }))
}

const toBase64 = (bytes: Uint8Array) => {
  let binary = ''
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000))
  }
  return btoa(binary)
}

export async function pushChanges(
  ref: RepoRef,
  headSha: string,
  changed: ProjectFile[],
  deleted: string[],
  message: string,
) {
  const headCommit = await request<{ tree: { sha: string } }>(ref, `/git/commits/${headSha}`)
  const treeItems: { path: string; mode: string; type: string; sha: string | null }[] = []
  for (const file of changed) {
    const blob = await request<{ sha: string }>(ref, '/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: toBase64(toBytes(file.content)), encoding: 'base64' }),
    })
    treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha })
  }
  for (const path of deleted) {
    treeItems.push({ path, mode: '100644', type: 'blob', sha: null })
  }
  const tree = await request<{ sha: string }>(ref, '/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: treeItems }),
  })
  const commit = await request<{ sha: string }>(ref, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] }),
  })
  await request(ref, `/git/refs/heads/${encodeURI(ref.branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  })
  return commit.sha
}

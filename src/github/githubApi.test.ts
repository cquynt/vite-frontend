import { afterEach, vi } from 'vitest'
import { mockFetch } from '../test/mockFetch'
import { downloadFiles, fetchHeadSha, listCommits, listEntries, parseRepo, pushChanges } from './githubApi'
import type { RepoRef } from './githubApi'

const ref: RepoRef = { owner: 'o', repo: 'r', branch: 'feature/x', token: 'tok' }
const publicRef: RepoRef = { ...ref, token: '' }

afterEach(() => vi.unstubAllGlobals())

describe('parseRepo', () => {
  it('parses owner/repo and URLs', () => {
    expect(parseRepo('octocat/Hello-World')).toEqual({ owner: 'octocat', repo: 'Hello-World' })
    expect(parseRepo('https://github.com/octocat/Hello-World.git')).toEqual({ owner: 'octocat', repo: 'Hello-World' })
    expect(parseRepo(' https://github.com/a/b/ ')).toEqual({ owner: 'a', repo: 'b' })
  })
  it('rejects invalid input', () => {
    expect(parseRepo('nonsense')).toBeNull()
  })
})

describe('fetchHeadSha', () => {
  it('sends auth headers and returns the commit sha', async () => {
    const calls = mockFetch(() => ({ json: { object: { sha: 'abc' } } }))
    expect(await fetchHeadSha(ref)).toBe('abc')
    expect(calls[0].url).toBe('https://api.github.com/repos/o/r/git/ref/heads/feature/x')
    expect(((calls[0].init?.headers ?? {}) as Record<string, string>).Authorization).toBe('Bearer tok')
  })
  it('omits Authorization without a token', async () => {
    const calls = mockFetch(() => ({ json: { object: { sha: 'abc' } } }))
    await fetchHeadSha(publicRef)
    expect(((calls[0].init?.headers ?? {}) as Record<string, string>).Authorization).toBeUndefined()
  })
  it('surfaces API errors with the message', async () => {
    mockFetch(() => ({ status: 404, json: { message: 'Not Found' } }))
    await expect(fetchHeadSha(ref)).rejects.toThrow('GitHub 404: Not Found')
  })
  it('falls back to the status text when the body is not JSON', async () => {
    mockFetch(() => ({ status: 500, text: 'oops' }))
    await expect(fetchHeadSha(ref)).rejects.toThrow('GitHub 500')
  })
})

const treeHandler = (tree: unknown[]) => (url: string) =>
  url.includes('/git/commits/') ? { json: { tree: { sha: 'treesha' } } } : { json: { tree } }

describe('listEntries', () => {
  it('returns blobs below the size limit', async () => {
    mockFetch(
      treeHandler([
        { path: 'a.tex', type: 'blob', sha: '1', size: 10 },
        { path: 'dir', type: 'tree', sha: '2' },
        { path: 'big.bin', type: 'blob', sha: '3', size: 6 * 1024 * 1024 },
        { path: 'nosize.txt', type: 'blob', sha: '4' },
      ]),
    )
    expect(await listEntries(ref, 'head')).toEqual([
      { path: 'a.tex', sha: '1' },
      { path: 'nosize.txt', sha: '4' },
    ])
  })
  it('rejects repositories with too many files', async () => {
    mockFetch(treeHandler(Array.from({ length: 301 }, (_, index) => ({ path: `f${index}`, type: 'blob', sha: String(index), size: 1 }))))
    await expect(listEntries(ref, 'head')).rejects.toThrow('limit is 300')
  })
})

describe('downloadFiles', () => {
  it('decodes text and binary blobs in batches', async () => {
    const encode = (text: string) => btoa(text)
    mockFetch((url) => ({ json: { content: url.endsWith('/t') ? `${encode('hi')}\n` : encode('\x01\x02') } }))
    const entries = Array.from({ length: 8 }, (_, index) => ({ path: index === 0 ? 'a.tex' : `f${index}.png`, sha: index === 0 ? 't' : 'b' }))
    const files = await downloadFiles(ref, entries)
    expect(files).toHaveLength(8)
    expect(files[0]).toEqual({ path: 'a.tex', content: 'hi' })
    expect(files[1].content).toEqual(new Uint8Array([1, 2]))
  })
})

describe('listCommits', () => {
  it('maps commit data', async () => {
    mockFetch(() => ({ json: [{ sha: 's1', commit: { message: 'msg', author: { name: 'N', date: '2020-01-01T00:00:00Z' } } }] }))
    expect(await listCommits(ref)).toEqual([{ sha: 's1', message: 'msg', author: 'N', date: '2020-01-01T00:00:00Z' }])
  })
})

describe('pushChanges', () => {
  it('creates blobs, a tree, a commit and updates the ref', async () => {
    const calls = mockFetch((url, init) => {
      if (url.endsWith('/git/commits/head')) return { json: { tree: { sha: 'basetree' } } }
      if (url.endsWith('/git/blobs')) return { json: { sha: 'blob1' } }
      if (url.endsWith('/git/trees')) return { json: { sha: 'newtree' } }
      if (url.endsWith('/git/commits')) return { json: { sha: 'newcommit' } }
      if (init?.method === 'PATCH') return { json: {} }
      return { status: 500 }
    })
    const big = new Uint8Array(0x9000).fill(65)
    const sha = await pushChanges(ref, 'head', [{ path: 'a.tex', content: 'x' }, { path: 'b.bin', content: big }], ['gone.tex'], 'msg')
    expect(sha).toBe('newcommit')
    const treeCall = calls.find((call) => call.url.endsWith('/git/trees'))
    const body = JSON.parse(treeCall?.init?.body as string)
    expect(body.base_tree).toBe('basetree')
    expect(body.tree).toEqual([
      { path: 'a.tex', mode: '100644', type: 'blob', sha: 'blob1' },
      { path: 'b.bin', mode: '100644', type: 'blob', sha: 'blob1' },
      { path: 'gone.tex', mode: '100644', type: 'blob', sha: null },
    ])
    expect(calls[calls.length - 1].init?.method).toBe('PATCH')
  })
})

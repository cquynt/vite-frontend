import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'
import * as api from './githubApi'
import { useGitHub } from './useGitHub'

vi.mock('./githubApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('./githubApi')>()
  return {
    ...original,
    fetchHeadSha: vi.fn(),
    listEntries: vi.fn(),
    listCommits: vi.fn(),
    downloadFiles: vi.fn(),
    pushChanges: vi.fn(),
  }
})

const mocked = vi.mocked(api)
const blobShaOfA = '2e65efe2a145dda7ee51d1741299f848e5bf752e'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  mocked.fetchHeadSha.mockResolvedValue('head1')
  mocked.listEntries.mockResolvedValue([{ path: 'a.tex', sha: blobShaOfA }, { path: 'old.tex', sha: 'zzz' }])
  mocked.listCommits.mockResolvedValue([{ sha: 'c1', message: 'm', author: 'a', date: '2020-01-01' }])
  mocked.downloadFiles.mockResolvedValue([{ path: 'a.tex', content: 'a' }])
  mocked.pushChanges.mockResolvedValue('newsha')
})

const setup = (files = [{ path: 'a.tex', content: 'a' }, { path: 'new.tex', content: 'n' }, { path: 'mod.tex', content: 'm' }]) => {
  const replaceAll = vi.fn()
  const hook = renderHook(({ current }) => useGitHub(current, replaceAll), { initialProps: { current: files } })
  return { ...hook, replaceAll }
}

const connect = async (hook: ReturnType<typeof setup>) => {
  act(() => {
    hook.result.current.setRepoInput('o/r')
    hook.result.current.setBranch('main')
    hook.result.current.setToken('tok')
  })
  await act(async () => {
    await hook.result.current.connect()
  })
}

describe('useGitHub', () => {
  it('rejects an invalid repository', async () => {
    const hook = setup()
    act(() => hook.result.current.setRepoInput('bad'))
    await act(async () => {
      await hook.result.current.connect()
    })
    expect(hook.result.current.error).toContain('owner/repo')
    expect(hook.result.current.connection).toBeNull()
  })

  it('connects, persists settings and computes changes', async () => {
    const hook = setup()
    await connect(hook)
    await waitFor(() => expect(hook.result.current.changes.length).toBe(3))
    expect(hook.result.current.changes).toEqual(
      expect.arrayContaining([
        { path: 'new.tex', status: 'U' },
        { path: 'mod.tex', status: 'U' },
        { path: 'old.tex', status: 'D' },
      ]),
    )
    expect(localStorage.getItem('gh-repo')).toBe('o/r')
    expect(sessionStorage.getItem('gh-token')).toBe('tok')
    expect(hook.result.current.info).toContain('Connected')
    expect(hook.result.current.commits).toHaveLength(1)
  })

  it('marks modified files', async () => {
    const hook = setup([{ path: 'a.tex', content: 'changed' }])
    await connect(hook)
    await waitFor(() => expect(hook.result.current.changes).toContainEqual({ path: 'a.tex', status: 'M' }))
  })

  it('reports connection errors', async () => {
    mocked.fetchHeadSha.mockRejectedValue(new Error('boom'))
    const hook = setup()
    await connect(hook)
    expect(hook.result.current.error).toBe('boom')
    mocked.fetchHeadSha.mockRejectedValue('plain')
    await connect(hook)
    expect(hook.result.current.error).toBe('plain')
  })

  it('pulls remote files into the project', async () => {
    const hook = setup()
    await connect(hook)
    await act(async () => {
      await hook.result.current.pull()
    })
    expect(hook.replaceAll).toHaveBeenCalledWith([{ path: 'a.tex', content: 'a' }])
    expect(hook.result.current.info).toBe('Pulled 2 files')
  })

  it('commits and pushes changes', async () => {
    const hook = setup()
    await connect(hook)
    await waitFor(() => expect(hook.result.current.changes.length).toBe(3))
    await act(async () => {
      expect(await hook.result.current.commit('msg')).toBe(true)
    })
    expect(mocked.pushChanges).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'o' }),
      'head1',
      [{ path: 'new.tex', content: 'n' }, { path: 'mod.tex', content: 'm' }],
      ['old.tex'],
      'msg',
    )
    expect(hook.result.current.info).toContain('newsha'.slice(0, 7))
    await waitFor(() => expect(hook.result.current.changes).toEqual([]))
  })

  it('refuses to push without a token or when the remote moved', async () => {
    const hook = setup()
    act(() => {
      hook.result.current.setRepoInput('o/r')
      hook.result.current.setToken('')
    })
    await act(async () => {
      await hook.result.current.connect()
    })
    await act(async () => {
      expect(await hook.result.current.commit('m')).toBe(false)
    })
    expect(hook.result.current.error).toContain('token')

    const second = setup()
    await connect(second)
    mocked.fetchHeadSha.mockResolvedValue('head2')
    await act(async () => {
      await second.result.current.commit('m')
    })
    expect(second.result.current.error).toContain('Pull first')
  })

  it('restores an older commit without touching the baseline', async () => {
    const hook = setup()
    await connect(hook)
    await act(async () => {
      await hook.result.current.restore('c1abcdef')
    })
    expect(hook.replaceAll).toHaveBeenCalled()
    expect(hook.result.current.info).toContain('Restored c1abcde')
  })

  it('does nothing when disconnected and can disconnect', async () => {
    const hook = setup()
    await act(async () => {
      await hook.result.current.pull()
      await hook.result.current.commit('x')
      await hook.result.current.restore('c')
    })
    expect(mocked.fetchHeadSha).not.toHaveBeenCalled()
    await connect(hook)
    act(() => hook.result.current.disconnect())
    expect(hook.result.current.connection).toBeNull()
    expect(hook.result.current.changes).toEqual([])
  })

  it('survives unavailable storage', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const hook = setup()
    expect(hook.result.current.branch).toBe('main')
    getItem.mockRestore()
    setItem.mockRestore()
  })
})

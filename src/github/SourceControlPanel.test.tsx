import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { SourceControlPanel } from './SourceControlPanel'
import type { useGitHub } from './useGitHub'

type GitHubState = ReturnType<typeof useGitHub>

const baseState = (overrides: Partial<GitHubState> = {}): GitHubState =>
  ({
    repoInput: '',
    branch: 'main',
    token: '',
    setRepoInput: vi.fn(),
    setBranch: vi.fn(),
    setToken: vi.fn(),
    connection: null,
    changes: [],
    commits: [],
    busy: '',
    error: '',
    info: '',
    connect: vi.fn(),
    disconnect: vi.fn(),
    pull: vi.fn(),
    commit: vi.fn().mockResolvedValue(true),
    restore: vi.fn(),
    ...overrides,
  }) as GitHubState

const connection = { ref: { owner: 'o', repo: 'r', branch: 'main', token: 't' }, headSha: 'h' }

describe('SourceControlPanel (disconnected)', () => {
  it('collects repository settings and connects', () => {
    const github = baseState({ repoInput: 'o/r' })
    render(<SourceControlPanel github={github} onOpen={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/owner\/repo/), { target: { value: 'a/b' } })
    fireEvent.change(screen.getByPlaceholderText('branch'), { target: { value: 'dev' } })
    fireEvent.change(screen.getByPlaceholderText(/Personal access token/), { target: { value: 'tok' } })
    fireEvent.click(screen.getByText('Connect'))
    expect(github.setRepoInput).toHaveBeenCalledWith('a/b')
    expect(github.setBranch).toHaveBeenCalledWith('dev')
    expect(github.setToken).toHaveBeenCalledWith('tok')
    expect(github.connect).toHaveBeenCalled()
  })
  it('disables Connect without a repository and shows status lines', () => {
    render(<SourceControlPanel github={baseState({ busy: 'Connecting…', info: 'note', error: 'bad' })} onOpen={vi.fn()} />)
    expect((screen.getByText('Connect') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Connecting…')).toBeTruthy()
    expect(screen.getByText('note')).toBeTruthy()
    expect(screen.getByText('bad')).toBeTruthy()
  })
})

describe('SourceControlPanel (connected)', () => {
  const changes = [
    { path: 'a.tex', status: 'M' as const },
    { path: 'gone.tex', status: 'D' as const },
  ]
  const commits = [{ sha: 'abcdef123', message: 'First\nbody', author: 'Me', date: '2020-01-01T00:00:00Z' }]

  it('commits with a message, clearing it on success', async () => {
    const onOpen = vi.fn()
    const github = baseState({ connection, changes, commits })
    render(<SourceControlPanel github={github} onOpen={onOpen} />)
    const commitButton = screen.getByText(/Commit & Push/) as HTMLButtonElement
    expect(commitButton.disabled).toBe(true)
    const box = screen.getByPlaceholderText('Commit message') as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: ' msg ' } })
    fireEvent.click(commitButton)
    await waitFor(() => expect(github.commit).toHaveBeenCalledWith('msg'))
    await waitFor(() => expect(box.value).toBe(''))
    fireEvent.click(screen.getByText('a.tex'))
    fireEvent.click(screen.getByText('gone.tex'))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(screen.getByText('First')).toBeTruthy()
    fireEvent.click(screen.getByText('Restore'))
    expect(github.restore).toHaveBeenCalledWith('abcdef123')
    fireEvent.click(screen.getByText('Disconnect'))
    expect(github.disconnect).toHaveBeenCalled()
  })

  it('keeps the message when the commit fails', async () => {
    const github = baseState({ connection, changes, commit: vi.fn().mockResolvedValue(false) })
    render(<SourceControlPanel github={github} onOpen={vi.fn()} />)
    const box = screen.getByPlaceholderText('Commit message') as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: 'keep' } })
    fireEvent.click(screen.getByText(/Commit & Push/))
    await waitFor(() => expect(github.commit).toHaveBeenCalled())
    expect(box.value).toBe('keep')
  })

  it('asks for confirmation before pulling over local changes', () => {
    const github = baseState({ connection, changes })
    render(<SourceControlPanel github={github} onOpen={vi.fn()} />)
    fireEvent.click(screen.getByText('Pull'))
    expect(github.pull).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Discard 2 changes and pull'))
    expect(github.pull).toHaveBeenCalled()
  })

  it('pulls immediately when the tree is clean', () => {
    const github = baseState({ connection })
    render(<SourceControlPanel github={github} onOpen={vi.fn()} />)
    fireEvent.click(screen.getByText('Pull'))
    expect(github.pull).toHaveBeenCalled()
  })
})

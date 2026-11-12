import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { mockFetch } from '../test/mockFetch'
import { findMainPath, isTextPath, normalizePath, useProject } from './useProject'

afterEach(() => vi.unstubAllGlobals())

const serveTemplate = () =>
  mockFetch((url) => {
    if (url.endsWith('/main.tex')) return { text: '\\input{sections/a} {{who}}' }
    if (url.endsWith('/fields.json')) return { json: [{ key: 'who', label: 'Who', type: 'text', default: 'Ann' }] }
    if (url.endsWith('/sections/a.tex')) return { text: 'A' }
    return { status: 200, text: '<html>', type: 'text/html' }
  })

describe('helpers', () => {
  it('detects text files', () => {
    expect(isTextPath('a.TEX')).toBe(true)
    expect(isTextPath('a.png')).toBe(false)
  })
  it('normalizes paths', () => {
    expect(normalizePath('/a//b/ c /')).toBe('a/b/c')
  })
  it('finds the main file', () => {
    expect(findMainPath([{ path: 'x.tex', content: '' }, { path: 'main.tex', content: '' }])).toBe('main.tex')
    expect(findMainPath([{ path: 'a.tex', content: 'x' }, { path: 'b.tex', content: '\\documentclass{x}' }])).toBe('b.tex')
    expect(findMainPath([{ path: 'a.md', content: new Uint8Array() }])).toBe('a.md')
    expect(findMainPath([])).toBe('main.tex')
  })
})

describe('useProject', () => {
  it('loads the template with defaults filled in', async () => {
    serveTemplate()
    const { result } = renderHook(() => useProject())
    await waitFor(() => expect(result.current.files.length).toBe(2))
    expect(result.current.files[0]).toEqual({ path: 'main.tex', content: '\\input{sections/a} Ann' })
    expect(result.current.activePath).toBe('main.tex')
  })

  it('reports load errors', async () => {
    mockFetch(() => ({ status: 404, text: '' }))
    const { result } = renderHook(() => useProject())
    await waitFor(() => expect(result.current.loadError).toContain('Cannot load template'))
  })

  it('creates, updates, uploads and removes files and folders', async () => {
    serveTemplate()
    const { result } = renderHook(() => useProject())
    await waitFor(() => expect(result.current.files.length).toBe(2))

    act(() => result.current.updateText('main.tex', 'new'))
    expect(result.current.files.find((file) => file.path === 'main.tex')?.content).toBe('new')

    act(() => result.current.createFile('sections', 'b.tex'))
    expect(result.current.activePath).toBe('sections/b.tex')
    act(() => result.current.createFile('sections', 'b.tex'))
    expect(result.current.files.filter((file) => file.path === 'sections/b.tex')).toHaveLength(1)
    act(() => result.current.createFile('', '  '))
    act(() => result.current.createFolder('', 'figs'))
    act(() => result.current.createFolder('', 'figs'))
    act(() => result.current.createFolder('', ''))
    expect(result.current.folders).toEqual(['figs'])

    await act(async () => {
      const text = new File(['hello'], 'n.tex')
      const image = new File([new Uint8Array([9])], 'p.png')
      Object.defineProperty(image, 'webkitRelativePath', { value: 'dir/p.png' })
      await result.current.upload([text, image], 'figs')
      await result.current.upload([], '')
    })
    expect(result.current.files.find((file) => file.path === 'figs/n.tex')?.content).toBe('hello')
    expect(result.current.files.find((file) => file.path === 'figs/dir/p.png')?.content).toEqual(new Uint8Array([9]))
    expect(result.current.activePath).toBe('figs/n.tex')

    act(() => result.current.remove('figs', true))
    expect(result.current.files.some((file) => file.path.startsWith('figs/'))).toBe(false)
    expect(result.current.folders).toEqual([])
    act(() => result.current.remove('sections/b.tex', false))
    expect(result.current.files.some((file) => file.path === 'sections/b.tex')).toBe(false)

    act(() => result.current.replaceAll([{ path: 'x.tex', content: '\\documentclass{a}' }]))
    expect(result.current.files).toHaveLength(1)
    expect(result.current.activePath).toBe('x.tex')
    act(() => result.current.setActivePath('x.tex'))
  })
})

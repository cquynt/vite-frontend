import { act, renderHook } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'
import { useLatexCompiler } from './useLatexCompiler'

const state = vi.hoisted(() => ({
  compile: vi.fn(),
  initialize: vi.fn(),
  terminate: vi.fn(),
  initialized: false,
  engines: [] as string[],
}))

vi.mock('texlyre-busytex', () => {
  class BusyTexRunner {
    async initialize() {
      await state.initialize()
      state.initialized = true
    }
    isInitialized() {
      return state.initialized
    }
    terminate() {
      state.terminate()
    }
  }
  const tool = (name: string) =>
    class {
      compile(options: unknown) {
        state.engines.push(name)
        return state.compile(options)
      }
    }
  return { BusyTexRunner, PdfLatex: tool('pdf'), XeLatex: tool('xe'), LuaLatex: tool('lua') }
})

const files = [
  { path: 'main.tex', content: 'x' },
  { path: 'img.png', content: new Uint8Array([1]) },
]
const request = { mainPath: 'main.tex', files, engine: 'pdflatex' as const, bibtex: true }

beforeEach(() => {
  vi.clearAllMocks()
  state.initialized = false
  state.engines = []
  state.initialize.mockResolvedValue(undefined)
  state.compile.mockResolvedValue({ success: true, pdf: new Uint8Array([1]), log: 'ok' })
})

describe('useLatexCompiler', () => {
  it('compiles a project and exposes the pdf', async () => {
    const { result } = renderHook(() => useLatexCompiler())
    await act(async () => {
      await result.current.compile(request)
    })
    expect(result.current.state).toBe('done')
    expect(result.current.pdfUrl).toBe('blob:test')
    expect(result.current.engineLoadMs).not.toBeNull()
    expect(result.current.firstCompileMs).not.toBeNull()
    expect(state.compile.mock.calls[0][0]).toMatchObject({
      input: 'x',
      bibtex: true,
      additionalFiles: [{ path: 'img.png', content: new Uint8Array([1]) }],
    })
    await act(async () => {
      await result.current.compile(request)
    })
    expect(state.initialize).toHaveBeenCalledTimes(1)
    expect(result.current.lastCompileMs).not.toBeNull()
  })

  it('selects the engine', async () => {
    const { result } = renderHook(() => useLatexCompiler())
    await act(async () => {
      await result.current.compile({ ...request, engine: 'xelatex' })
      await result.current.compile({ ...request, engine: 'lualatex' })
      await result.current.compile(request)
    })
    expect(state.engines).toEqual(['xe', 'lua', 'pdf'])
  })

  it('reports failures with extracted errors and keeps the previous pdf', async () => {
    const { result } = renderHook(() => useLatexCompiler())
    await act(async () => {
      await result.current.compile(request)
    })
    state.compile.mockResolvedValue({ success: false, log: 'line\n! Bad thing.\nl.3 x' })
    await act(async () => {
      await result.current.compile(request)
    })
    expect(result.current.state).toBe('failed')
    expect(result.current.errors[0]).toContain('! Bad thing.')
    expect(result.current.pdfUrl).toBe('blob:test')
  })

  it('reports thrown errors and a missing main file', async () => {
    const { result } = renderHook(() => useLatexCompiler())
    state.compile.mockRejectedValue(new Error('crash'))
    await act(async () => {
      await result.current.compile(request)
    })
    expect(result.current.message).toBe('crash')
    state.compile.mockRejectedValue('weird')
    await act(async () => {
      await result.current.compile(request)
    })
    expect(result.current.message).toBe('weird')
    await act(async () => {
      await result.current.compile({ ...request, mainPath: 'nope.tex' })
    })
    expect(result.current.message).toBe('Missing nope.tex')
    await act(async () => {
      await result.current.compile({ ...request, files: [{ path: 'main.tex', content: new Uint8Array() }] })
    })
    expect(result.current.state).toBe('failed')
  })

  it('queues the latest request while compiling', async () => {
    let release: () => void = () => {}
    state.compile.mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve({ success: true, pdf: new Uint8Array(), log: '' }))),
    )
    const { result } = renderHook(() => useLatexCompiler())
    let first: Promise<void> = Promise.resolve()
    await act(async () => {
      first = result.current.compile(request)
      await Promise.resolve()
    })
    await act(async () => {
      await result.current.compile({ ...request, bibtex: false })
      await result.current.compile({ ...request, bibtex: true })
      release()
      await first
    })
    expect(state.compile).toHaveBeenCalledTimes(2)
    expect(state.compile.mock.calls[1][0]).toMatchObject({ bibtex: true })
  })

  it('terminates the runner on unmount', async () => {
    const { result, unmount } = renderHook(() => useLatexCompiler())
    await act(async () => {
      await result.current.compile(request)
    })
    unmount()
    expect(state.terminate).toHaveBeenCalled()
  })

  it('treats a successful run without a pdf as failure', async () => {
    state.compile.mockResolvedValue({ success: true, log: '' })
    const { result } = renderHook(() => useLatexCompiler())
    await act(async () => {
      await result.current.compile(request)
    })
    expect(result.current.state).toBe('failed')
  })
})

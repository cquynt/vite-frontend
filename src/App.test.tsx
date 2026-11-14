import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { App } from './App'
import { mockFetch } from './test/mockFetch'

const compiler = vi.hoisted(() => ({
  value: {
    state: 'done',
    message: '',
    pdfUrl: 'blob:pdf',
    log: '(./main.tex\n! Undefined control sequence.\nl.2 \\foo\n)',
    errors: [],
    engineLoadMs: 5,
    firstCompileMs: 10,
    lastCompileMs: 7,
    compile: vi.fn(),
  },
}))

vi.mock('./compiler/useLatexCompiler', () => ({ useLatexCompiler: () => compiler.value }))

const mainSource = '\\documentclass{article}\n\\begin{document}\n\\section{Intro}\n\\foo\n\\input{sections/a}\n\\includegraphics{images/logo}\n\\end{document}\n'

beforeEach(() => {
  compiler.value = { ...compiler.value, state: 'done', pdfUrl: 'blob:pdf', message: '', compile: vi.fn() }
  mockFetch((url) => {
    if (url.endsWith('/main.tex')) return { text: mainSource }
    if (url.endsWith('/fields.json')) return { json: [] }
    if (url.endsWith('/sections/a.tex')) return { text: '\\subsection{A}' }
    if (url.endsWith('/images/logo.png')) return { bytes: new Uint8Array([1, 2]), type: 'image/png' }
    return { status: 200, text: '<html>', type: 'text/html' }
  })
})

afterEach(() => vi.unstubAllGlobals())

const loaded = async () => {
  const view = render(<App />)
  await screen.findByTitle('main.tex')
  return view
}

describe('App', () => {
  it('loads the project, shows the tab, breadcrumbs, problems and status', async () => {
    const { container } = await loaded()
    expect(container.querySelector('.tab.active')?.textContent).toContain('main.tex')
    expect(container.querySelector('.breadcrumbs')?.textContent).toContain('main.tex')
    expect(container.querySelector('.state-chip')?.textContent).toBe('done')
    expect(screen.getByText('Undefined control sequence.')).toBeTruthy()
    expect(container.querySelector('iframe')).not.toBeNull()
    await waitFor(() => expect(compiler.value.compile).toHaveBeenCalled())
  })

  it('navigates from a problem to its line', async () => {
    const { container } = await loaded()
    fireEvent.click(screen.getByText('Undefined control sequence.'))
    await waitFor(() => expect(container.querySelector('.line-number.active')?.textContent).toContain('2'))
  })

  it('opens included files from the explorer and closes tabs', async () => {
    const { container } = await loaded()
    fireEvent.click(await screen.findByText('a.tex'))
    await waitFor(() => expect(container.querySelectorAll('.tab')).toHaveLength(2))
    fireEvent.click(container.querySelectorAll('.tab-close')[1])
    await waitFor(() => expect(container.querySelectorAll('.tab')).toHaveLength(1))
    fireEvent.click(container.querySelector('.tab-close') as HTMLElement)
    await waitFor(() => expect(screen.getByText('Open a file from the Explorer to start editing.')).toBeTruthy())
  })

  it('previews images', async () => {
    const { container } = await loaded()
    fireEvent.click(await screen.findByText('logo.png'))
    await waitFor(() => expect(container.querySelector('.binary-preview img')).not.toBeNull())
    expect(screen.getByText('2 bytes')).toBeTruthy()
  })

  it('shows the outline and follows includes', async () => {
    const { container } = await loaded()
    fireEvent.click(screen.getByTitle('Outline'))
    expect(container.querySelector('.outline-file')?.textContent).toBe('main.tex')
    fireEvent.click(screen.getByText('Intro'))
    await waitFor(() => expect(container.querySelector('.line-number.active')?.textContent).toContain('3'))
    fireEvent.click(screen.getByText('\\input{sections/a}'))
    await waitFor(() => expect(container.querySelector('.tab.active')?.textContent).toContain('a.tex'))
  })

  it('toggles the sidebar, panel and preview', async () => {
    const { container } = await loaded()
    const sidebar = container.querySelector('.sidebar') as HTMLElement
    fireEvent.click(screen.getByTitle('Explorer'))
    expect(sidebar.hidden).toBe(true)
    fireEvent.click(screen.getByTitle('Search'))
    expect(sidebar.hidden).toBe(false)
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(sidebar.hidden).toBe(true)
    fireEvent.keyDown(window, { key: 'b', metaKey: true })
    expect(sidebar.hidden).toBe(false)
    fireEvent.keyDown(window, { key: 'j', ctrlKey: true })
    expect(container.querySelector('.bottom-panel')).toBeNull()
    fireEvent.keyDown(window, { key: 'x', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'b' })
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true, altKey: true })
    fireEvent.click(screen.getByTitle('Show problems'))
    expect(container.querySelector('.bottom-panel')).not.toBeNull()
    fireEvent.click(screen.getByTitle('Close panel (Ctrl/Cmd+J)'))
    expect(container.querySelector('.bottom-panel')).toBeNull()
    fireEvent.click(screen.getByTitle('Toggle PDF preview'))
    expect(container.querySelector('.preview')).toBeNull()
    fireEvent.click(screen.getByTitle('Toggle sidebar (Ctrl/Cmd+B)'))
    fireEvent.click(screen.getByTitle('Toggle panel (Ctrl/Cmd+J)'))
    expect(container.querySelector('.bottom-panel')).not.toBeNull()
  })

  it('switches between problems and output', async () => {
    const { container } = await loaded()
    fireEvent.click(screen.getByText('OUTPUT'))
    expect(container.querySelector('.log-body pre')?.textContent).toContain('Undefined control sequence')
    fireEvent.click(screen.getByText('PROBLEMS'))
    expect(container.querySelector('.problem')).not.toBeNull()
  })

  it('shows compiler messages and an empty problem list', async () => {
    compiler.value = { ...compiler.value, message: 'engine crashed', log: '', state: 'compiling', pdfUrl: null as unknown as string }
    await loaded()
    expect(screen.getByText('engine crashed')).toBeTruthy()
    expect(screen.getByText('No problems detected')).toBeTruthy()
    expect(screen.getByText('Compiling…')).toBeTruthy()
    expect((screen.getByTitle('Compile now') as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows the placeholder when idle without a pdf', async () => {
    compiler.value = { ...compiler.value, state: 'idle', pdfUrl: null as unknown as string }
    await loaded()
    expect(screen.getByText('No PDF yet')).toBeTruthy()
  })

  it('compiles on demand and downloads', async () => {
    const click = vi.fn()
    const create = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = create(tag)
      if (tag === 'a') element.click = click
      return element
    })
    await loaded()
    fireEvent.click(screen.getByTitle('Compile now'))
    expect(compiler.value.compile).toHaveBeenCalled()
    fireEvent.click(screen.getByTitle('Download PDF'))
    expect(click).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('does not download without a pdf', async () => {
    compiler.value = { ...compiler.value, pdfUrl: null as unknown as string }
    await loaded()
    fireEvent.click(screen.getByTitle('Toggle sidebar (Ctrl/Cmd+B)'))
    fireEvent.click(screen.getByTitle('Build'))
    fireEvent.click(screen.getByText('Download PDF'))
    expect((screen.getByTitle('Download PDF') as HTMLButtonElement).disabled).toBe(true)
  })

  it('folds all and unfolds all blocks', async () => {
    const { container } = await loaded()
    fireEvent.click(screen.getByTitle('Fold all'))
    await waitFor(() => expect(container.querySelectorAll('.fold-toggle.folded').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByTitle('Unfold all'))
    await waitFor(() => expect(container.querySelectorAll('.fold-toggle.folded')).toHaveLength(0))
  })

  it('changes build settings and the main file', async () => {
    const { container } = await loaded()
    fireEvent.click(screen.getByTitle('Build'))
    const view = container.querySelectorAll('.view-slot')[4] as HTMLElement
    const [mainSelect, engineSelect] = Array.from(view.querySelectorAll('select'))
    fireEvent.change(engineSelect, { target: { value: 'xelatex' } })
    fireEvent.change(mainSelect, { target: { value: 'sections/a.tex' } })
    fireEvent.click(screen.getByLabelText('Compile on change'))
    fireEvent.click(screen.getByLabelText('Run bibtex'))
    expect(container.querySelector('.title-center')?.textContent).toBe('sections/a.tex')
  })

  it('inserts snippets into the editor', async () => {
    const { container } = await loaded()
    fireEvent.click(screen.getByTitle('Insert'))
    fireEvent.click(screen.getByText('Fraction'))
    await waitFor(() => expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toContain('\\frac{a}{b}'))
  })

  it('searches and jumps to results', async () => {
    const { container } = await loaded()
    fireEvent.click(screen.getByTitle('Search'))
    fireEvent.change(screen.getByPlaceholderText('Find'), { target: { value: 'foo' } })
    fireEvent.click(screen.getAllByText('\\foo')[0])
    await waitFor(() => expect(container.querySelector('.line-number.active')?.textContent).toContain('4'))
    fireEvent.change(screen.getByPlaceholderText('Replace'), { target: { value: 'bar' } })
    fireEvent.click(screen.getByText(/Replace all/))
    await waitFor(() => expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toContain('\\bar'))
  })

  it('shows the source control view', async () => {
    await loaded()
    fireEvent.click(screen.getByTitle('Source Control'))
    expect(screen.getByText('Connect')).toBeTruthy()
  })

  it('updates the file when typing in the editor', async () => {
    const { container } = await loaded()
    const area = container.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(area, { target: { value: `${area.value}% end` } })
    await waitFor(() => expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toContain('% end'))
  })

  it('resizes panes with the sashes', async () => {
    const { container } = await loaded()
    const sashes = Array.from(container.querySelectorAll('.sash')) as HTMLElement[]
    for (const sash of sashes) {
      sash.setPointerCapture = vi.fn()
      act(() => {
        fireEvent.pointerDown(sash, { pointerId: 1 })
        fireEvent.pointerMove(sash, { movementX: 20, movementY: 20 })
        fireEvent.pointerUp(sash)
      })
    }
    expect((container.querySelector('.sidebar') as HTMLElement).style.width).toBe('280px')
    expect((container.querySelector('.editor') as HTMLElement).style.flex).toContain('0 0')
    expect((container.querySelector('.bottom-panel') as HTMLElement).style.height).toBe('180px')
  })

  it('reports project load errors', async () => {
    mockFetch(() => ({ status: 404, text: '' }))
    render(<App />)
    expect(await screen.findByText(/Cannot load template/)).toBeTruthy()
  })
})

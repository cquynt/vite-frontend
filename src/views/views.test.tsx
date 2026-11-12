import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { BuildView } from './BuildView'
import { buildOutline } from './outline'
import { OutlineView } from './OutlineView'
import { SearchView } from './SearchView'
import { SnippetsView } from './SnippetsView'

describe('SearchView', () => {
  const files = [
    { path: 'a.tex', content: 'foo\nbar foo' },
    { path: 'b.tex', content: 'nothing' },
    { path: 'p.png', content: new Uint8Array() },
  ]
  it('lists hits, navigates and replaces', () => {
    const onGoTo = vi.fn()
    const onReplace = vi.fn()
    render(<SearchView files={files} onGoTo={onGoTo} onReplace={onReplace} />)
    fireEvent.change(screen.getByPlaceholderText('Find'), { target: { value: 'foo' } })
    fireEvent.click(screen.getByText('bar foo'))
    expect(onGoTo).toHaveBeenCalledWith('a.tex', 2)
    fireEvent.change(screen.getByPlaceholderText('Replace'), { target: { value: 'baz' } })
    fireEvent.click(screen.getByText('Replace all (2)'))
    expect(onReplace).toHaveBeenCalledTimes(1)
    expect(onReplace).toHaveBeenCalledWith('a.tex', 'baz\nbar baz')
  })
  it('supports regex and match case toggles and flags invalid patterns', () => {
    render(<SearchView files={files} onGoTo={vi.fn()} onReplace={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Regex'))
    fireEvent.click(screen.getByLabelText('Match case'))
    fireEvent.change(screen.getByPlaceholderText('Find'), { target: { value: '(' } })
    expect(screen.getByText('Invalid regular expression')).toBeTruthy()
    expect((screen.getByText(/Replace all/) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('OutlineView', () => {
  const nodes = buildOutline('main.tex', '\\begin{document}\n\\section{S}\n\\input{sub}\n\\end{document}', ['sub.tex'])
  it('renders symbols, toggles children and navigates', () => {
    const onGoTo = vi.fn()
    const onOpenFile = vi.fn()
    const { container } = render(
      <OutlineView fileName="main.tex" nodes={nodes} activeLine={2} activeIds={new Set([nodes[0].id])} onGoTo={onGoTo} onOpenFile={onOpenFile} />,
    )
    fireEvent.click(screen.getByText('S'))
    expect(onGoTo).toHaveBeenCalledWith(2)
    fireEvent.click(screen.getByText('\\input{sub}'))
    expect(onOpenFile).toHaveBeenCalledWith('sub.tex')
    expect(container.querySelector('.outline-active')).not.toBeNull()
    fireEvent.click(container.querySelector('.tree-arrow') as HTMLElement)
    expect(screen.queryByText('S')).toBeNull()
    fireEvent.click(container.querySelector('.tree-arrow') as HTMLElement)
    expect(screen.getByText('S')).toBeTruthy()
  })
  it('collapses the preamble by default and shows an empty state', () => {
    const preamble = buildOutline('main.tex', '\\documentclass{article}\n\\usepackage{x}', [])
    const { rerender } = render(
      <OutlineView fileName="main.tex" nodes={preamble} activeLine={1} activeIds={new Set()} onGoTo={vi.fn()} onOpenFile={vi.fn()} />,
    )
    expect(screen.queryByText('documentclass: article')).toBeNull()
    rerender(<OutlineView fileName="" nodes={[]} activeLine={1} activeIds={new Set()} onGoTo={vi.fn()} onOpenFile={vi.fn()} />)
    expect(screen.getByText('No symbols found in this file')).toBeTruthy()
    expect(screen.getByText('No file open')).toBeTruthy()
  })
})

describe('SnippetsView', () => {
  it('inserts the clicked snippet', () => {
    const onInsert = vi.fn()
    render(<SnippetsView onInsert={onInsert} />)
    fireEvent.click(screen.getByText('Fraction'))
    expect(onInsert).toHaveBeenCalledWith('\\frac{a}{b}')
  })
})

describe('BuildView', () => {
  it('wires every control', () => {
    const handlers = {
      onMainChange: vi.fn(),
      onEngineChange: vi.fn(),
      onBibtexChange: vi.fn(),
      onAutoCompileChange: vi.fn(),
      onCompile: vi.fn(),
      onDownload: vi.fn(),
    }
    const props = { texFiles: ['main.tex', 'b.tex'], mainPath: 'main.tex', engine: 'pdflatex' as const, bibtex: true, autoCompile: true, state: 'done' as const, hasPdf: true, ...handlers }
    const { rerender } = render(<BuildView {...props} />)
    const [mainSelect, engineSelect] = screen.getAllByRole('combobox')
    fireEvent.change(mainSelect, { target: { value: 'b.tex' } })
    fireEvent.change(engineSelect, { target: { value: 'xelatex' } })
    fireEvent.click(screen.getByLabelText('Run bibtex'))
    fireEvent.click(screen.getByLabelText('Compile on change'))
    fireEvent.click(screen.getByText('Compile now'))
    fireEvent.click(screen.getByText('Download PDF'))
    expect(handlers.onMainChange).toHaveBeenCalledWith('b.tex')
    expect(handlers.onEngineChange).toHaveBeenCalledWith('xelatex')
    expect(handlers.onBibtexChange).toHaveBeenCalledWith(false)
    expect(handlers.onAutoCompileChange).toHaveBeenCalledWith(false)
    expect(handlers.onCompile).toHaveBeenCalled()
    expect(handlers.onDownload).toHaveBeenCalled()
    rerender(<BuildView {...props} state="compiling" hasPdf={false} />)
    expect((screen.getByText('Compile now') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByText('Download PDF') as HTMLButtonElement).disabled).toBe(true)
  })
})

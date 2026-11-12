import { act, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { vi } from 'vitest'
import { collectFoldRanges } from './foldRanges'
import { LatexEditor } from './LatexEditor'
import { buildOutline } from '../views/outline'

const doc = ['\\begin{a}', '  one', '  two', '\\end{a}', 'tail'].join('\n')

interface HarnessProps {
  initial?: string
  initialFolds?: number[]
  jump?: { line: number; nonce: number } | null
  insert?: { text: string; nonce: number } | null
  onCaretLine?: (line: number) => void
  onValue?: (value: string) => void
  readOnly?: boolean
}

function Harness({ initial = doc, initialFolds = [], jump, insert, onCaretLine, onValue, readOnly = false }: HarnessProps) {
  const [value, setValue] = useState(initial)
  const [folds, setFolds] = useState(initialFolds)
  return (
    <>
      <LatexEditor
        value={value}
        readOnly={readOnly}
        onChange={(next) => {
          setValue(next)
          onValue?.(next)
        }}
        onCaretLine={onCaretLine}
        jump={jump}
        insert={insert}
        ranges={collectFoldRanges(buildOutline('x.tex', value, []))}
        folds={folds}
        onFoldsChange={setFolds}
      />
      <output data-testid="folds">{JSON.stringify(folds)}</output>
      <output data-testid="value">{value}</output>
    </>
  )
}

const textarea = (container: HTMLElement) => container.querySelector('textarea') as HTMLTextAreaElement
const folds = (container: HTMLElement) => container.querySelector('[data-testid="folds"]')?.textContent
const value = (container: HTMLElement) => container.querySelector('[data-testid="value"]')?.textContent

describe('LatexEditor', () => {
  it('renders highlighted text with line numbers', () => {
    const { container } = render(<Harness />)
    expect(container.querySelectorAll('.line-number')).toHaveLength(5)
    expect(container.querySelector('.tok-environment')).not.toBeNull()
  })

  it('propagates edits and the caret line', () => {
    const onCaretLine = vi.fn()
    const onValue = vi.fn()
    const { container } = render(<Harness onCaretLine={onCaretLine} onValue={onValue} />)
    const area = textarea(container)
    fireEvent.change(area, { target: { value: `${doc}!` } })
    expect(onValue).toHaveBeenCalledWith(`${doc}!`)
    area.setSelectionRange(doc.indexOf('two'), doc.indexOf('two'))
    fireEvent.click(area)
    fireEvent.keyUp(area)
    fireEvent.select(area)
    expect(onCaretLine).toHaveBeenLastCalledWith(3)
  })

  it('inserts indentation on Tab and keeps indentation on Enter', () => {
    const { container } = render(<Harness initial={'\\begin{x}'} />)
    const area = textarea(container)
    area.setSelectionRange(9, 9)
    fireEvent.keyDown(area, { key: 'Enter' })
    expect(value(container)).toBe('\\begin{x}\n  ')
    area.setSelectionRange(0, 0)
    fireEvent.keyDown(area, { key: 'Tab' })
    expect(value(container)?.startsWith('  \\begin')).toBe(true)
  })

  it('formats with Alt+Shift+F and clears folds', () => {
    const { container } = render(<Harness initial={'\\begin{a}\nx\n\\end{a}'} initialFolds={[1]} />)
    fireEvent.keyDown(textarea(container), { key: 'F', shiftKey: true, altKey: true })
    expect(value(container)).toBe('\\begin{a}\n  x\n\\end{a}\n')
    expect(folds(container)).toBe('[]')
  })

  it('folds and unfolds from the gutter and hides lines', () => {
    const { container } = render(<Harness />)
    const toggles = container.querySelectorAll('.fold-toggle')
    fireEvent.click(toggles[0])
    expect(folds(container)).toBe('[1]')
    expect(textarea(container).value).toBe('\\begin{a} …\ntail')
    expect(container.querySelectorAll('.line-number')).toHaveLength(2)
    fireEvent.click(container.querySelector('.fold-toggle.folded') as HTMLElement)
    expect(folds(container)).toBe('[]')
    fireEvent.click(toggles[4])
    expect(folds(container)).toBe('[]')
  })

  it('folds and unfolds at the caret with the keyboard', () => {
    const { container } = render(<Harness />)
    const area = textarea(container)
    area.setSelectionRange(doc.indexOf('one'), doc.indexOf('one'))
    fireEvent.click(area)
    fireEvent.keyDown(area, { code: 'BracketLeft', ctrlKey: true, altKey: true })
    expect(folds(container)).toBe('[1]')
    fireEvent.keyDown(area, { code: 'BracketLeft', ctrlKey: true, altKey: true })
    expect(folds(container)).toBe('[1]')
    area.setSelectionRange(0, 0)
    fireEvent.click(area)
    fireEvent.keyDown(area, { code: 'BracketRight', metaKey: true, altKey: true })
    expect(folds(container)).toBe('[]')
    fireEvent.keyDown(area, { code: 'BracketRight', metaKey: true, altKey: true })
    expect(folds(container)).toBe('[]')
  })

  it('maps edits made while folded back to the real text', () => {
    const { container } = render(<Harness initialFolds={[1]} />)
    const area = textarea(container)
    fireEvent.change(area, { target: { value: '\\begin{a} …\ntail!' } })
    expect(value(container)).toBe(`${doc}!`)
    fireEvent.change(area, { target: { value: '\\begin{a} …\nNEW\ntail!' } })
    expect(value(container)).toBe(`${doc.replace('tail', 'NEW\ntail')}!`)
    expect(folds(container)).toBe('[1]')
  })

  it('shifts fold positions when lines are added above them', () => {
    const { container } = render(<Harness initial={`first\n${doc}`} initialFolds={[2]} />)
    const area = textarea(container)
    fireEvent.change(area, { target: { value: `new\nfirst\n\\begin{a} …\ntail` } })
    expect(folds(container)).toBe('[3]')
  })

  it('unfolds instead of applying edits that touch folded text', () => {
    const { container } = render(<Harness initialFolds={[1]} />)
    const area = textarea(container)
    fireEvent.change(area, { target: { value: '\\begin{a} …tail' } })
    expect(folds(container)).toBe('[]')
    expect(value(container)).toBe(doc)
  })

  it('rejects typing inside the fold marker', () => {
    const { container } = render(<Harness initialFolds={[1]} />)
    fireEvent.change(textarea(container), { target: { value: '\\begin{a} …X\ntail' } })
    expect(folds(container)).toBe('[]')
    expect(value(container)).toBe(doc)
  })

  it('jumps to a line, unfolding what hides it', () => {
    const onCaretLine = vi.fn()
    const { container, rerender } = render(<Harness initialFolds={[1]} onCaretLine={onCaretLine} />)
    rerender(<Harness initialFolds={[1]} onCaretLine={onCaretLine} jump={{ line: 3, nonce: 1 }} />)
    expect(folds(container)).toBe('[]')
    expect(onCaretLine).toHaveBeenLastCalledWith(3)
    rerender(<Harness initialFolds={[1]} onCaretLine={onCaretLine} jump={{ line: 5, nonce: 2 }} />)
    expect(onCaretLine).toHaveBeenLastCalledWith(5)
  })

  it('inserts snippets once per request', () => {
    const { container, rerender } = render(<Harness initial="ab" insert={{ text: 'X', nonce: 1 }} />)
    expect(value(container)).toBe('ab')
    rerender(<Harness initial="ab" insert={{ text: 'X', nonce: 2 }} />)
    expect(value(container)).toBe('Xab')
    rerender(<Harness initial="ab" insert={{ text: 'X', nonce: 2 }} />)
    expect(value(container)).toBe('Xab')
  })

  it('ignores snippet insertion when read only', () => {
    const { container, rerender } = render(<Harness initial="ab" readOnly insert={null} />)
    rerender(<Harness initial="ab" readOnly insert={{ text: 'X', nonce: 5 }} />)
    expect(value(container)).toBe('ab')
  })

  it('syncs the gutter and highlight when scrolling', () => {
    const { container } = render(<Harness />)
    const area = textarea(container)
    area.scrollTop = 40
    act(() => {
      fireEvent.scroll(area)
    })
    expect((container.querySelector('.latex-gutter') as HTMLElement).scrollTop).toBe(40)
    expect((container.querySelector('.latex-highlight') as HTMLElement).scrollTop).toBe(40)
  })

  it('scrolls the textarea from the minimap', () => {
    const { container } = render(<Harness initial={'x\n'.repeat(200)} />)
    const minimap = container.querySelector('.minimap') as HTMLElement
    minimap.setPointerCapture = vi.fn()
    fireEvent.pointerDown(minimap, { pointerId: 1, clientY: 50 })
    expect(minimap.setPointerCapture).toHaveBeenCalled()
  })
})

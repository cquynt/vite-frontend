import { collectFoldRanges } from './foldRanges'
import { buildDisplay, countNewlines, diffEdit, displayLineAt, displayToReal, foldMarker } from './foldedText'
import { buildOutline } from '../views/outline'

const source = 'a\nb\nc\nd\ne'
const ranges = [{ start: 2, end: 4 }]

describe('buildDisplay', () => {
  it('returns the text unchanged without folds', () => {
    const display = buildDisplay(source, ranges, [])
    expect(display.text).toBe(source)
    expect(display.lines).toHaveLength(5)
  })
  it('hides folded lines and appends a marker', () => {
    const display = buildDisplay(source, ranges, [2])
    expect(display.text).toBe(`a\nb${foldMarker}\ne`)
    expect(display.lines.map((line) => line.realIndex)).toEqual([0, 1, 4])
    expect(display.lines[1].folded).toBe(true)
  })
  it('ignores ranges beyond the document', () => {
    expect(buildDisplay(source, [{ start: 2, end: 99 }], [2]).text).toBe(source)
  })
})

describe('offset mapping', () => {
  const display = buildDisplay(source, ranges, [2])
  it('finds the display line for an offset', () => {
    expect(displayLineAt(display, 0)).toBe(0)
    expect(displayLineAt(display, display.text.length)).toBe(2)
  })
  it('maps display offsets to real offsets', () => {
    expect(displayToReal(display, 0)).toBe(0)
    expect(displayToReal(display, display.lines[2].start)).toBe(8)
  })
  it('returns null inside the marker', () => {
    expect(displayToReal(display, display.lines[1].start + 2)).toBeNull()
  })
})

describe('diffEdit', () => {
  it('detects insertions, deletions and replacements', () => {
    expect(diffEdit('abc', 'abXc')).toEqual({ start: 2, end: 2, inserted: 'X' })
    expect(diffEdit('abc', 'ac')).toEqual({ start: 1, end: 2, inserted: '' })
    expect(diffEdit('abc', 'aZc')).toEqual({ start: 1, end: 2, inserted: 'Z' })
    expect(diffEdit('same', 'same')).toEqual({ start: 4, end: 4, inserted: '' })
  })
  it('counts newlines', () => {
    expect(countNewlines('a\nb\nc')).toBe(2)
  })
})

describe('collectFoldRanges', () => {
  it('collects multi-line nodes once per start line', () => {
    const nodes = buildOutline('main.tex', '\\begin{a}\n\\begin{b}\nx\n\\end{b}\n\\end{a}\n\\label{l}', [])
    expect(collectFoldRanges(nodes)).toEqual([
      { start: 1, end: 5 },
      { start: 2, end: 4 },
    ])
  })
  it('deduplicates identical starts', () => {
    const node = { id: 'x', kind: 'section' as const, title: 't', line: 1, endLine: 3, children: [] }
    expect(collectFoldRanges([node, { ...node, id: 'y' }])).toHaveLength(1)
  })
})

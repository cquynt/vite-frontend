import type { FoldRange } from './foldRanges'

export const foldMarker = ' …'

export interface DisplayLine {
  realIndex: number
  text: string
  folded: boolean
  start: number
}

export interface DisplayText {
  text: string
  lines: DisplayLine[]
  realLines: string[]
  realStarts: number[]
}

export function buildDisplay(value: string, ranges: FoldRange[], folds: number[]): DisplayText {
  const realLines = value.split('\n')
  const realStarts: number[] = []
  let realOffset = 0
  for (const line of realLines) {
    realStarts.push(realOffset)
    realOffset += line.length + 1
  }
  const rangeByStart = new Map(ranges.filter((range) => range.end <= realLines.length).map((range) => [range.start, range]))
  const foldedStarts = new Set(folds)
  const lines: DisplayLine[] = []
  let offset = 0
  let index = 0
  while (index < realLines.length) {
    const range = rangeByStart.get(index + 1)
    const folded = !!range && foldedStarts.has(index + 1)
    const text = folded ? realLines[index] + foldMarker : realLines[index]
    lines.push({ realIndex: index, text, folded, start: offset })
    offset += text.length + 1
    index = folded && range ? range.end : index + 1
  }
  return { text: lines.map((line) => line.text).join('\n'), lines, realLines, realStarts }
}

export function displayLineAt(display: DisplayText, offset: number) {
  let found = 0
  for (let index = 0; index < display.lines.length; index += 1) {
    if (display.lines[index].start <= offset) found = index
    else break
  }
  return found
}

export function displayToReal(display: DisplayText, offset: number): number | null {
  const line = display.lines[displayLineAt(display, offset)]
  const column = offset - line.start
  if (column > display.realLines[line.realIndex].length) {
    return null
  }
  return display.realStarts[line.realIndex] + column
}

export interface TextEdit {
  start: number
  end: number
  inserted: string
}

export function diffEdit(before: string, after: string): TextEdit {
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) {
    start += 1
  }
  let suffix = 0
  while (
    suffix < before.length - start &&
    suffix < after.length - start &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1
  }
  return { start, end: before.length - suffix, inserted: after.slice(start, after.length - suffix) }
}

export const countNewlines = (text: string) => text.split('\n').length - 1

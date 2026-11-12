import { formatLatex, nextLineIndent } from './formatLatex'

describe('formatLatex', () => {
  it('indents nested environments and collapses blank lines', () => {
    const input = '\\documentclass{article}\n\\begin{document}\n\\begin{itemize}\n\\item A  \n\n\n\\end{itemize}\n\\end{document}\n\n\n'
    expect(formatLatex(input)).toBe(
      '\\documentclass{article}\n\\begin{document}\n\\begin{itemize}\n  \\item A\n\n\\end{itemize}\n\\end{document}\n',
    )
  })
  it('ignores commented begin and same-line environments', () => {
    expect(formatLatex('% \\begin{x}\n\\begin{a}x\\end{a}\ntext\n')).toBe('% \\begin{x}\n\\begin{a}x\\end{a}\ntext\n')
  })
  it('never dedents below zero', () => {
    expect(formatLatex('\\end{itemize}\nx')).toBe('\\end{itemize}\nx\n')
  })
  it('drops leading blank lines', () => {
    expect(formatLatex('\n\na')).toBe('a\n')
  })
})

describe('nextLineIndent', () => {
  it('keeps indentation', () => {
    expect(nextLineIndent('  text')).toBe('  ')
  })
  it('adds indentation after begin', () => {
    expect(nextLineIndent('  \\begin{itemize}')).toBe('    ')
  })
  it('does not indent after a closed environment', () => {
    expect(nextLineIndent('\\begin{a}x\\end{a}')).toBe('')
  })
  it('handles empty input', () => {
    expect(nextLineIndent('')).toBe('')
  })
})

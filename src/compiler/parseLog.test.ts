import { parseProblems } from './parseLog'

describe('parseProblems', () => {
  it('extracts errors with line numbers and the current file', () => {
    const log = ['(./main.tex', '(./sections/intro.tex', '! Undefined control sequence.', 'l.7 \\foo', ')', '! Missing $ inserted.', 'no line here'].join('\n')
    const problems = parseProblems(log, 'main.tex')
    expect(problems[0]).toEqual({ severity: 'error', message: 'Undefined control sequence.', path: 'sections/intro.tex', line: 7 })
    expect(problems[1]).toMatchObject({ message: 'Missing $ inserted.', path: 'main.tex', line: null })
  })

  it('extracts warnings and box warnings', () => {
    const log = [
      'LaTeX Warning: Reference `x\' undefined on input line 12.',
      'Package babel Warning: Foo',
      'continued text',
      'input line 9',
      'Class article Warning: Bar',
      'Overfull \\hbox (3.0pt too wide) in paragraph at lines 4--5',
    ].join('\n')
    const problems = parseProblems(log, 'main.tex')
    expect(problems.map((problem) => problem.line)).toEqual([12, 9, null, 4])
    expect(problems.every((problem) => problem.severity === 'warning')).toBe(true)
  })

  it('deduplicates repeated messages from multiple passes', () => {
    const log = '! Oops.\nl.1 x\n! Oops.\nl.1 x'
    expect(parseProblems(log, 'main.tex')).toHaveLength(1)
  })

  it('returns nothing for a clean log', () => {
    expect(parseProblems('all good', 'main.tex')).toEqual([])
  })

  it('does not crash on unmatched closing parentheses', () => {
    expect(parseProblems(')\n)\n! E.\nl.2', 'main.tex')[0].path).toBe('main.tex')
  })
})

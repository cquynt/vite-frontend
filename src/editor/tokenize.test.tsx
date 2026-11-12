import { render } from '@testing-library/react'
import { highlightLatex } from './highlightLatex'
import { tokenizeLatex } from './tokenizeLatex'

describe('tokenizeLatex', () => {
  it('classifies tokens', () => {
    const kinds = tokenizeLatex('\\begin{a} \\cmd[opt] $x$ & % c {{p}} \\\\').map((token) => token.kind)
    expect(kinds).toEqual(['environment', 'command', 'option', 'math', 'operator', 'comment'])
  })
  it('finds braces and placeholders', () => {
    const kinds = tokenizeLatex('{x}{{p}}').map((token) => token.kind)
    expect(kinds).toEqual(['brace', 'brace', 'placeholder'])
  })
})

describe('highlightLatex', () => {
  it('colors nested braces by depth and flags unmatched ones', () => {
    const { container } = render(<pre>{highlightLatex('{a{b{c{d}}}}}')}</pre>)
    const classes = Array.from(container.querySelectorAll('span')).map((span) => span.className)
    expect(classes.slice(0, 4)).toEqual(['tok-bracket-0', 'tok-bracket-1', 'tok-bracket-2', 'tok-bracket-0'])
    expect(classes[classes.length - 1]).toBe('tok-bracket-error')
  })
  it('keeps plain text between tokens', () => {
    const { container } = render(<pre>{highlightLatex('plain \\x tail')}</pre>)
    expect(container.textContent).toBe('plain \\x tail')
  })
})

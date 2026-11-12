import type { ReactNode } from 'react'
import { tokenizeLatex } from './tokenizeLatex'

const bracketColors = 3

export function highlightLatex(source: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let depth = 0
  for (const token of tokenizeLatex(source)) {
    if (token.start > last) {
      nodes.push(source.slice(last, token.start))
    }
    let className = `tok-${token.kind}`
    if (token.kind === 'brace') {
      if (token.text === '}') depth -= 1
      className = depth < 0 ? 'tok-bracket-error' : `tok-bracket-${depth % bracketColors}`
      if (token.text === '{') depth += 1
    }
    nodes.push(
      <span key={token.start} className={className}>
        {token.text}
      </span>,
    )
    last = token.end
  }
  nodes.push(source.slice(last))
  return nodes
}

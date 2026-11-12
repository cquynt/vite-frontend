import type { ReactNode } from 'react'

const tokenPattern =
  /(%.*$)|(\{\{\w+\}\})|(\\(?:begin|end)\s*\{[^}]*\})|(\\[a-zA-Z@]+\*?|\\[^a-zA-Z])|(\$\$[^$]*\$\$|\$[^$\n]*\$)|(\[[^\]\n]*\])|([{}])|(&|\\\\)/gm

const classNames = ['comment', 'placeholder', 'environment', 'command', 'math', 'option', 'brace', 'operator']

export function highlightLatex(source: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of source.matchAll(tokenPattern)) {
    const start = match.index
    if (start > last) {
      nodes.push(source.slice(last, start))
    }
    const groupIndex = match.slice(1).findIndex((group) => group !== undefined)
    nodes.push(
      <span key={start} className={`tok-${classNames[groupIndex]}`}>
        {match[0]}
      </span>,
    )
    last = start + match[0].length
  }
  nodes.push(source.slice(last))
  return nodes
}

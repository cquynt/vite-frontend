export type TokenKind =
  | 'comment'
  | 'placeholder'
  | 'environment'
  | 'command'
  | 'math'
  | 'option'
  | 'brace'
  | 'operator'

export interface Token {
  start: number
  end: number
  kind: TokenKind
  text: string
}

const tokenPattern =
  /(%.*$)|(\{\{\w{1,100}\}\})|(\\(?:begin|end)\s{0,20}\{[^}\n]{0,200}\})|(\\\\|\\[a-zA-Z@]+\*?|\\[^a-zA-Z])|(\$\$[^$]{0,2000}\$\$|\$[^$\n]{0,500}\$)|(\[[^\]\n]{0,500}\])|([{}])|(&)/gm

const kinds: TokenKind[] = ['comment', 'placeholder', 'environment', 'command', 'math', 'option', 'brace', 'operator']

export function tokenizeLatex(source: string): Token[] {
  const tokens: Token[] = []
  for (const match of source.matchAll(tokenPattern)) {
    const groupIndex = match.slice(1).findIndex((group) => group !== undefined)
    tokens.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: kinds[groupIndex],
      text: match[0],
    })
  }
  return tokens
}

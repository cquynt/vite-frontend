import { stripComment } from './stripComment'
const indentUnit = '  '

const countEnvironments = (line: string, keyword: 'begin' | 'end') =>
  Array.from(line.matchAll(new RegExp(`\\\\${keyword}\\{([^}]+)\\}`, 'g'))).filter(
    (match) => match[1] !== 'document',
  ).length

export function formatLatex(source: string) {
  let depth = 0
  let previousBlank = true
  const output: string[] = []
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim()
    if (line === '') {
      if (!previousBlank) {
        output.push('')
      }
      previousBlank = true
      continue
    }
    previousBlank = false
    const code = stripComment(line)
    const opens = countEnvironments(code, 'begin')
    const closes = countEnvironments(code, 'end')
    const startsWithEnd = /^\\end\{(?!document\})/.test(code)
    const lineDepth = Math.max(0, startsWithEnd ? depth - 1 : depth)
    output.push(indentUnit.repeat(lineDepth) + line)
    depth = Math.max(0, depth + opens - closes)
  }
  while (output.length > 0 && output[output.length - 1] === '') {
    output.pop()
  }
  return `${output.join('\n')}\n`
}

export const nextLineIndent = (lineBeforeCaret: string) => {
  const indent = /^\s*/.exec(lineBeforeCaret)?.[0] ?? ''
  const code = stripComment(lineBeforeCaret)
  const opensBlock = countEnvironments(code, 'begin') > countEnvironments(code, 'end')
  return opensBlock ? indent + indentUnit : indent
}

export { indentUnit }

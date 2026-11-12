export interface Problem {
  severity: 'error' | 'warning'
  message: string
  path: string
  line: number | null
}

const fileMarker = /\((\.\/[^\s()]+)|\)/g
const lookAhead = 8

export function parseProblems(log: string, mainPath: string): Problem[] {
  const lines = log.split('\n')
  const stack: string[] = []
  const seen = new Set<string>()
  const problems: Problem[] = []

  const add = (problem: Problem) => {
    const key = `${problem.severity}|${problem.message}|${problem.path}|${problem.line}`
    if (!seen.has(key)) {
      seen.add(key)
      problems.push(problem)
    }
  }

  lines.forEach((line, index) => {
    const current = stack[stack.length - 1] ?? mainPath
    if (line.startsWith('! ')) {
      const following = lines.slice(index + 1, index + 1 + lookAhead)
      const lineMatch = following.map((text) => /^l\.(\d+)/.exec(text)).find(Boolean)
      add({
        severity: 'error',
        message: line.slice(2).trim(),
        path: current,
        line: lineMatch ? Number(lineMatch[1]) : null,
      })
    }
    const warning = /^(?:LaTeX|Package \w+|Class \w+) Warning: (.*)/.exec(line)
    if (warning) {
      const window = [line, ...lines.slice(index + 1, index + 4)].join(' ')
      const lineMatch = /input line (\d+)/.exec(window)
      add({
        severity: 'warning',
        message: warning[1].trim(),
        path: current,
        line: lineMatch ? Number(lineMatch[1]) : null,
      })
    }
    const box = /^((?:Overfull|Underfull) .*?) in paragraph at lines (\d+)/.exec(line)
    if (box) {
      add({ severity: 'warning', message: box[1], path: current, line: Number(box[2]) })
    }
    for (const marker of line.matchAll(fileMarker)) {
      if (marker[1]) stack.push(marker[1].slice(2))
      else stack.pop()
    }
  })
  return problems
}

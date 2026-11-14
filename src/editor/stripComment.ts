// Cắt phần comment LaTeX (% không đứng sau dấu \) mà không dùng regex lookbehind (tránh backtracking).
const stripLine = (line: string) => {
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '%' || line[i - 1] === '\\') continue
    const end = line.indexOf('\r', i)
    return end === -1 ? line.slice(0, i) : line.slice(0, i) + line.slice(end)
  }
  return line
}

export const stripComment = stripLine

export const stripComments = (source: string) => source.split('\n').map(stripLine).join('\n')

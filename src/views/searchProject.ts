import type { ProjectFile } from '../project/useProject'

export interface SearchOptions {
  caseSensitive: boolean
  useRegex: boolean
}

export interface SearchHit {
  path: string
  line: number
  text: string
}

const maxHits = 500

export function buildPattern(query: string, options: SearchOptions) {
  const source = options.useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(source, options.caseSensitive ? 'g' : 'gi')
}

export function searchProject(files: ProjectFile[], query: string, options: SearchOptions): SearchHit[] {
  if (!query) {
    return []
  }
  const hits: SearchHit[] = []
  for (const file of files) {
    if (typeof file.content !== 'string') continue
    const lines = file.content.split('\n')
    for (let index = 0; index < lines.length && hits.length < maxHits; index += 1) {
      if (buildPattern(query, options).test(lines[index])) {
        hits.push({ path: file.path, line: index + 1, text: lines[index].trim() })
      }
    }
  }
  return hits
}

export function replaceInText(text: string, query: string, replacement: string, options: SearchOptions) {
  return text.replace(buildPattern(query, options), replacement)
}

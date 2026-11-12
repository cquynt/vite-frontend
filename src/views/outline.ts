import type { ProjectFile } from '../project/useProject'

export interface OutlineItem {
  path: string
  line: number
  level: number
  title: string
  kind: 'section' | 'label'
}

const levels: Record<string, number> = {
  part: 0,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4,
  paragraph: 5,
}

const pattern = /\\(part|chapter|section|subsection|subsubsection|paragraph)\*?(?:\[[^\]]*\])?\{([^}]*)\}|\\label\{([^}]*)\}/g

export function buildOutline(files: ProjectFile[], mainPath: string): OutlineItem[] {
  const texFiles = files
    .filter((file) => file.path.endsWith('.tex') && typeof file.content === 'string')
    .sort((a, b) => Number(b.path === mainPath) - Number(a.path === mainPath) || a.path.localeCompare(b.path))
  const items: OutlineItem[] = []
  for (const file of texFiles) {
    ;(file.content as string).split('\n').forEach((text, index) => {
      const code = text.replace(/(^|[^\\])%.*$/, '$1')
      for (const match of code.matchAll(pattern)) {
        if (match[1]) {
          items.push({ path: file.path, line: index + 1, level: levels[match[1]], title: match[2], kind: 'section' })
        } else {
          items.push({ path: file.path, line: index + 1, level: 6, title: match[3], kind: 'label' })
        }
      }
    })
  }
  return items
}

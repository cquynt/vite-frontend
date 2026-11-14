export type SymbolKind =
  | 'preamble'
  | 'packages'
  | 'package'
  | 'documentclass'
  | 'section'
  | 'environment'
  | 'include'
  | 'graphic'
  | 'bibliography'
  | 'label'
  | 'caption'
  | 'bibentry'

export interface OutlineNode {
  id: string
  kind: SymbolKind
  title: string
  line: number
  endLine: number
  children: OutlineNode[]
  target?: string
}

interface StackEntry {
  node: OutlineNode
  isSection: boolean
  level: number
}

const sectionLevels: Record<string, number> = {
  part: 0,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4,
  paragraph: 5,
}

const pattern = new RegExp(
  [
    String.raw`\\(documentclass)(?:\[[^\]]*\])?\{([^}]*)\}`,
    String.raw`\\(usepackage)(?:\[[^\]]*\])?\{([^}]*)\}`,
    String.raw`\\(part|chapter|section|subsection|subsubsection|paragraph)\*?(?:\[[^\]]*\])?\{([^}]*)\}`,
    String.raw`\\(begin)\{([^}]*)\}`,
    String.raw`\\(end)\{([^}]*)\}`,
    String.raw`\\(input|include)\{([^}]*)\}`,
    String.raw`\\(includegraphics)(?:\[[^\]]*\])?\{([^}]*)\}`,
    String.raw`\\(bibliography|addbibresource)\{([^}]*)\}`,
    String.raw`\\(label)\{([^}]*)\}`,
    String.raw`\\(caption)(?:\[[^\]]*\])?\{([^}]*)\}`,
  ].join('|'),
  'g',
)

const withoutComment = (line: string) => line.replace(/(?<!\\)%.*$/, '')

const resolveTarget = (name: string, candidates: string[], filePaths: string[]) =>
  [name, ...candidates.map((extension) => `${name}${extension}`)].find((path) => filePaths.includes(path))

function buildBibOutline(source: string): OutlineNode[] {
  const nodes: OutlineNode[] = []
  source.split('\n').forEach((text, index) => {
    const match = /^\s*@(\w+)\s*\{\s*([^,\s]+)/.exec(text)
    if (match && match[1].toLowerCase() !== 'comment') {
      nodes.push({
        id: `bib-${index}`,
        kind: 'bibentry',
        title: `${match[2]} (${match[1]})`,
        line: index + 1,
        endLine: index + 1,
        children: [],
      })
    }
  })
  return nodes
}

export function buildOutline(path: string, source: string, filePaths: string[]): OutlineNode[] {
  if (path.endsWith('.bib')) {
    return buildBibOutline(source)
  }
  const lines = source.split('\n')
  const root: OutlineNode[] = []
  const stack: StackEntry[] = []
  let preamble: OutlineNode | null = null
  let packages: OutlineNode | null = null
  let counter = 0

  const makeNode = (kind: SymbolKind, title: string, line: number, target?: string): OutlineNode => {
    counter += 1
    return { id: `${kind}-${counter}`, kind, title, line, endLine: line, children: [], target }
  }
  const attach = (node: OutlineNode) => {
    const top = stack[stack.length - 1]
    ;(top ? top.node.children : root).push(node)
  }
  const closeTo = (size: number, endLine: number) => {
    while (stack.length > size) {
      const entry = stack.pop() as StackEntry
      entry.node.endLine = Math.max(entry.node.line, endLine)
    }
  }
  const ensurePreamble = (line: number) => {
    if (!preamble) {
      preamble = makeNode('preamble', 'Preamble', line)
      preamble.id = 'preamble'
      root.push(preamble)
    }
    return preamble
  }

  lines.forEach((raw, index) => {
    const line = index + 1
    for (const match of withoutComment(raw).matchAll(pattern)) {
      const keyword = match.slice(1).find((group, position) => position % 2 === 0 && group !== undefined) as string
      const value = match[match.indexOf(keyword) + 1] ?? ''
      if (keyword === 'documentclass') {
        ensurePreamble(line).children.push(makeNode('documentclass', `documentclass: ${value}`, line))
      } else if (keyword === 'usepackage') {
        const group = ensurePreamble(line)
        if (!packages) {
          packages = makeNode('packages', 'Packages', line)
          packages.id = 'packages'
          group.children.push(packages)
        }
        for (const name of value.split(',')) {
          packages.children.push(makeNode('package', name.trim(), line))
        }
        packages.endLine = line
        packages.title = `Packages (${packages.children.length})`
        group.endLine = line
      } else if (keyword in sectionLevels) {
        const level = sectionLevels[keyword]
        while (stack.length > 0 && stack[stack.length - 1].isSection && stack[stack.length - 1].level >= level) {
          closeTo(stack.length - 1, line - 1)
        }
        const node = makeNode('section', value, line)
        attach(node)
        stack.push({ node, isSection: true, level })
      } else if (keyword === 'begin') {
        const node = makeNode('environment', value, line)
        if (value === 'document' && preamble) {
          ;(preamble as OutlineNode).endLine = line - 1
        }
        attach(node)
        stack.push({ node, isSection: false, level: 0 })
      } else if (keyword === 'end') {
        let position = stack.length - 1
        while (position >= 0 && (stack[position].isSection || stack[position].node.title !== value)) {
          position -= 1
        }
        if (position >= 0) {
          closeTo(position + 1, line - 1)
          closeTo(position, line)
        }
      } else if (keyword === 'input' || keyword === 'include') {
        attach(makeNode('include', `\\${keyword}{${value}}`, line, resolveTarget(value, ['.tex'], filePaths)))
      } else if (keyword === 'includegraphics') {
        attach(makeNode('graphic', value, line, resolveTarget(value, ['.png', '.jpg', '.jpeg', '.pdf'], filePaths)))
      } else if (keyword === 'bibliography' || keyword === 'addbibresource') {
        for (const name of value.split(',')) {
          attach(makeNode('bibliography', name.trim(), line, resolveTarget(name.trim(), ['.bib'], filePaths)))
        }
      } else if (keyword === 'label') {
        attach(makeNode('label', value, line))
      } else if (keyword === 'caption') {
        attach(makeNode('caption', value, line))
      }
    }
  })
  closeTo(0, lines.length)
  return root
}

export function findSymbolPath(nodes: OutlineNode[], line: number): OutlineNode[] {
  const container = [...nodes].reverse().find((node) => node.line <= line && line <= node.endLine)
  return container ? [container, ...findSymbolPath(container.children, line)] : []
}

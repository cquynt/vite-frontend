import type { OutlineNode } from '../views/outline'

export interface FoldRange {
  start: number
  end: number
}

export function collectFoldRanges(nodes: OutlineNode[]): FoldRange[] {
  const ranges: FoldRange[] = []
  const visit = (node: OutlineNode) => {
    if (node.endLine > node.line) {
      ranges.push({ start: node.line, end: node.endLine })
    }
    node.children.forEach(visit)
  }
  nodes.forEach(visit)
  const seen = new Set<number>()
  return ranges.filter((range) => (seen.has(range.start) ? false : seen.add(range.start)))
}

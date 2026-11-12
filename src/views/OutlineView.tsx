import { useState } from 'react'
import { Icon } from '../ui/Icon'
import type { OutlineNode, SymbolKind } from './outline'

interface OutlineViewProps {
  fileName: string
  nodes: OutlineNode[]
  activeLine: number
  activeIds: Set<string>
  onGoTo: (line: number) => void
  onOpenFile: (path: string) => void
}

const badges: Record<SymbolKind, string> = {
  preamble: 'P',
  packages: 'pkg',
  package: 'pkg',
  documentclass: 'cls',
  section: '§',
  environment: '{}',
  include: '↗',
  graphic: 'img',
  bibliography: 'bib',
  label: '#',
  caption: 'cap',
  bibentry: '@',
}

export function OutlineView({ fileName, nodes, activeIds, onGoTo, onOpenFile }: OutlineViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['preamble']))

  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const renderNode = (node: OutlineNode, depth: number) => {
    const hasChildren = node.children.length > 0
    const isOpen = !collapsed.has(node.id)
    const isActive = activeIds.has(node.id)
    return (
      <div key={node.id}>
        <div
          tabIndex={-1}
          className={`tree-row outline-row${isActive ? ' outline-active' : ''}`}
          style={{ paddingLeft: 8 + depth * 14 + (hasChildren ? 0 : 16) }}
          onClick={() => {
            if (node.target) onOpenFile(node.target)
            else onGoTo(node.line)
          }}
        >
          {hasChildren && (
            <span
              className="tree-arrow"
              onClick={(event) => {
                event.stopPropagation()
                toggle(node.id)
              }}
            >
              <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} />
            </span>
          )}
          <span className={`sym sym-${node.kind}`}>{badges[node.kind]}</span>
          <span className={`tree-name${node.target ? ' sym-link' : ''}`}>{node.title}</span>
          <span className="hit-line">{node.line}</span>
        </div>
        {hasChildren && isOpen && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="view">
      <div className="explorer-header">
        <span>OUTLINE</span>
      </div>
      <div className="outline-file">{fileName || 'No file open'}</div>
      <div className="view-list">
        {nodes.map((node) => renderNode(node, 0))}
        {nodes.length === 0 && <p className="scm-hint pad">No symbols found in this file</p>}
      </div>
    </div>
  )
}

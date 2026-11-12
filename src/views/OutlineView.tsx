import { useMemo } from 'react'
import type { ProjectFile } from '../project/useProject'
import { buildOutline } from './outline'

interface OutlineViewProps {
  files: ProjectFile[]
  mainPath: string
  onGoTo: (path: string, line: number) => void
}

export function OutlineView({ files, mainPath, onGoTo }: OutlineViewProps) {
  const items = useMemo(() => buildOutline(files, mainPath), [files, mainPath])
  return (
    <div className="view">
      <div className="explorer-header">
        <span>OUTLINE</span>
      </div>
      <div className="view-list">
        {items.map((item, index) => (
          <div
            key={`${item.path}:${item.line}:${index}`}
            className={`tree-row outline-${item.kind}`}
            style={{ paddingLeft: 12 + Math.min(item.level, 5) * 12 }}
            onClick={() => onGoTo(item.path, item.line)}
          >
            <span className="tree-name">{item.kind === 'label' ? `# ${item.title}` : item.title}</span>
            <span className="hit-line">{item.path}:{item.line}</span>
          </div>
        ))}
        {items.length === 0 && <p className="scm-hint pad">No sections found</p>}
      </div>
    </div>
  )
}

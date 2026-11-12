import { snippetGroups } from './snippets'

interface SnippetsViewProps {
  onInsert: (text: string) => void
}

export function SnippetsView({ onInsert }: SnippetsViewProps) {
  return (
    <div className="view">
      <div className="explorer-header">
        <span>INSERT</span>
      </div>
      <div className="view-list">
        {snippetGroups.map((group) => (
          <div key={group.title}>
            <div className="scm-section">{group.title}</div>
            {group.items.map((item) => (
              <div key={item.label} className="tree-row" onClick={() => onInsert(item.text)}>
                <span className="tree-name">{item.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

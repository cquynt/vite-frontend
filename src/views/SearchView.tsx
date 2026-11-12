import { useMemo, useState } from 'react'
import type { ProjectFile } from '../project/useProject'
import { replaceInText, searchProject } from './searchProject'

interface SearchViewProps {
  files: ProjectFile[]
  onGoTo: (path: string, line: number) => void
  onReplace: (path: string, text: string) => void
}

export function SearchView({ files, onGoTo, onReplace }: SearchViewProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const options = { caseSensitive, useRegex }

  const { hits, invalid } = useMemo(() => {
    try {
      return { hits: searchProject(files, query, { caseSensitive, useRegex }), invalid: false }
    } catch {
      return { hits: [], invalid: true }
    }
  }, [files, query, caseSensitive, useRegex])

  const replaceAll = () => {
    for (const file of files) {
      if (typeof file.content === 'string') {
        const next = replaceInText(file.content, query, replacement, options)
        if (next !== file.content) onReplace(file.path, next)
      }
    }
  }

  const paths = Array.from(new Set(hits.map((hit) => hit.path)))

  return (
    <div className="view">
      <div className="explorer-header">
        <span>SEARCH</span>
      </div>
      <div className="scm-form">
        <input placeholder="Find" value={query} onChange={(event) => setQuery(event.target.value)} />
        <input placeholder="Replace" value={replacement} onChange={(event) => setReplacement(event.target.value)} />
        <label className="check">
          <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
          Match case
        </label>
        <label className="check">
          <input type="checkbox" checked={useRegex} onChange={(event) => setUseRegex(event.target.checked)} />
          Regex
        </label>
        <button type="button" disabled={!query || invalid || hits.length === 0} onClick={replaceAll}>
          Replace all ({hits.length})
        </button>
        {invalid && <p className="error-block">Invalid regular expression</p>}
      </div>
      <div className="view-list">
        {paths.map((path) => (
          <div key={path}>
            <div className="scm-section">{path}</div>
            {hits
              .filter((hit) => hit.path === path)
              .map((hit) => (
                <div key={`${path}:${hit.line}`} className="tree-row" onClick={() => onGoTo(path, hit.line)}>
                  <span className="hit-line">{hit.line}</span>
                  <span className="tree-name">{hit.text}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

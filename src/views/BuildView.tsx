import type { CompilerState, Engine } from '../compiler/useLatexCompiler'

interface BuildViewProps {
  texFiles: string[]
  mainPath: string
  engine: Engine
  bibtex: boolean
  autoCompile: boolean
  state: CompilerState
  hasPdf: boolean
  onMainChange: (path: string) => void
  onEngineChange: (engine: Engine) => void
  onBibtexChange: (value: boolean) => void
  onAutoCompileChange: (value: boolean) => void
  onCompile: () => void
  onDownload: () => void
}

export function BuildView(props: BuildViewProps) {
  return (
    <div className="view">
      <div className="explorer-header">
        <span>BUILD</span>
      </div>
      <div className="scm-form">
        <label>
          Main file
          <select value={props.mainPath} onChange={(event) => props.onMainChange(event.target.value)}>
            {props.texFiles.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </label>
        <label>
          Engine
          <select value={props.engine} onChange={(event) => props.onEngineChange(event.target.value as Engine)}>
            <option value="pdflatex">pdfLaTeX</option>
            <option value="xelatex">XeLaTeX</option>
            <option value="lualatex">LuaLaTeX</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={props.bibtex} onChange={(event) => props.onBibtexChange(event.target.checked)} />
          Run bibtex
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={props.autoCompile}
            onChange={(event) => props.onAutoCompileChange(event.target.checked)}
          />
          Compile on change
        </label>
        <button
          type="button"
          className="primary"
          disabled={props.state === 'compiling' || props.state === 'loading engine'}
          onClick={props.onCompile}
        >
          Compile now
        </button>
        <button type="button" disabled={!props.hasPdf} onClick={props.onDownload}>
          Download PDF
        </button>
      </div>
    </div>
  )
}

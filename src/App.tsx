import { useEffect, useMemo, useState } from 'react'
import { parseProblems } from './compiler/parseLog'
import { useLatexCompiler } from './compiler/useLatexCompiler'
import type { Engine } from './compiler/useLatexCompiler'
import { LatexEditor } from './editor/LatexEditor'
import { FileTree } from './explorer/FileTree'
import { SourceControlPanel } from './github/SourceControlPanel'
import { useGitHub } from './github/useGitHub'
import { findMainPath, useProject } from './project/useProject'
import { BuildView } from './views/BuildView'
import { OutlineView } from './views/OutlineView'
import { SearchView } from './views/SearchView'
import { SnippetsView } from './views/SnippetsView'

type View = 'files' | 'search' | 'outline' | 'snippets' | 'build' | 'git'
type PanelTab = 'output' | 'problems'

const debounceMs = 800
const activityViews: { id: View; label: string }[] = [
  { id: 'files', label: 'Files' },
  { id: 'search', label: 'Find' },
  { id: 'outline', label: 'Outline' },
  { id: 'snippets', label: 'Insert' },
  { id: 'build', label: 'Build' },
  { id: 'git', label: 'Git' },
]
const imageTypes: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

function BinaryPreview({ path, content }: { path: string; content: Uint8Array }) {
  const type = imageTypes[path.slice(path.lastIndexOf('.') + 1).toLowerCase()]
  const url = useMemo(
    () => (type ? URL.createObjectURL(new Blob([content as BlobPart], { type })) : null),
    [content, type],
  )
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  return (
    <div className="binary-preview">
      {url ? <img src={url} alt={path} /> : <p>Binary file</p>}
      <p>{content.byteLength} bytes</p>
    </div>
  )
}

export function App() {
  const compiler = useLatexCompiler()
  const { compile } = compiler
  const project = useProject()
  const { files, activePath } = project
  const github = useGitHub(files, project.replaceAll)
  const [view, setView] = useState<View>('files')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>('output')
  const [engine, setEngine] = useState<Engine>('pdflatex')
  const [bibtex, setBibtex] = useState(true)
  const [autoCompile, setAutoCompile] = useState(true)
  const [mainOverride, setMainOverride] = useState('')
  const [jump, setJump] = useState<{ path: string; line: number; nonce: number } | null>(null)
  const [insert, setInsert] = useState<{ text: string; nonce: number } | null>(null)

  const mainPath = files.some((file) => file.path === mainOverride) ? mainOverride : findMainPath(files)
  const activeFile = files.find((file) => file.path === activePath)
  const texFiles = files.filter((file) => file.path.endsWith('.tex')).map((file) => file.path)
  const problems = useMemo(() => parseProblems(compiler.log, mainPath), [compiler.log, mainPath])
  const errorCount = problems.filter((problem) => problem.severity === 'error').length
  const changeStatus = Object.fromEntries(
    github.changes.filter((change) => change.status !== 'D').map((change) => [change.path, change.status]),
  )

  const compileNow = () => compile({ mainPath, files, engine, bibtex })

  useEffect(() => {
    if (!autoCompile || files.length === 0) {
      return
    }
    const timer = setTimeout(() => {
      compile({ mainPath, files, engine, bibtex })
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [files, mainPath, engine, bibtex, autoCompile, compile])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setSidebarOpen((open) => !open)
      } else if (event.key.toLowerCase() === 'j') {
        event.preventDefault()
        setPanelOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const openFile = (path: string) => {
    setJump(null)
    project.setActivePath(path)
  }

  const goTo = (path: string, line: number | null) => {
    if (!files.some((file) => file.path === path)) {
      return
    }
    project.setActivePath(path)
    setJump(line === null ? null : { path, line, nonce: Date.now() })
  }

  const selectView = (next: View) => {
    if (next === view && sidebarOpen) {
      setSidebarOpen(false)
    } else {
      setView(next)
      setSidebarOpen(true)
    }
  }

  const download = () => {
    if (!compiler.pdfUrl) {
      return
    }
    const link = document.createElement('a')
    link.href = compiler.pdfUrl
    link.download = `${mainPath.replace(/\.tex$/, '').split('/').pop()}.pdf`
    link.click()
  }

  return (
    <div className="app">
      <div className="layout">
        <nav className="activity-bar">
          {activityViews.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === view && sidebarOpen ? 'active' : ''}
              title={`${item.label} (click again to hide)`}
              onClick={() => selectView(item.id)}
            >
              {item.label}
              {item.id === 'git' && github.changes.length > 0 && (
                <span className="badge-count">{github.changes.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar" hidden={!sidebarOpen}>
          <div className="view-slot" hidden={view !== 'files'}>
            <FileTree
              changeStatus={changeStatus}
              filePaths={files.map((file) => file.path)}
              folders={project.folders}
              activePath={activePath}
              onOpen={openFile}
              onCreateFile={project.createFile}
              onCreateFolder={project.createFolder}
              onUpload={project.upload}
              onRemove={project.remove}
            />
          </div>
          <div className="view-slot" hidden={view !== 'search'}>
            <SearchView files={files} onGoTo={goTo} onReplace={project.updateText} />
          </div>
          <div className="view-slot" hidden={view !== 'outline'}>
            <OutlineView files={files} mainPath={mainPath} onGoTo={goTo} />
          </div>
          <div className="view-slot" hidden={view !== 'snippets'}>
            <SnippetsView onInsert={(text) => setInsert({ text, nonce: Date.now() })} />
          </div>
          <div className="view-slot" hidden={view !== 'build'}>
            <BuildView
              texFiles={texFiles}
              mainPath={mainPath}
              engine={engine}
              bibtex={bibtex}
              autoCompile={autoCompile}
              state={compiler.state}
              hasPdf={!!compiler.pdfUrl}
              onMainChange={setMainOverride}
              onEngineChange={setEngine}
              onBibtexChange={setBibtex}
              onAutoCompileChange={setAutoCompile}
              onCompile={compileNow}
              onDownload={download}
            />
          </div>
          <div className="view-slot" hidden={view !== 'git'}>
            <SourceControlPanel github={github} onOpen={openFile} />
          </div>
        </div>
        <section className="editor">
          <div className="editor-tab">{activeFile ? activePath : 'No file open'}</div>
          {project.loadError && <p className="error-block">{project.loadError}</p>}
          {activeFile && typeof activeFile.content === 'string' && (
            <LatexEditor
              key={activePath}
              value={activeFile.content}
              readOnly={false}
              onChange={(text) => project.updateText(activePath, text)}
              jump={jump && jump.path === activePath ? jump : null}
              insert={insert}
            />
          )}
          {activeFile && typeof activeFile.content !== 'string' && (
            <BinaryPreview path={activePath} content={activeFile.content} />
          )}
          {panelOpen && (
            <div className="bottom-panel">
              <div className="panel-tabs">
                <button
                  type="button"
                  className={panelTab === 'output' ? 'active' : ''}
                  onClick={() => setPanelTab('output')}
                >
                  OUTPUT
                </button>
                <button
                  type="button"
                  className={panelTab === 'problems' ? 'active' : ''}
                  onClick={() => setPanelTab('problems')}
                >
                  PROBLEMS ({problems.length})
                </button>
                <button type="button" className="panel-close" title="Close panel (Ctrl/Cmd+J)" onClick={() => setPanelOpen(false)}>
                  ×
                </button>
              </div>
              <div className="log-body">
                {compiler.message && <p className="error-block">{compiler.message}</p>}
                {panelTab === 'output' && <pre>{compiler.log}</pre>}
                {panelTab === 'problems' &&
                  problems.map((problem, index) => (
                    <div
                      key={index}
                      className="tree-row problem"
                      onClick={() => goTo(problem.path, problem.line)}
                    >
                      <span className={`problem-${problem.severity}`}>
                        {problem.severity === 'error' ? 'E' : 'W'}
                      </span>
                      <span className="tree-name">{problem.message}</span>
                      <span className="hit-line">
                        {problem.path}
                        {problem.line !== null ? `:${problem.line}` : ''}
                      </span>
                    </div>
                  ))}
                {panelTab === 'problems' && problems.length === 0 && <p className="scm-hint">No problems</p>}
              </div>
            </div>
          )}
        </section>
        {previewOpen && (
          <main className="preview">
            {compiler.pdfUrl ? (
              <iframe title="PDF preview" src={compiler.pdfUrl} />
            ) : (
              <div className="placeholder">{compiler.state}</div>
            )}
          </main>
        )}
      </div>
      <footer className="status-bar">
        <span className="status-left">
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle sidebar (Ctrl/Cmd+B)">
            Sidebar
          </button>
          <button type="button" onClick={() => setPanelOpen(!panelOpen)} title="Toggle panel (Ctrl/Cmd+J)">
            Panel
          </button>
          <button type="button" onClick={() => setPreviewOpen(!previewOpen)} title="Toggle PDF preview">
            Preview
          </button>
          <span>{compiler.state}</span>
          <button type="button" onClick={() => { setPanelOpen(true); setPanelTab('problems') }}>
            {errorCount} errors, {problems.length - errorCount} warnings
          </button>
        </span>
        <span>
          engine load {compiler.engineLoadMs ?? '-'} ms · first {compiler.firstCompileMs ?? '-'} ms · last{' '}
          {compiler.lastCompileMs ?? '-'} ms
        </span>
      </footer>
    </div>
  )
}

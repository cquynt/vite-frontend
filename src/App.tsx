import { useEffect, useMemo, useRef, useState } from 'react'
import { parseProblems } from './compiler/parseLog'
import { useLatexCompiler } from './compiler/useLatexCompiler'
import type { Engine } from './compiler/useLatexCompiler'
import { collectFoldRanges } from './editor/foldRanges'
import { LatexEditor } from './editor/LatexEditor'
import { FileTree } from './explorer/FileTree'
import { SourceControlPanel } from './github/SourceControlPanel'
import { useGitHub } from './github/useGitHub'
import { findMainPath, useProject } from './project/useProject'
import { Icon } from './ui/Icon'
import { Sash } from './ui/Sash'
import { BuildView } from './views/BuildView'
import { buildOutline, findSymbolPath } from './views/outline'
import { OutlineView } from './views/OutlineView'
import { SearchView } from './views/SearchView'
import { SnippetsView } from './views/SnippetsView'

type View = 'files' | 'search' | 'outline' | 'snippets' | 'build' | 'git'
type PanelTab = 'output' | 'problems'

const debounceMs = 800
const activityViews: { id: View; label: string; icon: 'files' | 'search' | 'outline' | 'snippets' | 'build' | 'git' }[] = [
  { id: 'files', label: 'Explorer', icon: 'files' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'outline', label: 'Outline', icon: 'outline' },
  { id: 'snippets', label: 'Insert', icon: 'snippets' },
  { id: 'build', label: 'Build', icon: 'build' },
  { id: 'git', label: 'Source Control', icon: 'git' },
]
const imageTypes: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

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

function Welcome() {
  return (
    <div className="welcome">
      <h2>LaTeX Studio</h2>
      <p>Open a file from the Explorer to start editing.</p>
      <dl>
        <dt>Ctrl/Cmd+B</dt>
        <dd>Toggle sidebar</dd>
        <dt>Ctrl/Cmd+J</dt>
        <dd>Toggle output panel</dd>
        <dt>Alt+Shift+F</dt>
        <dd>Format document</dd>
        <dt>Ctrl/Cmd+Alt+[ / ]</dt>
        <dd>Fold / unfold block</dd>
      </dl>
    </div>
  )
}

export function App() {
  const compiler = useLatexCompiler()
  const { compile } = compiler
  const project = useProject()
  const { files, activePath } = project
  const github = useGitHub(files, project.replaceAll)
  const editorRef = useRef<HTMLElement>(null)
  const [view, setView] = useState<View>('files')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>('problems')
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [panelHeight, setPanelHeight] = useState(200)
  const [editorWidth, setEditorWidth] = useState<number | null>(null)
  const [engine, setEngine] = useState<Engine>('pdflatex')
  const [bibtex, setBibtex] = useState(true)
  const [autoCompile, setAutoCompile] = useState(true)
  const [mainOverride, setMainOverride] = useState('')
  const [jump, setJump] = useState<{ path: string; line: number; nonce: number } | null>(null)
  const [insert, setInsert] = useState<{ text: string; nonce: number } | null>(null)
  const [caretLine, setCaretLine] = useState(1)
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [foldsByPath, setFoldsByPath] = useState<Record<string, number[]>>({})

  if (activePath && !openTabs.includes(activePath) && files.some((file) => file.path === activePath)) {
    setOpenTabs([...openTabs, activePath])
  }
  const tabs = openTabs.filter((path) => files.some((file) => file.path === path))

  const mainPath = files.some((file) => file.path === mainOverride) ? mainOverride : findMainPath(files)
  const activeFile = files.find((file) => file.path === activePath)
  const activeText = typeof activeFile?.content === 'string' ? activeFile.content : null
  const texFiles = files.filter((file) => file.path.endsWith('.tex')).map((file) => file.path)
  const problems = useMemo(() => parseProblems(compiler.log, mainPath), [compiler.log, mainPath])
  const errorCount = problems.filter((problem) => problem.severity === 'error').length
  const outline = useMemo(
    () => (activeText === null ? [] : buildOutline(activePath, activeText, files.map((file) => file.path))),
    [activePath, activeText, files],
  )
  const ranges = useMemo(() => collectFoldRanges(outline), [outline])
  const symbolPath = findSymbolPath(outline, caretLine)
  const activeIds = new Set(symbolPath.map((node) => node.id))
  const breadcrumbs = [
    ...activePath.split('/').filter(Boolean),
    ...symbolPath.filter((node) => node.kind === 'section' || node.kind === 'environment').map((node) => node.title),
  ]
  const changeStatus = Object.fromEntries(
    github.changes.filter((change) => change.status !== 'D').map((change) => [change.path, change.status]),
  )
  const folds = foldsByPath[activePath] ?? []
  const busy = compiler.state === 'compiling' || compiler.state === 'loading engine'

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
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
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

  const closeTab = (path: string) => {
    const index = tabs.indexOf(path)
    setOpenTabs(tabs.filter((tab) => tab !== path))
    if (path === activePath) {
      project.setActivePath(tabs[index + 1] ?? tabs[index - 1] ?? '')
    }
  }

  const selectView = (next: View) => {
    if (next === view && sidebarOpen) {
      setSidebarOpen(false)
    } else {
      setView(next)
      setSidebarOpen(true)
    }
  }

  const setFolds = (next: number[]) => setFoldsByPath({ ...foldsByPath, [activePath]: next })

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
      <header className="titlebar">
        <span className="app-name">LaTeX Studio</span>
        <span className="title-center">{mainPath}</span>
        <span className="layout-toggles">
          <button type="button" className={sidebarOpen ? 'on' : ''} title="Toggle sidebar (Ctrl/Cmd+B)" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Icon name="layoutSidebar" />
          </button>
          <button type="button" className={panelOpen ? 'on' : ''} title="Toggle panel (Ctrl/Cmd+J)" onClick={() => setPanelOpen(!panelOpen)}>
            <Icon name="layoutPanel" />
          </button>
          <button type="button" className={previewOpen ? 'on' : ''} title="Toggle PDF preview" onClick={() => setPreviewOpen(!previewOpen)}>
            <Icon name="layoutPreview" />
          </button>
        </span>
      </header>
      <div className="layout">
        <nav className="activity-bar">
          {activityViews.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === view && sidebarOpen ? 'active' : ''}
              title={item.label}
              onClick={() => selectView(item.id)}
            >
              <Icon name={item.icon} />
              {item.id === 'git' && github.changes.length > 0 && (
                <span className="badge-count">{github.changes.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar" style={{ width: sidebarWidth }} hidden={!sidebarOpen}>
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
            <OutlineView
              fileName={activePath}
              nodes={outline}
              activeLine={caretLine}
              activeIds={activeIds}
              onGoTo={(line) => goTo(activePath, line)}
              onOpenFile={openFile}
            />
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
        {sidebarOpen && <Sash orientation="vertical" onResize={(delta) => setSidebarWidth((width) => clamp(width + delta, 170, 520))} />}
        <section
          ref={editorRef}
          className="editor"
          style={previewOpen && editorWidth !== null ? { flex: `0 0 ${editorWidth}px` } : undefined}
        >
          <div className="tab-row">
            {tabs.map((path) => (
              <div role="button"
                key={path}
                className={`tab${path === activePath ? ' active' : ''}`}
                onClick={() => openFile(path)}
                title={path}
              >
                <span className="tab-name">{path.split('/').pop()}</span>
                <button
                  type="button"
                  className="tab-close"
                  title="Close"
                  onClick={(event) => {
                    event.stopPropagation()
                    closeTab(path)
                  }}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
          {activeFile && (
            <div className="breadcrumbs">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`} className="crumb">
                  {index > 0 && <Icon name="chevronRight" size={12} />}
                  {crumb}
                </span>
              ))}
              {ranges.length > 0 && (
                <span className="crumb-actions">
                  <button type="button" title="Fold all" onClick={() => setFolds(ranges.map((range) => range.start))}>
                    <Icon name="foldAll" />
                  </button>
                  <button type="button" title="Unfold all" onClick={() => setFolds([])}>
                    <Icon name="unfoldAll" />
                  </button>
                </span>
              )}
            </div>
          )}
          {project.loadError && <p className="error-block">{project.loadError}</p>}
          {!activeFile && <Welcome />}
          {activeFile && typeof activeFile.content === 'string' && (
            <LatexEditor
              key={activePath}
              value={activeFile.content}
              readOnly={false}
              onChange={(text) => project.updateText(activePath, text)}
              onCaretLine={setCaretLine}
              jump={jump && jump.path === activePath ? jump : null}
              insert={insert}
              ranges={ranges}
              folds={folds}
              onFoldsChange={setFolds}
            />
          )}
          {activeFile && typeof activeFile.content !== 'string' && (
            <BinaryPreview path={activePath} content={activeFile.content} />
          )}
          {panelOpen && (
            <>
              <Sash orientation="horizontal" onResize={(delta) => setPanelHeight((height) => clamp(height - delta, 80, 600))} />
              <div className="bottom-panel" style={{ height: panelHeight }}>
                <div className="panel-tabs">
                  <button type="button" className={panelTab === 'problems' ? 'active' : ''} onClick={() => setPanelTab('problems')}>
                    PROBLEMS
                    {problems.length > 0 && <span className="count-badge">{problems.length}</span>}
                  </button>
                  <button type="button" className={panelTab === 'output' ? 'active' : ''} onClick={() => setPanelTab('output')}>
                    OUTPUT
                  </button>
                  <button type="button" className="panel-close" title="Close panel (Ctrl/Cmd+J)" onClick={() => setPanelOpen(false)}>
                    <Icon name="close" />
                  </button>
                </div>
                <div className="log-body">
                  {compiler.message && <p className="error-block">{compiler.message}</p>}
                  {panelTab === 'output' && <pre>{compiler.log}</pre>}
                  {panelTab === 'problems' &&
                    problems.map((problem, index) => (
                      <div role="button" key={index} className="tree-row problem" onClick={() => goTo(problem.path, problem.line)}>
                        <span className={`problem-${problem.severity}`}>
                          <Icon name={problem.severity === 'error' ? 'error' : 'warning'} size={14} />
                        </span>
                        <span className="tree-name">{problem.message}</span>
                        <span className="hit-line">
                          {problem.path}
                          {problem.line !== null ? `:${problem.line}` : ''}
                        </span>
                      </div>
                    ))}
                  {panelTab === 'problems' && problems.length === 0 && <p className="scm-hint pad">No problems detected</p>}
                </div>
              </div>
            </>
          )}
        </section>
        {previewOpen && (
          <Sash
            orientation="vertical"
            onResize={(delta) =>
              setEditorWidth((width) => clamp((width ?? editorRef.current?.offsetWidth ?? 600) + delta, 240, 2000))
            }
          />
        )}
        {previewOpen && (
          <main className="preview">
            <div className="preview-bar">
              <span className="preview-title">PDF PREVIEW</span>
              <span className={`state-chip state-${compiler.state.replace(' ', '-')}`}>{compiler.state}</span>
              <span className="preview-actions">
                <button type="button" title="Compile now" disabled={busy} onClick={compileNow}>
                  <Icon name="play" />
                </button>
                <button type="button" title="Download PDF" disabled={!compiler.pdfUrl} onClick={download}>
                  <Icon name="download" />
                </button>
              </span>
            </div>
            {compiler.pdfUrl ? (
              <iframe title="PDF preview" src={compiler.pdfUrl} />
            ) : (
              <div className="placeholder">{busy ? 'Compiling…' : 'No PDF yet'}</div>
            )}
          </main>
        )}
      </div>
      <footer className="status-bar">
        <span className="status-left">
          {github.connection && (
            <button type="button" title="Source control" onClick={() => selectView('git')}>
              <Icon name="branch" size={13} /> {github.connection.ref.branch}
              {github.changes.length > 0 && ` · ${github.changes.length}*`}
            </button>
          )}
          <button type="button" title="Show problems" onClick={() => { setPanelOpen(true); setPanelTab('problems') }}>
            <Icon name="error" size={13} /> {errorCount} <Icon name="warning" size={13} /> {problems.length - errorCount}
          </button>
          <span>{compiler.state}</span>
        </span>
        <span className="status-right">
          <span>Ln {caretLine}</span>
          <span>{engine}</span>
          <span>
            load {compiler.engineLoadMs ?? '-'} ms · first {compiler.firstCompileMs ?? '-'} ms · last{' '}
            {compiler.lastCompileMs ?? '-'} ms
          </span>
        </span>
      </footer>
    </div>
  )
}

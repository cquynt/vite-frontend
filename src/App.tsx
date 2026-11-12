import { useEffect, useMemo, useState } from 'react'
import { useLatexCompiler } from './compiler/useLatexCompiler'
import { LatexEditor } from './editor/LatexEditor'
import { FileTree } from './explorer/FileTree'
import { SourceControlPanel } from './github/SourceControlPanel'
import { useGitHub } from './github/useGitHub'
import { findMainPath, useProject } from './project/useProject'

const debounceMs = 800
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
  const [view, setView] = useState<'explorer' | 'git'>('explorer')
  const mainPath = findMainPath(files)
  const changeStatus = Object.fromEntries(
    github.changes.filter((change) => change.status !== 'D').map((change) => [change.path, change.status]),
  )
  const activeFile = files.find((file) => file.path === activePath)

  useEffect(() => {
    if (files.length === 0) {
      return
    }
    const timer = setTimeout(() => {
      compile({ mainPath, files, engine: 'pdflatex', bibtex: true })
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [files, mainPath, compile])

  return (
    <div className="app">
      <div className="layout">
        <nav className="activity-bar">
          <button
            type="button"
            className={view === 'explorer' ? 'active' : ''}
            title="Explorer"
            onClick={() => setView('explorer')}
          >
            Files
          </button>
          <button
            type="button"
            className={view === 'git' ? 'active' : ''}
            title="Source Control"
            onClick={() => setView('git')}
          >
            Git
            {github.changes.length > 0 && <span className="badge-count">{github.changes.length}</span>}
          </button>
        </nav>
        <div className="sidebar" hidden={view !== 'explorer'}>
        <FileTree
          changeStatus={changeStatus}
          filePaths={files.map((file) => file.path)}
          folders={project.folders}
          activePath={activePath}
          onOpen={project.setActivePath}
          onCreateFile={project.createFile}
          onCreateFolder={project.createFolder}
          onUpload={project.upload}
          onRemove={project.remove}
        />
        </div>
        <div className="sidebar" hidden={view !== 'git'}>
          <SourceControlPanel github={github} onOpen={project.setActivePath} />
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
            />
          )}
          {activeFile && typeof activeFile.content !== 'string' && (
            <BinaryPreview path={activePath} content={activeFile.content} />
          )}
        </section>
        <main className="preview">
          {compiler.pdfUrl ? (
            <iframe title="PDF preview" src={compiler.pdfUrl} />
          ) : (
            <div className="placeholder">{compiler.state}</div>
          )}
          <div className="log-header">OUTPUT</div>
          <div className="log-body">
            {compiler.message && <p className="error-block">{compiler.message}</p>}
            {compiler.errors.length > 0 && (
              <pre className="error-block">{compiler.errors.join('\n\n')}</pre>
            )}
            <pre>{compiler.log}</pre>
          </div>
        </main>
      </div>
      <footer className="status-bar">
        <span>{compiler.state}</span>
        <span>
          engine load {compiler.engineLoadMs ?? '-'} ms · first {compiler.firstCompileMs ?? '-'} ms · last{' '}
          {compiler.lastCompileMs ?? '-'} ms
        </span>
      </footer>
    </div>
  )
}

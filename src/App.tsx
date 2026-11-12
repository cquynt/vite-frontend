import { useEffect, useMemo } from 'react'
import { useLatexCompiler } from './compiler/useLatexCompiler'
import { LatexEditor } from './editor/LatexEditor'
import { FileTree } from './explorer/FileTree'
import { mainPath, useProject } from './project/useProject'

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
  const activeFile = files.find((file) => file.path === activePath)

  useEffect(() => {
    if (files.length === 0) {
      return
    }
    const timer = setTimeout(() => {
      compile({ mainPath, files, engine: 'pdflatex', bibtex: true })
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [files, compile])

  return (
    <div className="app">
      <div className="layout">
        <FileTree
          filePaths={files.map((file) => file.path)}
          folders={project.folders}
          activePath={activePath}
          onOpen={project.setActivePath}
          onCreateFile={project.createFile}
          onCreateFolder={project.createFolder}
          onUpload={project.upload}
          onRemove={project.remove}
        />
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

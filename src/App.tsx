import { useEffect, useState } from 'react'
import { fillTemplate } from './compiler/fillTemplate'
import { useLatexCompiler } from './compiler/useLatexCompiler'
import { LatexEditor } from './editor/LatexEditor'
import { loadTemplate, templateNames } from './templates/loadTemplate'
import type { Template } from './templates/loadTemplate'

type Tab = 'log' | 'files'

const debounceMs = 800
const templateName = templateNames[0]

export function App() {
  const compiler = useLatexCompiler()
  const { compile } = compiler
  const [template, setTemplate] = useState<Template | null>(null)
  const [source, setSource] = useState('')
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<Tab>('log')

  useEffect(() => {
    loadTemplate(templateName)
      .then((loaded) => {
        setTemplate(loaded)
        setSource(fillTemplate(loaded.mainSource, loaded.fields, {}))
      })
      .catch((error: Error) => setLoadError(error.message))
  }, [])

  useEffect(() => {
    if (!template) {
      return
    }
    const timer = setTimeout(() => {
      compile({
        templateName: template.name,
        mainSource: source,
        engine: 'pdflatex',
        bibtex: true,
        fillSource: (text) => fillTemplate(text, template.fields, {}),
      })
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [template, source, compile])

  return (
    <div className="layout">
      <section className="pane editor">
        {loadError && <p className="error-block">{loadError}</p>}
        <LatexEditor value={source} readOnly={false} onChange={setSource} />
      </section>
      <main className="pane preview">
        {compiler.pdfUrl ? (
          <iframe title="PDF preview" src={compiler.pdfUrl} />
        ) : (
          <div className="placeholder">{compiler.state}</div>
        )}
        <div className="tabs">
          <button type="button" className={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>
            Log
          </button>
          <button type="button" className={tab === 'files' ? 'active' : ''} onClick={() => setTab('files')}>
            Files
          </button>
        </div>
        <div className="tab-body">
          {compiler.message && <p className="error-block">{compiler.message}</p>}
          {tab === 'log' && (
            <>
              {compiler.errors.length > 0 && (
                <pre className="error-block">{compiler.errors.join('\n\n')}</pre>
              )}
              <pre>{compiler.log}</pre>
            </>
          )}
          {tab === 'files' && (
            <table>
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {compiler.files.map((file) => (
                  <tr key={file.path} className={file.status}>
                    <td>{file.path}</td>
                    <td>{file.status}</td>
                    <td>{file.size} B</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

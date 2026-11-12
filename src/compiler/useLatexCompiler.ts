import { useCallback, useEffect, useRef, useState } from 'react'
import { BusyTexRunner, LuaLatex, PdfLatex, XeLatex } from 'texlyre-busytex'
import type { FileInput } from 'texlyre-busytex'
import { resolveProject } from './resolveProject'
import type { ResolvedFile } from './resolveProject'

export type Engine = 'pdflatex' | 'xelatex' | 'lualatex'
export type CompilerState = 'idle' | 'loading engine' | 'compiling' | 'done' | 'failed'

export interface CompileRequest {
  templateName: string
  mainSource: string
  engine: Engine
  bibtex: boolean
  fillSource: (source: string) => string
}

const assetBase = '/core/busytex'

const createRunner = () =>
  new BusyTexRunner({
    busytexBasePath: assetBase,
    preloadDataPackages: [`${assetBase}/texlive-basic.js`],
    catalogDataPackages: [
      `${assetBase}/texlive-recommended.js`,
      `${assetBase}/texlive-extra.js`,
    ],
  })

function extractLatexErrors(log: string) {
  const lines = log.split('\n')
  const errors: string[] = []
  lines.forEach((line, index) => {
    if (line.startsWith('!')) {
      errors.push(lines.slice(index, index + 4).join('\n'))
    }
  })
  return errors
}

export function useLatexCompiler() {
  const runnerRef = useRef<BusyTexRunner | null>(null)
  const pdfUrlRef = useRef<string | null>(null)
  const compileCountRef = useRef(0)
  const runningRef = useRef(false)
  const pendingRef = useRef<CompileRequest | null>(null)
  const [state, setState] = useState<CompilerState>('idle')
  const [message, setMessage] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [log, setLog] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [files, setFiles] = useState<ResolvedFile[]>([])
  const [engineLoadMs, setEngineLoadMs] = useState<number | null>(null)
  const [firstCompileMs, setFirstCompileMs] = useState<number | null>(null)
  const [lastCompileMs, setLastCompileMs] = useState<number | null>(null)
  const [downloadName, setDownloadName] = useState('document.pdf')

  const replacePdfUrl = useCallback((url: string | null) => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current)
    }
    pdfUrlRef.current = url
    setPdfUrl(url)
  }, [])

  useEffect(
    () => () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current)
      }
      runnerRef.current?.terminate()
    },
    [],
  )

  const ensureRunner = useCallback(async () => {
    if (runnerRef.current?.isInitialized()) {
      return runnerRef.current
    }
    setState('loading engine')
    const started = performance.now()
    const runner = createRunner()
    await runner.initialize(true)
    runnerRef.current = runner
    setEngineLoadMs(Math.round(performance.now() - started))
    return runner
  }, [])

  const runCompile = useCallback(
    async (request: CompileRequest) => {
      setMessage('')
      setErrors([])
      setLog('')
      try {
        const runner = await ensureRunner()
        setState('compiling')
        const started = performance.now()
        const resolved = await resolveProject(
          request.templateName,
          request.fillSource(request.mainSource),
          request.fillSource,
        )
        setFiles(resolved)
        const unsupported = resolved.filter((file) => file.status === 'unsupported')
        if (unsupported.length > 0) {
          setMessage(`Unsupported files: ${unsupported.map((file) => file.path).join(', ')}`)
        }
        const additionalFiles: FileInput[] = resolved.flatMap((file) =>
          file.status === 'ok' && file.content !== undefined
            ? [{ path: file.path, content: file.content }]
            : [],
        )
        const tool =
          request.engine === 'xelatex'
            ? new XeLatex(runner)
            : request.engine === 'lualatex'
              ? new LuaLatex(runner)
              : new PdfLatex(runner)
        const result = await tool.compile({
          input: request.fillSource(request.mainSource),
          additionalFiles,
          bibtex: request.bibtex,
          rerun: true,
        })
        const elapsed = Math.round(performance.now() - started)
        compileCountRef.current += 1
        if (compileCountRef.current === 1) {
          setFirstCompileMs(elapsed)
        }
        setLastCompileMs(elapsed)
        setLog(result.log)
        setErrors(extractLatexErrors(result.log))
        if (result.success && result.pdf) {
          replacePdfUrl(
            URL.createObjectURL(new Blob([result.pdf as BlobPart], { type: 'application/pdf' })),
          )
          setDownloadName(`${request.templateName}.pdf`)
          setState('done')
        } else {
          setState('failed')
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error))
        setState('failed')
      }
    },
    [ensureRunner, replacePdfUrl],
  )

  const compile = useCallback(
    async (request: CompileRequest) => {
      if (runningRef.current) {
        pendingRef.current = request
        return
      }
      runningRef.current = true
      let next: CompileRequest | null = request
      while (next) {
        pendingRef.current = null
        await runCompile(next)
        next = pendingRef.current
      }
      runningRef.current = false
    },
    [runCompile],
  )

  const download = useCallback(() => {
    if (!pdfUrlRef.current) {
      return
    }
    const link = document.createElement('a')
    link.href = pdfUrlRef.current
    link.download = downloadName
    link.click()
  }, [downloadName])

  return {
    state,
    message,
    pdfUrl,
    log,
    errors,
    files,
    engineLoadMs,
    firstCompileMs,
    lastCompileMs,
    compile,
    download,
  }
}

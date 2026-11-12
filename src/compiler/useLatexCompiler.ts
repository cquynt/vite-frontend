import { useCallback, useEffect, useRef, useState } from 'react'
import { BusyTexRunner, LuaLatex, PdfLatex, XeLatex } from 'texlyre-busytex'
import type { FileInput } from 'texlyre-busytex'
import type { ProjectFile } from '../project/useProject'

export type Engine = 'pdflatex' | 'xelatex' | 'lualatex'
export type CompilerState = 'idle' | 'loading engine' | 'compiling' | 'done' | 'failed'

export interface CompileRequest {
  mainPath: string
  files: ProjectFile[]
  engine: Engine
  bibtex: boolean
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
  const [engineLoadMs, setEngineLoadMs] = useState<number | null>(null)
  const [firstCompileMs, setFirstCompileMs] = useState<number | null>(null)
  const [lastCompileMs, setLastCompileMs] = useState<number | null>(null)

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
      try {
        const main = request.files.find((file) => file.path === request.mainPath)
        if (!main || typeof main.content !== 'string') {
          setMessage(`Missing ${request.mainPath}`)
          setState('failed')
          return
        }
        const runner = await ensureRunner()
        setState('compiling')
        const started = performance.now()
        const additionalFiles: FileInput[] = request.files
          .filter((file) => file.path !== request.mainPath)
          .map((file) => ({ path: file.path, content: file.content }))
        const tool =
          request.engine === 'xelatex'
            ? new XeLatex(runner)
            : request.engine === 'lualatex'
              ? new LuaLatex(runner)
              : new PdfLatex(runner)
        const result = await tool.compile({
          input: main.content,
          mainTexPath: request.mainPath,
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

  return { state, message, pdfUrl, log, errors, engineLoadMs, firstCompileMs, lastCompileMs, compile }
}

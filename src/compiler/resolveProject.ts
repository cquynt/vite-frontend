import { templateUrl } from '../templates/loadTemplate'

export type FileStatus = 'ok' | 'missing' | 'unsupported'

export interface ResolvedFile {
  path: string
  status: FileStatus
  size: number
  content?: string | Uint8Array
}

const imageExtensions = ['.png', '.jpg', '.jpeg', '.pdf']
const unsupportedExtensions = ['.svg', '.eps']

const stripComments = (source: string) => source.replace(/(?<!\\)%.*$/gm, '')

const splitList = (list: string) =>
  list
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const withExtension = (path: string, extension: string) =>
  /\.[A-Za-z0-9]+$/.test(path) ? path : `${path}${extension}`

interface Reference {
  path: string
  kind: 'tex' | 'bib' | 'image' | 'package'
}

function scanReferences(source: string): Reference[] {
  const text = stripComments(source)
  const references: Reference[] = []
  const collect = (pattern: RegExp, kind: Reference['kind']) => {
    for (const match of text.matchAll(pattern)) {
      for (const path of splitList(match[1])) {
        references.push({ path, kind })
      }
    }
  }
  collect(/\\(?:input|include)\s*\{([^}]+)\}/g, 'tex')
  collect(/\\includegraphics\s*(?:\[[^\]]*\]\s*)?\{([^}]+)\}/g, 'image')
  collect(/\\(?:bibliography|addbibresource)\s*(?:\[[^\]]*\]\s*)?\{([^}]+)\}/g, 'bib')
  collect(/\\usepackage\s*(?:\[[^\]]*\]\s*)?\{([^}]+)\}/g, 'package')
  return references
}

async function fetchTemplateFile(templateName: string, path: string) {
  const response = await fetch(templateUrl(templateName, path))
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || contentType.includes('text/html')) {
    return null
  }
  return response
}

async function fetchResolved(
  templateName: string,
  path: string,
  binary: boolean,
  fillSource: (source: string) => string,
): Promise<ResolvedFile | null> {
  const response = await fetchTemplateFile(templateName, path)
  if (!response) {
    return null
  }
  if (binary) {
    const content = new Uint8Array(await response.arrayBuffer())
    return { path, status: 'ok', size: content.byteLength, content }
  }
  const content = fillSource(await response.text())
  return { path, status: 'ok', size: new TextEncoder().encode(content).byteLength, content }
}

async function resolveReference(
  templateName: string,
  reference: Reference,
  fillSource: (source: string) => string,
): Promise<ResolvedFile | null> {
  if (reference.kind === 'package') {
    return fetchResolved(templateName, withExtension(reference.path, '.sty'), false, fillSource)
  }
  if (reference.kind === 'tex') {
    const path = withExtension(reference.path, '.tex')
    return (
      (await fetchResolved(templateName, path, false, fillSource)) ?? {
        path,
        status: 'missing',
        size: 0,
      }
    )
  }
  if (reference.kind === 'bib') {
    const path = withExtension(reference.path, '.bib')
    return (
      (await fetchResolved(templateName, path, false, fillSource)) ?? {
        path,
        status: 'missing',
        size: 0,
      }
    )
  }
  if (unsupportedExtensions.some((extension) => reference.path.toLowerCase().endsWith(extension))) {
    return { path: reference.path, status: 'unsupported', size: 0 }
  }
  const candidates = /\.[A-Za-z0-9]+$/.test(reference.path)
    ? [reference.path]
    : imageExtensions.map((extension) => `${reference.path}${extension}`)
  for (const candidate of candidates) {
    const file = await fetchResolved(templateName, candidate, true, fillSource)
    if (file) {
      return file
    }
  }
  return { path: candidates[0], status: 'missing', size: 0 }
}

export async function resolveProject(
  templateName: string,
  mainSource: string,
  fillSource: (source: string) => string,
): Promise<ResolvedFile[]> {
  const resolved: ResolvedFile[] = []
  const visited = new Set<string>(['main.tex'])
  const queue: string[] = [mainSource]
  while (queue.length > 0) {
    const source = queue.shift() as string
    for (const reference of scanReferences(source)) {
      const file = await resolveReference(templateName, reference, fillSource)
      if (!file || visited.has(file.path)) {
        continue
      }
      visited.add(file.path)
      resolved.push(file)
      const isTextSource = file.path.endsWith('.tex') || file.path.endsWith('.sty')
      if (file.status === 'ok' && isTextSource && typeof file.content === 'string') {
        queue.push(file.content)
      }
    }
  }
  return resolved
}

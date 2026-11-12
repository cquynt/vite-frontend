import { useCallback, useEffect, useState } from 'react'
import { fillTemplate } from '../compiler/fillTemplate'
import { resolveProject } from '../compiler/resolveProject'
import { loadTemplate, templateNames } from '../templates/loadTemplate'

export interface ProjectFile {
  path: string
  content: string | Uint8Array
}

export const mainPath = 'main.tex'

const textExtensions = ['.tex', '.bib', '.sty', '.cls', '.bst', '.txt', '.md', '.cfg', '.def']

export const isTextPath = (path: string) =>
  textExtensions.some((extension) => path.toLowerCase().endsWith(extension))

export const normalizePath = (path: string) =>
  path
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')

const joinPath = (parent: string, name: string) => normalizePath(parent ? `${parent}/${name}` : name)

export function useProject() {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [activePath, setActivePath] = useState(mainPath)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const load = async () => {
      const template = await loadTemplate(templateNames[0])
      const fill = (source: string) => fillTemplate(source, template.fields, {})
      const main = fill(template.mainSource)
      const resolved = await resolveProject(template.name, main, fill)
      const loaded: ProjectFile[] = [{ path: mainPath, content: main }]
      for (const file of resolved) {
        if (file.status === 'ok' && file.content !== undefined) {
          loaded.push({ path: file.path, content: file.content })
        }
      }
      setFiles(loaded)
    }
    load().catch((error: Error) => setLoadError(error.message))
  }, [])

  const updateText = useCallback((path: string, text: string) => {
    setFiles((current) =>
      current.map((file) => (file.path === path ? { path, content: text } : file)),
    )
  }, [])

  const putFiles = useCallback((added: ProjectFile[]) => {
    setFiles((current) => {
      const addedPaths = new Set(added.map((file) => file.path))
      return [...current.filter((file) => !addedPaths.has(file.path)), ...added]
    })
  }, [])

  const createFile = useCallback(
    (parent: string, name: string) => {
      const path = joinPath(parent, name)
      if (!path) {
        return
      }
      setFiles((current) =>
        current.some((file) => file.path === path) ? current : [...current, { path, content: '' }],
      )
      setActivePath(path)
    },
    [],
  )

  const createFolder = useCallback((parent: string, name: string) => {
    const path = joinPath(parent, name)
    if (path) {
      setFolders((current) => (current.includes(path) ? current : [...current, path]))
    }
  }, [])

  const upload = useCallback(
    async (uploaded: File[], parent: string) => {
      const added: ProjectFile[] = []
      for (const file of uploaded) {
        const relative = file.webkitRelativePath || file.name
        const path = joinPath(parent, relative)
        const content = isTextPath(path)
          ? await file.text()
          : new Uint8Array(await file.arrayBuffer())
        added.push({ path, content })
      }
      putFiles(added)
      if (added.length > 0) {
        setActivePath(added[0].path)
      }
    },
    [putFiles],
  )

  const remove = useCallback((path: string, isFolder: boolean) => {
    const prefix = `${path}/`
    setFiles((current) =>
      current.filter((file) => (isFolder ? !file.path.startsWith(prefix) : file.path !== path)),
    )
    if (isFolder) {
      setFolders((current) => current.filter((folder) => folder !== path && !folder.startsWith(prefix)))
    }
  }, [])

  return {
    files,
    folders,
    activePath,
    loadError,
    setActivePath,
    updateText,
    createFile,
    createFolder,
    upload,
    remove,
  }
}

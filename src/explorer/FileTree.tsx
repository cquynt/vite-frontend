import { useRef, useState } from 'react'
import type { DragEvent, KeyboardEvent } from 'react'
import { buildTree } from './buildTree'
import type { TreeNode } from './buildTree'

interface FileTreeProps {
  filePaths: string[]
  folders: string[]
  activePath: string
  onOpen: (path: string) => void
  onCreateFile: (parent: string, name: string) => void
  onCreateFolder: (parent: string, name: string) => void
  onUpload: (files: File[], parent: string) => void
  onRemove: (path: string, isFolder: boolean) => void
}

interface Creating {
  parent: string
  isFolder: boolean
}

const iconClass = (name: string) => {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (['tex', 'sty', 'cls'].includes(extension)) return 'icon-tex'
  if (['bib', 'bst'].includes(extension)) return 'icon-bib'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'pdf', 'eps'].includes(extension)) return 'icon-image'
  return 'icon-file'
}

export function FileTree(props: FileTreeProps) {
  const { filePaths, folders, activePath, onOpen, onCreateFile, onCreateFolder, onUpload, onRemove } = props
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['sections', 'images']))
  const [selectedFolder, setSelectedFolder] = useState('')
  const [creating, setCreating] = useState<Creating | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const tree = buildTree(filePaths, folders)

  const toggleFolder = (path: string) => {
    setSelectedFolder(path)
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const startCreating = (isFolder: boolean) => {
    if (selectedFolder) {
      setExpanded((current) => new Set(current).add(selectedFolder))
    }
    setCreating({ parent: selectedFolder, isFolder })
  }

  const commitCreating = (name: string) => {
    if (creating && name.trim()) {
      if (creating.isFolder) onCreateFolder(creating.parent, name)
      else onCreateFile(creating.parent, name)
    }
    setCreating(null)
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    onUpload(Array.from(event.dataTransfer.files), selectedFolder)
  }

  const renderCreating = (parent: string, depth: number) =>
    creating && creating.parent === parent ? (
      <div className="tree-row" style={{ paddingLeft: 12 + depth * 14 }}>
        <span className={`tree-icon ${creating.isFolder ? 'icon-folder' : 'icon-file'}`} />
        <input
          className="tree-input"
          autoFocus
          placeholder={creating.isFolder ? 'folder name' : 'file name'}
          onBlur={(event) => commitCreating(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') commitCreating(event.currentTarget.value)
            if (event.key === 'Escape') setCreating(null)
          }}
        />
      </div>
    ) : null

  const renderNode = (node: TreeNode, depth: number) => {
    const isOpen = expanded.has(node.path)
    const isActive = !node.isFolder && node.path === activePath
    const isSelectedFolder = node.isFolder && node.path === selectedFolder
    return (
      <div key={node.path}>
        <div
          className={`tree-row${isActive ? ' active' : ''}${isSelectedFolder ? ' selected' : ''}`}
          style={{ paddingLeft: 12 + depth * 14 }}
          onClick={() => (node.isFolder ? toggleFolder(node.path) : onOpen(node.path))}
        >
          <span className="tree-arrow">{node.isFolder ? (isOpen ? '▾' : '▸') : ''}</span>
          <span className={`tree-icon ${node.isFolder ? 'icon-folder' : iconClass(node.name)}`} />
          <span className="tree-name">{node.name}</span>
          {node.path !== 'main.tex' && (
            <button
              type="button"
              className="tree-delete"
              title="Delete"
              onClick={(event) => {
                event.stopPropagation()
                onRemove(node.path, node.isFolder)
              }}
            >
              ×
            </button>
          )}
        </div>
        {node.isFolder && isOpen && (
          <>
            {renderCreating(node.path, depth + 1)}
            {node.children.map((child) => renderNode(child, depth + 1))}
          </>
        )}
      </div>
    )
  }

  return (
    <aside
      className={`explorer${dragging ? ' dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="explorer-header">
        <span>EXPLORER</span>
        <span className="explorer-actions">
          <button type="button" title="New file" onClick={() => startCreating(false)}>
            + File
          </button>
          <button type="button" title="New folder" onClick={() => startCreating(true)}>
            + Folder
          </button>
          <button type="button" title="Upload files" onClick={() => fileInputRef.current?.click()}>
            Upload
          </button>
          <button type="button" title="Upload folder" onClick={() => folderInputRef.current?.click()}>
            Upload dir
          </button>
        </span>
      </div>
      <div className="tree-root-label" onClick={() => setSelectedFolder('')}>
        PROJECT
      </div>
      <div className="tree" onClick={() => setSelectedFolder('')}>
        {renderCreating('', 0)}
        {tree.map((node) => renderNode(node, 0))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          onUpload(Array.from(event.target.files ?? []), selectedFolder)
          event.target.value = ''
        }}
      />
      <input
        ref={(element) => {
          folderInputRef.current = element
          element?.setAttribute('webkitdirectory', '')
        }}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          onUpload(Array.from(event.target.files ?? []), selectedFolder)
          event.target.value = ''
        }}
      />
    </aside>
  )
}

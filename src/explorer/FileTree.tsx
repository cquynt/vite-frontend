import { useRef, useState } from 'react'
import type { DragEvent, KeyboardEvent } from 'react'
import { Icon } from '../ui/Icon'
import { buildTree } from './buildTree'
import type { TreeNode } from './buildTree'

interface FileTreeProps {
  filePaths: string[]
  folders: string[]
  activePath: string
  changeStatus: Record<string, string>
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

const indentStep = 8
const indentBase = 8

const iconClass = (name: string) => {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (['tex', 'sty', 'cls'].includes(extension)) return 'icon-tex'
  if (['bib', 'bst'].includes(extension)) return 'icon-bib'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'pdf', 'eps'].includes(extension)) return 'icon-image'
  return 'icon-file'
}

export function FileTree(props: FileTreeProps) {
  const { filePaths, folders, activePath, changeStatus, onOpen, onCreateFile, onCreateFolder, onUpload, onRemove } = props
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['sections', 'images']))
  const [sectionOpen, setSectionOpen] = useState(true)
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
    setSectionOpen(true)
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
      <div className="tree-row" style={{ paddingLeft: indentBase + depth * indentStep + 16 }}>
        <span className={`tree-icon ${creating.isFolder ? 'icon-folder' : 'icon-file'}`} />
        <input
          className="tree-input"
          autoFocus
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
    const status = changeStatus[node.path]
    return (
      <div key={node.path}>
        <div
          tabIndex={-1}
          className={`tree-row${isActive ? ' active' : ''}${node.isFolder && node.path === selectedFolder ? ' selected' : ''}`}
          style={{ paddingLeft: indentBase + depth * indentStep + (node.isFolder ? 0 : 16) }}
          onClick={(event) => {
            event.stopPropagation()
            if (node.isFolder) toggleFolder(node.path)
            else onOpen(node.path)
          }}
        >
          {node.isFolder && <span className="tree-arrow"><Icon name={isOpen ? 'chevronDown' : 'chevronRight'} /></span>}
          <span className={`tree-icon ${node.isFolder ? 'icon-folder' : iconClass(node.name)}`} />
          <span className={`tree-name${status ? ` name-${status}` : ''}`}>{node.name}</span>
          {status && <span className={`tree-status status-${status}`}>{status}</span>}
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
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
        {node.isFolder && isOpen && (
          <div className="tree-children" style={{ ['--guide' as string]: `${indentBase + depth * indentStep + 7}px` }}>
            {renderCreating(node.path, depth + 1)}
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const uploadHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpload(Array.from(event.target.files ?? []), selectedFolder)
    event.target.value = ''
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
      </div>
      <div className="section-header" onClick={() => setSectionOpen(!sectionOpen)}>
        <Icon name={sectionOpen ? 'chevronDown' : 'chevronRight'} />
        <span className="section-title">PROJECT</span>
        <span className="section-actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" title="New file" onClick={() => startCreating(false)}>
            <Icon name="newFile" />
          </button>
          <button type="button" title="New folder" onClick={() => startCreating(true)}>
            <Icon name="newFolder" />
          </button>
          <button type="button" title="Upload files" onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" />
          </button>
          <button type="button" title="Upload folder" onClick={() => folderInputRef.current?.click()}>
            <Icon name="uploadFolder" />
          </button>
        </span>
      </div>
      {sectionOpen && (
        <div className="tree" onClick={() => setSelectedFolder('')}>
          {renderCreating('', 0)}
          {tree.map((node) => renderNode(node, 0))}
        </div>
      )}
      <input ref={fileInputRef} type="file" multiple hidden onChange={uploadHandler} />
      <input
        ref={(element) => {
          folderInputRef.current = element
          element?.setAttribute('webkitdirectory', '')
        }}
        type="file"
        multiple
        hidden
        onChange={uploadHandler}
      />
    </aside>
  )
}

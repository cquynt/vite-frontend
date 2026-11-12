export interface TreeNode {
  name: string
  path: string
  isFolder: boolean
  children: TreeNode[]
}

export function buildTree(filePaths: string[], folders: string[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isFolder: true, children: [] }
  const nodes = new Map<string, TreeNode>([['', root]])

  const ensureFolder = (path: string): TreeNode => {
    const existing = nodes.get(path)
    if (existing) {
      return existing
    }
    const slash = path.lastIndexOf('/')
    const parent = ensureFolder(slash === -1 ? '' : path.slice(0, slash))
    const node: TreeNode = { name: path.slice(slash + 1), path, isFolder: true, children: [] }
    parent.children.push(node)
    nodes.set(path, node)
    return node
  }

  for (const folder of folders) {
    ensureFolder(folder)
  }
  for (const path of filePaths) {
    const slash = path.lastIndexOf('/')
    const parent = ensureFolder(slash === -1 ? '' : path.slice(0, slash))
    parent.children.push({ name: path.slice(slash + 1), path, isFolder: false, children: [] })
  }

  const sortChildren = (node: TreeNode) => {
    node.children.sort(
      (a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name),
    )
    node.children.forEach(sortChildren)
  }
  sortChildren(root)
  return root.children
}

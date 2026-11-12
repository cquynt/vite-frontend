import { buildTree } from './buildTree'

describe('buildTree', () => {
  it('builds sorted folders before files, including empty folders', () => {
    const tree = buildTree(['b.tex', 'sections/z.tex', 'sections/a.tex', 'a.tex', 'deep/x/y.tex'], ['empty'])
    expect(tree.map((node) => node.name)).toEqual(['deep', 'empty', 'sections', 'a.tex', 'b.tex'])
    expect(tree[2].children.map((node) => node.name)).toEqual(['a.tex', 'z.tex'])
    expect(tree[0].children[0].children[0].path).toBe('deep/x/y.tex')
    expect(tree[1].isFolder).toBe(true)
  })
  it('reuses folder nodes', () => {
    const tree = buildTree(['a/b.tex', 'a/c.tex'], ['a'])
    expect(tree).toHaveLength(1)
    expect(tree[0].children).toHaveLength(2)
  })
})

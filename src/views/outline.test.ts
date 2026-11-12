import { buildOutline, findSymbolPath } from './outline'

const doc = [
  '\\documentclass{article}',
  '\\usepackage{a,b}',
  '\\usepackage{c} % comment \\usepackage{x}',
  '\\begin{document}',
  '\\section{Intro}',
  '\\label{sec:intro}',
  '\\subsection*{Sub}',
  '\\begin{figure}',
  '\\includegraphics[width=1cm]{images/logo}',
  '\\caption{Cap}',
  '\\end{figure}',
  '\\section{Next}',
  '\\input{sections/intro}',
  '\\include{missing}',
  '\\bibliography{refs,other}',
  '\\end{document}',
].join('\n')
const filePaths = ['sections/intro.tex', 'images/logo.png', 'refs.bib']

describe('buildOutline', () => {
  const nodes = buildOutline('main.tex', doc, filePaths)
  const preamble = nodes[0]
  const document = nodes[1]

  it('groups the preamble with packages', () => {
    expect(preamble.kind).toBe('preamble')
    expect(preamble.children[0].title).toBe('documentclass: article')
    const packages = preamble.children[1]
    expect(packages.title).toBe('Packages (3)')
    expect(packages.children.map((node) => node.title)).toEqual(['a', 'b', 'c'])
    expect(preamble.endLine).toBe(3)
  })

  it('nests sections and environments inside the document', () => {
    expect(document.title).toBe('document')
    const [intro, next] = document.children
    expect(intro.title).toBe('Intro')
    expect(intro.children.map((node) => node.title)).toEqual(['sec:intro', 'Sub'])
    expect(intro.endLine).toBe(11)
    const figure = intro.children[1].children[0]
    expect(figure.title).toBe('figure')
    expect(figure.children.map((node) => node.kind)).toEqual(['graphic', 'caption'])
    expect(figure.endLine).toBe(11)
    expect(next.title).toBe('Next')
  })

  it('resolves include and bibliography targets', () => {
    const next = document.children[1]
    expect(next.children[0].target).toBe('sections/intro.tex')
    expect(next.children[1].target).toBeUndefined()
    expect(next.children[2].target).toBe('refs.bib')
    expect(next.children[3].target).toBeUndefined()
    const graphic = document.children[0].children[1].children[0].children[0]
    expect(graphic.target).toBe('images/logo.png')
  })

  it('closes dangling environments at the end of the file', () => {
    const open = buildOutline('a.tex', '\\begin{x}\ntext', [])
    expect(open[0].endLine).toBe(2)
  })

  it('ignores a mismatched \\end', () => {
    const result = buildOutline('a.tex', '\\begin{x}\n\\end{y}\n\\end{x}', [])
    expect(result[0].endLine).toBe(3)
  })

  it('closes sections when an environment ends', () => {
    const result = buildOutline('a.tex', '\\begin{x}\n\\section{s}\n\\end{x}', [])
    expect(result[0].children[0].endLine).toBe(2)
    expect(result[0].endLine).toBe(3)
  })

  it('lists bib entries for .bib files', () => {
    const entries = buildOutline('r.bib', '@book{knuth,\n}\n@comment{x}\n@article{a1,', [])
    expect(entries.map((node) => node.title)).toEqual(['knuth (book)', 'a1 (article)'])
  })

  it('returns no symbols for empty files', () => {
    expect(buildOutline('a.tex', '', [])).toEqual([])
  })
})

describe('findSymbolPath', () => {
  const nodes = buildOutline('main.tex', doc, filePaths)
  it('returns the chain of containing symbols', () => {
    expect(findSymbolPath(nodes, 10).map((node) => node.title)).toEqual(['document', 'Intro', 'Sub', 'figure', 'Cap'])
  })
  it('returns nothing outside every symbol', () => {
    expect(findSymbolPath(nodes, 999)).toEqual([])
  })
})

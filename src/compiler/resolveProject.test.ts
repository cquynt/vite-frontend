import { afterEach, vi } from 'vitest'
import { mockFetch } from '../test/mockFetch'
import { loadTemplate, templateNames, templateUrl } from '../templates/loadTemplate'
import { resolveProject } from './resolveProject'

afterEach(() => vi.unstubAllGlobals())

const files: Record<string, { text?: string; bytes?: Uint8Array }> = {
  'sections/intro.tex': { text: 'intro {{x}} \\input{sections/deep}' },
  'sections/deep.tex': { text: '\\input{main}' },
  'refs.bib': { text: '@book{k,}' },
  'images/logo.png': { bytes: new Uint8Array([1, 2, 3]) },
  'my.sty': { text: '\\ProvidesPackage{my}' },
}

const serve = () =>
  mockFetch((url) => {
    const path = url.replace('/templates/t/', '')
    const file = files[path]
    if (!file) return { status: 200, text: '<html></html>', type: 'text/html' }
    return file.bytes ? { bytes: file.bytes, type: 'image/png' } : { text: file.text }
  })

describe('resolveProject', () => {
  it('resolves includes recursively, images, bib and local packages', async () => {
    serve()
    const source = [
      '% \\input{commented}',
      '\\usepackage{my,amsmath}',
      '\\input{sections/intro}',
      '\\include{sections/missing}',
      '\\includegraphics[width=1cm]{images/logo}',
      '\\includegraphics{vector.svg}',
      '\\includegraphics{nothing}',
      '\\includegraphics{images/logo.png}',
      '\\bibliography{refs,absent}',
    ].join('\n')
    const resolved = await resolveProject('t', source, (text) => text.replace('{{x}}', 'X'))
    const byPath = Object.fromEntries(resolved.map((file) => [file.path, file]))
    expect(byPath['my.sty'].status).toBe('ok')
    expect(byPath['amsmath.sty']).toBeUndefined()
    expect(byPath['sections/intro.tex'].content).toContain('intro X')
    expect(byPath['sections/deep.tex'].status).toBe('ok')
    expect(byPath['sections/missing.tex'].status).toBe('missing')
    expect(byPath['images/logo.png'].content).toEqual(new Uint8Array([1, 2, 3]))
    expect(byPath['vector.svg'].status).toBe('unsupported')
    expect(byPath['nothing.png'].status).toBe('missing')
    expect(byPath['refs.bib'].size).toBe(9)
    expect(byPath['absent.bib'].status).toBe('missing')
  })
  it('protects against cycles', async () => {
    serve()
    const resolved = await resolveProject('t', '\\input{sections/deep}', (text) => text)
    expect(resolved.map((file) => file.path)).toEqual(['sections/deep.tex'])
  })
})

describe('loadTemplate', () => {
  it('loads main source and fields', async () => {
    mockFetch((url) => (url.endsWith('fields.json') ? { json: [{ key: 'a', label: 'A', type: 'text', default: '' }] } : { text: 'main' }))
    const template = await loadTemplate('minimal')
    expect(template).toMatchObject({ name: 'minimal', mainSource: 'main' })
    expect(template.fields).toHaveLength(1)
    expect(templateNames).toContain('letter-de')
    expect(templateUrl('a', 'b')).toBe('/templates/a/b')
  })
  it('throws when a file is missing', async () => {
    mockFetch(() => ({ status: 404, text: '' }))
    await expect(loadTemplate('nope')).rejects.toThrow('Cannot load template nope')
  })
})

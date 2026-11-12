import { buildPattern, replaceInText, searchProject } from './searchProject'
import { snippetGroups } from './snippets'

const files = [
  { path: 'a.tex', content: 'Hello world\nhello again\n(paren)' },
  { path: 'img.png', content: new Uint8Array([1]) },
]
const plain = { caseSensitive: false, useRegex: false }

describe('searchProject', () => {
  it('finds case-insensitive matches and skips binaries', () => {
    const hits = searchProject(files, 'hello', plain)
    expect(hits).toEqual([
      { path: 'a.tex', line: 1, text: 'Hello world' },
      { path: 'a.tex', line: 2, text: 'hello again' },
    ])
  })
  it('honours case sensitivity', () => {
    expect(searchProject(files, 'hello', { ...plain, caseSensitive: true })).toHaveLength(1)
  })
  it('escapes regex characters in plain mode', () => {
    expect(searchProject(files, '(paren)', plain)).toHaveLength(1)
  })
  it('supports regex mode', () => {
    expect(searchProject(files, '^h.llo', { caseSensitive: false, useRegex: true })).toHaveLength(2)
  })
  it('returns nothing for empty queries', () => {
    expect(searchProject(files, '', plain)).toEqual([])
  })
  it('throws on invalid regular expressions', () => {
    expect(() => buildPattern('(', { caseSensitive: false, useRegex: true })).toThrow()
  })
  it('caps the number of hits', () => {
    const big = [{ path: 'b.tex', content: 'x\n'.repeat(800) }]
    expect(searchProject(big, 'x', plain)).toHaveLength(500)
  })
})

describe('replaceInText', () => {
  it('replaces every match', () => {
    expect(replaceInText('a a a', 'a', 'b', plain)).toBe('b b b')
  })
})

describe('snippetGroups', () => {
  it('has labelled non-empty snippets', () => {
    for (const group of snippetGroups) {
      expect(group.items.length).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(item.label).not.toBe('')
        expect(item.text).not.toBe('')
      }
    }
  })
})

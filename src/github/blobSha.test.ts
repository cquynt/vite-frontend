import { blobSha, toBytes } from './blobSha'

describe('blobSha', () => {
  it('matches git hash-object for text', async () => {
    expect(await blobSha('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
    expect(await blobSha('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
  })
  it('hashes bytes identically to text', async () => {
    expect(await blobSha(new TextEncoder().encode('hello\n'))).toBe(await blobSha('hello\n'))
  })
  it('passes bytes through', () => {
    const bytes = new Uint8Array([1, 2])
    expect(toBytes(bytes)).toBe(bytes)
  })
})

const encoder = new TextEncoder()

export const toBytes = (content: string | Uint8Array) =>
  typeof content === 'string' ? encoder.encode(content) : content

export async function blobSha(content: string | Uint8Array) {
  const body = toBytes(content)
  const header = encoder.encode(`blob ${body.byteLength}\0`)
  const data = new Uint8Array(header.byteLength + body.byteLength)
  data.set(header)
  data.set(body, header.byteLength)
  const digest = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

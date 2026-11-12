import { vi } from 'vitest'

type Handler = (url: string, init?: RequestInit) => { status?: number; json?: unknown; text?: string; bytes?: Uint8Array; type?: string }

export function mockFetch(handler: Handler) {
  const calls: { url: string; init?: RequestInit }[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    const result = handler(url, init)
    const status = result.status ?? 200
    const body = result.bytes ?? result.text ?? JSON.stringify(result.json ?? {})
    const contentType = result.type ?? (result.json !== undefined ? 'application/json' : 'text/plain')
    return new Response(body as BodyInit, { status, headers: { 'content-type': contentType } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

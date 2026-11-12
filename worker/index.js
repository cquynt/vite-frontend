// Cloudflare Worker: serves the SPA from static assets (<25 MiB/file limit)
// and streams the big BusyTeX files (busytex.wasm, texlive-*.data) from R2.
// Same-origin on purpose: `new Worker(url)` in texlyre-busytex cannot load cross-origin.

const BIG_FILE = /^\/core\/busytex\/(busytex\.wasm|texlive-[a-z]+\.data)$/

const TYPES = { '.wasm': 'application/wasm', '.data': 'application/octet-stream' }

export default {
  /** @param {Request} request @param {{ ASSETS: Fetcher, BUSYTEX: R2Bucket }} env */
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (!BIG_FILE.test(pathname) || !['GET', 'HEAD'].includes(request.method)) {
      return env.ASSETS.fetch(request)
    }

    const object = await env.BUSYTEX.get(pathname.slice(1), {
      range: request.headers,
      onlyIf: request.headers,
    })
    if (object === null) return new Response('Not found', { status: 404 })

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('content-type', TYPES[pathname.slice(pathname.lastIndexOf('.'))])
    headers.set('cache-control', 'public, max-age=86400')
    headers.set('accept-ranges', 'bytes')

    if (!('body' in object)) return new Response(null, { status: 304, headers }) // If-None-Match hit

    let status = 200
    if (request.headers.has('range') && object.range && 'offset' in object.range) {
      const { offset = 0, length = object.size - offset } = object.range
      headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`)
      status = 206
    }
    return new Response(request.method === 'HEAD' ? null : object.body, { status, headers })
  },
}

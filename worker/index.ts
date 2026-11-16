import { sha256, toHex, normalizePassphrase } from './passphrase'

/*
 * Sija sync API. Only requests under /api/ run this Worker; every other request
 * is served straight from the static files.
 *
 *   POST /api/connect         { passphrase, deviceName } → session cookie
 *   POST /api/disconnect      ends this device's session
 *   POST /api/disconnect-all  ends every session
 *   GET  /api/sync            the stored progress (ETag = version)
 *   PUT  /api/sync            saves progress if If-Match is still the current version
 *
 * The progress travels as base64 text of gzip-compressed JSON, which the Worker
 * never decodes: devices merge and check it themselves, which keeps every
 * request far below the free plan's CPU limit.
 */

const COOKIE = '__Host-sija_session'
const DAY_MS = 24 * 60 * 60 * 1000
/** Sessions last 400 days (Chrome's longest cookie lifetime), renewed while in use. */
const SESSION_MS = 400 * DAY_MS
/** Uploads above this many characters (about 1.4 MB compressed) are refused; D1 allows 2 MB per row. */
const MAX_DOC_CHARS = 1_900_000
const MAX_CONNECT_BODY = 4_000
/** Wrong passphrases from one network: at most MAX_FAILS per window. */
const FAIL_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILS = 10
// Only the default export may be exported from this module: the Workers runtime
// treats every named export of the main module as an entrypoint.

const BASE_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

type Handler = (request: Request, env: Env, now: number) => Promise<Response>

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)
    try {
      return await route(request, env, url)
    } catch (e) {
      console.error(e)
      return json(500, { error: 'Something went wrong on the server. Try again later.' })
    }
  },
} satisfies ExportedHandler<Env>

const ROUTES: Record<string, Record<string, Handler>> = {
  '/api/connect': { POST: connect },
  '/api/disconnect': { POST: signedIn(disconnect) },
  '/api/disconnect-all': { POST: signedIn(disconnectAll) },
  '/api/sync': { GET: signedIn(getSync), PUT: signedIn(putSync) },
}

async function route(request: Request, env: Env, url: URL): Promise<Response> {
  const methods = ROUTES[url.pathname]
  if (!methods) return json(404, { error: 'Not found.' })
  const handler = methods[request.method]
  if (!handler) return json(405, { error: 'Method not allowed.' }, { Allow: Object.keys(methods).join(', ') })
  // Changes must come from Sija's own pages: with the SameSite=Strict cookie this
  // stops another site from making a signed-in device act.
  if (request.method !== 'GET' && request.headers.get('Origin') !== url.origin) {
    return json(403, { error: 'Requests must come from Sija itself.' })
  }
  return handler(request, env, Date.now())
}

// ---------------------------------------------------------------------------
// Responses

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers } })
}

function empty(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { ...BASE_HEADERS, ...headers } })
}

function docResponse(status: number, doc: string, headers: Record<string, string>): Response {
  return new Response(doc, { status, headers: { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...headers } })
}

const etag = (version: number) => `"${version}"`

/**
 * The body as text, or null when it is larger than `max` bytes. Reading stops
 * as soon as the limit is passed, also for a streamed body that declares no
 * length, so nobody can make the Worker buffer a huge upload.
 */
async function readText(request: Request, max: number): Promise<string | null> {
  if (Number(request.headers.get('Content-Length')) > max) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const all = new Uint8Array(size)
  let at = 0
  for (const c of chunks) {
    all.set(c, at)
    at += c.byteLength
  }
  return new TextDecoder().decode(all)
}

// ---------------------------------------------------------------------------
// Sessions

function sessionCookie(token: string): string {
  return `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}`
}

const CLEAR_COOKIE = `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`

function readCookie(request: Request): string | null {
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === COOKIE) return value.join('=')
  }
  return null
}

function randomToken(): string {
  const raw = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...raw)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

interface Session {
  tokenHash: string
  /** A renewed cookie to send back, at most once a day. */
  renew: string | null
}

async function findSession(request: Request, env: Env, now: number): Promise<Session | null> {
  const token = readCookie(request)
  if (!token || !TOKEN_RE.test(token)) return null
  const tokenHash = toHex(await sha256(token))
  const row = await env.DB.prepare('SELECT last_seen_at FROM sessions WHERE token_hash = ?').bind(tokenHash).first<{ last_seen_at: number }>()
  if (!row) return null
  if (now - row.last_seen_at > SESSION_MS) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
    return null
  }
  if (now - row.last_seen_at < DAY_MS) return { tokenHash, renew: null }
  await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').bind(now, tokenHash).run()
  return { tokenHash, renew: sessionCookie(token) }
}

type SessionHandler = (request: Request, env: Env, now: number, session: Session) => Promise<Response>

/** Runs the handler for a connected device; others get 401 and lose a stale cookie. */
function signedIn(handler: SessionHandler): Handler {
  return async (request, env, now) => {
    const session = await findSession(request, env, now)
    if (!session) {
      const headers: Record<string, string> = readCookie(request) !== null ? { 'Set-Cookie': CLEAR_COOKIE } : {}
      return json(401, { error: 'This device is not connected to sync.' }, headers)
    }
    const response = await handler(request, env, now, session)
    if (session.renew && !response.headers.has('Set-Cookie')) response.headers.append('Set-Cookie', session.renew)
    return response
  }
}

// ---------------------------------------------------------------------------
// Connecting

/** The configured passphrase hash, or null when the secret is missing or malformed. */
function expectedHash(env: Env): Uint8Array | null {
  const hex = (env.SYNC_PASSPHRASE_HASH ?? '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(hex)) return null
  return Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16))
}

/** A short printable device name, e.g. "iPhone · Safari". */
function cleanDeviceName(v: unknown): string {
  const text = typeof v === 'string' ? Array.from(v, (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('') : ''
  return text.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Unknown device'
}

async function connect(request: Request, env: Env, now: number): Promise<Response> {
  const expected = expectedHash(env)
  if (!expected) return json(503, { error: "Sync isn't set up on the server yet." })

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  await env.DB.prepare('DELETE FROM connect_failures WHERE at <= ?').bind(now - FAIL_WINDOW_MS).run()
  const fails = await env.DB.prepare('SELECT COUNT(*) AS n, MIN(at) AS first FROM connect_failures WHERE ip = ?').bind(ip).first<{ n: number; first: number | null }>()
  if (fails && fails.n >= MAX_FAILS && fails.first !== null) {
    const wait = Math.max(1, Math.ceil((fails.first + FAIL_WINDOW_MS - now) / 1000))
    return json(429, { error: 'Too many attempts. Try again in 15 minutes.' }, { 'Retry-After': String(wait) })
  }

  const text = await readText(request, MAX_CONNECT_BODY)
  if (text === null) return json(413, { error: 'The request is too large.' })
  let body: { passphrase?: unknown; deviceName?: unknown }
  try {
    body = JSON.parse(text) as typeof body
  } catch {
    return json(400, { error: 'Send the passphrase as JSON.' })
  }
  if (typeof body !== 'object' || body === null || typeof body.passphrase !== 'string') return json(400, { error: 'Send the passphrase as JSON.' })

  const given = await sha256(normalizePassphrase(body.passphrase))
  if (!crypto.subtle.timingSafeEqual(given, expected)) {
    await env.DB.prepare('INSERT INTO connect_failures (ip, at) VALUES (?, ?)').bind(ip, now).run()
    return json(401, { error: "That passphrase doesn't match." })
  }

  const token = randomToken()
  await env.DB.prepare('INSERT INTO sessions (token_hash, device_name, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    .bind(toHex(await sha256(token)), cleanDeviceName(body.deviceName), now, now)
    .run()
  return empty(204, { 'Set-Cookie': sessionCookie(token) })
}

async function disconnect(_request: Request, env: Env, _now: number, session: Session): Promise<Response> {
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.tokenHash).run()
  return empty(204, { 'Set-Cookie': CLEAR_COOKIE })
}

async function disconnectAll(_request: Request, env: Env): Promise<Response> {
  await env.DB.prepare('DELETE FROM sessions').run()
  return empty(204, { 'Set-Cookie': CLEAR_COOKIE })
}

// ---------------------------------------------------------------------------
// Progress

/** The version in an ETag-style header ("7" or W/"7"), or null. */
function parseVersion(header: string | null): number | null {
  const m = header?.trim().match(/^(?:W\/)?"(\d{1,15})"$/)
  return m ? Number(m[1]) : null
}

type StoredDoc = { version: number; doc: string }

async function current(env: Env): Promise<StoredDoc | null> {
  return env.DB.prepare('SELECT version, doc FROM sync WHERE id = 1').first<StoredDoc>()
}

async function getSync(request: Request, env: Env): Promise<Response> {
  const row = await env.DB.prepare('SELECT version FROM sync WHERE id = 1').first<{ version: number }>()
  if (!row) return empty(204, { ETag: etag(0) })
  const seen = request.headers
    .get('If-None-Match')
    ?.split(',')
    .map((t) => parseVersion(t))
  if (seen?.includes(row.version)) return empty(304, { ETag: etag(row.version) })
  const stored = await current(env)
  if (!stored) return empty(204, { ETag: etag(0) })
  return docResponse(200, stored.doc, { ETag: etag(stored.version) })
}

/** Base64 of gzip data: gzip's first bytes (1f 8b 08) encode as "H4sI". */
const isCompressedProgress = (text: string) => text.length >= 24 && text.length % 4 === 0 && text.startsWith('H4sI') && /^[A-Za-z0-9+/]+={0,2}$/.test(text)

async function putSync(request: Request, env: Env, now: number): Promise<Response> {
  const base = parseVersion(request.headers.get('If-Match'))
  if (base === null) return json(428, { error: 'Send If-Match with the version this device last saw.' })
  // Base64 is ASCII, so the byte limit is also the character limit.
  const body = await readText(request, MAX_DOC_CHARS)
  if (body === null) return json(413, { error: 'The progress is too large to sync.' })
  if (!isCompressedProgress(body)) return json(400, { error: 'The upload is not compressed progress.' })

  // The version check and the save are one statement, so two devices can't both win.
  const saved =
    base === 0
      ? await env.DB.prepare('INSERT INTO sync (id, version, doc, updated_at) VALUES (1, 1, ?1, ?2) ON CONFLICT (id) DO NOTHING RETURNING version').bind(body, now).first<{ version: number }>()
      : await env.DB.prepare('UPDATE sync SET doc = ?1, version = version + 1, updated_at = ?2 WHERE id = 1 AND version = ?3 RETURNING version')
          .bind(body, now, base)
          .first<{ version: number }>()
  if (saved) return json(200, { version: saved.version }, { ETag: etag(saved.version) })

  // Another device saved first: send the current copy to merge with.
  const stored = await current(env)
  if (!stored) return empty(409, { ETag: etag(0) })
  return docResponse(409, stored.doc, { ETag: etag(stored.version) })
}

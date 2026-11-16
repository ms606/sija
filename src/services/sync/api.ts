import { InvalidSyncDocError, parseSyncDoc, type SyncDoc } from './doc'

/*
 * The device side of the sync API (worker/index.ts). Progress travels as base64
 * text of gzip-compressed JSON; the server stores it without opening it, and
 * every device checks what it downloads (parseSyncDoc).
 */

/** The server refuses uploads above this many characters. */
export const MAX_UPLOAD_CHARS = 1_900_000
/**
 * A downloaded copy may unpack to at most this much JSON. Two years of heavy
 * use is about 7 MB; the cap stops a damaged or hostile copy from filling memory.
 */
export const MAX_UNPACKED_BYTES = 40_000_000

/** The device could not reach the server. */
export class OfflineError extends Error {
  constructor() {
    super("You're offline.")
    this.name = 'OfflineError'
  }
}

/** The server no longer knows this device's session (disconnected from another device, or expired). */
export class SignedOutError extends Error {
  constructor() {
    super('This device is no longer connected to sync.')
    this.name = 'SignedOutError'
  }
}

/** Any other answer the device can't use. */
export class SyncServerError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'SyncServerError'
    this.status = status
  }
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init })
  } catch {
    throw new OfflineError()
  }
  if (res.status === 401 && path !== '/api/connect') throw new SignedOutError()
  return res
}

async function errorText(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown }
    if (typeof body.error === 'string') return body.error
  } catch {
    /* not JSON */
  }
  return `The sync server answered ${res.status}. Try again later.`
}

const versionOf = (res: Response): number => Number(res.headers.get('ETag')?.replace(/^W\//, '').replaceAll('"', '') ?? 0) || 0

// ---------------------------------------------------------------------------
// Encoding

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  let binary: string
  try {
    binary = atob(text)
  } catch {
    throw new InvalidSyncDocError('encoding')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function readCapped(stream: ReadableStream<Uint8Array>, max: number): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) {
      await reader.cancel()
      throw new InvalidSyncDocError('size')
    }
    chunks.push(value)
  }
  const all = new Uint8Array(size)
  let at = 0
  for (const c of chunks) {
    all.set(c, at)
    at += c.byteLength
  }
  return all
}

/** The document as it is uploaded: base64 text of gzip-compressed JSON. */
export async function encode(doc: SyncDoc): Promise<string> {
  const stream = new Blob([JSON.stringify(doc)]).stream().pipeThrough(new CompressionStream('gzip'))
  return toBase64(new Uint8Array(await new Response(stream).arrayBuffer()))
}

/** A downloaded document, checked. Throws InvalidSyncDocError or NewerFormatError. */
export async function decode(text: string): Promise<SyncDoc> {
  let json: unknown
  try {
    const stream = new Blob([fromBase64(text)]).stream().pipeThrough(new DecompressionStream('gzip'))
    json = JSON.parse(new TextDecoder().decode(await readCapped(stream, MAX_UNPACKED_BYTES)))
  } catch (e) {
    if (e instanceof InvalidSyncDocError) throw e
    throw new InvalidSyncDocError('compression')
  }
  return parseSyncDoc(json)
}

// ---------------------------------------------------------------------------
// Requests

export type ConnectResult = { ok: true } | { ok: false; message: string }

export async function connect(passphrase: string, deviceName: string): Promise<ConnectResult> {
  let res: Response
  try {
    res = await call('/api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passphrase, deviceName }) })
  } catch (e) {
    if (e instanceof OfflineError) return { ok: false, message: "You're offline. Connect again when you have a connection." }
    throw e
  }
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await errorText(res) }
}

/** Ends this device's session, or every device's. */
export async function disconnect(all: boolean): Promise<void> {
  try {
    const res = await call(all ? '/api/disconnect-all' : '/api/disconnect', { method: 'POST' })
    if (res.status !== 204) throw new SyncServerError(res.status, await errorText(res))
  } catch (e) {
    if (!(e instanceof SignedOutError)) throw e // already disconnected on the server
  }
}

/** The synced copy as the server holds it. */
export interface Remote {
  version: number
  /** Null when nothing is stored yet. */
  doc: SyncDoc | null
}

/** The server's copy, or 'unchanged' when it is still `known`. */
export async function pull(known?: number): Promise<Remote | 'unchanged'> {
  const res = await call('/api/sync', known === undefined ? {} : { headers: { 'If-None-Match': `"${known}"` } })
  if (res.status === 304) return 'unchanged'
  if (res.status === 204) return { version: 0, doc: null }
  if (res.status !== 200) throw new SyncServerError(res.status, await errorText(res))
  return { version: versionOf(res), doc: await decode(await res.text()) }
}

export type PushResult = { saved: true; version: number } | { saved: false; remote: Remote }

/**
 * Saves `text` if the server still has version `base`. Otherwise the server
 * answers with its newer copy, to merge with and try again.
 */
export async function push(text: string, base: number, options: { keepalive?: boolean } = {}): Promise<PushResult> {
  const res = await call('/api/sync', {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'If-Match': `"${base}"` },
    body: text,
    // A request that may outlive the page (sent when the app is hidden) has a 64 KB budget.
    keepalive: options.keepalive === true && text.length < 60_000,
  })
  if (res.status === 200) return { saved: true, version: versionOf(res) }
  if (res.status === 409) {
    const body = await res.text()
    return { saved: false, remote: { version: versionOf(res), doc: body ? await decode(body) : null } }
  }
  throw new SyncServerError(res.status, await errorText(res))
}

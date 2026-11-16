import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'
import { passphraseHash } from '../passphrase'

/*
 * The real Worker, bundled the way Wrangler bundles it, running in Miniflare
 * (the local Workers runtime that `wrangler dev` uses) with a local D1 database
 * created from the real migration.
 */

export const ORIGIN = 'https://sija.example'
export const PHRASE = 'velvet harbor quiet plume ginger oak'

async function workerScript(): Promise<string> {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../index.ts', import.meta.url))],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2023',
    write: false,
  })
  return result.outputFiles[0]!.text
}

/** The migration's statements, one by one. */
function migration(): string[] {
  const sql = readFileSync(new URL('../migrations/0001_sync.sql', import.meta.url), 'utf8')
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

export type Db = Awaited<ReturnType<Miniflare['getD1Database']>>

/** Starts the Worker with these bindings; by default the test passphrase is set. */
export async function startWorker(bindings?: Record<string, string>): Promise<{ mf: Miniflare; db: Db }> {
  const vars = bindings ?? { SYNC_PASSPHRASE_HASH: await passphraseHash(PHRASE) }
  // Miniflare 5 (what Wrangler 4.156 ships) converts the long-standing v4 option shape itself.
  const options = convertV4MiniflareOptions({ modules: true, script: await workerScript(), compatibilityDate: '2026-10-06', d1Databases: ['DB'], bindings: vars })
  const mf = new Miniflare(options)
  const db = await mf.getD1Database('DB')
  await db.batch(migration().map((s) => db.prepare(s)))
  return { mf, db }
}

export async function clearTables(db: Db): Promise<void> {
  await db.batch(['sync', 'sessions', 'connect_failures'].map((t) => db.prepare(`DELETE FROM ${t}`)))
}

export interface Call {
  method?: string
  body?: string | object
  cookie?: string
  /** The Origin header; null leaves it out. Defaults to Sija's own origin for changes. */
  origin?: string | null
  ip?: string
  headers?: Record<string, string>
}

/** A request to the Worker, as a browser on Sija's own pages would send it. */
export function send(worker: Miniflare, path: string, call: Call = {}) {
  const method = call.method ?? 'GET'
  const headers: Record<string, string> = { ...call.headers }
  if (method !== 'GET' && call.origin !== null) headers.Origin = call.origin ?? ORIGIN
  if (call.cookie) headers.Cookie = call.cookie
  if (call.ip) headers['CF-Connecting-IP'] = call.ip
  let body = call.body
  if (body !== undefined && typeof body === 'object') {
    body = JSON.stringify(body)
    headers['Content-Type'] = 'application/json'
  }
  return worker.dispatchFetch(`${ORIGIN}${path}`, { method, headers, ...(body !== undefined ? { body } : {}) })
}

import { randomBytes } from 'node:crypto'
import { gunzipSync, gzipSync } from 'node:zlib'
import type { Miniflare } from 'miniflare'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { parseSyncDoc } from '../../src/services/sync/doc'
import { startDoc } from '../../src/services/sync/merge'
import { EMPTY_PROGRESS } from '../../src/stores/progress'
import { sha256, toHex } from '../passphrase'
import { clearTables, ORIGIN, PHRASE, send, startWorker, type Call, type Db } from './harness'

const DAY = 24 * 60 * 60 * 1000
const MINUTE = 60 * 1000

let mf: Miniflare
let db: Db

beforeAll(async () => {
  ;({ mf, db } = await startWorker())
}, 120_000)

afterAll(async () => {
  await mf?.dispose()
})

beforeEach(async () => {
  await clearTables(db)
})

const api = (path: string, call: Call = {}, worker: Miniflare = mf) => send(worker, path, call)

const connectWith = (passphrase: string, ip = '203.0.113.1', deviceName = 'iPhone · Safari') => api('/api/connect', { method: 'POST', body: { passphrase, deviceName }, ip })

/** Connects a device and returns its cookie ("name=value"). */
async function connected(deviceName = 'iPhone · Safari', ip = '203.0.113.1'): Promise<string> {
  const res = await connectWith(PHRASE, ip, deviceName)
  expect(res.status).toBe(204)
  return res.headers.get('set-cookie')!.split(';')[0]!
}

const upload = (cookie: string, data: string, version: number | null) =>
  api('/api/sync', { method: 'PUT', cookie, body: data, headers: version === null ? {} : { 'If-Match': `"${version}"` } })

/** Progress as a device sends it: base64 text of gzip-compressed JSON. */
const gz = (value: unknown) => gzipSync(JSON.stringify(value)).toString('base64')
const textOf = (res: { text(): Promise<string> }) => res.text()

// ---------------------------------------------------------------------------

describe('connecting', () => {
  it('connects with the passphrase however it was pasted, and sets a locked-down cookie', async () => {
    for (const pasted of [PHRASE, '  Velvet-Harbor  quiet\nplume ginger oak\n', 'VELVET HARBOR QUIET PLUME GINGER OAK']) {
      const res = await connectWith(pasted)
      expect(res.status).toBe(204)
      expect(res.headers.get('set-cookie')).toMatch(/^__Host-sija_session=[A-Za-z0-9_-]{43}; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=34560000$/)
    }
  })

  it('stores only a hash of the session cookie, and nothing of the passphrase', async () => {
    const cookie = await connected('Pixel · Chrome')
    const token = cookie.split('=')[1]!
    const rows = await db.prepare('SELECT * FROM sessions').all<Record<string, unknown>>()
    expect(rows.results).toHaveLength(1)
    expect(rows.results[0]).toMatchObject({ token_hash: toHex(await sha256(token)), device_name: 'Pixel · Chrome' })
    const everything = JSON.stringify(rows.results)
    expect(everything).not.toContain(token)
    expect(everything).not.toContain('velvet')
  })

  it("refuses a wrong passphrase with a clear message and notes the network's failure", async () => {
    const res = await connectWith('velvet harbor quiet plume ginger elm', '198.51.100.7')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "That passphrase doesn't match." })
    expect(res.headers.get('set-cookie')).toBeNull()
    const fails = await db.prepare('SELECT ip FROM connect_failures').all()
    expect(fails.results).toEqual([{ ip: '198.51.100.7' }])
  })

  it('makes a network wait after 10 wrong tries, while connected devices keep syncing', async () => {
    const phone = await connected('iPhone · Safari', '203.0.113.1')
    for (let i = 0; i < 10; i++) expect((await connectWith('wrong guess', '198.51.100.7')).status).toBe(401)

    const blocked = await connectWith('wrong guess', '198.51.100.7')
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ error: 'Too many attempts. Try again in 15 minutes.' })
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(Number(blocked.headers.get('retry-after'))).toBeLessThanOrEqual(15 * 60)
    expect((await connectWith(PHRASE, '198.51.100.7')).status).toBe(429) // even the right phrase, from that network

    expect((await connectWith(PHRASE, '192.0.2.44')).status).toBe(204) // another network
    expect((await api('/api/sync', { cookie: phone })).status).toBe(204)
  })

  it('lets a network try again once its failures are 15 minutes old', async () => {
    const old = Date.now() - 16 * MINUTE
    await db.batch(Array.from({ length: 10 }, () => db.prepare('INSERT INTO connect_failures (ip, at) VALUES (?, ?)').bind('198.51.100.7', old)))
    expect((await connectWith(PHRASE, '198.51.100.7')).status).toBe(204)
    expect((await db.prepare('SELECT COUNT(*) AS n FROM connect_failures').first<{ n: number }>())?.n).toBe(0)
  })

  it('rejects connect requests that are not a passphrase in JSON', async () => {
    expect((await api('/api/connect', { method: 'POST', body: 'not json' })).status).toBe(400)
    expect((await api('/api/connect', { method: 'POST', body: { passphrase: 5 } })).status).toBe(400)
    expect((await api('/api/connect', { method: 'POST', body: { passphrase: 'x'.repeat(5000) } })).status).toBe(413)
  })

  it('stops reading a large streamed body that declares no length', async () => {
    let sent = 0
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 64_000
        if (sent > 50_000_000) controller.close()
        else controller.enqueue(new Uint8Array(64_000).fill(0x61))
      },
    })
    const res = await mf.dispatchFetch(`${ORIGIN}/api/connect`, { method: 'POST', headers: { Origin: ORIGIN }, body: endless, duplex: 'half' })
    expect(res.status).toBe(413)
    expect(sent).toBeLessThan(5_000_000) // it gave up long before the 50 MB were sent
  })

  it('answers 503 when the server has no passphrase set', async () => {
    const bare = await startWorker({})
    try {
      const res = await api('/api/connect', { method: 'POST', body: { passphrase: PHRASE } }, bare.mf)
      expect(res.status).toBe(503)
      expect(await res.json()).toEqual({ error: "Sync isn't set up on the server yet." })
    } finally {
      await bare.mf.dispose()
    }
  }, 120_000)
})

describe('requests', () => {
  it('refuses changes that do not come from Sija itself', async () => {
    const phone = await connected()
    expect((await api('/api/connect', { method: 'POST', body: { passphrase: PHRASE }, origin: 'https://evil.example' })).status).toBe(403)
    expect((await api('/api/connect', { method: 'POST', body: { passphrase: PHRASE }, origin: null })).status).toBe(403)
    expect((await api('/api/sync', { method: 'PUT', cookie: phone, body: gz({}), origin: 'https://evil.example', headers: { 'If-Match': '"0"' } })).status).toBe(403)
    expect((await api('/api/disconnect-all', { method: 'POST', cookie: phone, origin: 'https://evil.example' })).status).toBe(403)
    expect((await api('/api/sync', { cookie: phone })).status).toBe(204) // still connected
  })

  it('answers unknown paths and methods', async () => {
    expect((await api('/api/nope')).status).toBe(404)
    const wrong = await api('/api/sync', { method: 'DELETE' })
    expect(wrong.status).toBe(405)
    expect(wrong.headers.get('allow')).toBe('GET, PUT')
    expect((await api('/api/connect')).status).toBe(405)
  })

  it('marks every answer as not to be cached', async () => {
    const phone = await connected()
    for (const res of [await api('/api/sync', { cookie: phone }), await api('/api/sync'), await api('/api/nope'), await connectWith('wrong')]) {
      expect(res.headers.get('cache-control')).toBe('no-store')
      expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    }
  })

  it('refuses a device without a session, and clears a cookie that no longer works', async () => {
    const none = await api('/api/sync')
    expect(none.status).toBe(401)
    expect(await none.json()).toEqual({ error: 'This device is not connected to sync.' })
    expect(none.headers.get('set-cookie')).toBeNull()

    const stale = await api('/api/sync', { cookie: `__Host-sija_session=${'A'.repeat(43)}` })
    expect(stale.status).toBe(401)
    expect(stale.headers.get('set-cookie')).toMatch(/^__Host-sija_session=; .*Max-Age=0$/)
  })
})

describe('sessions', () => {
  it('disconnects only this device', async () => {
    const phone = await connected('iPhone · Safari')
    const laptop = await connected('Mac · Chrome')
    const res = await api('/api/disconnect', { method: 'POST', cookie: phone })
    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0$/)
    expect((await api('/api/sync', { cookie: phone })).status).toBe(401)
    expect((await api('/api/sync', { cookie: laptop })).status).toBe(204)
  })

  it('disconnects every device at once', async () => {
    const phone = await connected('iPhone · Safari')
    const laptop = await connected('Mac · Chrome')
    expect((await api('/api/disconnect-all', { method: 'POST', cookie: laptop })).status).toBe(204)
    expect((await api('/api/sync', { cookie: phone })).status).toBe(401)
    expect((await api('/api/sync', { cookie: laptop })).status).toBe(401)
    expect((await db.prepare('SELECT COUNT(*) AS n FROM sessions').first<{ n: number }>())?.n).toBe(0)
  })

  it('renews a session in use at most once a day', async () => {
    const phone = await connected()
    expect((await api('/api/sync', { cookie: phone })).headers.get('set-cookie')).toBeNull() // used today already

    await db.prepare('UPDATE sessions SET last_seen_at = ?').bind(Date.now() - 2 * DAY).run()
    const renewed = await api('/api/sync', { cookie: phone })
    expect(renewed.status).toBe(204)
    expect(renewed.headers.get('set-cookie')).toBe(`${phone}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=34560000`)
    const seen = await db.prepare('SELECT last_seen_at FROM sessions').first<{ last_seen_at: number }>()
    expect(Date.now() - seen!.last_seen_at).toBeLessThan(MINUTE)
    expect((await api('/api/sync', { cookie: phone })).headers.get('set-cookie')).toBeNull()
  })

  it('ends a session that went unused for 400 days', async () => {
    const phone = await connected()
    await db.prepare('UPDATE sessions SET last_seen_at = ?').bind(Date.now() - 401 * DAY).run()
    expect((await api('/api/sync', { cookie: phone })).status).toBe(401)
    expect((await db.prepare('SELECT COUNT(*) AS n FROM sessions').first<{ n: number }>())?.n).toBe(0)
  })
})

describe('progress', () => {
  it('starts with nothing stored', async () => {
    const phone = await connected()
    const res = await api('/api/sync', { cookie: phone })
    expect(res.status).toBe(204)
    expect(res.headers.get('etag')).toBe('"0"')
  })

  it('saves the first copy and gives it back byte for byte', async () => {
    const phone = await connected()
    const data = gz({ hello: 'talo' })
    const saved = await upload(phone, data, 0)
    expect(saved.status).toBe(200)
    expect(saved.headers.get('etag')).toBe('"1"')
    expect(await saved.json()).toEqual({ version: 1 })

    const got = await api('/api/sync', { cookie: phone })
    expect(got.status).toBe(200)
    expect(got.headers.get('etag')).toBe('"1"')
    expect(got.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(await textOf(got)).toEqual(data)
  })

  it('answers 304 when the device already has the latest version', async () => {
    const phone = await connected()
    await upload(phone, gz({ v: 1 }), 0)
    expect((await api('/api/sync', { cookie: phone, headers: { 'If-None-Match': '"1"' } })).status).toBe(304)
    expect((await api('/api/sync', { cookie: phone, headers: { 'If-None-Match': 'W/"1"' } })).status).toBe(304)
    expect((await api('/api/sync', { cookie: phone, headers: { 'If-None-Match': '"0"' } })).status).toBe(200)
  })

  it('saves only on top of the current version, and hands back the newer copy otherwise', async () => {
    const phone = await connected('iPhone · Safari')
    const laptop = await connected('Mac · Chrome')
    const first = gz({ from: 'phone' })
    expect((await upload(phone, first, 0)).status).toBe(200)

    const late = await upload(laptop, gz({ from: 'laptop' }), 0) // the laptop still thinks nothing is stored
    expect(late.status).toBe(409)
    expect(late.headers.get('etag')).toBe('"1"')
    expect(await textOf(late)).toEqual(first)

    const merged = gz({ from: 'both' })
    expect((await upload(laptop, merged, 1)).status).toBe(200)
    const stale = await upload(phone, gz({ from: 'phone again' }), 1)
    expect(stale.status).toBe(409)
    expect(stale.headers.get('etag')).toBe('"2"')
    expect(await textOf(stale)).toEqual(merged)
  })

  it('lets only one of two simultaneous saves win', async () => {
    const phone = await connected('iPhone · Safari')
    const laptop = await connected('Mac · Chrome')
    await upload(phone, gz({ v: 1 }), 0)
    const results = await Promise.all([upload(phone, gz({ from: 'phone' }), 1), upload(laptop, gz({ from: 'laptop' }), 1)])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect((await db.prepare('SELECT version FROM sync').first<{ version: number }>())?.version).toBe(2)
  })

  it('refuses uploads without a version, that are not compressed progress, or over the size limit', async () => {
    const phone = await connected()
    expect((await upload(phone, gz({}), null)).status).toBe(428)
    const plain = await upload(phone, JSON.stringify({ xp: 1, padding: 'x'.repeat(40) }), 0)
    expect(plain.status).toBe(400)
    expect(await plain.json()).toEqual({ error: 'The upload is not compressed progress.' })
    expect((await upload(phone, `H4sI${'!'.repeat(40)}`, 0)).status).toBe(400) // not base64
    expect((await upload(phone, gzipSync('{}').toString('hex'), 0)).status).toBe(400) // compressed, wrong encoding

    const tooBig = await upload(phone, `H4sI${'A'.repeat(1_900_000)}`, 0)
    expect(tooBig.status).toBe(413)
    expect(await tooBig.json()).toEqual({ error: 'The progress is too large to sync.' })
    expect((await api('/api/sync', { cookie: phone })).status).toBe(204) // nothing was stored
  })

  it('stores progress near the size limit (about 1.4 MB compressed)', async () => {
    const phone = await connected()
    const data = gzipSync(randomBytes(1_400_000)).toString('base64') // random bytes don't compress
    expect(data.length).toBeGreaterThan(1_850_000)
    expect((await upload(phone, data, 0)).status).toBe(200)
    expect(await textOf(await api('/api/sync', { cookie: phone }))).toBe(data)
  })

  it("carries a real synced copy from one device to another, readable by the other device's check", async () => {
    const progress = {
      ...EMPTY_PROGRESS,
      xp: 3450,
      totalAttempts: 400,
      daily: { '2026-11-16': { items: 22, correct: 20, xp: 225, goalMet: true } },
      streak: { current: 1, best: 4, lastDay: '2026-11-16' },
    }
    const doc = startDoc(progress, 'epoch-1')
    const phone = await connected('iPhone · Safari')
    const laptop = await connected('Mac · Chrome')
    expect((await upload(phone, gz(doc), 0)).status).toBe(200)

    const got = await api('/api/sync', { cookie: laptop })
    const read = parseSyncDoc(JSON.parse(gunzipSync(Buffer.from(await textOf(got), 'base64')).toString('utf8')))
    expect(read).toEqual(doc)
  })
})

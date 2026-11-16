import { gunzipSync, gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ALL_SLOTS } from '../../grammar'
import { EMPTY_PROGRESS, type ProgressData } from '../../stores/progress'
import { connect, decode, disconnect, encode, OfflineError, pull, push, SignedOutError, SyncServerError } from '../sync/api'
import { InvalidSyncDocError, NewerFormatError } from '../sync/doc'
import { deviceName, encodeForUpload, hasProgress, summarize } from '../sync/engine'
import { assemble, startDoc } from '../sync/merge'
import { answer, D1, run, withXp } from './sync-helpers'

const doc = () => startDoc(run(answer(withXp(3450), 20, { day: D1, hour: 9 }), (s) => s.completeLesson('1.1', 90)), 'epoch-1')

describe('sync encoding', () => {
  it('round-trips a document, in the gzip + base64 form the Worker accepts', async () => {
    const d = doc()
    const text = await encode(d)
    expect(text.startsWith('H4sI')).toBe(true) // gzip, as the Worker checks
    expect(text).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(JSON.parse(gunzipSync(Buffer.from(text, 'base64')).toString('utf8'))).toEqual(d) // what Node (and the other tests) read
    expect(await decode(text)).toEqual(d)
  })

  it('reads what Node compressed, so devices and tools agree', async () => {
    const d = doc()
    expect(await decode(gzipSync(JSON.stringify(d)).toString('base64'))).toEqual(d)
  })

  it('refuses damaged downloads with the error the app explains', async () => {
    await expect(decode('not base64!')).rejects.toBeInstanceOf(InvalidSyncDocError)
    await expect(decode(Buffer.from('plain text, not gzip').toString('base64'))).rejects.toBeInstanceOf(InvalidSyncDocError)
    await expect(decode(gzipSync('{"format":"sija-sync"').toString('base64'))).rejects.toBeInstanceOf(InvalidSyncDocError) // cut-off JSON
    await expect(decode(gzipSync(JSON.stringify({ ...doc(), formatVersion: 2 })).toString('base64'))).rejects.toBeInstanceOf(NewerFormatError)
  })

  it('stops unpacking a download that would fill memory', async () => {
    const bomb = gzipSync(Buffer.alloc(50_000_000, 32)).toString('base64') // 50 MB of spaces, a few KB packed
    expect(bomb.length).toBeLessThan(200_000)
    await expect(decode(bomb)).rejects.toMatchObject({ name: 'InvalidSyncDocError', path: 'size' })
  })
})

describe('sync requests', () => {
  afterEach(() => vi.unstubAllGlobals())

  function serve(...responses: Response[]) {
    const calls: { url: string; init: RequestInit }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url, init })
        return responses.shift() ?? new Response(null, { status: 500 })
      }),
    )
    return calls
  }

  it('asks for the copy only if it changed since the version this device has', async () => {
    const d = doc()
    const text = await encode(d)
    const calls = serve(new Response(null, { status: 304 }), new Response(text, { status: 200, headers: { ETag: '"8"' } }), new Response(null, { status: 204, headers: { ETag: '"0"' } }))
    expect(await pull(7)).toBe('unchanged')
    expect(new Headers(calls[0]!.init.headers).get('If-None-Match')).toBe('"7"')
    expect(await pull()).toEqual({ version: 8, doc: d })
    expect(new Headers(calls[1]!.init.headers).get('If-None-Match')).toBeNull()
    expect(await pull()).toEqual({ version: 0, doc: null })
    expect(calls.every((c) => c.init.credentials === 'same-origin' && c.init.cache === 'no-store')).toBe(true)
  })

  it('saves on top of a version, and hands back the newer copy when another device saved first', async () => {
    const d = doc()
    const theirs = await encode(d)
    const calls = serve(new Response('{"version":5}', { status: 200, headers: { ETag: '"5"' } }), new Response(theirs, { status: 409, headers: { ETag: '"6"' } }))
    expect(await push('H4sIAAAA', 4)).toEqual({ saved: true, version: 5 })
    const put = calls[0]!.init
    expect(put.method).toBe('PUT')
    expect(new Headers(put.headers).get('If-Match')).toBe('"4"')
    expect(put.keepalive).toBe(false)
    expect(await push('H4sIAAAA', 4, { keepalive: true })).toEqual({ saved: false, remote: { version: 6, doc: d } })
    expect(calls[1]!.init.keepalive).toBe(true) // small enough to outlive a closing page
  })

  it('sends a large upload without keepalive, which allows only 64 KB', async () => {
    const calls = serve(new Response('{"version":1}', { status: 200, headers: { ETag: '"1"' } }))
    await push(`H4sI${'A'.repeat(70_000)}`, 0, { keepalive: true })
    expect(calls[0]!.init.keepalive).toBe(false)
  })

  it('turns failures into errors the engine handles', async () => {
    serve(new Response(null, { status: 401 }), new Response('{"error":"The progress is too large to sync."}', { status: 413 }))
    await expect(pull()).rejects.toBeInstanceOf(SignedOutError)
    await expect(push('H4sI', 1)).rejects.toMatchObject({ name: 'SyncServerError', status: 413, message: 'The progress is too large to sync.' })
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(pull()).rejects.toBeInstanceOf(OfflineError)
    expect(SyncServerError).toBeDefined()
  })

  it("reports the server's words when connecting fails, and treats an ended session as disconnected", async () => {
    serve(new Response(null, { status: 204 }), new Response('{"error":"That passphrase doesn\'t match."}', { status: 401 }), new Response(null, { status: 401 }))
    expect(await connect('velvet harbor', 'iPhone · Safari')).toEqual({ ok: true })
    expect(await connect('wrong', 'iPhone · Safari')).toEqual({ ok: false, message: "That passphrase doesn't match." })
    await expect(disconnect(false)).resolves.toBeUndefined() // already gone on the server
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))
    expect(await connect('x', 'y')).toEqual({ ok: false, message: "You're offline. Connect again when you have a connection." })
  })
})

describe('sync engine helpers', () => {
  it('names devices from their browser', () => {
    expect(deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe('iPhone · Safari')
    expect(deviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36')).toBe('Mac · Chrome')
    expect(deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0')).toBe('Windows · Edge')
    expect(deviceName('Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36')).toBe('Android · Chrome')
  })

  it('asks before replacing a device only when it has done something', () => {
    expect(hasProgress(EMPTY_PROGRESS)).toBe(false)
    expect(hasProgress(withXp(10))).toBe(true)
    expect(hasProgress({ ...EMPTY_PROGRESS, daily: { [D1]: { items: 0, correct: 0, xp: 0, activeMs: 60_000 } } })).toBe(true)
    expect(summarize(run(answer(withXp(100), 3, { day: D1, hour: 9 }), (s) => s.completeLesson('1.1', 90)))).toEqual({ xp: 180, exercises: 3, lessonsDone: 1, lastDay: D1 })
  })
})

describe('sync upload size', () => {
  it('drops the oldest review answers from an upload that nears the limit, and nothing else', async () => {
    // About three years of heavy use: 13,000 review cards with 12 answers each.
    const reviews: ProgressData['reviews'] = {}
    for (let i = 0; i < 13_000; i++) {
      const key = `form:w${i}:${ALL_SLOTS[i % ALL_SLOTS.length]}`
      reviews[key] = {
        key,
        kind: 'form',
        target: { lexemeId: `w${i}`, slot: ALL_SLOTS[i % ALL_SLOTS.length]! },
        ease: 2.3 + (i % 5) / 10,
        intervalDays: i % 40,
        due: 1_790_000_000_000 + i * 86_400_000,
        reps: i % 9,
        lapses: i % 3,
        lastReviewed: 1_790_000_000_000 + i * 1000,
        history: Array.from({ length: 12 }, (_, h) => ({ at: 1_780_000_000_000 + i * 100_000 + h * 7_000_000, correct: (i + h) % 4 !== 0, ms: 2000 + ((i * 37 + h * 101) % 9000) })),
      }
    }
    const big = startDoc({ ...withXp(123_456), reviews }, 'e')
    expect((await encode(big)).length).toBeGreaterThan(1_500_000)

    const text = await encodeForUpload(big)
    expect(text.length).toBeLessThanOrEqual(1_500_000)
    const sent = await decode(text)
    expect(Object.keys(sent.reviews)).toHaveLength(13_000)
    const card = Object.keys(reviews)[42]!
    expect(sent.reviews[card]!.history).toEqual(big.reviews[card]!.history.slice(-6)) // the newest answers stay
    expect({ ...sent, reviews: {} }).toEqual({ ...big, reviews: {} })
    expect(assemble(sent).xp).toBe(123_456)
  }, 60_000)

  it('sends an ordinary upload untouched', async () => {
    const d = doc()
    expect(await decode(await encodeForUpload(d))).toEqual(d)
  })
})

import { gunzipSync, gzipSync } from 'node:zlib'
import type { Miniflare } from 'miniflare'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { answer, D1, GOAL, run, typed, withXp } from '../../src/services/__tests__/sync-helpers'
import { parseSyncDoc, type DeviceSync, type SyncDoc } from '../../src/services/sync/doc'
import { adopt, mergeLocal, settle, startDoc, type MergeOptions } from '../../src/services/sync/merge'
import { EMPTY_PROGRESS, type ProgressData } from '../../src/stores/progress'
import { clearTables, PHRASE, send, startWorker, type Db } from './harness'

// Steps 1 and 2 together: devices change progress through the real store,
// merge with the real rules and sync through the real Worker and D1. The small
// client below does what the app's sync engine (step 3) will do.

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

const encode = (doc: SyncDoc) => gzipSync(JSON.stringify(doc)).toString('base64')
const decode = (text: string) => parseSyncDoc(JSON.parse(gunzipSync(Buffer.from(text, 'base64')).toString('utf8')))
const versionOf = (res: { headers: { get(name: string): string | null } }) => Number(res.headers.get('etag')!.replaceAll('"', ''))

interface Remote {
  version: number
  doc: SyncDoc | null
}

let epochs = 0

class Device {
  readonly id: string
  local: ProgressData
  sync: DeviceSync | null = null
  cookie = ''

  constructor(id: string, local: ProgressData = EMPTY_PROGRESS) {
    this.id = id
    this.local = local
  }

  answer(n: number, hour: number, ok = true) {
    this.local = answer(this.local, n, { day: D1, hour, ok })
  }

  async connect() {
    const res = await send(mf, '/api/connect', { method: 'POST', body: { passphrase: PHRASE, deviceName: this.id } })
    expect(res.status).toBe(204)
    this.cookie = res.headers.get('set-cookie')!.split(';')[0]!
  }

  async pull(): Promise<Remote> {
    const res = await send(mf, '/api/sync', { cookie: this.cookie })
    if (res.status === 204) return { version: 0, doc: null }
    expect(res.status).toBe(200)
    return { version: versionOf(res), doc: decode(await res.text()) }
  }

  put(doc: SyncDoc, base: number) {
    return send(mf, '/api/sync', { method: 'PUT', cookie: this.cookie, body: encode(doc), headers: { 'If-Match': `"${base}"` } })
  }

  private take(doc: SyncDoc, version: number) {
    const { sync, progress } = adopt(doc, this.id, version)
    this.sync = sync
    this.local = progress
  }

  /** Replaces the synced progress with this device's (first upload, reset, import). Returns the status. */
  async replace(base: number): Promise<number> {
    const doc = startDoc(this.local, `epoch-${++epochs}`)
    const res = await this.put(doc, base)
    if (res.status === 200) this.take(doc, versionOf(res))
    return res.status
  }

  /** First sync after connecting, keeping the synced progress when there is some. */
  async join() {
    const remote = await this.pull()
    if (remote.doc) this.take(remote.doc, remote.version)
    else expect(await this.replace(0)).toBe(200)
  }

  /** One sync: merge, save on top of the version seen, and on 409 merge the newer copy and retry. Returns the attempts used. */
  async push(stale?: Remote, options: Partial<MergeOptions> = {}): Promise<number> {
    let remote = stale ?? (await this.pull())
    const opts = { dailyGoal: GOAL, now: Date.now(), ...options }
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (!remote.doc || remote.doc.epoch !== this.sync!.epoch) {
        this.take(remote.doc!, remote.version) // another device replaced the progress
        return attempt
      }
      const sent = this.local
      const result = mergeLocal(remote.doc, this.sync!, sent, opts)
      const res = await this.put(result.doc, remote.version)
      if (res.status === 200) {
        const settled = settle(result, versionOf(res), sent, this.local, opts)
        this.sync = settled.sync
        this.local = settled.progress
        return attempt
      }
      expect(res.status).toBe(409)
      remote = { version: versionOf(res), doc: decode(await res.text()) }
    }
    throw new Error('gave up after 3 attempts')
  }
}

/** A phone that started the synced progress from `start`, and a laptop that took it over. */
async function pair(start: ProgressData = EMPTY_PROGRESS, laptopOwn: ProgressData = EMPTY_PROGRESS) {
  const phone = new Device('phone', start)
  const laptop = new Device('laptop', laptopOwn)
  await phone.connect()
  await phone.join()
  await laptop.connect()
  await laptop.join()
  return { phone, laptop }
}

// ---------------------------------------------------------------------------

describe('syncing through the Worker', () => {
  it("starts from the phone's progress and replaces the laptop's own", async () => {
    let start = answer(withXp(3450), 20, { day: D1, hour: 7 })
    start = run(start, (s) => s.completeLesson('1.1', 90))
    const laptopOwn = answer(EMPTY_PROGRESS, 3, { day: D1, hour: 6 })
    const { phone, laptop } = await pair(start, laptopOwn)
    expect(phone.local).toEqual(typed(start))
    expect(laptop.local).toEqual(typed(start))
  })

  it('adds up practice from both devices, including a save that had to merge and retry', async () => {
    const { phone, laptop } = await pair(withXp(3450))
    phone.answer(5, 8)
    laptop.answer(3, 20)
    const seenByPhone = await phone.pull() // the phone reads version 1
    expect(await laptop.push()).toBe(1) // the laptop saves version 2
    expect(await phone.push(seenByPhone)).toBe(2) // refused with 409, merged, saved version 3
    await laptop.push()
    for (const d of [phone, laptop]) {
      expect(d.local.xp).toBe(3530)
      expect(d.local.totalAttempts).toBe(8)
      expect(d.local.daily[D1]).toEqual({ items: 8, correct: 8, xp: 80 })
    }
    expect(laptop.local).toEqual(phone.local)
  })

  it('counts a save once when the server kept it but the reply was lost', async () => {
    const { phone, laptop } = await pair(withXp(3450))
    phone.answer(5, 8)
    const remote = await phone.pull()
    const lost = mergeLocal(remote.doc!, phone.sync!, phone.local, { dailyGoal: GOAL, now: Date.now() })
    expect((await phone.put(lost.doc, remote.version)).status).toBe(200) // saved; the phone never hears back
    phone.answer(2, 9)
    await phone.push()
    await laptop.push()
    expect(phone.local.xp).toBe(3520)
    expect(laptop.local.xp).toBe(3520)
  })

  it('keeps both devices when they save at the same moment', async () => {
    const { phone, laptop } = await pair()
    phone.answer(12, 8)
    laptop.answer(10, 20)
    const attempts = await Promise.all([phone.push(), laptop.push()])
    await phone.push()
    await laptop.push()
    expect(attempts).toEqual(expect.arrayContaining([1]))
    for (const d of [phone, laptop]) {
      expect(d.local.daily[D1]).toEqual({ items: 22, correct: 22, xp: 245, goalMet: true }) // the goal reached together counts once
      expect(d.local.xp).toBe(245)
    }
  })

  it('starts every device over after a reset, dropping changes not yet synced', async () => {
    const { phone, laptop } = await pair(withXp(3450))
    laptop.answer(3, 20) // not synced yet
    phone.local = EMPTY_PROGRESS
    expect(await phone.replace(phone.sync!.version)).toBe(200)
    await laptop.push()
    expect(laptop.local).toEqual(EMPTY_PROGRESS)
    expect(laptop.sync!.epoch).toBe(phone.sync!.epoch)
  })

  it('lets only one of two first connections start the synced progress; the other takes it over', async () => {
    const phone = new Device('phone', withXp(100))
    const laptop = new Device('laptop', withXp(7))
    await phone.connect()
    await laptop.connect()
    const statuses = await Promise.all([phone.replace(0), laptop.replace(0)])
    expect([...statuses].sort()).toEqual([200, 409])
    const loser = statuses[0] === 409 ? phone : laptop
    const winner = loser === phone ? laptop : phone
    await loser.join() // the app asks; "use synced progress"
    expect(loser.local).toEqual(winner.local)
  })
})

import { describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, type ProgressData } from '../../stores/progress'
import { parseBackup } from '../storage/backup'
import type { DeviceSync, SyncDoc } from '../sync/doc'
import { adopt, assemble, diffTally, mergeDocs, mergeLocal, settle, startDoc, trimHistories, type MergeOptions } from '../sync/merge'
import { answer, D0, D1, D2, GOAL, NOW, run, t, transport, typed, withXp } from './sync-helpers'

interface Device {
  id: string
  sync: DeviceSync
  local: ProgressData
}

/** A server with one synced document and a version number; every upload succeeds. */
class Cloud {
  doc!: SyncDoc
  version = 0

  connectFirst(id: string, local: ProgressData, epoch = 'epoch-1'): Device {
    this.doc = transport(startDoc(local, epoch))
    this.version += 1
    return this.connect(id)
  }

  connect(id: string): Device {
    const { sync, progress } = adopt(this.doc, id, this.version)
    return { id, sync, local: progress }
  }

  sync(d: Device, options: Partial<MergeOptions> = {}): void {
    const result = mergeLocal(this.doc, d.sync, d.local, { dailyGoal: GOAL, now: NOW, ...options })
    this.doc = transport(result.doc)
    this.version += 1
    d.sync = { ...result.sync, version: this.version }
    d.local = result.progress
  }
}

/** A phone that connected first with `start`, and a laptop that took over the synced progress. */
function pair(start: ProgressData = EMPTY_PROGRESS) {
  const cloud = new Cloud()
  const phone = cloud.connectFirst('phone', start)
  const laptop = cloud.connect('laptop')
  return { cloud, phone, laptop }
}

// ---------------------------------------------------------------------------

describe('sync: starting point', () => {
  it('gives back exactly the progress it started from', () => {
    let p = answer(EMPTY_PROGRESS, 20, { day: D1, hour: 9 }) // reaches the daily goal
    p = answer(p, 3, { day: D1, hour: 10, ok: false, word: 'kauppa', skill: 'partitive' })
    p = answer(p, 5, { day: D2, hour: 9 })
    p = run(p, (s) => {
      s.startLesson('1.2')
      s.completeLesson('1.1', 0.9)
      s.finishSession({ correct: 5, total: 5 })
      s.addActiveTime({ [D1]: 600_000, [D2]: 120_000 })
    })
    expect(p.daily[D1]?.goalMet).toBe(true)
    expect(assemble(startDoc(p, 'e'))).toEqual(typed(p))
    expect(assemble(transport(startDoc(p, 'e')))).toEqual(typed(p))
  })

  it('shows the same progress on the device that adopts it', () => {
    const start = answer(withXp(3450), 20, { day: D1, hour: 9 })
    const { phone, laptop } = pair(start)
    expect(phone.local).toEqual(typed(start))
    expect(laptop.local).toEqual(typed(start))
  })
})

describe('sync: counters', () => {
  it('adds up practice done offline on both devices, in either order', () => {
    for (const order of [['phone', 'laptop'], ['laptop', 'phone']] as const) {
      const { cloud, ...devices } = pair(withXp(3450))
      devices.phone.local = answer(devices.phone.local, 5, { day: D1, hour: 8 })
      devices.laptop.local = answer(devices.laptop.local, 3, { day: D1, hour: 20 })
      for (const id of [...order, ...order]) cloud.sync(devices[id])

      for (const d of [devices.phone, devices.laptop]) {
        expect(d.local.xp).toBe(3530)
        expect(d.local.totalAttempts).toBe(8)
        expect(d.local.daily[D1]).toEqual({ items: 8, correct: 8, xp: 80 })
        expect(d.local.skills['case:genitive']).toMatchObject({ attempts: 8, correct: 8 })
      }
      expect(devices.laptop.local).toEqual(devices.phone.local)
    }
  })

  it('counts an upload once when the server saved it but the reply was lost', () => {
    const { cloud, phone, laptop } = pair(withXp(3450))
    phone.local = answer(phone.local, 5, { day: D1, hour: 8 })

    const lost = mergeLocal(cloud.doc, phone.sync, phone.local, { dailyGoal: GOAL, now: NOW })
    cloud.doc = transport(lost.doc) // saved on the server; the phone never hears back
    cloud.version += 1

    cloud.sync(phone) // the retry, from the sync info saved before
    expect(phone.local.xp).toBe(3500)

    phone.local = answer(phone.local, 2, { day: D1, hour: 9 })
    cloud.sync(phone)
    cloud.sync(laptop)
    expect(phone.local.xp).toBe(3520)
    expect(laptop.local.xp).toBe(3520)
    expect(laptop.local.totalAttempts).toBe(7)
  })

  it('counts answers given after a lost reply on top, not twice', () => {
    const { cloud, phone } = pair(withXp(3450))
    phone.local = answer(phone.local, 5, { day: D1, hour: 8 })
    cloud.doc = transport(mergeLocal(cloud.doc, phone.sync, phone.local, { dailyGoal: GOAL, now: NOW }).doc)
    phone.local = answer(phone.local, 2, { day: D1, hour: 9 })
    cloud.sync(phone)
    expect(phone.local.xp).toBe(3520)
    expect(assemble(cloud.doc).daily[D1]).toEqual({ items: 7, correct: 7, xp: 70 })
  })

  it('keeps answers given while an upload was on its way', () => {
    const { cloud, phone, laptop } = pair(withXp(3450))
    const options = { dailyGoal: GOAL, now: NOW }
    phone.local = answer(phone.local, 5, { day: D1, hour: 8 })

    const sent = phone.local
    const result = mergeLocal(cloud.doc, phone.sync, sent, options)
    phone.local = answer(phone.local, 2, { day: D1, hour: 9 }) // while the upload is on its way
    cloud.doc = transport(result.doc)
    cloud.version += 1
    const settled = settle(result, cloud.version, sent, phone.local, options)
    phone.sync = settled.sync
    phone.local = settled.progress

    expect(phone.local.xp).toBe(3520)
    expect(assemble(cloud.doc).xp).toBe(3500)
    cloud.sync(phone)
    cloud.sync(laptop)
    expect(laptop.local.xp).toBe(3520)
  })

  it('merges a newer copy into a device that fell behind, keeping both sides', () => {
    const { cloud, phone, laptop } = pair(withXp(3450))
    phone.local = answer(phone.local, 5, { day: D1, hour: 8 })
    cloud.sync(phone)
    phone.local = answer(phone.local, 5, { day: D1, hour: 9 })
    cloud.sync(phone)
    laptop.local = answer(laptop.local, 3, { day: D1, hour: 20 })

    expect(laptop.sync.version).toBeLessThan(cloud.version) // its upload would be refused
    cloud.sync(laptop) // so it merges the current copy instead
    expect(laptop.local.xp).toBe(3580)
    expect(laptop.local.daily[D1]).toEqual({ items: 13, correct: 13, xp: 130 })
  })

  it('adds up the time spent on both devices', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = run(phone.local, (s) => s.addActiveTime({ [D1]: 600_000 }))
    laptop.local = run(laptop.local, (s) => s.addActiveTime({ [D1]: 300_000, [D2]: 60_000 }))
    cloud.sync(phone)
    cloud.sync(laptop)
    expect(laptop.local.daily[D1]?.activeMs).toBe(900_000)
    expect(laptop.local.daily[D2]?.activeMs).toBe(60_000)
  })

  it('leaves bonuses out of what a device adds', () => {
    let local = answer(EMPTY_PROGRESS, 20, { day: D1, hour: 9 })
    local = run(local, (s) => s.completeLesson('1.1', 1))
    expect(local.xp).toBe(200 + 25 + 50)
    const added = diffTally(EMPTY_PROGRESS, local)
    expect(added.xp).toBe(200)
    expect(added.daily[D1]).toEqual({ items: 20, correct: 20, xp: 200, activeMs: 0 })
  })
})

describe('sync: daily goal, bonuses and streak', () => {
  it('counts the daily-goal bonus once when both devices reach the goal', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = answer(phone.local, 25, { day: D1, hour: 8 })
    laptop.local = answer(laptop.local, 25, { day: D1, hour: 20 })
    expect(phone.local.xp).toBe(275)
    expect(laptop.local.xp).toBe(275)
    cloud.sync(phone)
    cloud.sync(laptop)
    cloud.sync(phone)
    for (const d of [phone, laptop]) {
      expect(d.local.xp).toBe(525)
      expect(d.local.daily[D1]).toEqual({ items: 50, correct: 50, xp: 525, goalMet: true })
      expect(d.local.streak).toEqual({ current: 1, best: 1, lastDay: D1 })
    }
  })

  it('credits a goal reached only with both devices together, once, in either order', () => {
    for (const order of [['phone', 'laptop'], ['laptop', 'phone']] as const) {
      const { cloud, ...devices } = pair()
      devices.phone.local = answer(devices.phone.local, 12, { day: D1, hour: 8 })
      devices.laptop.local = answer(devices.laptop.local, 10, { day: D1, hour: 20 })
      for (const id of [...order, ...order, ...order]) cloud.sync(devices[id])

      for (const d of [devices.phone, devices.laptop]) {
        expect(d.local.daily[D1]).toEqual({ items: 22, correct: 22, xp: 245, goalMet: true })
        expect(d.local.xp).toBe(245)
        expect(d.local.streak).toEqual({ current: 1, best: 1, lastDay: D1 })
      }
    }
  })

  it('does not credit a goal the combined answers do not reach', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = answer(phone.local, 8, { day: D1, hour: 8 })
    laptop.local = answer(laptop.local, 10, { day: D1, hour: 20 })
    cloud.sync(phone)
    cloud.sync(laptop)
    expect(laptop.local.daily[D1]).toEqual({ items: 18, correct: 18, xp: 180 })
    expect(laptop.local.streak.current).toBe(0)
  })

  it('checks a combined goal against the synced daily goal, not the device setting', () => {
    for (const [synced, device, met] of [
      [30, 20, false],
      [20, 30, true],
    ] as const) {
      const { cloud, phone, laptop } = pair()
      const prefs = { dailyGoal: { value: synced, changedAt: 1 } }
      phone.local = answer(phone.local, 12, { day: D1, hour: 8, goal: device })
      laptop.local = answer(laptop.local, 10, { day: D1, hour: 20, goal: device })
      cloud.sync(phone, { dailyGoal: device, prefs })
      cloud.sync(laptop, { dailyGoal: device, prefs })
      expect(laptop.local.daily[D1]?.goalMet ?? false).toBe(met)
    }
  })

  it('leaves past days as they were when the goal is lowered later', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = answer(phone.local, 8, { day: D1, hour: 8 })
    laptop.local = answer(laptop.local, 10, { day: D1, hour: 20 })
    cloud.sync(phone)
    cloud.sync(laptop)

    phone.local = answer(phone.local, 3, { day: D2, hour: 8, goal: 15 })
    cloud.sync(phone, { dailyGoal: 15 })
    cloud.sync(laptop, { dailyGoal: 15 })
    expect(laptop.local.daily[D1]?.goalMet).toBeUndefined()
    expect(laptop.local.daily[D2]?.goalMet).toBeUndefined()
  })

  it('counts the lesson bonus once when both devices first finish the same lesson', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = run(phone.local, (s) => s.completeLesson('1.1', 0.8))
    laptop.local = run(laptop.local, (s) => s.completeLesson('1.1', 0.9))
    cloud.sync(phone)
    cloud.sync(laptop)
    expect(laptop.local.xp).toBe(50)
    expect(laptop.local.lessons['1.1']).toMatchObject({ status: 'done', score: 0.9 })
  })

  it('builds the streak from goal days reached on either device', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = answer(phone.local, 20, { day: D1, hour: 8 })
    cloud.sync(phone)
    laptop.local = answer(laptop.local, 20, { day: D2, hour: 20 }) // has not seen the phone's day
    expect(laptop.local.streak).toEqual({ current: 1, best: 1, lastDay: D2 })
    cloud.sync(laptop)
    expect(laptop.local.streak).toEqual({ current: 2, best: 2, lastDay: D2 })
    expect(laptop.local.xp).toBe(400 + 50)
  })

  it('keeps the starting streak until a new goal day arrives, then continues it', () => {
    // Older data: a streak without goal marks on its days.
    const start: ProgressData = { ...EMPTY_PROGRESS, xp: 1000, streak: { current: 3, best: 5, lastDay: D0 } }
    const { cloud, phone, laptop } = pair(start)
    expect(laptop.local.streak).toEqual(start.streak)
    phone.local = answer(phone.local, 20, { day: D1, hour: 8 })
    cloud.sync(phone)
    cloud.sync(laptop)
    expect(laptop.local.streak).toEqual({ current: 4, best: 5, lastDay: D1 })
  })
})

describe('sync: records', () => {
  it('keeps the latest review of a card and both answers in its history', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = answer(phone.local, 1, { day: D1, hour: 8 })
    laptop.local = answer(laptop.local, 1, { day: D1, hour: 20, ok: false })
    const laptopCard = laptop.local.reviews['form:talo:sg.genitive']!
    cloud.sync(phone)
    cloud.sync(laptop)

    const card = laptop.local.reviews['form:talo:sg.genitive']
    expect(card).toEqual({
      ...laptopCard,
      target: { lexemeId: 'talo', slot: 'sg.genitive' },
      history: [phone.local.reviews['form:talo:sg.genitive']!.history[0], laptopCard.history[0]],
    })
    expect(laptop.local.skills['case:genitive']).toEqual({
      attempts: 2,
      correct: 1,
      recent: [
        { at: t(D1, 8), ok: true },
        { at: t(D1, 20), ok: false },
      ],
    })
  })

  it('combines recently viewed words, newest first, top 12', () => {
    const { cloud, phone, laptop } = pair()
    for (let i = 0; i < 8; i++) phone.local = answer(phone.local, 1, { day: D1, hour: 1 + i, word: `p${i}` })
    for (let i = 0; i < 8; i++) laptop.local = answer(laptop.local, 1, { day: D1, hour: 9 + i, word: `l${i}` })
    laptop.local = answer(laptop.local, 1, { day: D1, hour: 20, word: 'p0' }) // also seen on the phone, earlier
    cloud.sync(phone)
    cloud.sync(laptop)
    expect(laptop.local.recentNouns.map((r) => r.id)).toEqual(['p0', 'l7', 'l6', 'l5', 'l4', 'l3', 'l2', 'l1', 'l0', 'p7', 'p6', 'p5'])
    expect(laptop.local.recentNouns[0]?.at).toBe(t(D1, 20))
  })

  it('unlocks achievements the combined totals reach, and keeps the earliest unlock', () => {
    const { cloud, phone, laptop } = pair(withXp(440))
    phone.local = answer(phone.local, 3, { day: D1, hour: 8 })
    laptop.local = answer(laptop.local, 4, { day: D1, hour: 20 })
    expect(phone.local.achievements['xp-500']).toBeUndefined()
    expect(laptop.local.achievements['xp-500']).toBeUndefined()
    cloud.sync(phone)
    cloud.sync(laptop)
    expect(laptop.local.xp).toBe(510)
    expect(laptop.local.achievements['xp-500']).toBe(NOW)
    expect(laptop.local.achievements['first-answer']).toBe(t(D1, 8))
  })

  it('takes the last change of a shared setting, the same way on every device', () => {
    const { cloud, phone, laptop } = pair()
    cloud.sync(phone, { prefs: { dailyGoal: { value: 20, changedAt: 100 }, mode: { value: 'beginner', changedAt: 300 } } })
    cloud.sync(laptop, { prefs: { dailyGoal: { value: 30, changedAt: 200 }, mode: { value: 'advanced', changedAt: 100 } } })
    expect(cloud.doc.prefs).toEqual({ dailyGoal: { value: 30, changedAt: 200 }, mode: { value: 'beginner', changedAt: 300 } })

    const a = { ...cloud.doc, prefs: { theme: { value: 'a', changedAt: 5 } } }
    const b = { ...cloud.doc, prefs: { theme: { value: 'b', changedAt: 5 } } }
    expect(mergeDocs(a, b).prefs).toEqual(mergeDocs(b, a).prefs)
  })
})

describe('sync: merging copies', () => {
  function threeDocs(): [SyncDoc, SyncDoc, SyncDoc] {
    const cloud = new Cloud()
    let start = answer(withXp(100), 5, { day: D0, hour: 9 })
    start = run(start, (s) => s.completeLesson('1.1', 0.7))
    const phone = cloud.connectFirst('phone', start)
    const laptop = cloud.connect('laptop')
    const tablet = cloud.connect('tablet')
    phone.local = answer(phone.local, 12, { day: D1, hour: 8 })
    phone.local = run(phone.local, (s) => s.completeLesson('1.2', 0.6))
    laptop.local = answer(laptop.local, 21, { day: D1, hour: 20, word: 'kauppa' })
    laptop.local = run(laptop.local, (s) => {
      s.completeLesson('1.2', 0.9)
      s.addActiveTime({ [D1]: 400_000 })
    })
    tablet.local = answer(tablet.local, 2, { day: D2, hour: 7, ok: false })
    tablet.local = run(tablet.local, (s) => s.finishSession({ correct: 0, total: 2 }))
    const options = { dailyGoal: GOAL, now: NOW }
    return [phone, laptop, tablet].map((d) => mergeLocal(cloud.doc, d.sync, d.local, options).doc) as [SyncDoc, SyncDoc, SyncDoc]
  }

  it('gives the same result in any order, and repeating a merge changes nothing', () => {
    const [a, b, c] = threeDocs()
    expect(mergeDocs(a, b)).toEqual(mergeDocs(b, a))
    expect(mergeDocs(mergeDocs(a, b), c)).toEqual(mergeDocs(a, mergeDocs(b, c)))
    expect(mergeDocs(a, a)).toEqual(a)
    expect(mergeDocs(mergeDocs(a, b), b)).toEqual(mergeDocs(a, b))
  })

  it('keeps only the typed fields of a card, so the order of copies never matters', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = answer(phone.local, 1, { day: D1, hour: 8 })
    const raw = phone.local.reviews['form:talo:sg.genitive']!
    expect(raw.target).toHaveProperty('form') // the store saves the word form on the target
    const options = { dailyGoal: GOAL, now: NOW }
    const local = mergeLocal(cloud.doc, phone.sync, phone.local, options).doc // straight from the device
    expect(local.reviews['form:talo:sg.genitive']?.target).toEqual({ lexemeId: 'talo', slot: 'sg.genitive' })
    const downloaded = transport(local) // the same copy after a round trip
    expect(mergeDocs(local, downloaded)).toEqual(mergeDocs(downloaded, local))
    expect(startDoc(phone.local, 'e').reviews['form:talo:sg.genitive']?.target).toEqual({ lexemeId: 'talo', slot: 'sg.genitive' })
    cloud.sync(laptop)
  })

  it('refuses to merge copies from different epochs', () => {
    const [a] = threeDocs()
    expect(() => mergeDocs(a, { ...a, epoch: 'other' })).toThrow('different epochs')
  })
})

describe('sync: replacing progress', () => {
  it('starts every device over after a reset, and an old copy is not merged into it', () => {
    const { cloud, phone, laptop } = pair(withXp(3450))
    laptop.local = answer(laptop.local, 3, { day: D1, hour: 20 })

    cloud.doc = transport(startDoc(EMPTY_PROGRESS, 'epoch-2')) // reset on the phone
    cloud.version += 1
    const reset = adopt(cloud.doc, phone.id, cloud.version)
    expect(reset.progress).toEqual(EMPTY_PROGRESS)

    expect(() => cloud.sync(laptop)).toThrow('was replaced')
    const taken = cloud.connect(laptop.id)
    expect(taken.local).toEqual(EMPTY_PROGRESS)
  })

  it('gives a device back its own tally when it adopts a copy that has one', () => {
    const { cloud, laptop } = pair()
    laptop.local = answer(laptop.local, 4, { day: D1, hour: 20 })
    cloud.sync(laptop)
    const again = cloud.connect('laptop')
    expect(again.sync.myTally).toEqual(cloud.doc.tallies.laptop)
    again.local = answer(again.local, 1, { day: D1, hour: 21 })
    cloud.sync(again)
    expect(again.local.totalAttempts).toBe(5)
  })
})

describe('sync: what goes into a synced copy', () => {
  const card = 'form:talo:sg.genitive'

  it('accepts an answer timed on a clock that was set back', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = answer(phone.local, 1, { day: D1, hour: 8, ms: -40_000 })
    expect(phone.local.reviews[card]!.history[0]!.ms).toBe(-40_000) // what the store saves
    cloud.sync(phone) // the download check would throw on a negative time
    cloud.sync(laptop)
    expect(laptop.local.reviews[card]!.history[0]!.ms).toBe(0)
    expect(laptop.local.xp).toBe(10)
  })

  it('accepts progress restored from an odd backup, clamping or dropping what cannot be synced', () => {
    // Everything here gets through the backup import, which repairs shapes but not values.
    const restored = parseBackup(
      JSON.stringify({
        format: 'sija-progress',
        version: 1,
        data: {
          xp: -5,
          sessions: -1,
          totalAttempts: 3,
          streak: { current: -1, best: 2, lastDay: 'yesterday' },
          skills: { partitive: { attempts: 3, correct: -1, recent: [] } },
          lessons: { '': { status: 'done', at: 1 }, '1.1': { status: 'done', score: 80, at: 2 } },
          daily: { a: { items: 1, correct: 1, xp: 10 }, [D1]: { items: -2, correct: 1, xp: 10 } },
          recentNouns: [
            { id: '', at: 1 },
            { id: 'talo', at: 2 },
          ],
          reviews: { x: { key: 'x', kind: 'form', target: { lexemeId: 'talo', slot: 'sg.genitive' }, ease: 2, intervalDays: -1, due: 1, reps: -2, lapses: 0, history: [{ at: 1, correct: true, ms: -3 }] } },
        },
      }),
    )
    const doc = transport(startDoc(restored, 'e'))
    const p = assemble(doc)
    expect(p.xp).toBe(0)
    expect(p.sessions).toBe(0)
    expect(p.streak).toEqual({ current: 0, best: 2, lastDay: null })
    expect(p.skills.partitive).toEqual({ attempts: 3, correct: 0, recent: [] })
    expect(Object.keys(p.lessons)).toEqual(['1.1'])
    expect(p.daily).toEqual({ [D1]: { items: 0, correct: 1, xp: 10 } })
    expect(p.recentNouns).toEqual([{ id: 'talo', at: 2 }])
    expect(p.reviews.x).toMatchObject({ reps: 0, intervalDays: 0, history: [{ at: 1, correct: true, ms: 0 }] })

    const { sync } = adopt(doc, 'phone', 1)
    expect(() => transport(mergeLocal(doc, sync, restored, { dailyGoal: GOAL, now: NOW }).doc)).not.toThrow()
  })

  it('trims answer histories for an upload near the size limit, while stats and devices keep theirs', () => {
    const { cloud, phone, laptop } = pair()
    phone.local = answer(phone.local, 12, { day: D1, hour: 8 })
    const full = mergeLocal(cloud.doc, phone.sync, phone.local, { dailyGoal: GOAL, now: NOW })
    expect(full.doc.reviews[card]!.history).toHaveLength(12)

    const trimmed = trimHistories(full.doc, 2)
    expect(trimmed.reviews[card]!.history).toEqual(full.doc.reviews[card]!.history.slice(-2))
    expect({ ...trimmed, reviews: {} }).toEqual({ ...full.doc, reviews: {} }) // nothing else changes
    expect(trimHistories(full.doc, 0).reviews[card]!.history).toEqual([])

    // The server keeps the trimmed copy; the phone keeps the full result.
    cloud.doc = transport(trimmed)
    cloud.version += 1
    phone.sync = { ...full.sync, version: cloud.version }
    phone.local = full.progress

    cloud.sync(laptop)
    expect(laptop.local.xp).toBe(120)
    expect(laptop.local.reviews[card]).toEqual({ ...full.progress.reviews[card], history: full.progress.reviews[card]!.history.slice(-2) })
    cloud.sync(phone)
    expect(phone.local.reviews[card]!.history).toHaveLength(12)
  })
})

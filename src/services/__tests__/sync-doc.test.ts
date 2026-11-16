import { describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, type ProgressData } from '../../stores/progress'
import { InvalidSyncDocError, NewerFormatError, parseSyncDoc, type SyncDoc } from '../sync/doc'
import { startDoc } from '../sync/merge'

const progress: ProgressData = {
  ...EMPTY_PROGRESS,
  xp: 245,
  streak: { current: 1, best: 3, lastDay: '2026-11-16' },
  lessons: { '1.1': { status: 'done', score: 0.9, at: 5 }, '1.2': { status: 'started', at: 6 } },
  skills: { 'case:genitive': { attempts: 22, correct: 20, recent: [{ at: 1, ok: true }, { at: 2, ok: false }] } },
  achievements: { 'first-answer': 1 },
  recentNouns: [{ id: 'talo', at: 2 }],
  daily: { '2026-11-16': { items: 22, correct: 20, xp: 225, goalMet: true, activeMs: 600_000 } },
  reviews: {
    'form:talo:sg.genitive': {
      key: 'form:talo:sg.genitive',
      kind: 'form',
      target: { lexemeId: 'talo', slot: 'sg.genitive' },
      ease: 2.4,
      intervalDays: 3,
      due: 9,
      reps: 2,
      lapses: 0,
      lastReviewed: 2,
      history: [{ at: 2, correct: true, ms: 2500 }],
    },
  },
  sessions: 2,
  perfectSessions: 1,
  totalAttempts: 22,
}

function sample(): SyncDoc {
  const doc = startDoc(progress, 'epoch-1', { dailyGoal: { value: 20, changedAt: 7 } })
  doc.tallies.laptop = {
    xp: 30,
    totalAttempts: 3,
    sessions: 0,
    perfectSessions: 0,
    skills: { partitive: { attempts: 3, correct: 3 } },
    daily: { '2026-11-17': { items: 3, correct: 3, xp: 30, activeMs: 0 } },
  }
  return doc
}

/** A JSON copy of the sample with one part changed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the tests reach into arbitrary fields of the JSON copy
function broken(change: (doc: Record<string, any>) => void): unknown {
  const doc = JSON.parse(JSON.stringify(sample()))
  change(doc)
  return doc
}

function pathOf(raw: unknown): string {
  try {
    parseSyncDoc(raw)
  } catch (e) {
    if (e instanceof InvalidSyncDocError) return e.path
    throw e
  }
  throw new Error('expected the copy to be rejected')
}

describe('sync document check', () => {
  it('reads back a document unchanged', () => {
    const doc = sample()
    expect(parseSyncDoc(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })

  it('asks for an update when a newer app wrote the copy', () => {
    expect(() => parseSyncDoc(broken((d) => (d.formatVersion = 2)))).toThrow(NewerFormatError)
    expect(() => parseSyncDoc(broken((d) => (d.formatVersion = 2)))).toThrow('Update the app')
  })

  it('rejects anything that is not a sync document', () => {
    expect(pathOf(null)).toBe('document')
    expect(pathOf([])).toBe('document')
    expect(pathOf(broken((d) => (d.format = 'sija-progress')))).toBe('format')
    expect(pathOf(broken((d) => (d.formatVersion = 0)))).toBe('formatVersion')
    expect(pathOf(broken((d) => (d.epoch = '')))).toBe('epoch')
  })

  it('rejects the whole copy for one damaged part, instead of dropping it', () => {
    expect(pathOf(broken((d) => (d.tallies.laptop.xp = -5)))).toBe('tallies.laptop.xp')
    expect(pathOf(broken((d) => (d.tallies.laptop.daily['17.11.2026'] = { items: 1, correct: 1, xp: 10, activeMs: 0 })))).toBe('tallies.laptop.daily.17.11.2026')
    expect(pathOf(broken((d) => delete d.start.counters.skills['case:genitive'].correct))).toBe('start.counters.skills.case:genitive.correct')
    expect(pathOf(broken((d) => (d.reviews['form:talo:sg.genitive'].target.slot = 'sg.bogus')))).toBe('reviews.form:talo:sg.genitive.target.slot')
    expect(pathOf(broken((d) => (d.lessons['1.1'].status = 'finished')))).toBe('lessons.1.1.status')
    expect(pathOf(broken((d) => (d.skillHistory['case:genitive'][0].ok = 'yes')))).toBe('skillHistory.case:genitive.0.ok')
    expect(pathOf(broken((d) => (d.recentNouns[0] = { at: 2 })))).toBe('recentNouns.0.id')
    expect(pathOf(broken((d) => (d.goalDays = ['yesterday'])))).toBe('goalDays.0')
    expect(pathOf(broken((d) => (d.start.streak.lastDay = 5)))).toBe('start.streak.lastDay')
    expect(pathOf(broken((d) => (d.prefs.dailyGoal.value = { n: 20 })))).toBe('prefs.dailyGoal.value')
  })

  it('rejects damaged parts of review cards and lessons too', () => {
    const card = 'reviews.form:talo:sg.genitive'
    expect(pathOf(broken((d) => (d.reviews['form:talo:sg.genitive'].history[0].ms = 'slow')))).toBe(`${card}.history.0.ms`)
    expect(pathOf(broken((d) => (d.reviews['form:talo:sg.genitive'].history[0].correct = 1)))).toBe(`${card}.history.0.correct`)
    expect(pathOf(broken((d) => (d.reviews['form:talo:sg.genitive'].lastReviewed = 'today')))).toBe(`${card}.lastReviewed`)
    expect(pathOf(broken((d) => (d.reviews['form:talo:sg.genitive'].target.person = 'we')))).toBe(`${card}.target.person`)
    expect(pathOf(broken((d) => (d.reviews['form:talo:sg.genitive'].reps = -1)))).toBe(`${card}.reps`)
    expect(pathOf(broken((d) => (d.lessons['1.1'].score = 'high')))).toBe('lessons.1.1.score')
  })

  it('rejects days that are not on the calendar', () => {
    expect(pathOf(broken((d) => (d.goalDays = ['2026-02-30'])))).toBe('goalDays.0')
    expect(pathOf(broken((d) => (d.tallies.laptop.daily['2026-13-01'] = { items: 1, correct: 1, xp: 10, activeMs: 0 })))).toBe('tallies.laptop.daily.2026-13-01')
  })

  it('drops fields it does not know, such as the word form saved on a card target', () => {
    const raw = broken((d) => {
      d.reviews['form:talo:sg.genitive'].target.form = 'talon'
      d.lessons['1.1'].note = 'x'
    })
    const doc = parseSyncDoc(raw)
    expect(doc.reviews['form:talo:sg.genitive']?.target).toEqual({ lexemeId: 'talo', slot: 'sg.genitive' })
    expect(doc.lessons['1.1']).toEqual({ status: 'done', score: 0.9, at: 5 })
  })

  it('rejects prototype keys', () => {
    const raw = JSON.parse(JSON.stringify(sample()).replace('"tallies":{', '"tallies":{"__proto__":{},'))
    expect(pathOf(raw)).toBe('tallies.__proto__')
  })
})

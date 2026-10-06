import { describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, type ProgressData } from '../../stores/progress'
import { exportProgress, parseBackup } from '../storage/backup'

const backup = (data: unknown) => JSON.stringify({ format: 'sija-progress', version: 1, data })

describe('backup import', () => {
  it('round-trips an export unchanged', () => {
    const data: ProgressData = {
      ...EMPTY_PROGRESS,
      xp: 120,
      streak: { current: 2, best: 5, lastDay: '2026-10-04' },
      lessons: { 'l1.1': { status: 'done', score: 0.9, at: 1 } },
      skills: { 'case.genitive': { attempts: 3, correct: 2, recent: [{ at: 1, ok: true }] } },
      achievements: { 'first-step': 1 },
      recentNouns: [{ id: 'talo', at: 1 }],
      daily: { '2026-10-04': { items: 20, correct: 18, xp: 90, goalMet: true } },
      reviews: {
        'talo:sg.genitive': {
          key: 'talo:sg.genitive',
          kind: 'form',
          target: { lexemeId: 'talo', slot: 'sg.genitive' },
          ease: 2.5,
          intervalDays: 1,
          due: 2,
          reps: 1,
          lapses: 0,
          lastReviewed: 1,
          history: [{ at: 1, correct: true, ms: 900 }],
        },
      },
      sessions: 4,
      perfectSessions: 1,
      totalAttempts: 30,
    }
    expect(parseBackup(exportProgress(data))).toEqual(data)
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('nope')).toThrow('not valid JSON')
    expect(() => parseBackup('[]')).toThrow('not a Sija progress backup')
    expect(() => parseBackup(backup({ xp: '1', skills: {}, lessons: {} }))).toThrow('missing required fields')
  })

  it('repairs wrongly shaped fields instead of persisting them', () => {
    const p = parseBackup(backup({ xp: 1, skills: { a: { attempts: 1 } }, lessons: { b: 'done' }, recentNouns: {}, streak: null, daily: [] }))
    expect(p.recentNouns).toEqual([])
    expect(p.streak).toEqual(EMPTY_PROGRESS.streak)
    expect(p.skills).toEqual({})
    expect(p.lessons).toEqual({})
    expect(p.daily).toEqual({})
  })

  it('drops unknown keys, prototype keys and reviews with unknown slots', () => {
    const p = parseBackup(
      '{"format":"sija-progress","data":{"xp":1,"skills":{"__proto__":{"attempts":1,"correct":1,"recent":[]}},"lessons":{},' +
        '"recordAttempt":1,"reviews":{"x":{"key":"x","kind":"form","target":{"lexemeId":"talo","slot":"sg.bogus"},"ease":1,"intervalDays":1,"due":1,"reps":1,"lapses":0,"history":[]}}}}',
    )
    expect(Object.keys(p)).toEqual(Object.keys(EMPTY_PROGRESS))
    expect(Object.getPrototypeOf(p.skills)).toBe(Object.prototype)
    expect(Object.keys(p.skills)).toEqual([])
    expect(p.reviews).toEqual({})
  })
})

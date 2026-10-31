import { describe, expect, it } from 'vitest'
import { LESSONS, LEVELS } from '../../data/curriculum'
import { buildLearningMap, WORLDS } from '../learning/map'
import type { SkillStat } from '../learning/mastery'

type Lessons = Record<string, { status: 'started' | 'done'; score?: number }>

const none = { lessons: {} as Lessons, skills: {} as Record<string, SkillStat> }
const done = (...ids: string[]): Lessons => Object.fromEntries(ids.map((id) => [id, { status: 'done' as const, score: 100 }]))
const required = (n: number) => LESSONS.filter((l) => l.level === n && !l.advanced).map((l) => l.id)
const allRequired = () => LESSONS.filter((l) => !l.advanced).map((l) => l.id)
const OPTIONAL = LESSONS.filter((l) => l.advanced).map((l) => l.id)
const level = (map: ReturnType<typeof buildLearningMap>, n: number) => map.worlds.flatMap((w) => w.levels).find((l) => l.level.id === n)!
const strong: SkillStat = { attempts: 30, correct: 30, recent: Array.from({ length: 30 }, (_, i) => ({ at: i, ok: true })) }
const skillsOf = (n: number) => Object.fromEntries([...new Set(LESSONS.filter((l) => l.level === n).flatMap((l) => l.skills))].map((s) => [s, strong]))

describe('learning map: structure', () => {
  it('groups every existing level into exactly one world, in curriculum order, with the approved names', () => {
    expect(WORLDS.flatMap((w) => w.levelIds)).toEqual(LEVELS.map((l) => l.id))
    expect(WORLDS.map((w) => w.title.en)).toEqual(['Foundations and cases', 'Stems and gradation', 'Words ending in -i and plurals', 'Possessives and usage'])
    expect(WORLDS.map((w) => w.title.fi)).toEqual(['Perusteet ja sijat', 'Vartalot ja astevaihtelu', 'i-loppuiset sanat ja monikko', 'Omistusliitteet ja käyttö'])
  })

  it('shows every existing lesson exactly once, in curriculum order; optional = the existing advanced flag', () => {
    const map = buildLearningMap(none)
    const shown = map.worlds.flatMap((w) => w.levels.flatMap((l) => l.lessons))
    expect(shown.map((x) => x.lesson.id)).toEqual(LESSONS.map((l) => l.id))
    expect(shown.filter((x) => x.optional).map((x) => x.lesson.id)).toEqual(OPTIONAL)
    expect(OPTIONAL).toEqual(['2.10', '4.8'])
    expect(map.requiredTotal + map.optionalTotal).toBe(LESSONS.length)
  })

  it('keeps the curriculum prerequisites and derives "builds on" from them', () => {
    const map = buildLearningMap(none)
    for (const lv of map.worlds.flatMap((w) => w.levels)) {
      const expected = [...new Set(lv.lessons.flatMap((x) => x.lesson.prerequisites.map((p) => LESSONS.find((l) => l.id === p)!.level)))]
        .filter((n) => n !== lv.level.id)
        .sort((a, b) => a - b)
      expect(lv.buildsOn).toEqual(expected)
    }
  })

  it('no required lesson depends on an optional lesson (skipping one never leaves a required lesson waiting)', () => {
    for (const l of LESSONS.filter((x) => !x.advanced)) {
      for (const p of l.prerequisites) expect(OPTIONAL, `${l.id} → ${p}`).not.toContain(p)
    }
  })
})

describe('learning map: completion and progress', () => {
  it('a new learner is at level 1; every other level is upcoming', () => {
    const map = buildLearningMap(none)
    expect(map.next?.id).toBe('1.1')
    expect(level(map, 1).state).toBe('current')
    for (let n = 2; n <= 8; n++) expect(level(map, n).state).toBe('upcoming')
    expect(map.worlds.flatMap((w) => w.levels.flatMap((l) => l.lessons)).filter((x) => x.isNext)).toHaveLength(1)
  })

  it('a level is completed when its required lessons are done, even with its optional lesson open', () => {
    const map = buildLearningMap({ ...none, lessons: done(...required(1), ...required(2)) })
    expect(level(map, 2).state).toBe('completed')
    expect(level(map, 2).requiredDone).toBe(level(map, 2).requiredTotal)
    expect(level(map, 2).optionalDone).toBe(0)
    expect(level(map, 2).lessons.find((l) => l.lesson.id === '2.10')!.status).toBe('new')
  })

  it('an unfinished optional lesson does not hold back a later required lesson', () => {
    const map = buildLearningMap({ ...none, lessons: done(...required(1), ...required(2), ...required(3), '4.1') })
    expect(map.next?.id).toBe('4.2')
    expect(map.nextIsOptional).toBe(false)
    expect(level(map, 2).state).toBe('completed')
    expect(level(map, 4).state).toBe('current')
  })

  it('with every required lesson done and optional lessons open: all levels completed, optional lesson next', () => {
    const map = buildLearningMap({ ...none, lessons: done(...allRequired()) })
    expect(map.worlds.flatMap((w) => w.levels).every((l) => l.state === 'completed')).toBe(true)
    expect(map.next?.id).toBe('2.10')
    expect(map.nextIsOptional).toBe(true)
    expect(map.requiredDone).toBe(map.requiredTotal)
    expect(map.optionalDone).toBe(0)
  })

  it('when every lesson is done there is no next lesson', () => {
    const map = buildLearningMap({ ...none, lessons: done(...LESSONS.map((l) => l.id)) })
    expect(map.next).toBeUndefined()
    expect(map.optionalDone).toBe(map.optionalTotal)
  })

  it('progress made out of order is shown without moving "you are here"', () => {
    const map = buildLearningMap({ ...none, lessons: { ...done('4.1'), '6.1': { status: 'started' } } })
    expect(level(map, 1).state).toBe('current')
    expect(level(map, 4).state).toBe('upcoming')
    expect(level(map, 4).requiredDone).toBe(1)
    expect(level(map, 6).lessons.find((l) => l.lesson.id === '6.1')!.status).toBe('started')
  })

  it('imported progress with unknown lesson ids is ignored safely', () => {
    const map = buildLearningMap({ ...none, lessons: { ...done('1.1', '9.9', 'old-lesson') } })
    expect(map.requiredDone).toBe(1)
    expect(map.next?.id).toBe('1.2')
  })

  it('keeps the best score of a completed lesson', () => {
    const map = buildLearningMap({ ...none, lessons: { '1.1': { status: 'done', score: 83 } } })
    expect(level(map, 1).lessons[0]!.score).toBe(83)
  })

  it('lists missing prerequisites as recommendations and never locks a lesson', () => {
    expect(level(buildLearningMap(none), 1).lessons.find((l) => l.lesson.id === '1.2')!.missing.map((m) => m.id)).toEqual(['1.1'])
    expect(level(buildLearningMap({ ...none, lessons: done('1.1') }), 1).lessons.find((l) => l.lesson.id === '1.2')!.missing).toEqual([])
    for (const item of buildLearningMap(none).worlds.flatMap((w) => w.levels.flatMap((l) => l.lessons))) {
      expect(['done', 'started', 'new']).toContain(item.status)
    }
  })
})

describe('learning map: related-skill mastery', () => {
  it('is hidden for an untouched level, even when its skills were practised elsewhere', () => {
    // Level 6 shares skills (plural, partitive, ...) with level 1, but has no lesson activity.
    const map = buildLearningMap({ lessons: done(...required(1)), skills: { ...skillsOf(1), ...skillsOf(6) } })
    expect(level(map, 6).mastery).toBeUndefined()
  })

  it('is shown for a level with activity and practice data', () => {
    const map = buildLearningMap({ lessons: { '2.1': { status: 'started' } }, skills: skillsOf(2) })
    expect(level(map, 2).mastery?.tier).toBe('mastered')
  })

  it('is shown for a completed level with practice data', () => {
    const map = buildLearningMap({ lessons: done(...required(1)), skills: skillsOf(1) })
    expect(level(map, 1).state).toBe('completed')
    expect(level(map, 1).mastery?.value).toBeCloseTo(1)
  })

  it('is omitted (never "not started") for a completed level without practice data, e.g. imported progress', () => {
    const map = buildLearningMap({ lessons: done(...required(1)), skills: {} })
    expect(level(map, 1).state).toBe('completed')
    expect(level(map, 1).mastery).toBeUndefined()
  })
})

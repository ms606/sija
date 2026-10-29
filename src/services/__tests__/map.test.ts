import { describe, expect, it } from 'vitest'
import { LESSONS, LEVELS } from '../../data/curriculum'
import { buildLearningMap, WORLDS } from '../learning/map'
import type { SkillStat } from '../learning/mastery'

type Lessons = Record<string, { status: 'started' | 'done'; score?: number; at: number }>

const none = { lessons: {} as Lessons, skills: {} as Record<string, SkillStat> }
const done = (...ids: string[]): Lessons => Object.fromEntries(ids.map((id) => [id, { status: 'done' as const, score: 100, at: 1 }]))
const levelIds = (n: number) => LESSONS.filter((l) => l.level === n).map((l) => l.id)
const level = (map: ReturnType<typeof buildLearningMap>, n: number) => map.worlds.flatMap((w) => w.levels).find((l) => l.level.id === n)!

describe('learning map: structure', () => {
  it('groups every existing level into exactly one world, in curriculum order', () => {
    const ids = WORLDS.flatMap((w) => w.levelIds)
    expect(ids).toEqual(LEVELS.map((l) => l.id))
    expect(new Set(WORLDS.map((w) => w.id)).size).toBe(WORLDS.length)
  })

  it('shows every existing lesson exactly once, with its own id, in curriculum order', () => {
    const map = buildLearningMap(none)
    const shown = map.worlds.flatMap((w) => w.levels.flatMap((l) => l.lessons.map((x) => x.lesson.id)))
    expect(shown).toEqual(LESSONS.map((l) => l.id))
    expect(map.total).toBe(LESSONS.length)
  })

  it('keeps the curriculum prerequisites unchanged and derives "builds on" from them', () => {
    const map = buildLearningMap(none)
    for (const lv of map.worlds.flatMap((w) => w.levels)) {
      for (const item of lv.lessons) expect(item.lesson.prerequisites).toEqual(LESSONS.find((l) => l.id === item.lesson.id)!.prerequisites)
      const expected = [...new Set(lv.lessons.flatMap((x) => x.lesson.prerequisites.map((p) => LESSONS.find((l) => l.id === p)!.level)))]
        .filter((n) => n !== lv.level.id)
        .sort((a, b) => a - b)
      expect(lv.buildsOn).toEqual(expected)
    }
    expect(level(map, 1).buildsOn).toEqual([])
    expect(level(map, 2).buildsOn).toContain(1)
  })
})

describe('learning map: progress states', () => {
  it('a new learner is at level 1, lesson 1.1; every other level is upcoming', () => {
    const map = buildLearningMap(none)
    expect(map.next?.id).toBe('1.1')
    expect(level(map, 1).state).toBe('current')
    for (let n = 2; n <= 8; n++) expect(level(map, n).state).toBe('upcoming')
    const first = level(map, 1).lessons[0]!
    expect(first.isNext).toBe(true)
    expect(first.status).toBe('new')
    expect(map.worlds.flatMap((w) => w.levels.flatMap((l) => l.lessons)).filter((x) => x.isNext)).toHaveLength(1)
  })

  it('a finished level is completed and the next level becomes current', () => {
    const map = buildLearningMap({ ...none, lessons: done(...levelIds(1)) })
    expect(level(map, 1).state).toBe('completed')
    expect(level(map, 1).done).toBe(level(map, 1).total)
    expect(level(map, 2).state).toBe('current')
    expect(map.next?.id).toBe('2.1')
    expect(map.done).toBe(levelIds(1).length)
    expect(map.worlds[0]!.done).toBe(levelIds(1).length)
  })

  it('progress made out of order is shown without moving "you are here"', () => {
    const map = buildLearningMap({ ...none, lessons: { ...done('4.1'), '6.1': { status: 'started' as const } } })
    expect(level(map, 1).state).toBe('current')
    expect(level(map, 4).state).toBe('upcoming')
    expect(level(map, 4).done).toBe(1)
    expect(level(map, 4).lessons.find((l) => l.lesson.id === '4.1')!.status).toBe('done')
    expect(level(map, 6).lessons.find((l) => l.lesson.id === '6.1')!.status).toBe('started')
  })

  it('agrees with the existing recommendation: the first lesson not done, advanced lessons included', () => {
    const all = LESSONS.map((l) => l.id).filter((id) => id !== '2.10')
    const map = buildLearningMap({ ...none, lessons: done(...all) })
    expect(map.next?.id).toBe('2.10')
    expect(level(map, 2).state).toBe('current')
  })

  it('when every lesson is done there is no next lesson and every level is completed', () => {
    const map = buildLearningMap({ ...none, lessons: done(...LESSONS.map((l) => l.id)) })
    expect(map.next).toBeUndefined()
    expect(map.worlds.flatMap((w) => w.levels).every((l) => l.state === 'completed')).toBe(true)
  })

  it('keeps the best score of a completed lesson', () => {
    const map = buildLearningMap({ ...none, lessons: { '1.1': { status: 'done' as const, score: 83 } } })
    expect(level(map, 1).lessons[0]!.score).toBe(83)
  })
})

describe('learning map: soft prerequisites', () => {
  it('lists missing prerequisites as recommendations and clears them when done', () => {
    const before = level(buildLearningMap(none), 1).lessons.find((l) => l.lesson.id === '1.2')!
    expect(before.missing.map((m) => m.id)).toEqual(['1.1'])
    const after = level(buildLearningMap({ ...none, lessons: done('1.1') }), 1).lessons.find((l) => l.lesson.id === '1.2')!
    expect(after.missing).toEqual([])
  })

  it('never locks a lesson: there is no locked state, only done, started or new', () => {
    const map = buildLearningMap(none)
    for (const item of map.worlds.flatMap((w) => w.levels.flatMap((l) => l.lessons))) {
      expect(['done', 'started', 'new']).toContain(item.status)
    }
  })
})

describe('learning map: mastery', () => {
  it('uses the existing per-skill mastery of the skills a level trains', () => {
    expect(level(buildLearningMap(none), 1).mastery.tier).toBe('new')
    const lv1Skills = [...new Set(LESSONS.filter((l) => l.level === 1).flatMap((l) => l.skills))]
    const strong: SkillStat = { attempts: 30, correct: 30, recent: Array.from({ length: 30 }, (_, i) => ({ at: i, ok: true })) }
    const skills = Object.fromEntries(lv1Skills.map((s) => [s, strong]))
    const m = level(buildLearningMap({ ...none, skills }), 1).mastery
    expect(m.value).toBeCloseTo(1)
    expect(m.tier).toBe('mastered')
  })
})

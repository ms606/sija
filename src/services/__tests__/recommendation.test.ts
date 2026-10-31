import { describe, expect, it } from 'vitest'
import { LESSONS } from '../../data/curriculum'
import { isOptionalLesson, recommendedLesson } from '../learning/curriculum'

type Lessons = Record<string, { status: 'started' | 'done' }>
const done = (...ids: string[]): Lessons => Object.fromEntries(ids.map((id) => [id, { status: 'done' as const }]))
const requiredIds = LESSONS.filter((l) => !isOptionalLesson(l)).map((l) => l.id)

describe('recommended lesson (shared by the Dashboard, the Learn page and the map)', () => {
  it('optional lessons are exactly the existing advanced lessons', () => {
    expect(LESSONS.filter(isOptionalLesson).map((l) => l.id)).toEqual(LESSONS.filter((l) => l.advanced).map((l) => l.id))
  })

  it('starts a new learner at 1.1', () => {
    expect(recommendedLesson({})?.id).toBe('1.1')
  })

  it('keeps recommending a started lesson until it is done', () => {
    expect(recommendedLesson({ '1.1': { status: 'started' } })?.id).toBe('1.1')
  })

  it('skips an unfinished optional lesson and moves on to the next required lesson', () => {
    const upTo2_9 = LESSONS.slice(0, LESSONS.findIndex((l) => l.id === '2.10')).map((l) => l.id)
    expect(recommendedLesson(done(...upTo2_9))?.id).toBe('3.1')
  })

  it('never recommends an optional lesson while a required lesson is unfinished', () => {
    for (let i = 0; i < requiredIds.length; i++) {
      const next = recommendedLesson(done(...requiredIds.slice(0, i)))
      expect(next?.id).toBe(requiredIds[i])
      expect(next && isOptionalLesson(next)).toBe(false)
    }
  })

  it('recommends optional lessons once every required lesson is done', () => {
    expect(recommendedLesson(done(...requiredIds))?.id).toBe('2.10')
    expect(recommendedLesson(done(...requiredIds, '2.10'))?.id).toBe('4.8')
    expect(recommendedLesson(done(...LESSONS.map((l) => l.id)))).toBeUndefined()
  })

  it('follows curriculum order for imported progress with gaps and unknown ids', () => {
    expect(recommendedLesson({ ...done('3.1', '5.5', 'unknown'), '2.4': { status: 'started' } })?.id).toBe('1.1')
  })
})

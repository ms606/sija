import { LESSONS, LEVELS } from '../../data/curriculum'
import type { LocalizedText } from '../../types/content'
import type { Lesson, Level } from '../../types/curriculum'
import type { SkillStat } from './mastery'
import { mastery, tier, type MasteryTier } from './mastery'
import { isOptionalLesson, lessonStatus, missingPrerequisites, recommendedLesson, type LessonStatus } from './curriculum'

/**
 * The learning map: a presentation of the existing curriculum (8 levels, 54
 * lessons, their prerequisites) as worlds on a path. Worlds only group levels
 * visually; they add no lessons, no order and no rules. Nothing is ever locked:
 * prerequisites are shown as recommendations, as on the lesson page. Advanced
 * lessons are optional extras and do not count towards completing a level.
 */

export type WorldTone = 'root' | 'grade' | 'stem' | 'ending'

export interface World {
  id: string
  /** The Finnish titles are proposed wording, not yet reviewed by a native speaker. */
  title: LocalizedText
  levelIds: number[]
  tone: WorldTone
}

/** Four worlds of two consecutive levels each, in curriculum order. */
export const WORLDS: readonly World[] = [
  { id: 'foundations', title: { en: 'Foundations and cases', fi: 'Perusteet ja sijat' }, levelIds: [1, 2], tone: 'root' },
  { id: 'stems', title: { en: 'Stems and gradation', fi: 'Vartalot ja astevaihtelu' }, levelIds: [3, 4], tone: 'grade' },
  { id: 'i-words-plurals', title: { en: 'Words ending in -i and plurals', fi: 'i-loppuiset sanat ja monikko' }, levelIds: [5, 6], tone: 'stem' },
  { id: 'possessives-usage', title: { en: 'Possessives and usage', fi: 'Omistusliitteet ja käyttö' }, levelIds: [7, 8], tone: 'ending' },
]

export type LevelState = 'completed' | 'current' | 'upcoming'

export interface MapLesson {
  lesson: Lesson
  status: LessonStatus
  /** An advanced lesson: an optional extra that does not count towards completion. */
  optional: boolean
  /** The recommended next lesson (the same one the Dashboard and Learn page recommend). */
  isNext: boolean
  /** Best check score, 0–100, when the lesson has been completed. */
  score?: number
  /** Prerequisites not completed yet: shown as a recommendation, never a lock. */
  missing: Lesson[]
}

export interface MapLevel {
  level: Level
  lessons: MapLesson[]
  requiredDone: number
  requiredTotal: number
  optionalDone: number
  optionalTotal: number
  /** Completed when every required lesson is done; current when it holds the next required lesson. */
  state: LevelState
  /** Other levels this level's lessons list as prerequisites. */
  buildsOn: number[]
  /**
   * Related-skill mastery: the existing per-skill mastery of the skills this
   * level's lessons train. Those skills are shared with other levels, so it can
   * include practice done elsewhere. Only given for a level with learner
   * activity (a lesson started or done) and recorded practice; otherwise undefined.
   */
  mastery?: { value: number; attempts: number; tier: MasteryTier }
}

export interface MapWorld {
  world: World
  levels: MapLevel[]
  requiredDone: number
  requiredTotal: number
}

export interface LearningMap {
  worlds: MapWorld[]
  next?: Lesson
  /** The next lesson is an optional extra (every required lesson is done). */
  nextIsOptional: boolean
  requiredDone: number
  requiredTotal: number
  optionalDone: number
  optionalTotal: number
}

type LessonProgress = Readonly<Record<string, { status: 'started' | 'done'; score?: number }>>

function relatedSkillMastery(lessons: readonly Lesson[], skills: Readonly<Record<string, SkillStat>>): MapLevel['mastery'] {
  const ids = [...new Set(lessons.flatMap((l) => l.skills))]
  const attempts = ids.reduce((s, id) => s + (skills[id]?.attempts ?? 0), 0)
  if (!ids.length || attempts === 0) return undefined
  const value = ids.reduce((s, id) => s + mastery(skills[id]), 0) / ids.length
  return { value, attempts, tier: tier(value, attempts) }
}

export function buildLearningMap(progress: { lessons: LessonProgress; skills: Readonly<Record<string, SkillStat>> }): LearningMap {
  const next = recommendedLesson(progress.lessons)
  const nextIsOptional = !!next && isOptionalLesson(next)
  const byId = new Map(LESSONS.map((l) => [l.id, l]))
  const levels = new Map<number, MapLevel>()
  for (const level of LEVELS) {
    const items = LESSONS.filter((l) => l.level === level.id)
    const lessons: MapLesson[] = items.map((lesson) => {
      const status = lessonStatus(progress.lessons, lesson.id)
      const score = progress.lessons[lesson.id]?.score
      return {
        lesson,
        status,
        optional: isOptionalLesson(lesson),
        isNext: next?.id === lesson.id,
        ...(status === 'done' && score !== undefined ? { score } : {}),
        missing: missingPrerequisites(progress.lessons, lesson),
      }
    })
    const required = lessons.filter((l) => !l.optional)
    const optional = lessons.filter((l) => l.optional)
    const requiredDone = required.filter((l) => l.status === 'done').length
    const state: LevelState =
      requiredDone === required.length ? 'completed' : !nextIsOptional && next?.level === level.id ? 'current' : 'upcoming'
    const buildsOn = [...new Set(items.flatMap((l) => l.prerequisites.map((p) => byId.get(p)?.level)))]
      .filter((n): n is number => n !== undefined && n !== level.id)
      .sort((a, b) => a - b)
    const active = lessons.some((l) => l.status !== 'new')
    const m = active ? relatedSkillMastery(items, progress.skills) : undefined
    levels.set(level.id, {
      level,
      lessons,
      requiredDone,
      requiredTotal: required.length,
      optionalDone: optional.filter((l) => l.status === 'done').length,
      optionalTotal: optional.length,
      state,
      buildsOn,
      ...(m ? { mastery: m } : {}),
    })
  }
  const worlds = WORLDS.map((world) => {
    const ls = world.levelIds.map((id) => levels.get(id)).filter((l): l is MapLevel => !!l)
    return { world, levels: ls, requiredDone: ls.reduce((s, l) => s + l.requiredDone, 0), requiredTotal: ls.reduce((s, l) => s + l.requiredTotal, 0) }
  })
  const all = [...levels.values()]
  return {
    worlds,
    ...(next ? { next } : {}),
    nextIsOptional,
    requiredDone: all.reduce((s, l) => s + l.requiredDone, 0),
    requiredTotal: all.reduce((s, l) => s + l.requiredTotal, 0),
    optionalDone: all.reduce((s, l) => s + l.optionalDone, 0),
    optionalTotal: all.reduce((s, l) => s + l.optionalTotal, 0),
  }
}

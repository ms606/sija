import { LESSONS, LEVELS } from '../../data/curriculum'
import type { LocalizedText } from '../../types/content'
import type { Lesson, Level } from '../../types/curriculum'
import type { SkillStat } from './mastery'
import { mastery, tier, type MasteryTier } from './mastery'
import { lessonStatus, missingPrerequisites, recommendedLesson, type LessonStatus } from './curriculum'

/**
 * The learning map: a presentation of the existing curriculum (8 levels, 54
 * lessons, their prerequisites) as worlds on a path. Worlds only group levels
 * visually; they add no lessons, no order and no rules. Nothing is ever locked:
 * prerequisites are shown as recommendations, as on the lesson page.
 */

export type WorldTone = 'root' | 'grade' | 'stem' | 'ending'

export interface World {
  id: string
  title: LocalizedText
  levelIds: number[]
  tone: WorldTone
}

/** Four worlds of two consecutive levels each, in curriculum order. */
export const WORLDS: readonly World[] = [
  { id: 'first-steps', title: { en: 'First steps', fi: 'Ensiaskeleet' }, levelIds: [1, 2], tone: 'root' },
  { id: 'stems', title: { en: 'Stems and gradation', fi: 'Vartalot ja astevaihtelu' }, levelIds: [3, 4], tone: 'grade' },
  { id: 'families', title: { en: '-i words and plurals', fi: 'I-sanat ja monikko' }, levelIds: [5, 6], tone: 'stem' },
  { id: 'in-use', title: { en: 'Nouns in use', fi: 'Sanat käytössä' }, levelIds: [7, 8], tone: 'ending' },
]

export type LevelState = 'completed' | 'current' | 'upcoming'

export interface MapLesson {
  lesson: Lesson
  status: LessonStatus
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
  done: number
  total: number
  state: LevelState
  /** Other levels this level's lessons list as prerequisites. */
  buildsOn: number[]
  mastery: { value: number; attempts: number; tier: MasteryTier }
}

export interface MapWorld {
  world: World
  levels: MapLevel[]
  done: number
  total: number
}

export interface LearningMap {
  worlds: MapWorld[]
  next?: Lesson
  done: number
  total: number
}

type LessonProgress = Readonly<Record<string, { status: 'started' | 'done'; score?: number }>>

/** Mastery of a level: the mean of the existing per-skill mastery over the skills its lessons train. */
function levelMastery(lessons: readonly Lesson[], skills: Readonly<Record<string, SkillStat>>): MapLevel['mastery'] {
  const ids = [...new Set(lessons.flatMap((l) => l.skills))]
  const value = ids.length ? ids.reduce((s, id) => s + mastery(skills[id]), 0) / ids.length : 0
  const attempts = ids.reduce((s, id) => s + (skills[id]?.attempts ?? 0), 0)
  return { value, attempts, tier: tier(value, attempts) }
}

export function buildLearningMap(progress: { lessons: LessonProgress; skills: Readonly<Record<string, SkillStat>> }): LearningMap {
  const next = recommendedLesson(progress.lessons)
  const byId = new Map(LESSONS.map((l) => [l.id, l]))
  const levels = new Map<number, MapLevel>()
  for (const level of LEVELS) {
    const items = LESSONS.filter((l) => l.level === level.id)
    const lessons: MapLesson[] = items.map((lesson) => {
      const score = progress.lessons[lesson.id]?.score
      return {
        lesson,
        status: lessonStatus(progress.lessons, lesson.id),
        isNext: next?.id === lesson.id,
        ...(lessonStatus(progress.lessons, lesson.id) === 'done' && score !== undefined ? { score } : {}),
        missing: missingPrerequisites(progress.lessons, lesson),
      }
    })
    const done = lessons.filter((l) => l.status === 'done').length
    const state: LevelState = done === items.length ? 'completed' : next?.level === level.id ? 'current' : 'upcoming'
    const buildsOn = [...new Set(items.flatMap((l) => l.prerequisites.map((p) => byId.get(p)?.level)))]
      .filter((n): n is number => n !== undefined && n !== level.id)
      .sort((a, b) => a - b)
    levels.set(level.id, { level, lessons, done, total: items.length, state, buildsOn, mastery: levelMastery(items, progress.skills) })
  }
  const worlds = WORLDS.map((world) => {
    const ls = world.levelIds.map((id) => levels.get(id)).filter((l): l is MapLevel => !!l)
    return { world, levels: ls, done: ls.reduce((s, l) => s + l.done, 0), total: ls.reduce((s, l) => s + l.total, 0) }
  })
  const done = [...levels.values()].reduce((s, l) => s + l.done, 0)
  return { worlds, ...(next ? { next } : {}), done, total: LESSONS.length }
}

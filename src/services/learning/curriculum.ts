import { LESSONS } from '../../data/curriculum'
import type { Lesson } from '../../types/curriculum'

export type LessonStatus = 'done' | 'started' | 'new'

/** Advanced lessons are optional extras: they never hold back the main path (lessons are soft-locked, never blocked). */
export function isOptionalLesson(lesson: Lesson): boolean {
  return lesson.advanced === true
}

/**
 * The recommended next step, shared by the Dashboard, the Learn page and the map:
 * the first required lesson not yet done, in curriculum order. An unfinished
 * optional lesson never pulls the learner back; once every required lesson is
 * done, the first optional lesson not yet done is recommended.
 */
export function recommendedLesson(lessons: Readonly<Record<string, { status: 'started' | 'done' }>>): Lesson | undefined {
  const open = (l: Lesson) => lessons[l.id]?.status !== 'done'
  return LESSONS.find((l) => !isOptionalLesson(l) && open(l)) ?? LESSONS.find((l) => isOptionalLesson(l) && open(l))
}

export function lessonStatus(lessons: Readonly<Record<string, { status: 'started' | 'done' }>>, id: string): LessonStatus {
  return lessons[id]?.status ?? 'new'
}

/** Prerequisites the learner has not completed yet. */
export function missingPrerequisites(lessons: Readonly<Record<string, { status: 'started' | 'done' }>>, lesson: Lesson): Lesson[] {
  return lesson.prerequisites.map((p) => LESSONS.find((l) => l.id === p)).filter((l): l is Lesson => !!l && lessons[l.id]?.status !== 'done')
}

export const PASS_MARK = 0.8

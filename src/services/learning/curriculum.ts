import { LESSONS } from '../../data/curriculum'
import type { Lesson } from '../../types/curriculum'

export type LessonStatus = 'done' | 'started' | 'new'

/** The first lesson not yet done — the recommended next step (lessons are soft-locked, never blocked). */
export function recommendedLesson(lessons: Readonly<Record<string, { status: 'started' | 'done' }>>): Lesson | undefined {
  return LESSONS.find((l) => lessons[l.id]?.status !== 'done')
}

export function lessonStatus(lessons: Readonly<Record<string, { status: 'started' | 'done' }>>, id: string): LessonStatus {
  return lessons[id]?.status ?? 'new'
}

/** Prerequisites the learner has not completed yet. */
export function missingPrerequisites(lessons: Readonly<Record<string, { status: 'started' | 'done' }>>, lesson: Lesson): Lesson[] {
  return lesson.prerequisites.map((p) => LESSONS.find((l) => l.id === p)).filter((l): l is Lesson => !!l && lessons[l.id]?.status !== 'done')
}

export const PASS_MARK = 0.8

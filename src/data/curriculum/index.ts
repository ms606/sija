import type { Lesson } from '../../types/curriculum'
import { LEVEL_1 } from './level-1'
import { LEVEL_2 } from './level-2'
import { LEVEL_3 } from './level-3'
import { LEVEL_4 } from './level-4'
import { LEVEL_5 } from './level-5'
import { LEVEL_6 } from './level-6'
import { LEVEL_7 } from './level-7'
import { LEVEL_8 } from './level-8'

export { LEVELS } from './levels'

/** The curriculum in recommended order: 8 levels, 54 lessons. */
export const LESSONS: readonly Lesson[] = [...LEVEL_1, ...LEVEL_2, ...LEVEL_3, ...LEVEL_4, ...LEVEL_5, ...LEVEL_6, ...LEVEL_7, ...LEVEL_8]

const byId = new Map(LESSONS.map((l) => [l.id, l]))

export function getLesson(id: string): Lesson | undefined {
  return byId.get(id)
}

export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id)
  return i >= 0 ? LESSONS[i + 1] : undefined
}

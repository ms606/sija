import type { CaseId, GradationId, PersonId, Predictability, SlotKey } from '../../grammar/types'
import type { ExerciseSpec, Lesson, LessonBlock } from '../../types/curriculum'
import { m, t } from '../explanations/text'

export { m, t }

export const lesson = (l: Lesson): Lesson => l

export const text = (en: string, fi?: string, label?: Predictability): LessonBlock => ({ kind: 'text', body: m(en, fi), ...(label ? { label } : {}) })
export const idea = (en: string, fi?: string, label?: Predictability): LessonBlock => ({ kind: 'key-idea', body: m(en, fi), ...(label ? { label } : {}) })
export const pipeline = (nounId: string, slot: SlotKey, person?: PersonId): LessonBlock => ({ kind: 'pipeline', nounId, slot, ...(person ? { person } : {}) })
export const builder = (nounId: string, slot: SlotKey): LessonBlock => ({ kind: 'builder', nounId, slot })
export const paradigm = (nounId: string, cases?: CaseId[]): LessonBlock => ({ kind: 'paradigm', nounId, ...(cases ? { cases } : {}) })
export const compare = (nounIds: string[], slots: SlotKey[], title?: string): LessonBlock => ({ kind: 'compare', nounIds, slots, ...(title ? { title: t(title) } : {}) })
export const cases = (...caseIds: CaseId[]): LessonBlock => ({ kind: 'case-cards', caseIds })
export const spatial = (highlight?: CaseId): LessonBlock => ({ kind: 'spatial', ...(highlight ? { highlight } : {}) })
export const gradation = (pattern: GradationId, nounId?: string): LessonBlock => ({ kind: 'gradation', pattern, ...(nounId ? { nounId } : {}) })
export const gradeMap = (nounId: string): LessonBlock => ({ kind: 'grade-map', nounId })
export const harmony = (initial?: string): LessonBlock => ({ kind: 'harmony', ...(initial ? { initial } : {}) })
export const examples = (sentenceIds: string[], title?: string): LessonBlock => ({ kind: 'examples', sentenceIds, ...(title ? { title: t(title) } : {}) })
export const endings = (slot: SlotKey, words: string[], title?: string): LessonBlock => ({ kind: 'endings', slot, words, ...(title ? { title: t(title) } : {}) })
export const possessives = (nounId: string, slot: SlotKey): LessonBlock => ({ kind: 'possessives', nounId, slot })
export const glossary = (...terms: string[]): LessonBlock => ({ kind: 'glossary', terms })
export const quick = (spec: ExerciseSpec, title?: string): LessonBlock => ({ kind: 'quick-check', spec, ...(title ? { title: t(title) } : {}) })

/** A list of engine forms with optional English meanings: ['talo', 'sg.inessive', 'in the house']. */
export const forms = (items: [string, SlotKey, string?, PersonId?][], title?: string): LessonBlock => ({
  kind: 'forms',
  items: items.map(([nounId, slot, en, person]) => ({ nounId, slot, ...(en ? { en } : {}), ...(person ? { person } : {}) })),
  ...(title ? { title: t(title) } : {}),
})

/** Regular words without gradation or stem changes — safe for early checks. */
export const EASY = ['talo', 'auto', 'koulu', 'kirja', 'kala', 'kissa', 'sauna', 'juna', 'kylä', 'päivä', 'isä', 'kello', 'radio', 'sana', 'kahvila', 'ravintola']

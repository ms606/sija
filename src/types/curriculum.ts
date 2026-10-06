import type { CaseId, GradationId, NumberId, PersonId, Predictability, SlotKey } from '../grammar/types'
import type { LocalizedText, ModeText } from './content'
import type { ExerciseType, SkillId } from './exercise'

/** What a lesson check or a quick check practises. Answers are always produced by the engine. */
export interface ExerciseSpec {
  skill?: SkillId | 'mixed'
  types?: ExerciseType[]
  words?: string[]
  slots?: SlotKey[]
  persons?: PersonId[]
  tags?: string[]
  count?: number
  /** Fill-blank hints show the lemma only (when choosing the case is the point). */
  lemmaHintOnly?: boolean
}

export type LessonBlock =
  | { kind: 'text'; body: ModeText; label?: Predictability }
  | { kind: 'key-idea'; body: ModeText; label?: Predictability }
  | { kind: 'pipeline'; nounId: string; slot: SlotKey; person?: PersonId; title?: LocalizedText }
  | { kind: 'builder'; nounId: string; slot: SlotKey }
  | { kind: 'paradigm'; nounId: string; cases?: CaseId[]; numbers?: NumberId[] }
  | { kind: 'compare'; nounIds: string[]; slots: SlotKey[]; title?: LocalizedText }
  | { kind: 'case-cards'; caseIds: CaseId[] }
  | { kind: 'spatial'; highlight?: CaseId }
  | { kind: 'gradation'; pattern: GradationId; nounId?: string }
  | { kind: 'grade-map'; nounId: string }
  | { kind: 'harmony'; initial?: string }
  | { kind: 'examples'; sentenceIds: string[]; title?: LocalizedText }
  | { kind: 'minimal-pairs' }
  | { kind: 'i-compare' }
  | { kind: 'plural-stems'; words?: string[] }
  | { kind: 'endings'; slot: SlotKey; words: string[]; title?: LocalizedText }
  | { kind: 'possessives'; nounId: string; slot: SlotKey }
  | { kind: 'forms'; items: { nounId: string; slot: SlotKey; person?: PersonId; en?: string }[]; title?: LocalizedText }
  | { kind: 'glossary'; terms: string[] }
  | { kind: 'quick-check'; spec: ExerciseSpec; title?: LocalizedText }

export interface Lesson {
  /** "4.3" — level.number */
  id: string
  level: number
  title: LocalizedText
  goal: ModeText
  why: ModeText
  prerequisites: string[]
  skills: SkillId[]
  minutes: number
  /** Marked ADVANCED: optional for beginners. */
  advanced?: boolean
  blocks: LessonBlock[]
  /** End-of-lesson check (5–8 generated exercises; 80% passes). */
  check: ExerciseSpec
}

export interface Level {
  id: number
  title: LocalizedText
  summary: ModeText
}

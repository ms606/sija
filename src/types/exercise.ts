import type { CaseId, GradationId, IGroup, PersonId, PieceRole, SlotKey } from '../grammar/types'
import type { RenderedSentence } from '../grammar'

/** The ten exercise types (spec §19 A–J). */
export type ExerciseType =
  | 'multiple-choice'
  | 'fill-blank'
  | 'transform'
  | 'identify-case'
  | 'identify-number-case'
  | 'identify-morphology'
  | 'build-word'
  | 'listening'
  | 'error-correction'
  | 'production'

/** The 15 mastery categories plus fine-grained skills. */
export type CategoryId =
  | 'cases'
  | 'case-endings'
  | 'singular'
  | 'plural'
  | 'genitive'
  | 'partitive'
  | 'noun-types'
  | 'i-words'
  | 'gradation'
  | 'vowel-harmony'
  | 'stem-formation'
  | 'possessives'
  | 'vocabulary'
  | 'listening'
  | 'production'

export type SkillId = CategoryId | `case:${CaseId}` | `itype:${IGroup}` | `grad:${GradationId}` | `type:${string}`

export interface ExerciseTarget {
  lexemeId: string
  slot: SlotKey
  person?: PersonId
}

export interface ExercisePrompt {
  /** Instruction, e.g. "Write the genitive singular". */
  instruction: string
  /** The word or form the exercise is about (shown large). */
  word?: string
  /** Extra line under the word (gloss, slot label, English meaning). */
  detail?: string
  /** A sentence with one part replaced by a blank (index into parts). */
  sentence?: { view: RenderedSentence; blank: number; translation?: string; hint?: string; marked?: boolean }
  /** Text the learner hears (listening). */
  audio?: string
  /** Error correction: the wrong form shown and why it is wrong. */
  error?: { text: string; diagnosisId: string; params: Record<string, string> }
}

export interface ChoiceOption {
  id: string
  label: string
  /** Finnish text (rendered with lang="fi"). */
  fi?: boolean
  /** When chosen wrongly: the diagnosis that explains this distractor. */
  diagnosisId?: string
  params?: Record<string, string>
}

export type ExerciseAnswer =
  | { kind: 'text'; accept: string[]; rare?: string[] }
  | { kind: 'choice'; options: ChoiceOption[]; correct: string[] }
  | { kind: 'pieces'; pieces: { text: string; role: PieceRole }[]; role: PieceRole; correct: number[] }
  | { kind: 'build'; tiles: { id: string; text: string }[]; accept: string[] }

export interface Exercise {
  id: string
  type: ExerciseType
  skills: SkillId[]
  /** Spaced-repetition key, e.g. "form:kauppa:sg.genitive". */
  reviewKey: string
  difficulty: 1 | 2 | 3
  target?: ExerciseTarget
  prompt: ExercisePrompt
  answer: ExerciseAnswer
}

export type Verdict = 'correct' | 'almost' | 'incorrect'

export interface CheckResult {
  verdict: Verdict
  /** The expected primary answer (text). */
  expected: string
  /** Everything that would have been accepted. */
  accepted: string[]
  /** Accepted but rare ("also correct, but rare"). */
  rare?: boolean
  diagnosisId?: string
  params?: Record<string, string>
  /** Explanation key for a real word the learner typed (uusin = 'newest'). */
  noteRuleId?: string
  /** The answer is a real form of another word or slot. */
  realWord?: { lexemeId: string; slot: SlotKey }[]
}

/**
 * Core types of the Finnish noun grammar engine.
 *
 * The engine is the single authoritative source of grammatical knowledge in
 * the app: it decides stems, consonant gradation, endings and variants, and
 * records *why* each form looks the way it does (derivation steps with
 * predictability labels). UI code only renders what the engine returns.
 */

export const CASES = [
  'nominative',
  'genitive',
  'partitive',
  'accusative',
  'inessive',
  'elative',
  'illative',
  'adessive',
  'ablative',
  'allative',
  'essive',
  'translative',
  'abessive',
  'comitative',
  'instructive',
] as const
export type CaseId = (typeof CASES)[number]

export const NUMBERS = ['sg', 'pl'] as const
export type NumberId = (typeof NUMBERS)[number]

export type SlotKey = `${NumberId}.${CaseId}`

export type Harmony = 'back' | 'front'
export type Grade = 'strong' | 'weak'

export const PERSONS = ['1sg', '2sg', '3', '1pl', '2pl'] as const
export type PersonId = (typeof PERSONS)[number]

/** The four pedagogical families of native/loan -i nouns. */
export type IGroup = 'pankki' | 'lehti' | 'kieli' | 'uusi'

/**
 * How predictable a step is. Maps 1:1 to the learner-facing labels
 * RULE, PATTERN, MEMORIZE, COMMON EXCEPTION, IRREGULAR, VARIANT, ADVANCED.
 */
export type Predictability =
  | 'rule' // productive rule that applies across the board
  | 'pattern' // regular within a declension type / group of words
  | 'lexical' // a property of the word itself that must be memorized
  | 'exception' // a common exception to an otherwise general rule
  | 'irregular' // irregular form
  | 'variant' // an accepted alternative form
  | 'advanced' // technical detail, hidden for beginners

export const GRADATION_IDS = [
  'kk-k',
  'pp-p',
  'tt-t',
  'k-0',
  'p-v',
  't-d',
  'ht-hd',
  'nk-ng',
  'mp-mm',
  'lt-ll',
  'nt-nn',
  'rt-rr',
  'k-j',
  'k-v',
] as const
export type GradationId = (typeof GRADATION_IDS)[number]

/** Namespaced identifier of a rule/explanation, e.g. `grade.weak.closed-syllable`. */
export type RuleId = string

export type PartOfSpeech = 'noun' | 'adjective' | 'numeral'

/** Kotus-aligned declension type id, e.g. `k26`. */
export type TypeId = `k${number}`

/** A form that replaces or extends what the rules generate for one slot. */
export interface FormOverride {
  slot: SlotKey
  forms: string[]
  mode: 'replace' | 'add-variant'
  label: Predictability
  ruleId: RuleId
}

/** Alternative stems that yield additional accepted variants (e.g. ruoka: ruoan ~ ruuan). */
export interface AltStems {
  vowelWeak?: string
  pluralWeak?: string
  register: 'variant' | 'rare' | 'colloquial'
  ruleId: RuleId
}

/**
 * The morphological core of a lexicon entry. Everything the engine needs to
 * inflect a word; content fields (gloss, images, themes…) live in `Noun`
 * (src/types/content.ts), which extends this.
 */
export interface Lexeme {
  id: string
  lemma: string
  pos: PartOfSpeech
  typeId: TypeId
  /** Kotus 2024 inflection info as listed, e.g. `7*F`; empty for compounds. */
  kotus: string
  gradation?: { pattern: GradationId; inverse?: boolean }
  /** Compounds inflect by their last part (`headId`); `modifier` is the fixed first part. */
  compound?: { modifier: string; headId: string }
  harmony?: Harmony
  overrides?: FormOverride[]
  altStems?: AltStems[]
  /** aika → ajan, poika → pojan: i between vowels after k-loss is written j (lexical). */
  jGlide?: boolean
  /** Lemma whose t/k/p looks gradable but does not alternate (e.g. auto → auton). */
  noGradationNote?: RuleId
  numberUse?: 'both' | 'mass' | 'pl-rare'
  /** Preferred order of standard variants per slot (forms listed first are shown first). */
  preferred?: Partial<Record<SlotKey, string[]>>
}

/* ------------------------------------------------------------------ */
/* Pieces and derivations                                              */
/* ------------------------------------------------------------------ */

export type PieceRole = 'root' | 'grade' | 'stem' | 'plural' | 'ending' | 'possessive' | 'exception'

/** A typed segment of a word form, used for colour-coded morphology views. */
export interface Piece {
  text: string
  role: PieceRole
  /** For `grade` pieces: which grade this is. */
  grade?: Grade
  /** The text this piece had before a change ('' text + `was` = something was removed). */
  was?: string
  ruleId?: RuleId
}

export type StepKind =
  | 'lemma'
  | 'type'
  | 'stem'
  | 'gradation'
  | 'stem-change'
  | 'plural'
  | 'ending'
  | 'harmony'
  | 'spelling'
  | 'possessive'
  | 'override'
  | 'result'

export interface DerivationStep {
  kind: StepKind
  ruleId: RuleId
  params?: Record<string, string>
  before: string
  after: string
  label: Predictability
}

export type Register = 'standard' | 'variant' | 'rare' | 'colloquial'

export interface FormVariant {
  text: string
  pieces: Piece[]
  steps: DerivationStep[]
  register: Register
}

export type FormStatus = 'ok' | 'not-used' | 'rare'

export interface NounForm {
  lexemeId: string
  slot: SlotKey
  person?: PersonId
  /** [0] is the primary standard form. Empty when `status` is `not-used`. */
  variants: FormVariant[]
  status: FormStatus
  /** Why the slot is not used / rare (explanation key). */
  statusRuleId?: RuleId
}

export interface Analysis {
  lexemeId: string
  slot: SlotKey
  person?: PersonId
  variantIndex: number
}

export interface GradationInfo {
  pattern: GradationId
  direction: 'normal' | 'inverse'
  /** Strong and weak realisations of the site in this word (e.g. pp / p). */
  strong: string
  weak: string
  /** Kotus letter (A–M). */
  kotusLetter: string
  /** Stems as they appear in this word (e.g. kauppa- / kaupa-). */
  strongStem: string
  weakStem: string
  strongSlots: SlotKey[]
  weakSlots: SlotKey[]
  /** True when the alternation is built into the declension type (Kotus 27, 31, 40). */
  intrinsic: boolean
}

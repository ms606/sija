import type { GradationId, Grade, IGroup, Predictability, Register, RuleId, SlotKey, TypeId } from '../types'

/**
 * How the vowel stem (vokaalivartalo) is formed from the nominative.
 *  - same:     talo → talo-
 *  - replace:  kieli → kiele- (strip 'i', add 'e'); nainen → naise-
 *  - lengthen: vieras → vieraa- (strip 's', double the last vowel); perhe → perhee-
 * `add` may contain the archiphoneme A (lämmin → lämpimä-).
 */
export type VowelStemRecipe =
  | { kind: 'same' }
  | { kind: 'replace'; strip: string; add: string; ruleId: RuleId; label: Predictability }
  | { kind: 'lengthen'; strip: string; ruleId: RuleId; label: Predictability }

/** How the consonant stem (konsonanttivartalo) is formed, if the type has one. */
export type ConsonantStemRecipe =
  | { kind: 'lemma' }
  | { kind: 'replace'; strip: string; add: string; ruleId: RuleId; label: Predictability }

/**
 * How the plural stem is formed from the strong vowel stem (+ plural -i-).
 *  - append:     talo → taloi-
 *  - a-to-o:     kauppa → kauppoi- (ä → ö in front words)
 *  - drop-final: koira → koiri-, kiele → kieli-
 *  - i-to-e:     pankki → pankkei-
 *  - shorten:    maa → mai-, perhee → perhei-
 *  - diphthong:  työ → töi-, tie → tei-, suo → soi-
 *  - lemma:      uusi → uusi- (the nominative already looks like the plural stem)
 *  - ks:         terveys → terveyksi-
 */
export type PluralRecipeKind = 'append' | 'a-to-o' | 'drop-final' | 'i-to-e' | 'shorten' | 'diphthong' | 'lemma' | 'ks'

export interface PluralRecipe {
  kind: PluralRecipeKind
  register?: Register
}

export type StemRef = 'lemma' | 'vowel' | 'consonant' | 'plural'

/**
 * One way of building a slot. The ending is a template:
 *  A/O/U = harmonising vowels; V = copy of the stem's last vowel
 *  (illative -Vn, -hVn).
 */
export interface SlotRecipe {
  stem: StemRef
  ending: string
  ruleId: RuleId
  /** Override the slot's default grade for this recipe (vowel/plural stems only). */
  grade?: Grade
  /** Which plural stem to use when the type has several (type 11 omena). */
  pluralIndex?: number
  register?: Register
}

export interface DeclensionTypeDef {
  id: TypeId
  kotus: number
  /** Kotus model word (malliesimerkki), e.g. 'pieni' for type 26. */
  modelWord: string
  /** The -i learning family this type is taught in (not a declension type of its own). */
  iGroup?: IGroup
  /** Can a learner tell from the word's shape that it belongs here? */
  membership: Predictability
  membershipRuleId: RuleId
  /**
   * normal    = nominative strong, weak in closed syllables (kauppa → kaupan)
   * inverse   = nominative weak, vowel stem strong (sade → sateen)
   * intrinsic = the type itself alternates t~d (Kotus folds it into the type: uusi → uuden)
   * none      = no words of this type alternate
   * Types that allow gradation only use it when the lexeme declares a pattern.
   */
  gradation: 'normal' | 'inverse' | 'intrinsic' | 'none'
  intrinsicPattern?: GradationId
  vowel: VowelStemRecipe
  consonant?: ConsonantStemRecipe
  plural: PluralRecipe[]
  /** Plural stems that never alternate (assibilated -si-, -ksi-). */
  pluralNoGradation?: boolean
  /** Principal slots that differ from the defaults. */
  slots: Partial<Record<SlotKey, SlotRecipe[]>>
  /** Extra explanation keys shown on the type page. */
  notes?: RuleId[]
}

/* Small helpers that keep the registry readable. */

export const r = (
  stem: StemRef,
  ending: string,
  ruleId: RuleId,
  extra: Partial<Pick<SlotRecipe, 'grade' | 'pluralIndex' | 'register'>> = {},
): SlotRecipe => ({ stem, ending, ruleId, ...extra })

export const PAR_VOWEL_A = r('vowel', 'A', 'ending.partitive.a')
export const PAR_VOWEL_TA = r('vowel', 'tA', 'ending.partitive.ta-vowel')
export const PAR_CONS_TA = r('consonant', 'tA', 'ending.partitive.ta-consonant')
export const PAR_LEMMA_TTA = r('lemma', 'ttA', 'ending.partitive.tta')

export const ILL_VN = r('vowel', 'Vn', 'ending.illative.vn')
export const ILL_HVN = r('vowel', 'hVn', 'ending.illative.hvn')
export const ILL_SEEN = r('vowel', 'seen', 'ending.illative.seen')

export const PLGEN_EN = r('plural', 'en', 'ending.genitive-pl.en')
export const PLGEN_VOWEL_EN = r('vowel', 'en', 'ending.genitive-pl.vowel-en')
export const PLGEN_DEN = r('plural', 'den', 'ending.genitive-pl.den')
export const PLGEN_TTEN = r('plural', 'tten', 'ending.genitive-pl.tten')
export const PLGEN_CONS_TEN = r('consonant', 'ten', 'ending.genitive-pl.ten')
export const PLGEN_CONS_TEN_RARE = r('consonant', 'ten', 'ending.genitive-pl.ten', { register: 'rare' })

export const PLPAR_A = r('plural', 'A', 'ending.partitive-pl.a')
export const PLPAR_TA = r('plural', 'tA', 'ending.partitive-pl.ta')

export const PLILL_HIN = r('plural', 'hin', 'ending.illative-pl.hin')
export const PLILL_IN = r('plural', 'in', 'ending.illative-pl.in')
export const PLILL_SIIN = r('plural', 'siin', 'ending.illative-pl.siin')
export const PLILL_HIN_RARE = r('plural', 'hin', 'ending.illative-pl.hin', { register: 'rare' })

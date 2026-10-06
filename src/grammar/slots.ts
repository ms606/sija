import { r, type SlotRecipe } from './declension/schema'
import { CASES, NUMBERS, type CaseId, type Grade, type NumberId, type Predictability, type RuleId, type SlotKey } from './types'

export const ALL_SLOTS: readonly SlotKey[] = NUMBERS.flatMap((n) => CASES.map((c) => `${n}.${c}` as SlotKey))

export function slotKey(number: NumberId, kase: CaseId): SlotKey {
  return `${number}.${kase}`
}

export function parseSlot(slot: SlotKey): { number: NumberId; kase: CaseId } {
  const [number, kase] = slot.split('.') as [NumberId, CaseId]
  return { number, kase }
}

/**
 * Default grade of the vowel/plural stem in each slot (for words with normal
 * gradation). Weak where the ending closes the syllable (-n, -ssa, -t …);
 * strong where it stays open (-a, -na) and in the illative (historically -hen).
 */
export const SLOT_GRADE: Readonly<Record<SlotKey, Grade | null>> = {
  'sg.nominative': null,
  'sg.genitive': 'weak',
  'sg.partitive': 'strong',
  'sg.accusative': null,
  'sg.inessive': 'weak',
  'sg.elative': 'weak',
  'sg.illative': 'strong',
  'sg.adessive': 'weak',
  'sg.ablative': 'weak',
  'sg.allative': 'weak',
  'sg.essive': 'strong',
  'sg.translative': 'weak',
  'sg.abessive': 'weak',
  'sg.comitative': null,
  'sg.instructive': null,
  'pl.nominative': 'weak',
  'pl.genitive': 'strong',
  'pl.partitive': 'strong',
  'pl.accusative': null,
  'pl.inessive': 'weak',
  'pl.elative': 'weak',
  'pl.illative': 'strong',
  'pl.adessive': 'weak',
  'pl.ablative': 'weak',
  'pl.allative': 'weak',
  'pl.essive': 'strong',
  'pl.translative': 'weak',
  'pl.abessive': 'weak',
  'pl.comitative': 'strong',
  'pl.instructive': 'weak',
}

/** Recipes for slots that work the same way in every declension type. */
export const DEFAULT_RECIPES: Readonly<Partial<Record<SlotKey, SlotRecipe[]>>> = {
  'sg.nominative': [r('lemma', '', 'ending.nominative')],
  'sg.genitive': [r('vowel', 'n', 'ending.genitive')],
  'sg.inessive': [r('vowel', 'ssA', 'ending.inessive')],
  'sg.elative': [r('vowel', 'stA', 'ending.elative')],
  'sg.adessive': [r('vowel', 'llA', 'ending.adessive')],
  'sg.ablative': [r('vowel', 'ltA', 'ending.ablative')],
  'sg.allative': [r('vowel', 'lle', 'ending.allative')],
  'sg.essive': [r('vowel', 'nA', 'ending.essive')],
  'sg.translative': [r('vowel', 'ksi', 'ending.translative')],
  'sg.abessive': [r('vowel', 'ttA', 'ending.abessive')],
  'pl.nominative': [r('vowel', 't', 'plural.t')],
  'pl.inessive': [r('plural', 'ssA', 'ending.inessive')],
  'pl.elative': [r('plural', 'stA', 'ending.elative')],
  'pl.adessive': [r('plural', 'llA', 'ending.adessive')],
  'pl.ablative': [r('plural', 'ltA', 'ending.ablative')],
  'pl.allative': [r('plural', 'lle', 'ending.allative')],
  'pl.essive': [r('plural', 'nA', 'ending.essive')],
  'pl.translative': [r('plural', 'ksi', 'ending.translative')],
  'pl.abessive': [r('plural', 'ttA', 'ending.abessive')],
  'pl.comitative': [r('plural', 'ne', 'ending.comitative')],
  'pl.instructive': [r('plural', 'n', 'ending.instructive')],
}

/** Slots that the types define themselves (their "principal parts"). */
export const PRINCIPAL_SLOTS: readonly SlotKey[] = [
  'sg.partitive',
  'sg.illative',
  'pl.genitive',
  'pl.partitive',
  'pl.illative',
]

/** Slots that do not exist / are not used for nouns in modern Finnish. */
export const NOT_USED: Readonly<Partial<Record<SlotKey, RuleId>>> = {
  'sg.comitative': 'slot.comitative.singular',
  'sg.instructive': 'slot.instructive.singular',
}

/** How predictable the *choice* of an ending is (all endings themselves are rules). */
export function endingLabel(ruleId: RuleId): Predictability {
  if (
    ruleId.startsWith('ending.genitive-pl.') ||
    ruleId.startsWith('ending.partitive-pl.') ||
    ruleId === 'ending.partitive.tta' ||
    ruleId === 'ending.illative.seen' ||
    ruleId === 'ending.illative-pl.siin'
  ) {
    return 'pattern'
  }
  return 'rule'
}

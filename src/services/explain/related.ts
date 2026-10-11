import { CASES_INFO } from '../../data/cases'
import { GENERAL_RULES, PLURAL_GLIDE_NOTE } from '../../data/explanations/general'
import { slotKey } from '../../grammar'
import type { FormVariant, Lexeme, PersonId, SlotKey } from '../../grammar/types'
import { slotLabel } from '../content/text'
import { grammar } from '../grammar'
import { firstSense } from './english'
import type { FormExplanation } from './form'

/**
 * Forms related to an explained form: other words built in exactly the same
 * way, the general rules behind it, and a closely related form to compare.
 * All of it comes from the engine's derivations.
 */

/** What makes two derivations "the same pattern": the same rule at every step. */
export function signature(v: FormVariant): string {
  return v.steps
    .filter((s) => s.kind !== 'lemma' && s.kind !== 'type' && s.kind !== 'result' && s.kind !== 'harmony')
    .map((s) => (s.kind === 'gradation' && s.params?.pattern ? `${s.ruleId}(${s.params.pattern})` : s.ruleId))
    .join('>')
}

function variantOf(lex: Lexeme, slot: SlotKey, person: PersonId | undefined, text?: string): FormVariant | undefined {
  const form = person ? grammar.withPossessive(lex, slot, person) : grammar.inflect(lex, slot)
  if (form.status === 'not-used') return undefined
  return text ? form.variants.find((v) => v.text === text) : form.variants[0]
}

const FREQ_RANK = { core: 0, common: 1, extra: 2 } as const

export interface PatternExample {
  lexemeId: string
  lemma: string
  gloss: string
  form: string
}

/**
 * Up to `limit` other words whose form in the same slot is derived with the
 * same steps (same stem change, plural stem, gradation pattern, ending and
 * spelling). Same word type and frequent words first.
 */
export function samePattern(exp: FormExplanation, limit = 3): PatternExample[] {
  const self = grammar.get(exp.lexemeId)
  const v = self && variantOf(self, exp.slot, exp.person, exp.form)
  if (!self || !v || exp.coverage === 'recorded' || exp.slot === 'sg.nominative') return []
  const sig = signature(v)
  const out: { lex: (typeof grammar.lexicon)[number]; form: string }[] = []
  for (const lex of grammar.lexicon) {
    if (lex.id === self.id || lex.compound?.headId === self.id || self.compound?.headId === lex.id) continue
    if (lex.pos !== self.pos) continue
    const other = variantOf(lex, exp.slot, exp.person)
    if (!other || signature(other) !== sig) continue
    out.push({ lex, form: other.text })
  }
  out.sort(
    (a, b) =>
      Number(b.lex.typeId === self.typeId) - Number(a.lex.typeId === self.typeId) ||
      FREQ_RANK[a.lex.frequency] - FREQ_RANK[b.lex.frequency] ||
      Number(!!a.lex.compound) - Number(!!b.lex.compound),
  )
  return out.slice(0, limit).map(({ lex, form }) => ({ lexemeId: lex.id, lemma: lex.lemma, gloss: firstSense(lex.gloss.en), form }))
}

export interface GeneralRule {
  ruleId: string
  text: string
}

/** The general rules behind a form, in derivation order; no example words of their own. */
export function generalRules(exp: FormExplanation): GeneralRule[] {
  if (exp.coverage === 'recorded') return []
  const ids = exp.steps.map((s) => s.ruleId).filter((id) => id.startsWith('plural.') || id.startsWith('grade.') || id.startsWith('ending.') || id === 'plural.t' || id.startsWith('acc.'))
  const seen = new Set<string>()
  const out: GeneralRule[] = []
  for (const id of ids) {
    const text = GENERAL_RULES[id]
    if (!text || seen.has(id)) continue
    seen.add(id)
    out.push({ ruleId: id, text })
  }
  const glide = exp.steps.some((s) => s.ruleId === 'spelling.plural-glide')
  const pluralEnding =
    exp.steps.some((s) => s.kind === 'plural') && exp.steps.some((s) => s.ruleId === 'ending.partitive-pl.a' || s.ruleId === 'ending.genitive-pl.en')
  if (pluralEnding) out.push({ ruleId: glide ? 'spelling.plural-glide' : 'spelling.no-glide', text: glide ? PLURAL_GLIDE_NOTE.glide : PLURAL_GLIDE_NOTE['no-glide'] })
  return out
}

export interface CompareForm {
  label: string
  form: string
  slot: SlotKey
  person?: PersonId
  note: string
}

/** A closely related form of the same word: the other number, or the form without a possessive suffix. */
export function compareForms(exp: FormExplanation): CompareForm[] {
  const lex = grammar.get(exp.lexemeId)
  if (!lex) return []
  const out: CompareForm[] = []
  if (exp.person) {
    const plainForm = grammar.inflect(lex, exp.slot).variants[0]?.text
    if (plainForm) out.push({ label: `${slotLabel(exp.slot)} without a suffix`, form: plainForm, slot: exp.slot, note: 'the same case, without the possessive suffix' })
    return out
  }
  const other = slotKey(exp.number === 'sg' ? 'pl' : 'sg', exp.caseId)
  const otherForm = grammar.inflect(lex, other)
  const text = otherForm.variants[0]?.text
  if (otherForm.status !== 'not-used' && text) {
    out.push({
      label: slotLabel(other),
      form: text,
      slot: other,
      note:
        lex.pos !== 'noun'
          ? `the same case in the ${exp.number === 'sg' ? 'plural' : 'singular'}`
          : exp.number === 'sg'
            ? `the same case for more than one ${firstSense(lex.gloss.en)}`
            : `the same case for one ${firstSense(lex.gloss.en)}`,
    })
  }
  if (exp.caseId !== 'nominative' && exp.caseId !== 'accusative') {
    const base = grammar.inflect(lex, slotKey(exp.number, 'nominative')).variants[0]?.text
    if (base) out.push({ label: slotLabel(slotKey(exp.number, 'nominative')), form: base, slot: slotKey(exp.number, 'nominative'), note: `the ${exp.number === 'sg' ? 'base form' : 'plain plural'}, without a case ending` })
  }
  return out
}

/** "the partitive" etc. */
export function caseName(exp: FormExplanation): string {
  return CASES_INFO[exp.caseId].en
}

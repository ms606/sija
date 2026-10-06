import { looseKey, normalizeForm, type Analyzer } from './analyze'
import { getType } from './declension/registry'
import { swapHarmony, realize } from './harmony'
import { inflect } from './inflect'
import { lastVowel } from './phonology'
import { ALL_SLOTS, parseSlot } from './slots'
import { getStems } from './stems'
import type { IGroup, Lexeme, RuleId, SlotKey, TypeId } from './types'

export type DiagnosisId =
  | 'missing-umlaut'
  | 'wrong-number'
  | 'wrong-case'
  | 'wrong-igroup'
  | 'no-gradation'
  | 'wrong-grade'
  | 'wrong-partitive-ending'
  | 'wrong-illative'
  | 'lemma-plus-ending'
  | 'wrong-harmony'
  | 'rare-slot'

export interface Malform {
  text: string
  diagnosisId: DiagnosisId
  params: Record<string, string>
}

export interface Diagnosis {
  diagnosisId: DiagnosisId | 'unknown'
  params: Record<string, string>
  /** The correct primary form. */
  correct: string
  /** The answer is itself a real form of some word in the lexicon. */
  realWord?: { lexemeId: string; slot: SlotKey }[]
  /** Extra note when the answer is a well-known word outside the lexicon (uusin = 'newest'). */
  noteRuleId?: RuleId
}

const I_GROUP_TYPE: Record<IGroup, TypeId> = { pankki: 'k5', lehti: 'k7', kieli: 'k26', uusi: 'k27' }
const RARE_SLOTS = new Set(['comitative', 'instructive', 'abessive'])

function correctForms(lex: Lexeme, slot: SlotKey): string[] {
  return inflect(lex, slot).variants.map((v) => v.text)
}

/** Builds the forms the word would have if it belonged to another -i family. */
function asOtherGroup(lex: Lexeme, slot: SlotKey): Malform[] {
  const group = getType(lex.typeId).iGroup
  if (!group || lex.compound) return []
  const out: Malform[] = []
  for (const [g, typeId] of Object.entries(I_GROUP_TYPE) as [IGroup, TypeId][]) {
    if (g === group) continue
    const def = getType(typeId)
    const pseudo: Lexeme = { id: `${lex.id}#as-${g}`, lemma: lex.lemma, pos: lex.pos, typeId, kotus: '' }
    if (lex.gradation && def.gradation === 'normal' && !lex.gradation.inverse) pseudo.gradation = lex.gradation
    if (typeId === 'k27' && !lex.lemma.endsWith('si')) continue
    try {
      for (const v of inflect(pseudo, slot).variants) {
        out.push({ text: v.text, diagnosisId: 'wrong-igroup', params: { treatedAs: g, actual: group } })
      }
    } catch {
      // The lemma does not fit that type's shape (e.g. gradation site); skip.
    }
  }
  return out
}

function gradationErrors(lex: Lexeme, correct: string[]): Malform[] {
  const stems = getStems(lex)
  if (!stems.gradation) return []
  const pairs: [string, string][] = [[stems.vowelStrong.text, stems.vowelWeak.text]]
  for (const p of stems.plurals) pairs.push([p.strong.text.slice(0, -1), p.weak.text.slice(0, -1)])
  const out: Malform[] = []
  for (const form of correct) {
    for (const [strong, weak] of pairs) {
      if (strong === weak) continue
      if (form.startsWith(weak) && !form.startsWith(strong)) {
        out.push({ text: strong + form.slice(weak.length), diagnosisId: 'no-gradation', params: { strong, weak } })
      } else if (form.startsWith(strong)) {
        out.push({ text: weak + form.slice(strong.length), diagnosisId: 'wrong-grade', params: { strong, weak } })
      }
    }
  }
  return out
}

function partitiveErrors(lex: Lexeme): Malform[] {
  const stems = getStems(lex)
  const h = stems.harmony.harmony
  const options: [string, string][] = [
    [lex.lemma + realize('A', h), '-A'],
    [stems.vowelStrong.text + realize('A', h), '-A'],
    [stems.vowelStrong.text + realize('tA', h), '-tA'],
    [lex.lemma + realize('ttA', h), '-ttA'],
  ]
  if (stems.consonant) options.push([stems.consonant.text + realize('tA', h), '-tA'])
  return options.map(([text, used]) => ({ text, diagnosisId: 'wrong-partitive-ending', params: { used } }))
}

function illativeErrors(lex: Lexeme): Malform[] {
  const stem = getStems(lex).vowelStrong.text
  const v = lastVowel(stem) ?? ''
  return [
    [`${stem}${v}n`, '-Vn'],
    [`${stem}h${v}n`, '-hVn'],
    [`${stem}seen`, '-seen'],
  ].map(([text, used]) => ({ text: text as string, diagnosisId: 'wrong-illative' as const, params: { used: used as string } }))
}

function lemmaPlusEnding(lex: Lexeme, slot: SlotKey): Malform[] {
  const v = inflect(lex, slot).variants[0]
  const ending = v?.pieces.filter((p) => p.role === 'ending').map((p) => p.text).join('')
  if (!ending) return []
  return [{ text: lex.lemma + ending, diagnosisId: 'lemma-plus-ending', params: { ending: `-${ending}` } }]
}

function harmonyErrors(lex: Lexeme, slot: SlotKey): Malform[] {
  const out: Malform[] = []
  for (const v of inflect(lex, slot).variants) {
    const idx = v.pieces.findIndex((p) => p.role === 'ending')
    if (idx < 0) continue
    const swapped = v.pieces.map((p, i) => (i >= idx ? swapHarmony(p.text) : p.text)).join('')
    out.push({ text: swapped, diagnosisId: 'wrong-harmony', params: {} })
  }
  return out
}

/**
 * Plausible wrong forms for a target, in priority order. Used to explain a
 * learner's mistake and to build distractors.
 */
export function malforms(lex: Lexeme, slot: SlotKey): Malform[] {
  const correct = correctForms(lex, slot)
  const { number, kase } = parseSlot(slot)
  const otherSlots: Malform[] = []
  const rareSlots: Malform[] = []
  for (const other of ALL_SLOTS) {
    if (other === slot || other.endsWith('.accusative')) continue
    const o = parseSlot(other)
    const f = inflect(lex, other)
    if (f.status === 'not-used') continue
    for (const v of f.variants) {
      const m: Malform = {
        text: v.text,
        diagnosisId: o.number !== number ? 'wrong-number' : 'wrong-case',
        params: { slot: other },
      }
      ;(RARE_SLOTS.has(o.kase) ? rareSlots : otherSlots).push({ ...m, diagnosisId: RARE_SLOTS.has(o.kase) ? 'rare-slot' : m.diagnosisId })
    }
  }
  const all: Malform[] = [
    ...otherSlots,
    ...asOtherGroup(lex, slot),
    ...gradationErrors(lex, correct),
    ...(slot === 'sg.partitive' ? partitiveErrors(lex) : []),
    ...(kase === 'illative' && number === 'sg' ? illativeErrors(lex) : []),
    ...lemmaPlusEnding(lex, slot),
    ...harmonyErrors(lex, slot),
    ...rareSlots,
  ]
  const seen = new Set(correct)
  return all.filter((m) => (seen.has(m.text) ? false : (seen.add(m.text), true)))
}

/**
 * Explains why `answer` is not a correct form of `lex` in `slot`.
 * Returns null when the answer is correct.
 */
export function diagnose(
  lex: Lexeme,
  slot: SlotKey,
  answer: string,
  ctx: { analyzer?: Analyzer; knownWords?: Readonly<Record<string, RuleId>> } = {},
): Diagnosis | null {
  const a = normalizeForm(answer)
  const correct = correctForms(lex, slot)
  if (correct.some((c) => normalizeForm(c) === a)) return null
  const primary = correct[0] ?? ''
  const result: Diagnosis = { diagnosisId: 'unknown', params: {}, correct: primary }
  // Typed without ä/ö at all (keyboard issue) — not a harmony error like talossä.
  const noUmlauts = !/[äöå]/.test(a)
  if (noUmlauts && correct.some((c) => /[äö]/.test(c) && looseKey(c) === looseKey(a))) {
    result.diagnosisId = 'missing-umlaut'
  } else {
    const match = malforms(lex, slot).find((m) => normalizeForm(m.text) === a)
    if (match) {
      result.diagnosisId = match.diagnosisId
      result.params = match.params
    }
  }
  const hits = ctx.analyzer?.analyze(a).filter((h) => !(h.lexemeId === lex.id && h.slot === slot)) ?? []
  if (hits.length) result.realWord = hits.map((h) => ({ lexemeId: h.lexemeId, slot: h.slot }))
  const note = ctx.knownWords?.[a]
  if (note) result.noteRuleId = note
  return result
}

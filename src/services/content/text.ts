import { CASES_INFO } from '../../data/cases'
import { DIAGNOSES, type FeedbackId } from '../../data/explanations/diagnoses'
import { RULES } from '../../data/explanations/rules'
import { GRADATION_PATTERNS, getType, parseSlot, type DerivationStep } from '../../grammar'
import type { GradationId, IGroup, PersonId, PieceRole, Predictability, RuleId, SlotKey, TypeId } from '../../grammar/types'
import type { LocalizedText, ModeText } from '../../types/content'
import type { LearnerMode } from '../../stores/settings'

export interface ResolvedText {
  /** Main text in the language chosen for the mode. */
  main: string
  /** Short secondary gloss (English under Finnish in intermediate mode). */
  gloss?: string
  lang: 'en' | 'fi'
}

/**
 * Picks the text for a learner mode:
 *  beginner     → English (with Finnish terms)
 *  intermediate → Finnish when available, English as a small gloss
 *  advanced     → Finnish only (English fallback when no Finnish text exists yet)
 */
export function pickText(text: ModeText, mode: LearnerMode): ResolvedText {
  if (mode === 'beginner') return { main: text.beginner.en, lang: 'en' }
  if (mode === 'intermediate') {
    const fi = text.intermediate?.fi ?? text.beginner.fi
    return fi ? { main: fi, gloss: text.intermediate?.en ?? text.beginner.en, lang: 'fi' } : { main: text.beginner.en, lang: 'en' }
  }
  const fi = text.advanced?.fi ?? text.intermediate?.fi ?? text.beginner.fi
  return fi ? { main: fi, lang: 'fi' } : { main: text.advanced?.en ?? text.beginner.en, lang: 'en' }
}

/** Localized label: English for beginners, Finnish (with English) otherwise. */
export function pickLabel(text: LocalizedText, mode: LearnerMode): string {
  if (mode === 'beginner' || !text.fi) return text.en
  return text.fi
}

/* ---------------- labels ---------------- */

const NUMBER_LABEL = { sg: { en: 'singular', fi: 'yksikön' }, pl: { en: 'plural', fi: 'monikon' } } as const

export function caseName(kase: keyof typeof CASES_INFO, mode: LearnerMode = 'beginner'): string {
  const info = CASES_INFO[kase]
  return mode === 'beginner' ? info.en : info.fi
}

/** "genitive singular" / "yksikön genetiivi". */
export function slotLabel(slot: SlotKey, mode: LearnerMode = 'beginner'): string {
  const { number, kase } = parseSlot(slot)
  if (mode === 'beginner') return `${CASES_INFO[kase].en} ${NUMBER_LABEL[number].en}`
  return `${NUMBER_LABEL[number].fi} ${CASES_INFO[kase].fi}`
}

const CASE_SHORT: Readonly<Record<string, string>> = {
  nominative: 'nom.',
  genitive: 'gen.',
  partitive: 'part.',
  accusative: 'acc.',
  inessive: 'iness.',
  elative: 'elat.',
  illative: 'ill.',
  adessive: 'adess.',
  ablative: 'abl.',
  allative: 'all.',
  essive: 'ess.',
  translative: 'transl.',
  abessive: 'abess.',
  comitative: 'com.',
  instructive: 'instr.',
}

/** Compact label for narrow screens: "gen. sg". */
export function slotShort(slot: SlotKey): string {
  const { number, kase } = parseSlot(slot)
  return `${CASE_SHORT[kase]} ${number}`
}

export const PERSON_LABEL: Readonly<Record<PersonId, LocalizedText>> = {
  '1sg': { en: 'my', fi: 'minun' },
  '2sg': { en: 'your (one person)', fi: 'sinun' },
  '3': { en: 'his / her / their', fi: 'hänen / heidän' },
  '1pl': { en: 'our', fi: 'meidän' },
  '2pl': { en: 'your (several people)', fi: 'teidän' },
}

export const PREDICTABILITY_LABEL: Readonly<Record<Predictability, { short: string; long: LocalizedText }>> = {
  rule: { short: 'Rule', long: { en: 'Rule — works the same way everywhere', fi: 'Sääntö' } },
  pattern: { short: 'Pattern', long: { en: 'Pattern — regular within this word type', fi: 'Malli' } },
  lexical: { short: 'Memorize', long: { en: 'Memorize — a property of this word', fi: 'Opettele' } },
  exception: { short: 'Common exception', long: { en: 'Common exception', fi: 'Tavallinen poikkeus' } },
  irregular: { short: 'Irregular', long: { en: 'Irregular form', fi: 'Epäsäännöllinen' } },
  variant: { short: 'Variant', long: { en: 'Also correct — an accepted variant', fi: 'Rinnakkaismuoto' } },
  advanced: { short: 'Advanced', long: { en: 'Advanced detail', fi: 'Lisätietoa' } },
}

export const ROLE_LABEL: Readonly<Record<PieceRole, { short: string; long: LocalizedText }>> = {
  root: { short: 'Unchanged', long: { en: 'Unchanged — the same as in the base form', fi: 'Muuttumaton osa' } },
  stem: { short: 'Stem change', long: { en: 'Stem change — the stem differs from the base form here', fi: 'Vartalon muutos' } },
  grade: { short: 'Grade', long: { en: 'Consonant gradation — strong or weak grade', fi: 'Astevaihtelu' } },
  ending: { short: 'Case ending', long: { en: 'Case ending', fi: 'Sijapääte' } },
  plural: { short: 'Plural marker', long: { en: 'Plural marker (-i- or -t)', fi: 'Monikon tunnus' } },
  possessive: { short: 'Possessive', long: { en: 'Possessive suffix', fi: 'Omistusliite' } },
  exception: { short: 'Exception', long: { en: 'Exception — must be memorized', fi: 'Poikkeus' } },
}

/** Name of an -i learning family: "pankki family". A family groups several declension types; it is never a type name. */
export function familyName(group: IGroup): string {
  return `${group} family`
}

/**
 * Display name of a declension type, from its own Kotus model word in the
 * registry: "paperi-type", or with `kotus`, "paperi-type · Kotus 6". Never the
 * name of the -i learning family the type is taught in (see `familyName`).
 */
export function typeName(typeId: TypeId, opts: { kotus?: boolean } = {}): string {
  const def = getType(typeId)
  const base = `${def.modelWord}-type`
  return opts.kotus ? `${base} · Kotus ${def.kotus}` : base
}

export function patternLabel(pattern: GradationId): string {
  const p = GRADATION_PATTERNS[pattern]
  return `${p.strong} → ${p.weak || '∅'}`
}

/* ---------------- placeholder filling ---------------- */

function formatParam(key: string, value: string, mode: LearnerMode): string {
  switch (key) {
    case 'slot':
      return value.includes('.') ? slotLabel(value as SlotKey, mode) : value
    case 'pattern':
      return value in GRADATION_PATTERNS ? patternLabel(value as GradationId) : value
    case 'person':
      return pickLabel(PERSON_LABEL[value as PersonId] ?? { en: value }, mode)
    case 'treatedAs':
    case 'actual':
    case 'group':
      // The bare family name; templates say "the {group} family".
      return value
    case 'from':
    case 'to':
    case 'strong':
    case 'weak':
      return value === '' ? '∅' : value
    default:
      return value
  }
}

export function fill(template: string, params: Record<string, string> = {}, mode: LearnerMode = 'beginner'): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = params[key]
    return v === undefined ? `{${key}}` : formatParam(key, v, mode)
  })
}

/** Explanation of one derivation step, in the learner's mode. */
export function ruleText(ruleId: RuleId, params: Record<string, string> | undefined, mode: LearnerMode): ResolvedText {
  const text = RULES[ruleId]
  if (!text) return { main: ruleId, lang: 'en' }
  const r = pickText(text, mode)
  return { ...r, main: fill(r.main, params, mode), ...(r.gloss ? { gloss: fill(r.gloss, params, mode) } : {}) }
}

export function stepText(step: DerivationStep, mode: LearnerMode): ResolvedText {
  return ruleText(step.ruleId, step.params, mode)
}

export function diagnosisText(id: string, params: Record<string, string>, mode: LearnerMode): ResolvedText {
  const r = pickText(DIAGNOSES[id as FeedbackId] ?? DIAGNOSES.unknown, mode)
  return { ...r, main: fill(r.main, params, mode), ...(r.gloss ? { gloss: fill(r.gloss, params, mode) } : {}) }
}

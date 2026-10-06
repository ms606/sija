import type {
  AltStems,
  FormOverride,
  GradationId,
  Harmony,
  PartOfSpeech,
  Predictability,
  RuleId,
  SlotKey,
  TypeId,
} from '../../grammar/types'
import type { IllustrationId, Noun, Provenance, SemanticTag, ThemeId } from '../../types/content'

export const CURATED: Provenance = {
  source: 'curated',
  author: 'Sija curated set (AI-drafted, machine-verified)',
  nativeReview: false,
}

export interface NounOpts {
  id?: string
  pos?: PartOfSpeech
  /** Gradation pattern; prefix with '<' for inverse gradation (sade: '<t-d'). */
  grad?: GradationId | `<${GradationId}`
  emoji?: string
  illustration?: IllustrationId
  sem?: SemanticTag[]
  loc?: Noun['locative']
  themes?: ThemeId[]
  level?: number
  freq?: Noun['frequency']
  /** Compound: [modifier, head lexeme id]. */
  compound?: [string, string]
  overrides?: FormOverride[]
  altStems?: AltStems[]
  jGlide?: boolean
  noGradationNote?: RuleId
  numberUse?: Noun['numberUse']
  preferred?: Partial<Record<SlotKey, string[]>>
  homonyms?: string[]
  notes?: RuleId[]
  harmony?: Harmony
  fi?: string
}

/** Builds a lexicon entry with curated provenance. `kotus` is copied from the Kotus 2024 list. */
export function noun(lemma: string, typeId: TypeId, kotus: string, gloss: string, o: NounOpts = {}): Noun {
  const n: Noun = {
    id: o.id ?? lemma,
    lemma,
    pos: o.pos ?? 'noun',
    typeId,
    kotus,
    gloss: o.fi ? { en: gloss, fi: o.fi } : { en: gloss },
    semantics: o.sem ?? [],
    themes: o.themes ?? [],
    level: o.level ?? 1,
    frequency: o.freq ?? 'common',
    provenance: CURATED,
  }
  if (o.grad) {
    const inverse = o.grad.startsWith('<')
    const pattern = (inverse ? o.grad.slice(1) : o.grad) as GradationId
    n.gradation = inverse ? { pattern, inverse: true } : { pattern }
  }
  if (o.emoji || o.illustration) {
    n.image = { alt: { en: gloss.split(/[;,(]/)[0]?.trim() ?? gloss } }
    if (o.emoji) n.image.emoji = o.emoji
    if (o.illustration) n.image.illustration = o.illustration
  }
  if (o.loc) n.locative = o.loc
  if (o.compound) n.compound = { modifier: o.compound[0], headId: o.compound[1] }
  if (o.overrides) n.overrides = o.overrides
  if (o.altStems) n.altStems = o.altStems
  if (o.jGlide) n.jGlide = true
  if (o.noGradationNote) n.noGradationNote = o.noGradationNote
  if (o.numberUse) n.numberUse = o.numberUse
  if (o.preferred) n.preferred = o.preferred
  if (o.homonyms) n.homonyms = o.homonyms
  if (o.notes) n.notes = o.notes
  if (o.harmony) n.harmony = o.harmony
  return n
}

export const adj = (lemma: string, typeId: TypeId, kotus: string, gloss: string, o: NounOpts = {}): Noun =>
  noun(lemma, typeId, kotus, gloss, { sem: ['quality'], themes: ['descriptions'], ...o, pos: 'adjective' })

export const num = (lemma: string, typeId: TypeId, kotus: string, gloss: string, o: NounOpts = {}): Noun =>
  noun(lemma, typeId, kotus, gloss, { sem: ['number'], themes: ['numbers'], ...o, pos: 'numeral' })

/** A lexical exception that replaces a generated form (e.g. meri → merta). */
export const replaceForm = (slot: SlotKey, forms: string[], ruleId: RuleId, label: Predictability = 'exception'): FormOverride => ({
  slot,
  forms,
  mode: 'replace',
  label,
  ruleId,
})

/** An extra accepted variant that the type rules do not produce. */
export const addVariant = (slot: SlotKey, forms: string[], ruleId: RuleId, label: Predictability = 'variant'): FormOverride => ({
  slot,
  forms,
  mode: 'add-variant',
  label,
  ruleId,
})

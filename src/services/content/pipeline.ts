import type { DerivationStep, FormVariant, LocalizedText, Predictability } from '../../types/content'

export type StageId = 'base' | 'type' | 'stem' | 'change' | 'number-case' | 'form'

export interface Stage {
  id: StageId
  title: LocalizedText
  /** What the word looks like after this stage (e.g. "vete-"). */
  result: string
  steps: DerivationStep[]
  /** Least predictable label among the steps (for the stage badge). */
  label: Predictability
}

export const STAGE_TITLES: Readonly<Record<StageId, LocalizedText>> = {
  base: { en: 'Base word', fi: 'Perusmuoto' },
  type: { en: 'Word type', fi: 'Taivutustyyppi' },
  stem: { en: 'Stem', fi: 'Vartalo' },
  change: { en: 'Stem change', fi: 'Vartalon muutos' },
  'number-case': { en: 'Number & case', fi: 'Luku ja sija' },
  form: { en: 'Final form', fi: 'Valmis muoto' },
}

const SEVERITY: Record<Predictability, number> = {
  rule: 0,
  variant: 0,
  advanced: 0,
  pattern: 1,
  lexical: 2,
  exception: 3,
  irregular: 4,
}

function stageOf(step: DerivationStep): StageId | null {
  switch (step.kind) {
    case 'lemma':
      return 'base'
    case 'type':
      return 'type'
    case 'stem':
      return 'stem'
    case 'gradation':
    case 'stem-change':
    case 'override':
      return 'change'
    case 'spelling':
      return step.ruleId === 'spelling.plural-glide' ? 'number-case' : 'change'
    case 'plural':
    case 'ending':
    case 'harmony':
    case 'possessive':
      return 'number-case'
    case 'result':
      return 'form'
  }
}

/**
 * Regroups a form's derivation into the teaching sequence
 * BASE → TYPE → STEM → STEM CHANGE → NUMBER & CASE → FINAL FORM.
 */
export function buildStages(variant: FormVariant): Stage[] {
  const groups: Record<StageId, DerivationStep[]> = { base: [], type: [], stem: [], change: [], 'number-case': [], form: [] }
  for (const step of variant.steps) {
    const id = stageOf(step)
    if (id) groups[id].push(step)
  }
  const lemma = groups.base[0]?.after ?? ''
  const lastText = (steps: DerivationStep[], fallback: string) => {
    const changed = steps.filter((s) => s.after !== s.before && s.after !== '')
    return changed[changed.length - 1]?.after ?? fallback
  }
  const stemResult = lastText(groups.stem, lemma)
  const changeResult = lastText(groups.change, stemResult)
  const order: StageId[] = ['base', 'type', 'stem', 'change', 'number-case', 'form']
  return order.map((id) => {
    const steps = groups[id]
    const result =
      id === 'base' || id === 'type'
        ? lemma
        : id === 'stem'
          ? `${stemResult}-`
          : id === 'change'
            ? `${changeResult}-`
            : variant.text
    const label = steps.reduce<Predictability>((best, s) => (SEVERITY[s.label] > SEVERITY[best] ? s.label : best), 'rule')
    return { id, title: STAGE_TITLES[id], result, steps, label }
  })
}

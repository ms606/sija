import type { DerivationStep, FormVariant, Predictability } from './types'

export const PREDICTABILITY_ORDER: readonly Predictability[] = [
  'rule',
  'pattern',
  'lexical',
  'exception',
  'irregular',
  'variant',
  'advanced',
]

/** Steps grouped by how predictable they are (answers "which parts are rules, which are lexical?"). */
export function predictability(v: FormVariant): Record<Predictability, DerivationStep[]> {
  const out = Object.fromEntries(PREDICTABILITY_ORDER.map((p) => [p, [] as DerivationStep[]])) as Record<
    Predictability,
    DerivationStep[]
  >
  for (const s of v.steps) {
    if (s.kind === 'lemma' || s.kind === 'result') continue
    out[s.label].push(s)
  }
  return out
}

const SEVERITY: Partial<Record<Predictability, number>> = { rule: 0, pattern: 1, lexical: 2, exception: 3, irregular: 4 }

/** The least predictable thing about a form — what the learner most needs to notice. */
export function headlineLabel(v: FormVariant): Predictability {
  let best: Predictability = 'rule'
  for (const s of v.steps) {
    if (s.kind === 'lemma' || s.kind === 'result') continue
    const sev = SEVERITY[s.label]
    if (sev !== undefined && sev > (SEVERITY[best] ?? 0)) best = s.label
  }
  return best
}

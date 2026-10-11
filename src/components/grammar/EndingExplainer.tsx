import { GENERAL_RULES, PLURAL_GLIDE_NOTE } from '../../data/explanations/general'
import type { Predictability, RuleId, SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { cx } from '../../utils/cx'
import { StatusLabel } from '../ui/StatusLabel'
import { FormLine } from './FormLine'

interface Group {
  ruleId: RuleId
  /** Plural i written j (taloja) or not (kieliä); undefined when the ending has no plural -i- before it. */
  glide?: boolean
  label: Predictability
  lexemeIds: string[]
}

/**
 * Groups example words by the ending rule the engine chose for one slot
 * (-a / -ta / -tta for the partitive, -en / -den / -ten for the plural
 * genitive …) and, after the plural -i-, by whether the i is written j.
 * The rule text is general; every word listed under it was derived with
 * exactly that rule, so an example can never illustrate another pattern.
 */
export function EndingExplainer({ slot, words, className }: { slot: SlotKey; words: string[]; className?: string }) {
  const groups = new Map<string, Group>()
  for (const id of words) {
    const lex = grammar.get(id)
    const v = lex && grammar.inflect(lex, slot).variants[0]
    const step = v?.steps.find((s) => s.kind === 'ending')
    if (!lex || !v || !step) continue
    // Only endings that begin with a vowel (-a/-ä, -en) put the plural i between two vowels.
    const vowelEnding = step.ruleId === 'ending.partitive-pl.a' || step.ruleId === 'ending.genitive-pl.en'
    const glide = vowelEnding && v.steps.some((s) => s.kind === 'plural') ? v.steps.some((s) => s.ruleId === 'spelling.plural-glide') : undefined
    const key = `${step.ruleId}:${glide ?? ''}`
    const g = groups.get(key) ?? { ruleId: step.ruleId, ...(glide !== undefined ? { glide } : {}), label: step.label, lexemeIds: [] }
    g.lexemeIds.push(lex.id)
    groups.set(key, g)
  }
  return (
    <ul className={cx('space-y-3', className)}>
      {[...groups.values()].map((g) => (
        <li key={`${g.ruleId}:${g.glide ?? ''}`} className="rounded-xl border border-border p-3">
          <p className="flex flex-wrap items-baseline gap-2">
            <StatusLabel label={g.label} />
            <span>
              {GENERAL_RULES[g.ruleId] ?? g.ruleId}
              {g.glide !== undefined && <> {g.glide ? PLURAL_GLIDE_NOTE.glide : PLURAL_GLIDE_NOTE['no-glide']}</>}
            </span>
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {g.lexemeIds.map((id) => (
              <li key={id}>
                <FormLine lexeme={grammar.require(id)} slot={slot} size="sm" />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

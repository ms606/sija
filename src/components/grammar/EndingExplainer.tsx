import type { RuleId, SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { ruleText } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { StatusLabel } from '../ui/StatusLabel'
import { FormLine } from './FormLine'

/**
 * Groups example words by the ending rule the engine chose for one slot
 * (-a / -ta / -tta for the partitive, -jen / -ien / -ten / -iden for the
 * plural genitive…). The rule text comes from the derivation, never from the UI.
 */
export function EndingExplainer({ slot, words, className }: { slot: SlotKey; words: string[]; className?: string }) {
  const mode = useSettings((s) => s.mode)
  const groups = new Map<RuleId, { lexemeId: string; params: Record<string, string> }[]>()
  for (const id of words) {
    const lex = grammar.get(id)
    const v = lex && grammar.inflect(lex, slot).variants[0]
    const step = v?.steps.find((s) => s.kind === 'ending')
    if (!lex || !step) continue
    const list = groups.get(step.ruleId) ?? []
    list.push({ lexemeId: lex.id, params: step.params ?? {} })
    groups.set(step.ruleId, list)
  }
  return (
    <ul className={cx('space-y-3', className)}>
      {[...groups].map(([ruleId, examples]) => {
        const params: Record<string, string> = {}
        for (const ex of examples) {
          for (const [k, v] of Object.entries(ex.params)) {
            const seen = params[k]?.split(' / ') ?? []
            if (!seen.includes(v)) params[k] = [...seen, v].join(' / ')
          }
        }
        const text = ruleText(ruleId, params, mode)
        const label = grammar.inflect(grammar.require(examples[0]!.lexemeId), slot).variants[0]?.steps.find((s) => s.kind === 'ending')?.label ?? 'rule'
        return (
          <li key={ruleId} className="rounded-xl border border-border p-3">
            <p className="flex flex-wrap items-baseline gap-2">
              <StatusLabel label={label} />
              <span lang={text.lang}>{text.main}</span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {examples.map((ex) => (
                <li key={ex.lexemeId}>
                  <FormLine lexeme={grammar.require(ex.lexemeId)} slot={slot} size="sm" />
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

import type { RuleId } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { ruleText } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'
import { StatusLabel } from '../ui/StatusLabel'
import { FormLine } from './FormLine'

const DEFAULT_WORDS = ['talo', 'kauppa', 'kala', 'koira', 'päivä', 'pankki', 'lehti', 'kieli', 'nainen', 'maa', 'perhe', 'vieras', 'tie', 'työ', 'uusi', 'käsi', 'terveys']

/**
 * How the plural -i- changes the stem, grouped by the rule the engine
 * applied for each example word (taloi-, kauppoi-, koiri-, pankkei-, mai-, töi-…).
 */
export function PluralStemExplainer({ words = DEFAULT_WORDS, className }: { words?: string[]; className?: string }) {
  const mode = useSettings((s) => s.mode)
  const groups = new Map<RuleId, { lexemeId: string; before: string; after: string; params?: Record<string, string> }[]>()
  for (const id of words) {
    const lex = grammar.get(id)
    const v = lex && grammar.inflect(lex, 'pl.partitive').variants[0]
    const step = v?.steps.find((s) => s.ruleId.startsWith('plural.') && s.ruleId !== 'plural.i' && s.ruleId !== 'plural.t')
    if (!lex || !step) continue
    const list = groups.get(step.ruleId) ?? []
    list.push({ lexemeId: lex.id, before: step.before, after: step.after, ...(step.params ? { params: step.params } : {}) })
    groups.set(step.ruleId, list)
  }
  return (
    <ul className={cx('space-y-3', className)}>
      {[...groups].map(([ruleId, examples]) => {
        // One heading for several words: list each distinct value (aa / ee) instead of the first word's.
        const params: Record<string, string> = {}
        for (const ex of examples) {
          for (const [k, v] of Object.entries(ex.params ?? {})) {
            const seen = params[k]?.split(' / ') ?? []
            if (!seen.includes(v)) params[k] = [...seen, v].join(' / ')
          }
        }
        const text = ruleText(ruleId, params, mode)
        return (
          <li key={ruleId} className="rounded-xl border border-border p-3">
            <p className="flex flex-wrap items-baseline gap-2">
              <StatusLabel label={ruleId === 'plural.lemma' ? 'pattern' : 'rule'} />
              <span lang={text.lang}>{text.main}</span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {examples.map((ex) => {
                const lex = grammar.require(ex.lexemeId)
                return (
                  <li key={ex.lexemeId} className="flex flex-wrap items-center gap-x-1.5 text-[0.97rem]">
                    <Fi className="font-semibold">{lex.lemma}</Fi>
                    <span className="text-muted">→</span>
                    <Fi className="seg seg-plural px-1 text-sm font-semibold">{ex.after}-</Fi>
                    <span className="text-muted">→</span>
                    <FormLine lexeme={lex} slot="pl.partitive" size="sm" audio={false} showVariants={false} />
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

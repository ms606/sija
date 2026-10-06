import { CASES_INFO, CASE_ORDER } from '../../data/cases'
import type { CaseId, Lexeme, NumberId, SlotKey } from '../../grammar/types'
import { RULES } from '../../data/explanations/rules'
import { grammar } from '../../services/grammar'
import { useExplain } from '../../stores/explain'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { Fi } from '../ui/FiText'
import { ColoredForm } from './ColoredForm'

const NUMBER_LABEL: Record<NumberId, { en: string; fi: string }> = {
  sg: { en: 'Singular', fi: 'Yksikkö' },
  pl: { en: 'Plural', fi: 'Monikko' },
}

function Cell({ lexeme, slot, highlight }: { lexeme: Lexeme; slot: SlotKey; highlight?: boolean }) {
  const open = useExplain((s) => s.open)
  const form = grammar.inflect(lexeme, slot)
  if (form.status === 'not-used') {
    const why = form.statusRuleId ? RULES[form.statusRuleId]?.beginner.en : undefined
    return (
      <span className="text-muted" title={why}>
        —<span className="sr-only">{why ?? 'not used'}</span>
      </span>
    )
  }
  const [primary, ...others] = form.variants.filter((v) => v.register !== 'rare')
  if (!primary) return null
  return (
    <div className={cx('flex items-start gap-1.5', form.status === 'rare' && 'opacity-70')}>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => open({ lexemeId: lexeme.id, slot })}
          className={cx(
            'rounded-md px-1 text-left text-[1.05rem] font-semibold hover:bg-surface-2',
            highlight && 'bg-primary-soft ring-2 ring-primary',
          )}
          aria-label={`${primary.text} — show how it is built`}
        >
          <ColoredForm variant={primary} />
        </button>
        {others.length > 0 && (
          <p className="px-1 text-xs text-muted">
            also <Fi>{others.map((o) => o.text).join(', ')}</Fi>
          </p>
        )}
        {form.status === 'rare' && <p className="px-1 text-xs text-muted">rarely used</p>}
      </div>
      <AudioButton text={primary.text} size="sm" slow={false} className="ml-auto" />
    </div>
  )
}

/**
 * Full paradigm. A real table on wide screens; on phones each row becomes a
 * small card (case name above, singular and plural side by side).
 */
export function DeclensionTable({
  lexeme,
  cases = CASE_ORDER.filter((c) => c !== 'accusative'),
  numbers = ['sg', 'pl'],
  highlight,
  className,
}: {
  lexeme: Lexeme
  cases?: readonly CaseId[]
  numbers?: NumberId[]
  highlight?: SlotKey
  className?: string
}) {
  const mode = useSettings((s) => s.mode)
  const fiFirst = mode !== 'beginner'
  return (
    <table className={cx('w-full border-separate border-spacing-0 text-left', className)}>
      <caption className="sr-only">
        Forms of {lexeme.lemma} in {numbers.length > 1 ? 'singular and plural' : numbers[0] === 'sg' ? 'singular' : 'plural'}
      </caption>
      <thead className="max-sm:sr-only">
        <tr>
          <th scope="col" className="border-b border-border py-2 pr-3 text-xs font-bold tracking-wide text-muted uppercase">
            Case
          </th>
          {numbers.map((n) => (
            <th key={n} scope="col" className="border-b border-border px-2 py-2 text-xs font-bold tracking-wide text-muted uppercase">
              {fiFirst ? NUMBER_LABEL[n].fi : NUMBER_LABEL[n].en}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cases.map((c) => {
          const info = CASES_INFO[c]
          return (
            <tr key={c} className="max-sm:mb-2 max-sm:grid max-sm:grid-cols-2 max-sm:rounded-xl max-sm:border max-sm:border-border max-sm:bg-surface max-sm:p-2">
              <th scope="row" className="border-border py-2 pr-3 align-top font-normal max-sm:col-span-2 max-sm:pb-1 sm:border-b">
                <span className="block font-semibold">{fiFirst ? <Fi>{info.fi}</Fi> : info.en}</span>
                <span className="block text-xs text-muted">
                  {fiFirst ? info.en : <Fi>{info.fi}</Fi>} · <Fi>{info.questions[0]?.fi ?? ''}</Fi>
                </span>
              </th>
              {numbers.map((n) => {
                const slot = `${n}.${c}` as SlotKey
                return (
                  <td key={n} className="border-border px-2 py-2 align-top sm:border-b">
                    <span className="mb-0.5 block text-[0.65rem] font-bold tracking-wide text-muted uppercase sm:hidden">
                      {fiFirst ? NUMBER_LABEL[n].fi : NUMBER_LABEL[n].en}
                    </span>
                    <Cell lexeme={lexeme} slot={slot} highlight={highlight === slot} />
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

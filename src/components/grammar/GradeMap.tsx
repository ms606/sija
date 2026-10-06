import { CASES_INFO, CASE_ORDER } from '../../data/cases'
import type { CaseId, Lexeme, NumberId, SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { caseName } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'
import { FormLine } from './FormLine'

const CASES: CaseId[] = CASE_ORDER.filter((c) => c !== 'accusative' && c !== 'comitative' && c !== 'instructive')

function GradeTag({ grade }: { grade: 'strong' | 'weak' }) {
  return (
    <span
      className={cx(
        'inline-flex min-w-14 justify-center rounded-md px-1.5 py-0.5 text-[0.68rem] font-bold tracking-wide uppercase',
        grade === 'strong' ? 'bg-[var(--grade-bg)] text-[var(--grade-fg)]' : 'border border-dashed border-[var(--grade-bd)] text-[var(--grade-fg)]',
      )}
    >
      {grade}
    </span>
  )
}

/**
 * Which forms of a word have the strong grade and which the weak grade —
 * read from the engine's derivations, so inverse words (sade) come out right.
 */
export function GradeMap({ lexeme, className }: { lexeme: Lexeme; className?: string }) {
  const mode = useSettings((s) => s.mode)
  const info = grammar.gradation(lexeme)
  const gradeOf = (slot: SlotKey): 'strong' | 'weak' | null =>
    info?.strongSlots.includes(slot) ? 'strong' : info?.weakSlots.includes(slot) ? 'weak' : null
  const numbers: NumberId[] = ['sg', 'pl']
  return (
    <table className={cx('w-full border-separate border-spacing-0 text-left', className)}>
      <caption className="sr-only">Strong and weak grade in the forms of {lexeme.lemma}</caption>
      <thead className="max-sm:sr-only">
        <tr className="text-xs font-bold tracking-wide text-muted uppercase">
          <th scope="col" className="border-b border-border py-2 pr-3">
            Case
          </th>
          {numbers.map((n) => (
            <th key={n} scope="col" className="border-b border-border px-2 py-2">
              {n === 'sg' ? 'Singular' : 'Plural'}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {CASES.map((c) => (
          <tr key={c} className="max-sm:mb-2 max-sm:grid max-sm:grid-cols-2 max-sm:rounded-xl max-sm:border max-sm:border-border max-sm:p-2">
            <th scope="row" className="border-border py-1.5 pr-3 align-top font-semibold max-sm:col-span-2 sm:border-b">
              {caseName(c, mode)}
              <span className="ml-1.5 text-xs font-normal text-muted">
                <Fi>{CASES_INFO[c].questions[0]?.fi}</Fi>
              </span>
            </th>
            {numbers.map((n) => {
              const slot = `${n}.${c}` as SlotKey
              const g = gradeOf(slot)
              return (
                <td key={n} className={cx('border-border px-1 py-1.5 align-top sm:border-b', g === 'weak' && 'bg-surface-2/60')}>
                  <div className="flex flex-col items-start gap-1">
                    {g ? <GradeTag grade={g} /> : <span className="text-xs text-muted sm:hidden">{n === 'sg' ? 'singular' : 'plural'}</span>}
                    <FormLine lexeme={lexeme} slot={slot} size="sm" showVariants={false} />
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

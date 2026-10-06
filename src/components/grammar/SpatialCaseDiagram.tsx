import { Link } from 'react-router'
import { CASES_INFO } from '../../data/cases'
import type { CaseId, SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { caseName } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { Fi } from '../ui/FiText'

type Motion = 'static' | 'from' | 'to'

const ROWS: { surface: 'inside' | 'surface'; lexemeId: string; title: string; cases: Record<Motion, CaseId> }[] = [
  { surface: 'inside', lexemeId: 'talo', title: 'Inside', cases: { static: 'inessive', from: 'elative', to: 'illative' } },
  { surface: 'surface', lexemeId: 'pöytä', title: 'On / at', cases: { static: 'adessive', from: 'ablative', to: 'allative' } },
]
const COLUMNS: { motion: Motion; title: string }[] = [
  { motion: 'static', title: 'where' },
  { motion: 'from', title: 'from' },
  { motion: 'to', title: 'to' },
]

/** Small schematic: a box (inside) or a surface line, with a dot or an arrow. */
function Glyph({ surface, motion }: { surface: 'inside' | 'surface'; motion: Motion }) {
  return (
    <svg viewBox="0 0 72 48" className="h-10 w-16 shrink-0" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      {surface === 'inside' ? (
        <path d="M16 44V22L30 10l14 12v22Z" stroke="currentColor" strokeWidth="2.5" className="text-muted" />
      ) : (
        <path d="M8 34h44M14 34v10M46 34v10" stroke="currentColor" strokeWidth="2.5" className="text-muted" />
      )}
      {motion === 'static' && <circle cx={30} cy={surface === 'inside' ? 32 : 27} r={5} className="fill-[var(--ending-fg)]" />}
      {motion === 'from' && (
        <path
          d={surface === 'inside' ? 'M30 32h34m-6-6 6 6-6 6' : 'M30 27 60 8m-8 0h8v8'}
          stroke="var(--ending-fg)"
          strokeWidth="3"
        />
      )}
      {motion === 'to' && (
        <path
          d={surface === 'inside' ? 'M66 32H34m6-6-6 6 6 6' : 'M62 6 32 25m0-8v8h8'}
          stroke="var(--ending-fg)"
          strokeWidth="3"
        />
      )}
    </svg>
  )
}

/**
 * The six place cases as a 2 × 3 grid: inside (talo) vs on/at (pöytä),
 * and where / from / to. Every form comes from the engine.
 */
export function SpatialCaseDiagram({ highlight, className }: { highlight?: CaseId; className?: string }) {
  const mode = useSettings((s) => s.mode)
  return (
    <div className={cx('overflow-hidden rounded-2xl border border-border', className)}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">The six place cases: inside and on/at, for where, from and to</caption>
        <thead>
          <tr className="bg-surface-2">
            <td className="w-0 p-2" />
            {COLUMNS.map((c) => (
              <th key={c.motion} scope="col" className="p-2 text-xs font-bold tracking-wide text-muted uppercase">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const noun = grammar.require(row.lexemeId)
            return (
              <tr key={row.surface} className="border-t border-border">
                <th scope="row" className="bg-surface-2 p-2 align-middle text-xs font-bold tracking-wide text-muted uppercase [writing-mode:vertical-rl] rotate-180 sm:rotate-0 sm:[writing-mode:horizontal-tb]">
                  {row.title}
                </th>
                {COLUMNS.map((col) => {
                  const kase = row.cases[col.motion]
                  const slot = `sg.${kase}` as SlotKey
                  const form = grammar.primary(noun, slot) ?? ''
                  const active = highlight === kase
                  return (
                    <td key={col.motion} className={cx('relative p-0 align-top', active && 'bg-primary-soft')}>
                      <div className="flex flex-col items-start gap-1 p-2 sm:flex-row sm:items-center sm:gap-2 sm:p-3">
                        <Glyph surface={row.surface} motion={col.motion} />
                        <div className="min-w-0">
                          <Link
                            to={`/cases/${kase}`}
                            className={cx('block font-semibold leading-tight hover:underline', active && 'text-primary-strong')}
                            aria-current={active ? 'true' : undefined}
                          >
                            <Fi className="text-[1.05rem]">{form}</Fi>
                          </Link>
                          <span className="block text-xs text-muted">
                            {caseName(kase, mode)} · <Fi>{CASES_INFO[kase].questions[0]?.fi}</Fi>
                          </span>
                        </div>
                        <AudioButton text={form} size="sm" slow={false} className="sm:ml-auto" />
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

import type { SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { slotLabel, slotShort } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'
import { FormLine } from './FormLine'

/** Words × forms. Scrolls sideways inside its own box on narrow screens, with the word column pinned. */
export function CompareTable({ nounIds, slots, className }: { nounIds: string[]; slots: SlotKey[]; className?: string }) {
  const mode = useSettings((s) => s.mode)
  const words = nounIds.map((id) => grammar.get(id)).filter((w): w is NonNullable<typeof w> => !!w)
  return (
    <div className={cx('relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <table className="w-full border-separate border-spacing-0 text-left" style={{ minWidth: `${Math.max(18, 7 + slots.length * 8)}rem` }}>
        <thead>
          <tr className="text-xs font-bold tracking-wide text-muted uppercase">
            <th scope="col" className="sticky left-0 z-10 border-b border-border bg-surface py-2 pr-2">
              Word
            </th>
            {slots.map((s) => (
              <th key={s} scope="col" className="border-b border-border px-1 py-2">
                <span className="sm:hidden">{slotShort(s)}</span>
                <span className="max-sm:hidden">{slotLabel(s, mode)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {words.map((w) => (
            <tr key={w.id}>
              <th scope="row" className="sticky left-0 z-10 border-b border-border bg-surface py-1.5 pr-2 align-top font-normal shadow-[4px_0_6px_-6px_rgb(0_0_0/0.3)]">
                <Fi className="font-semibold">{w.lemma}</Fi>
                <span className="block max-w-28 truncate text-xs text-muted">{w.gloss.en.split(/[;,]/)[0]}</span>
              </th>
              {slots.map((s) => (
                <td key={s} className="border-b border-border px-0 py-1.5 align-top">
                  <FormLine lexeme={w} slot={s} size="sm" audio={false} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

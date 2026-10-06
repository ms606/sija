import { I_COMPARE_SLOTS, I_GROUP_INFO, I_GROUP_ORDER } from '../../data/noun-families'
import type { IGroup, SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { slotLabel, slotShort } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'
import { FormLine } from './FormLine'

/**
 * The four -i families side by side. Scrolls horizontally on phones with the
 * case column pinned, so the page itself never scrolls sideways.
 */
export function ITypeComparison({
  words,
  slots = I_COMPARE_SLOTS,
  highlight = ['sg.genitive', 'sg.partitive'],
  className,
}: {
  /** One lexeme per column; defaults to the four model words. */
  words?: string[]
  slots?: readonly SlotKey[]
  highlight?: SlotKey[]
  className?: string
}) {
  const mode = useSettings((s) => s.mode)
  const columns = (words ?? I_GROUP_ORDER.map((g: IGroup) => I_GROUP_INFO[g].model)).map((id) => grammar.require(id))
  return (
    <div className={cx('relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <table className="w-full min-w-[30rem] border-separate border-spacing-0 text-left">
        <caption className="sr-only">Forms of the four -i word families compared</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 border-b border-border bg-surface py-2 pr-2 text-xs font-bold tracking-wide text-muted uppercase">
              Form
            </th>
            {columns.map((w) => {
              const g = grammar.type(w).iGroup
              return (
                <th key={w.id} scope="col" className="border-b border-border px-1 py-2 align-bottom">
                  <Fi className="block text-lg font-bold">{w.lemma}</Fi>
                  <span className="block text-xs font-semibold text-muted">{g ? I_GROUP_INFO[g].keyChange.en : grammar.type(w).modelWord}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const key = highlight.includes(slot)
            return (
              <tr key={slot} className={cx(key && 'bg-primary-soft/50')}>
                <th
                  scope="row"
                  className={cx(
                    'sticky left-0 z-10 border-b border-border py-1.5 pr-2 align-top text-sm font-semibold shadow-[4px_0_6px_-6px_rgb(0_0_0/0.3)]',
                    key ? 'bg-primary-soft' : 'bg-surface',
                  )}
                >
                  <span className="sm:hidden">{slotShort(slot)}</span>
                  <span className="max-sm:hidden">{slotLabel(slot, mode)}</span>
                  {key && <span className="block text-[0.65rem] font-bold tracking-wide text-primary-strong uppercase">key</span>}
                </th>
                {columns.map((w) => (
                  <td key={w.id} className="border-b border-border px-0 py-1.5 align-top">
                    <FormLine lexeme={w} slot={slot} size="sm" audio={false} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

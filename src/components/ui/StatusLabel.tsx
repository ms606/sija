import { AlertTriangle, ArrowLeftRight, Bookmark, CircleCheck, GraduationCap, Repeat, TriangleAlert } from 'lucide-react'
import type { Predictability } from '../../grammar/types'
import { PREDICTABILITY_LABEL } from '../../services/content/text'
import { cx } from '../../utils/cx'

const STYLE: Record<Predictability, { cls: string; Icon: typeof CircleCheck }> = {
  rule: { cls: 'bg-success-soft text-success', Icon: CircleCheck },
  pattern: { cls: 'bg-primary-soft text-primary-strong', Icon: Repeat },
  lexical: { cls: 'bg-[var(--stem-bg)] text-[var(--stem-fg)]', Icon: Bookmark },
  exception: { cls: 'bg-warning-soft text-warning', Icon: TriangleAlert },
  irregular: { cls: 'bg-error-soft text-error', Icon: AlertTriangle },
  variant: { cls: 'bg-surface-2 text-muted', Icon: ArrowLeftRight },
  advanced: { cls: 'bg-surface-2 text-muted', Icon: GraduationCap },
}

/** RULE / PATTERN / MEMORIZE / COMMON EXCEPTION / IRREGULAR / VARIANT / ADVANCED — icon + text + tint. */
export function StatusLabel({ label, className }: { label: Predictability; className?: string }) {
  const { cls, Icon } = STYLE[label]
  const text = PREDICTABILITY_LABEL[label]
  return (
    <span
      className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide', cls, className)}
      title={text.long.en}
    >
      <Icon aria-hidden className="size-3.5" />
      {text.short}
    </span>
  )
}

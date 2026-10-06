import { cx } from '../../utils/cx'

/** Accessible progress bar; value 0–1. */
export function ProgressBar({
  value,
  label,
  showValue = true,
  tone = 'primary',
  size = 'md',
  className,
}: {
  value: number
  label: string
  showValue?: boolean
  tone?: 'primary' | 'success' | 'warning'
  size?: 'sm' | 'md'
  className?: string
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  const bar = tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-primary'
  return (
    <div className={cx('w-full', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        {showValue && <span className="tabular-nums text-muted">{pct}%</span>}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className={cx('w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div className={cx('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

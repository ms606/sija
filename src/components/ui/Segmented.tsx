import { useId } from 'react'
import { cx } from '../../utils/cx'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  hint?: string
}

/** A radio group styled as a segmented control (keyboard: arrow keys). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className,
}: {
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const name = useId()
  return (
    <fieldset className={cx('min-w-0', className)}>
      <legend className="sr-only">{label}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-border bg-surface-2 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'relative cursor-pointer rounded-lg font-semibold transition-colors',
              size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-3.5 py-2 text-[0.95rem]',
              value === o.value ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text',
            )}
            title={o.hint}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="peer-focus-visible:underline peer-focus-visible:decoration-2 peer-focus-visible:underline-offset-4">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

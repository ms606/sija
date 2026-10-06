import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../utils/cx'

export function Card({
  className,
  children,
  as: As = 'section',
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: 'section' | 'article' | 'div' | 'li' }) {
  return (
    <As className={cx('rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5', className)} {...rest}>
      {children}
    </As>
  )
}

export function CardTitle({ children, sub, className }: { children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3', className)}>
      <h2 className="text-lg font-semibold leading-snug">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </div>
  )
}

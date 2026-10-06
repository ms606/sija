import type { HTMLAttributes } from 'react'

/** Finnish text, marked with lang="fi" so screen readers pronounce it correctly. */
export function Fi({ children, className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span lang="fi" className={className} {...rest}>
      {children}
    </span>
  )
}

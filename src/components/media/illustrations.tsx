import type { SVGProps } from 'react'
import { ART } from './illustration-art'

export function Illustration({ id, title, ...rest }: { id: string; title: string } & SVGProps<SVGSVGElement>) {
  const art = ART[id]
  if (!art) return null
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      {...rest}
    >
      <title>{title}</title>
      {art}
    </svg>
  )
}

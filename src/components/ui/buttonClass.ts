import { cx } from '../../utils/cx'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
export type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong border border-transparent',
  secondary: 'bg-surface text-text border border-border-strong hover:bg-surface-2',
  soft: 'bg-primary-soft text-primary-strong border border-transparent hover:brightness-95',
  ghost: 'bg-transparent text-text border border-transparent hover:bg-surface-2',
  danger: 'bg-error text-white border border-transparent hover:brightness-95',
}
const SIZE: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-[0.95rem] gap-2',
  lg: 'min-h-12 px-5 text-base gap-2',
}

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', extra?: string): string {
  return cx(
    'inline-flex items-center justify-center rounded-xl font-semibold transition-colors select-none',
    'disabled:opacity-50 disabled:pointer-events-none',
    VARIANT[variant],
    SIZE[size],
    extra,
  )
}

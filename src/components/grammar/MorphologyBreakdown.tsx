import { useState } from 'react'
import type { FormVariant, Piece, PieceRole } from '../../grammar/types'
import { ROLE_LABEL, ruleText } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'

const SIZE = {
  sm: 'text-lg gap-0.5',
  md: 'text-2xl gap-0.5',
  lg: 'text-4xl gap-1',
  xl: 'text-5xl gap-1',
  hero: 'text-[2.1rem] gap-0.5 sm:text-5xl sm:gap-1',
} as const

function pieceLabel(p: Piece): string {
  if (p.role === 'grade') return p.grade === 'weak' ? 'Weak' : 'Strong'
  return ROLE_LABEL[p.role].short
}

function pieceDescription(p: Piece): string {
  const role = ROLE_LABEL[p.role].long.en
  if (p.text === '' && p.was) return `${p.was} disappears — ${role}`
  const was = p.was !== undefined && p.was !== p.text ? (p.was === '' ? ' (added)' : `, was ${p.was}`) : ''
  return `${p.text}${was} — ${role}`
}

/**
 * The colour-coded anatomy of a word form. Colour is backed up by labels,
 * border styles and accessible names, never used alone.
 */
export function MorphologyBreakdown({
  variant,
  size = 'md',
  showLabels,
  showGhosts = true,
  highlight,
  interactive = true,
  className,
}: {
  variant: FormVariant
  size?: keyof typeof SIZE
  showLabels?: boolean
  showGhosts?: boolean
  /** Roles to emphasise; other pieces are dimmed. */
  highlight?: PieceRole[] | null
  interactive?: boolean
  className?: string
}) {
  const mode = useSettings((s) => s.mode)
  const labelsSetting = useSettings((s) => s.showRoleLabels)
  const labels = showLabels ?? labelsSetting
  const [selected, setSelected] = useState<number | null>(null)
  const pieces = variant.pieces.filter((p) => showGhosts || p.text !== '')
  const sel = selected !== null ? pieces[selected] : undefined
  const explanation = sel?.ruleId ? ruleText(sel.ruleId, {}, mode) : null

  return (
    <div className={className}>
      <Fi className={cx('fi-form inline-flex flex-wrap items-start font-semibold', SIZE[size])} aria-label={variant.text}>
        {pieces.map((p, i) => {
          const ghost = p.text === ''
          const dim = highlight && highlight.length > 0 && !highlight.includes(p.role)
          const content = (
            <>
              <span className={ghost ? 'seg-text seg-ghost' : 'seg-text'}>{ghost ? p.was : p.text}</span>
              {labels && !ghost && <span className="seg-label">{pieceLabel(p)}</span>}
            </>
          )
          const cls = cx('seg', `seg-${p.role}`, dim && 'seg-dim', selected === i && 'seg-focus')
          return interactive ? (
            <button
              key={i}
              type="button"
              className={cls}
              aria-label={pieceDescription(p)}
              aria-pressed={selected === i}
              onClick={() => setSelected(selected === i ? null : i)}
            >
              {content}
            </button>
          ) : (
            <span key={i} className={cls} aria-hidden>
              {content}
            </span>
          )
        })}
      </Fi>
      {interactive && sel && (
        <div className="animate-rise-in mt-3 rounded-xl border border-border bg-surface-2 p-3 text-sm" role="status">
          <p className="font-semibold">
            <span className={cx('seg mr-2 align-middle text-base', `seg-${sel.role}`)}>
              <Fi>{sel.text === '' ? sel.was : sel.text}</Fi>
            </span>
            {ROLE_LABEL[sel.role].long.en}
          </p>
          {sel.was !== undefined && sel.was !== sel.text && (
            <p className="mt-1 text-muted">
              {sel.text === '' ? (
                <>
                  The <Fi className="font-semibold">{sel.was}</Fi> of the base form disappears here.
                </>
              ) : sel.was === '' ? (
                <>Added in this form.</>
              ) : (
                <>
                  In the base form this was <Fi className="font-semibold">{sel.was}</Fi>.
                </>
              )}
            </p>
          )}
          {explanation && <p className="mt-1">{explanation.main}</p>}
        </div>
      )}
    </div>
  )
}

const ROLES: PieceRole[] = ['root', 'grade', 'stem', 'plural', 'ending', 'possessive', 'exception']

/** Key to the colours, labels and border styles. */
export function RoleLegend({ roles = ROLES, className }: { roles?: PieceRole[]; className?: string }) {
  return (
    <ul className={cx('flex flex-wrap gap-2 text-xs', className)} aria-label="Colour key">
      {roles.map((r) => (
        <li key={r} className={cx('inline-flex items-center gap-1.5 rounded-lg border-2 px-2 py-1 font-semibold', `swatch-${r}`)}>
          {ROLE_LABEL[r].short}
        </li>
      ))}
    </ul>
  )
}

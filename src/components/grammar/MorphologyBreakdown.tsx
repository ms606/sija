import { useState } from 'react'
import type { PieceRole } from '../../grammar/types'
import { ROLE_LABEL } from '../../services/content/text'
import type { ExplainedStep, FormExplanation, VisiblePiece } from '../../services/explain'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'
import { RichText } from './RichText'

const SIZE = {
  sm: 'text-lg gap-0.5',
  md: 'text-2xl gap-0.5',
  lg: 'text-4xl gap-1',
  xl: 'text-5xl gap-1',
  hero: 'text-[2.1rem] gap-0.5 sm:text-5xl sm:gap-1',
  /** Fits a long word on one line on a phone, large on wider screens. */
  fit: 'text-[1.75rem] gap-0.5 sm:text-4xl sm:gap-1',
} as const

/** The step of this word's own derivation that produced a piece. */
function stepFor(piece: VisiblePiece, steps: readonly ExplainedStep[]): ExplainedStep | undefined {
  switch (piece.role) {
    case 'root':
      return undefined
    case 'grade':
      return steps.find((s) => s.kind === 'gradation')
    case 'plural':
      return steps.find((s) => s.kind === 'plural' || s.ruleId === 'plural.t')
    default:
      return steps.find((s) => s.ruleId === piece.ruleId) ?? (piece.role === 'exception' ? steps.find((s) => s.kind === 'override') : undefined)
  }
}

/**
 * The colour-coded anatomy of one form. The visible pieces spell exactly the
 * form; removed letters are shown as a thin marker, never as letters. Colour
 * is backed up by labels, border styles and accessible names. Tapping a piece
 * shows the step of this word's derivation that produced it.
 */
export function MorphologyBreakdown({
  explanation,
  size = 'md',
  showLabels,
  highlight,
  interactive = true,
  className,
}: {
  explanation: FormExplanation
  size?: keyof typeof SIZE
  showLabels?: boolean
  /** Roles to emphasise; other pieces are dimmed. */
  highlight?: PieceRole[] | null
  interactive?: boolean
  className?: string
}) {
  const labelsSetting = useSettings((s) => s.showRoleLabels)
  const labels = showLabels ?? labelsSetting
  const [selected, setSelected] = useState<number | null>(null)
  const pieces = explanation.pieces
  const sel = selected !== null ? pieces[selected] : undefined
  const step = sel ? stepFor(sel, explanation.steps) : undefined

  return (
    <div className={className}>
      <Fi className={cx('fi-form inline-flex flex-wrap items-start font-semibold', SIZE[size])} aria-label={explanation.form}>
        {pieces.map((p, i) => {
          if (p.ghost) {
            return (
              <span
                key={i}
                aria-hidden
                title={`${p.was ?? ''} dropped here`}
                className="mx-0.5 inline-block h-[0.9em] w-0.5 translate-y-[0.15em] self-start rounded-full bg-[var(--stem-bd)]"
              />
            )
          }
          const dim = highlight && highlight.length > 0 && !highlight.includes(p.role)
          const content = (
            <>
              <span className="seg-text">{p.text}</span>
              {labels && <span className="seg-label">{p.label}</span>}
            </>
          )
          const cls = cx('seg', `seg-${p.role}`, dim && 'seg-dim', selected === i && 'seg-focus')
          return interactive ? (
            <button
              key={i}
              type="button"
              className={cls}
              aria-label={p.description}
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
              <Fi>{sel.text}</Fi>
            </span>
            {sel.label}
          </p>
          {sel.role === 'root' ? (
            <p className="mt-1 text-muted">
              This part is the same as in the base form <Fi className="font-semibold">{explanation.lemma}</Fi>.
            </p>
          ) : sel.was !== undefined && sel.was !== sel.text ? (
            <p className="mt-1 text-muted">
              In the base form this was <Fi className="font-semibold">{sel.was || '—'}</Fi>.
            </p>
          ) : null}
          {step && (
            <p className="mt-1">
              <RichText text={step.text} />
            </p>
          )}
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

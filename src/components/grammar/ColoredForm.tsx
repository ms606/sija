import type { FormVariant, PieceRole } from '../../grammar/types'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'

const TEXT: Record<PieceRole, string> = {
  root: '',
  stem: 'text-[var(--stem-fg)]',
  grade: 'text-[var(--grade-fg)] underline decoration-wavy decoration-[var(--grade-bd)] underline-offset-4',
  plural: 'text-[var(--plural-fg)] font-bold',
  ending: 'text-[var(--ending-fg)] font-bold',
  possessive: 'text-[var(--px-fg)] font-bold',
  exception: 'text-[var(--exception-fg)] font-bold underline decoration-2',
}

/** Compact inline colouring of a form (tables, lists): colour + weight + underline styles. */
export function ColoredForm({ variant, className }: { variant: FormVariant; className?: string }) {
  return (
    <Fi className={cx('fi-form', className)}>
      {variant.pieces.map((p, i) =>
        p.text !== '' ? (
          <span key={i} className={TEXT[p.role]}>
            {p.text}
          </span>
        ) : p.role === 'grade' && p.was ? (
          // A consonant that disappeared (ruoka → ruoan): a thin marker where it was.
          <span
            key={i}
            title={`${p.was} disappears here`}
            aria-hidden
            className="mx-px inline-block h-[0.85em] w-0.5 translate-y-[0.1em] rounded-full bg-[var(--grade-bd)]"
          />
        ) : null,
      )}
    </Fi>
  )
}

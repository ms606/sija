import { isClosedSyllable, syllabify } from '../../grammar'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'

/** A word split into syllables, with the last syllable marked open (ends in a vowel) or closed. */
export function SyllableView({ word, grade, className }: { word: string; grade?: 'strong' | 'weak'; className?: string }) {
  const syllables = syllabify(word)
  const last = syllables[syllables.length - 1] ?? ''
  const closed = isClosedSyllable(last)
  return (
    <span className={cx('inline-flex flex-col items-start gap-1', className)}>
      <Fi className="text-2xl font-semibold tracking-wide" aria-label={`${word}: ${syllables.join(' - ')}`}>
        {syllables.map((s, i) => (
          <span key={i}>
            {i > 0 && <span className="px-0.5 text-muted" aria-hidden>·</span>}
            <span className={cx(i === syllables.length - 1 && 'rounded bg-surface-2 px-0.5')}>{s}</span>
          </span>
        ))}
      </Fi>
      <span className="text-xs text-muted">
        last syllable <strong className="text-text">{closed ? 'closed' : 'open'}</strong>
        {grade && (
          <>
            {' '}
            → <strong className="text-[var(--grade-fg)]">{grade} grade</strong>
          </>
        )}
      </span>
    </span>
  )
}

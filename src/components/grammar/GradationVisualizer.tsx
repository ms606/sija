import { ArrowDown, Play } from 'lucide-react'
import { useState } from 'react'
import { GRADATION_PATTERNS } from '../../grammar'
import type { GradationId } from '../../grammar/types'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'

/**
 * Strong → weak animation for a gradation pattern: PP ↓ P, NT ↓ NN, K ↓ ∅.
 * With reduced motion the two grades are simply shown side by side.
 */
export function GradationVisualizer({
  pattern,
  strong: strongWord,
  weak: weakWord,
  size = 'md',
  className,
}: {
  pattern: GradationId
  /** Optional example words, e.g. kauppa / kaupan. */
  strong?: string
  weak?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const p = GRADATION_PATTERNS[pattern]
  const [run, setRun] = useState(0)
  const big = size === 'lg' ? 'text-5xl' : size === 'sm' ? 'text-2xl' : 'text-4xl'
  return (
    <div className={cx('flex flex-col items-center gap-2', className)}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span className="text-[0.65rem] font-bold tracking-wide text-muted uppercase">Strong</span>
          <Fi className={cx('seg seg-grade font-bold uppercase', big)}>{p.strong}</Fi>
        </div>
        <ArrowDown aria-hidden className="size-6 -rotate-90 text-muted" />
        <div className="flex flex-col items-center">
          <span className="text-[0.65rem] font-bold tracking-wide text-muted uppercase">Weak</span>
          <Fi key={run} className={cx('seg seg-grade animate-rise-in font-bold uppercase', big)}>
            {p.weak || '∅'}
          </Fi>
        </div>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="ml-1 inline-flex size-9 items-center justify-center rounded-full border border-border text-muted hover:bg-surface-2"
          aria-label="Replay the change"
        >
          <Play aria-hidden className="size-4" />
        </button>
      </div>
      {strongWord && weakWord && (
        <p className="text-sm text-muted">
          <Fi className="font-semibold text-text">{strongWord}</Fi> → <Fi className="font-semibold text-text">{weakWord}</Fi>
        </p>
      )}
    </div>
  )
}

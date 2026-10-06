import { Snail, Volume2 } from 'lucide-react'
import { useAudio } from '../../hooks/useAudio'
import type { Rate } from '../../services/audio/AudioService'
import { cx } from '../../utils/cx'

/**
 * Play Finnish text with a fi-FI voice: normal speed and (optionally) slow.
 * 48 px targets by default; `size="sm"` for dense tables.
 */
export function AudioButton({
  text,
  slow = true,
  size = 'md',
  className,
  label,
}: {
  text: string
  slow?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Accessible name override (defaults to the text). */
  label?: string
}) {
  const { speak, speaking, rate, supported, hasFinnishVoice, ready } = useAudio()
  if (!supported) return null
  const noVoice = ready && !hasFinnishVoice
  const dim = size === 'sm' ? 'size-9' : size === 'lg' ? 'size-12' : 'size-11'
  const icon = size === 'sm' ? 'size-4' : 'size-5'
  const btn = (r: Rate) => {
    const active = speaking === text && rate === r
    const Icon = r === 'normal' ? Volume2 : Snail
    const name = `${r === 'normal' ? 'Play' : 'Play slowly'}: ${label ?? text}`
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void speak(text, r)
        }}
        aria-label={name}
        aria-pressed={active}
        title={noVoice ? `${name} — no Finnish voice found on this device (see Settings → Audio)` : name}
        className={cx(
          'inline-flex shrink-0 items-center justify-center rounded-full border transition-colors',
          dim,
          active ? 'animate-speaking border-primary bg-primary text-on-primary' : 'border-border bg-surface text-primary hover:bg-primary-soft',
          noVoice && 'opacity-70',
        )}
      >
        <Icon aria-hidden className={icon} />
      </button>
    )
  }
  return (
    <span className={cx('inline-flex items-center gap-1', className)}>
      {btn('normal')}
      {slow && btn('slow')}
    </span>
  )
}

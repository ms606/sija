import { Flame, Star } from 'lucide-react'
import { Link } from 'react-router'
import { useNow } from '../../hooks/useNow'
import { dayKey, liveStreak } from '../../services/learning/xp'
import { useProgress } from '../../stores/progress'

/** Quiet streak and XP indicator in the header; links to Progress. */
export function HeaderStatus() {
  const xp = useProgress((s) => s.xp)
  const streak = useProgress((s) => s.streak)
  const hydrated = useProgress((s) => s.hydrated)
  const now = useNow()
  if (!hydrated) return null
  const days = liveStreak(streak, dayKey(new Date(now)))
  return (
    <Link
      to="/progress"
      className="inline-flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-semibold hover:bg-surface-2"
      aria-label={`Progress: ${days}-day streak, ${xp} XP`}
    >
      <span className="inline-flex items-center gap-1" title="Days in a row with the daily goal reached">
        <Flame aria-hidden className={days > 0 ? 'size-4 text-warning' : 'size-4 text-muted'} />
        <span className="tabular-nums">{days}</span>
      </span>
      <span className="inline-flex items-center gap-1" title="Experience points">
        <Star aria-hidden className="size-4 text-primary" />
        <span className="tabular-nums">{xp}</span>
      </span>
    </Link>
  )
}

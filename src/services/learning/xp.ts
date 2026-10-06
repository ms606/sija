import type { Verdict } from '../../types/exercise'

export const XP = { correct: 10, almost: 5, lesson: 50, dailyGoal: 25 } as const

export function xpFor(verdict: Verdict): number {
  return verdict === 'correct' ? XP.correct : verdict === 'almost' ? XP.almost : 0
}

/** Local calendar day, e.g. "2026-10-05". */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  return dayKey(new Date(y, m - 1, d - 1))
}

/** Streak update when the daily goal is reached on `today`. */
export function nextStreak(streak: { current: number; best: number; lastDay: string | null }, today: string) {
  if (streak.lastDay === today) return streak
  const current = streak.lastDay === previousDay(today) ? streak.current + 1 : 1
  return { current, best: Math.max(streak.best, current), lastDay: today }
}

/** The streak as it stands today (broken if the last goal day was before yesterday). */
export function liveStreak(streak: { current: number; lastDay: string | null }, today: string): number {
  if (!streak.lastDay) return 0
  return streak.lastDay === today || streak.lastDay === previousDay(today) ? streak.current : 0
}

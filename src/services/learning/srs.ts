import type { ExerciseTarget, Verdict } from '../../types/exercise'

/** A spaced-repetition item: one skill on one form (produce kaupan, recognise talossa…). */
export interface ReviewItem {
  key: string
  kind: 'form' | 'recognize'
  target: ExerciseTarget
  ease: number
  intervalDays: number
  due: number
  reps: number
  lapses: number
  lastReviewed?: number
  history: { at: number; correct: boolean; ms: number }[]
}

const DAY = 24 * 60 * 60 * 1000
const MIN_EASE = 1.3
const MAX_EASE = 2.8

/** SM-2 quality (0–5) from correctness and response time. */
export function quality(verdict: Verdict, ms: number): number {
  if (verdict === 'incorrect') return 1
  if (verdict === 'almost') return 3
  if (ms < 8000) return 5
  if (ms < 20000) return 4
  return 3
}

/** SM-2-lite: lapses come back in ten minutes; successes stretch the interval by the ease factor. */
export function schedule(prev: ReviewItem | undefined, key: string, target: ExerciseTarget, q: number, ms: number, now: number): ReviewItem {
  const item: ReviewItem = prev
    ? { ...prev, history: [...prev.history] }
    : { key, kind: key.startsWith('recognize:') ? 'recognize' : 'form', target, ease: 2.3, intervalDays: 0, due: now, reps: 0, lapses: 0, history: [] }
  item.history = [...item.history, { at: now, correct: q >= 3, ms }].slice(-12)
  item.lastReviewed = now
  if (q < 3) {
    item.reps = 0
    item.lapses += 1
    item.intervalDays = 0
    item.ease = Math.max(MIN_EASE, item.ease - 0.2)
    item.due = now + 10 * 60 * 1000
    return item
  }
  item.reps += 1
  item.intervalDays = item.reps === 1 ? 1 : item.reps === 2 ? 3 : Math.round(item.intervalDays * item.ease)
  item.ease = Math.min(MAX_EASE, Math.max(MIN_EASE, item.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))))
  item.due = now + item.intervalDays * DAY
  return item
}

export function dueItems(items: Readonly<Record<string, ReviewItem>>, now: number): ReviewItem[] {
  return Object.values(items)
    .filter((i) => i.due <= now)
    .sort((a, b) => a.due - b.due)
}

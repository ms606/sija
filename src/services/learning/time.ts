import { dayKey } from './xp'

/** Without a tap, key, scroll or pointer move for this long, the learner is away and the clock stops. */
export const IDLE_MS = 2 * 60_000
/** How often the open app counts its time. */
export const TICK_MS = 15_000
/** How often counted time is saved (and always when the app is hidden or closed). */
export const SAVE_MS = 60_000
/** Longest stretch one tick may count: after a sleeping laptop wakes, the gap is not time spent. */
export const MAX_GAP_MS = 2 * TICK_MS

/** Milliseconds per local day, e.g. { "2026-11-02": 45000 }. */
export type DaySpans = Record<string, number>

/** Splits [from, to) at local midnights. */
export function splitByDay(from: number, to: number): DaySpans {
  const spans: DaySpans = {}
  let start = from
  while (start < to) {
    const d = new Date(start)
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
    const end = Math.min(to, midnight)
    spans[dayKey(d)] = (spans[dayKey(d)] ?? 0) + (end - start)
    start = end
  }
  return spans
}

/** The active part of [from, to): it ends two minutes after the last input, and one tick never counts more than MAX_GAP_MS. */
export function activeSpans(from: number, to: number, lastInput: number): DaySpans {
  return splitByDay(from, Math.min(to, lastInput + IDLE_MS, from + MAX_GAP_MS))
}

export function addSpans(into: DaySpans, spans: DaySpans): DaySpans {
  for (const [day, ms] of Object.entries(spans)) into[day] = (into[day] ?? 0) + ms
  return into
}

/**
 * Counts the time the app is in use. `active` is whether the app is visible
 * and focused; idle time after the last input is cut off by `activeSpans`.
 */
export function createActivityClock(now: number, active: boolean) {
  let since: number | null = active ? now : null
  let lastInput = now
  let pending: DaySpans = {}
  const update = (at: number, isActive: boolean) => {
    if (since !== null) addSpans(pending, activeSpans(since, at, lastInput))
    since = isActive ? at : null
  }
  return {
    /** Counts the time since the last update; `active` says whether the app is in use from now on. */
    update,
    /** A tap, key, scroll or pointer move. After an idle stretch the clock restarts from here. */
    input(at: number, isActive: boolean) {
      if (since === null || at - lastInput > IDLE_MS) update(at, isActive)
      lastInput = at
    },
    /** Returns the time counted so far and starts a new batch. */
    take(): DaySpans {
      const out = pending
      pending = {}
      return out
    },
  }
}

/** Active time today, over the last seven days (today included) and in total. */
export function timeTotals(daily: Record<string, { activeMs?: number }>, now: number): { today: number; week: number; total: number } {
  const week = new Set(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      return dayKey(d)
    }),
  )
  let weekMs = 0
  let total = 0
  for (const [key, d] of Object.entries(daily)) {
    const ms = d.activeMs ?? 0
    total += ms
    if (week.has(key)) weekMs += ms
  }
  return { today: daily[dayKey(new Date(now))]?.activeMs ?? 0, week: weekMs, total }
}

/** "0 min", "25 min", "1 h 5 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

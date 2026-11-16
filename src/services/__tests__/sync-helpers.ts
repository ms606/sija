import { EMPTY_PROGRESS, useProgress, type ProgressData } from '../../stores/progress'
import type { Exercise } from '../../types/exercise'
import { parseSyncDoc, type SyncDoc } from '../sync/doc'

/*
 * Shared by the sync tests (merge rules, and devices syncing through the real
 * Worker). Devices change their progress through the real progress store, so
 * sync is tested against the app's own XP, goal, streak and achievement logic.
 */

export const GOAL = 20
export const D0 = '2026-11-15'
export const D1 = '2026-11-16'
export const D2 = '2026-11-17'
const pad = (n: number) => String(n).padStart(2, '0')
/** A local time on a day, so it lands on that day's key. */
export const t = (day: string, hour: number, minute = 0) => new Date(`${day}T${pad(hour)}:${pad(minute)}:00`).getTime()
export const NOW = t(D2, 23)

type Store = ReturnType<typeof useProgress.getState>

function pick(s: ProgressData): ProgressData {
  const { schemaVersion, xp, streak, lessons, skills, achievements, recentNouns, daily, reviews, sessions, perfectSessions, totalAttempts } = s
  return { schemaVersion, xp, streak, lessons, skills, achievements, recentNouns, daily, reviews, sessions, perfectSessions, totalAttempts }
}

/** Runs store actions on a copy of some progress and returns the result. */
export function run(p: ProgressData, act: (s: Store) => void): ProgressData {
  useProgress.setState(structuredClone(p))
  act(useProgress.getState())
  return pick(useProgress.getState())
}

function exercise(word: string, skill: string): Exercise {
  return { skills: [skill], reviewKey: `form:${word}:sg.genitive`, target: { lexemeId: word, slot: 'sg.genitive', form: word } } as unknown as Exercise
}

export interface Answers {
  day: string
  hour: number
  ok?: boolean
  goal?: number
  word?: string
  skill?: string
  /** Answer time; the app measures it on the wall clock. */
  ms?: number
}

/** `n` answers, one second apart, starting at `hour` on `day`. */
export function answer(p: ProgressData, n: number, a: Answers): ProgressData {
  return run(p, (s) => {
    for (let i = 0; i < n; i++) {
      s.recordAttempt({
        exercise: exercise(a.word ?? 'talo', a.skill ?? 'case:genitive'),
        verdict: a.ok === false ? 'incorrect' : 'correct',
        ms: a.ms ?? 3000,
        dailyGoal: a.goal ?? GOAL,
        now: t(a.day, a.hour) + i * 1000,
      })
    }
  })
}

/** The document as the server would hand it back: through JSON and the download check. */
export const transport = (doc: SyncDoc): SyncDoc => parseSyncDoc(JSON.parse(JSON.stringify(doc)))

export const withXp = (xp: number): ProgressData => ({ ...EMPTY_PROGRESS, xp })

/**
 * The store saves a review card's target with the exercise's surface form as an
 * extra, untyped field that nothing reads. Like a backup import, the download
 * check keeps only the typed fields (lexemeId, slot, person).
 */
export function typed(p: ProgressData): ProgressData {
  const reviews = Object.fromEntries(
    Object.entries(p.reviews).map(([k, r]) => [k, { ...r, target: { lexemeId: r.target.lexemeId, slot: r.target.slot, ...(r.target.person ? { person: r.target.person } : {}) } }]),
  )
  return { ...p, reviews }
}

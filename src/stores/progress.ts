import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { ACHIEVEMENTS } from '../services/learning/achievements'
import { RECENT_WINDOW, type SkillStat } from '../services/learning/mastery'
import { quality, schedule, type ReviewItem } from '../services/learning/srs'
import type { DaySpans } from '../services/learning/time'
import { dayKey, nextStreak, XP, xpFor } from '../services/learning/xp'
import { idbStorage } from '../services/storage/idb'
import type { Exercise, Verdict } from '../types/exercise'

export interface DailyStat {
  items: number
  correct: number
  xp: number
  goalMet?: boolean
  /** Time the app was in use on this device that day (visible, focused, not idle). */
  activeMs?: number
}

export interface ProgressData {
  schemaVersion: 1
  xp: number
  streak: { current: number; best: number; lastDay: string | null }
  lessons: Record<string, { status: 'started' | 'done'; score?: number; at: number }>
  skills: Record<string, SkillStat>
  achievements: Record<string, number>
  recentNouns: { id: string; at: number }[]
  daily: Record<string, DailyStat>
  reviews: Record<string, ReviewItem>
  sessions: number
  perfectSessions: number
  totalAttempts: number
}

export const EMPTY_PROGRESS: ProgressData = {
  schemaVersion: 1,
  xp: 0,
  streak: { current: 0, best: 0, lastDay: null },
  lessons: {},
  skills: {},
  achievements: {},
  recentNouns: [],
  daily: {},
  reviews: {},
  sessions: 0,
  perfectSessions: 0,
  totalAttempts: 0,
}

export interface AttemptOutcome {
  xp: number
  goalReached: boolean
  unlocked: string[]
}

interface ProgressStore extends ProgressData {
  hydrated: boolean
  recordAttempt: (input: { exercise: Exercise; verdict: Verdict; ms: number; dailyGoal: number; now?: number }) => AttemptOutcome
  startLesson: (id: string) => void
  completeLesson: (id: string, score: number) => AttemptOutcome
  finishSession: (input: { correct: number; total: number }) => string[]
  viewNoun: (id: string) => void
  addActiveTime: (spans: DaySpans) => void
  importData: (data: ProgressData) => void
  reset: () => void
}

function unlock(state: ProgressData, now: number): { achievements: Record<string, number>; unlocked: string[] } {
  const achievements = { ...state.achievements }
  const unlocked: string[] = []
  for (const a of ACHIEVEMENTS) {
    if (!achievements[a.id] && a.check(state)) {
      achievements[a.id] = now
      unlocked.push(a.id)
    }
  }
  return { achievements, unlocked }
}

// Each save is sent to the app's other open tabs, which take it over at once, so a
// tab left open in the background never writes its older copy over newer progress.
// (Reloading from IndexedDB instead would be asynchronous, and a change made in
// that tab meanwhile would be replaced by the older copy.)
const tabs = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sija-progress') : null
let fromOtherTab = false

const sharedStorage: StateStorage = {
  ...idbStorage,
  setItem: async (name, value) => {
    if (fromOtherTab) return // the tab that sent it has saved it
    await idbStorage.setItem(name, value)
    tabs?.postMessage(value)
  },
}

/** Learner progress, persisted in IndexedDB. Everything stays on this device. */
export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...EMPTY_PROGRESS,
      hydrated: false,

      recordAttempt: ({ exercise, verdict, ms, dailyGoal, now = Date.now() }) => {
        const s = get()
        const ok = verdict !== 'incorrect'
        const today = dayKey(new Date(now))
        const skills = { ...s.skills }
        for (const skill of exercise.skills) {
          const prev = skills[skill] ?? { attempts: 0, correct: 0, recent: [] }
          skills[skill] = {
            attempts: prev.attempts + 1,
            correct: prev.correct + (ok ? 1 : 0),
            recent: [...prev.recent, { at: now, ok }].slice(-RECENT_WINDOW),
          }
        }
        const gained = xpFor(verdict)
        const day = s.daily[today] ?? { items: 0, correct: 0, xp: 0 }
        const nextDay: DailyStat = { ...day, items: day.items + 1, correct: day.correct + (ok ? 1 : 0), xp: day.xp + gained }
        let goalReached = false
        let streak = s.streak
        let bonus = 0
        if (!day.goalMet && nextDay.items >= dailyGoal) {
          nextDay.goalMet = true
          goalReached = true
          streak = nextStreak(s.streak, today)
          bonus = XP.dailyGoal
          nextDay.xp += bonus
        }
        const reviews = { ...s.reviews }
        if (exercise.target) {
          reviews[exercise.reviewKey] = schedule(s.reviews[exercise.reviewKey], exercise.reviewKey, exercise.target, quality(verdict, ms), ms, now)
        }
        const recentNouns = exercise.target
          ? [{ id: exercise.target.lexemeId, at: now }, ...s.recentNouns.filter((r) => r.id !== exercise.target!.lexemeId)].slice(0, 12)
          : s.recentNouns
        const next: ProgressData = {
          ...s,
          skills,
          daily: { ...s.daily, [today]: nextDay },
          xp: s.xp + gained + bonus,
          streak,
          reviews,
          recentNouns,
          totalAttempts: s.totalAttempts + 1,
        }
        const { achievements, unlocked } = unlock(next, now)
        set({ ...next, achievements })
        return { xp: gained + bonus, goalReached, unlocked }
      },

      startLesson: (id) => {
        const s = get()
        if (s.lessons[id]) return
        set({ lessons: { ...s.lessons, [id]: { status: 'started', at: Date.now() } } })
      },

      completeLesson: (id, score) => {
        const s = get()
        const now = Date.now()
        const first = s.lessons[id]?.status !== 'done'
        const gained = first ? XP.lesson : 0
        const best = Math.max(score, s.lessons[id]?.score ?? 0)
        const next: ProgressData = { ...s, xp: s.xp + gained, lessons: { ...s.lessons, [id]: { status: 'done', score: best, at: now } } }
        const { achievements, unlocked } = unlock(next, now)
        set({ xp: next.xp, lessons: next.lessons, achievements })
        return { xp: gained, goalReached: false, unlocked }
      },

      finishSession: ({ correct, total }) => {
        const s = get()
        const now = Date.now()
        const next: ProgressData = { ...s, sessions: s.sessions + 1, perfectSessions: s.perfectSessions + (total >= 5 && correct === total ? 1 : 0) }
        const { achievements, unlocked } = unlock(next, now)
        set({ sessions: next.sessions, perfectSessions: next.perfectSessions, achievements })
        return unlocked
      },

      viewNoun: (id) => {
        const s = get()
        set({ recentNouns: [{ id, at: Date.now() }, ...s.recentNouns.filter((r) => r.id !== id)].slice(0, 12) })
      },

      addActiveTime: (spans) => {
        const daily = { ...get().daily }
        for (const [key, ms] of Object.entries(spans)) {
          const day = daily[key] ?? { items: 0, correct: 0, xp: 0 }
          daily[key] = { ...day, activeMs: (day.activeMs ?? 0) + Math.round(ms) }
        }
        set({ daily })
      },

      importData: (data) => set({ ...EMPTY_PROGRESS, ...data, schemaVersion: 1 }),

      reset: () => set({ ...EMPTY_PROGRESS }),
    }),
    {
      name: 'sija-progress',
      version: 1,
      storage: createJSONStorage(() => sharedStorage),
      partialize: (s): ProgressData => ({
        schemaVersion: 1,
        xp: s.xp,
        streak: s.streak,
        lessons: s.lessons,
        skills: s.skills,
        achievements: s.achievements,
        recentNouns: s.recentNouns,
        daily: s.daily,
        reviews: s.reviews,
        sessions: s.sessions,
        perfectSessions: s.perfectSessions,
        totalAttempts: s.totalAttempts,
      }),
      onRehydrateStorage: () => () => {
        useProgress.setState({ hydrated: true })
      },
    },
  ),
)

tabs?.addEventListener('message', (e: MessageEvent<string>) => {
  // A tab still loading reads the saved copy instead; it is about to anyway.
  if (!useProgress.getState().hydrated) return void useProgress.persist.rehydrate()
  fromOtherTab = true
  try {
    useProgress.setState((JSON.parse(e.data) as { state: ProgressData }).state)
  } finally {
    fromOtherTab = false
  }
})

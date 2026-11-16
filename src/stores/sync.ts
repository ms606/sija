import { create } from 'zustand'

/** What a device has done, for the "which progress to keep?" choice. */
export interface ProgressSummary {
  xp: number
  exercises: number
  lessonsDone: number
  /** The last day with activity, e.g. "2026-11-16". */
  lastDay: string | null
}

export type SyncPhase =
  /** Connected and up to date, or not connected (see `useProgress().sync`). */
  | 'idle'
  | 'connecting'
  | 'syncing'
  /** Changes wait on this device until it is online. */
  | 'offline'
  /** This device has its own progress and the server has some too. */
  | 'choose'
  | 'error'

interface SyncStatus {
  phase: SyncPhase
  /** A message for the learner: what went wrong and what happens next. */
  message: string | null
  choice: { synced: ProgressSummary; local: ProgressSummary } | null
}

/** Sync status for the Settings page. Not saved: the engine sets it as it works. */
export const useSyncStatus = create<SyncStatus>()(() => ({ phase: 'idle', message: null, choice: null }))

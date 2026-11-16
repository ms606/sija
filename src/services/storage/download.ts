import type { ProgressData } from '../../stores/progress'
import { dayKey } from '../learning/xp'
import { exportProgress } from './backup'

/** Just the progress of a store state: a backup never includes sync bookkeeping. */
export function progressSnapshot(s: ProgressData): ProgressData {
  const { schemaVersion, xp, streak, lessons, skills, achievements, recentNouns, daily, reviews, sessions, perfectSessions, totalAttempts } = s
  return { schemaVersion, xp, streak, lessons, skills, achievements, recentNouns, daily, reviews, sessions, perfectSessions, totalAttempts }
}

/** Saves a backup file of this progress, e.g. sija-progress-2026-11-16.json. */
export function downloadBackup(progress: ProgressData): void {
  const blob = new Blob([exportProgress(progressSnapshot(progress))], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sija-progress-${dayKey()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type LearnerMode = 'beginner' | 'intermediate' | 'advanced'
export type ThemePref = 'system' | 'light' | 'dark'
export type PictureStyle = 'auto' | 'photo' | 'illustration' | 'emoji'
export type MotionPref = 'system' | 'reduce' | 'full'

export interface Settings {
  mode: LearnerMode
  theme: ThemePref
  motion: MotionPref
  showRoleLabels: boolean
  pictureStyle: PictureStyle
  voiceURI: string | null
  /** Exercises per day for the daily goal. */
  dailyGoal: number
  showTranslations: boolean
}

/**
 * Learner settings shared by a learner's devices when they sync; the last change
 * wins. Theme, motion and voice stay per device (each device has its own screen
 * and its own voices).
 */
export const SYNCED_SETTINGS = ['dailyGoal', 'mode', 'showTranslations', 'showRoleLabels', 'pictureStyle'] as const
export type SyncedSetting = (typeof SYNCED_SETTINGS)[number]

const VALID: Record<SyncedSetting, (v: unknown) => boolean> = {
  dailyGoal: (v) => typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 500,
  mode: (v) => v === 'beginner' || v === 'intermediate' || v === 'advanced',
  showTranslations: (v) => typeof v === 'boolean',
  showRoleLabels: (v) => typeof v === 'boolean',
  pictureStyle: (v) => v === 'auto' || v === 'photo' || v === 'illustration' || v === 'emoji',
}

/** Whether a synced value is one this setting can take (a synced copy is untrusted). */
export const validSetting = (key: SyncedSetting, value: unknown): boolean => VALID[key](value)

interface SettingsStore extends Settings {
  /** When each synced setting was last changed on this device (or taken from sync). */
  changedAt: Partial<Record<SyncedSetting, number>>
  set: (patch: Partial<Settings>) => void
  /** Takes synced values with the times they were changed, without counting as a change here. */
  applySynced: (values: Partial<Record<SyncedSetting, { value: unknown; changedAt: number }>>) => void
  reset: () => void
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'beginner',
  theme: 'system',
  motion: 'system',
  showRoleLabels: true,
  pictureStyle: 'auto',
  voiceURI: null,
  dailyGoal: 20,
  showTranslations: true,
}

/** The change times for the synced settings in `patch` whose value differs from the current one. */
function changes(current: Settings, patch: Partial<Settings>, now: number): Partial<Record<SyncedSetting, number>> {
  const out: Partial<Record<SyncedSetting, number>> = {}
  for (const key of SYNCED_SETTINGS) if (key in patch && patch[key] !== current[key]) out[key] = now
  return out
}

/** Per-device preferences (localStorage, read synchronously to avoid a theme flash). */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      changedAt: {},
      set: (patch) => set((s) => ({ ...patch, changedAt: { ...s.changedAt, ...changes(s, patch, Date.now()) } })),
      applySynced: (values) =>
        set((s) => {
          const patch: Partial<Settings> = {}
          const changedAt = { ...s.changedAt }
          for (const key of SYNCED_SETTINGS) {
            const entry = values[key]
            if (!entry || !validSetting(key, entry.value)) continue
            ;(patch as Record<string, unknown>)[key] = entry.value
            changedAt[key] = entry.changedAt
          }
          return { ...patch, changedAt }
        }),
      reset: () => set((s) => ({ ...DEFAULT_SETTINGS, changedAt: { ...s.changedAt, ...changes(s, DEFAULT_SETTINGS, Date.now()) } })),
    }),
    {
      name: 'sija-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ set: _set, applySynced: _apply, reset: _reset, ...rest }) => rest,
    },
  ),
)

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

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void
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

/** Per-device preferences (localStorage, read synchronously to avoid a theme flash). */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'sija-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ set: _set, reset: _reset, ...rest }) => rest,
    },
  ),
)

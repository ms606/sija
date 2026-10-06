import { useEffect } from 'react'
import { useSettings } from '../stores/settings'

/** Applies theme and motion preferences to <html> (data-theme, data-motion). */
export function useApplyPreferences(): void {
  const theme = useSettings((s) => s.theme)
  const motion = useSettings((s) => s.motion)
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      root.dataset.theme = dark ? 'dark' : 'light'
      const meta = document.querySelector('meta[name="theme-color"]:not([media])')
      if (meta) meta.setAttribute('content', dark ? '#0e161d' : '#f6f7f4')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    const root = document.documentElement
    if (motion === 'system') delete root.dataset.motion
    else root.dataset.motion = motion
  }, [motion])
}

export function usePrefersReducedMotion(): boolean {
  const motion = useSettings((s) => s.motion)
  if (motion === 'reduce') return true
  if (motion === 'full') return false
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

import { useEffect } from 'react'
import { createActivityClock, SAVE_MS, TICK_MS } from '../services/learning/time'
import { useProgress } from '../stores/progress'

const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

/**
 * Counts the time the app is in use into each day's activity: the tab is
 * visible and focused, and there was input in the last two minutes. Mounted
 * once, in AppShell.
 */
export function useActiveTime() {
  useEffect(() => {
    const isActive = () => document.visibilityState === 'visible' && document.hasFocus()
    const clock = createActivityClock(Date.now(), isActive())
    let lastSave = Date.now()

    const save = () => {
      const progress = useProgress.getState()
      // Before hydration a write would replace the stored progress; keep the time until then.
      if (!progress.hydrated) return
      const spans = clock.take()
      if (Object.keys(spans).length) progress.addActiveTime(spans)
      lastSave = Date.now()
    }
    const tick = () => {
      clock.update(Date.now(), isActive())
      if (Date.now() - lastSave >= SAVE_MS) save()
    }
    const onInput = () => clock.input(Date.now(), isActive())
    // Hidden is the last moment a closing tab or app reliably gets to save (no save
    // on pagehide: a write started there can cost a save still in flight on navigation).
    const onChange = () => {
      const active = isActive()
      clock.update(Date.now(), active)
      if (!active) save()
    }

    const timer = setInterval(tick, TICK_MS)
    for (const e of INPUT_EVENTS) document.addEventListener(e, onInput, { capture: true, passive: true })
    document.addEventListener('visibilitychange', onChange)
    window.addEventListener('focus', onChange)
    window.addEventListener('blur', onChange)
    window.addEventListener('pageshow', onChange)
    return () => {
      clock.update(Date.now(), false)
      save()
      clearInterval(timer)
      for (const e of INPUT_EVENTS) document.removeEventListener(e, onInput, { capture: true })
      document.removeEventListener('visibilitychange', onChange)
      window.removeEventListener('focus', onChange)
      window.removeEventListener('blur', onChange)
      window.removeEventListener('pageshow', onChange)
    }
  }, [])
}

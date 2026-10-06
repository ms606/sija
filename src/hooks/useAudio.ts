import { useEffect, useSyncExternalStore } from 'react'
import { audioService, type AudioState, type Rate } from '../services/audio/AudioService'
import { useSettings } from '../stores/settings'

/** Subscribes to the audio service and keeps the preferred voice in sync with settings. */
export function useAudio(): AudioState & {
  speak: (text: string, rate?: Rate) => Promise<void>
  stop: () => void
  hasFinnishVoice: boolean
} {
  const state = useSyncExternalStore(
    (cb) => audioService.subscribe(cb),
    () => audioService.getState(),
    () => audioService.getState(),
  )
  const voiceURI = useSettings((s) => s.voiceURI)
  useEffect(() => {
    audioService.setPreferredVoice(voiceURI)
  }, [voiceURI])
  return {
    ...state,
    speak: (text, rate) => audioService.speak(text, rate),
    stop: () => audioService.stop(),
    hasFinnishVoice: state.voices.length > 0,
  }
}

/**
 * Audio for Finnish words and sentences.
 *
 * Provider chain: a recorded file (if the manifest has one for the text)
 * overrides text-to-speech; otherwise the Web Speech API speaks with a
 * Finnish (fi-FI) voice, preferring on-device voices so audio also works
 * offline where the operating system provides them.
 */

export type Rate = 'normal' | 'slow'

export const RATE_VALUE: Readonly<Record<Rate, number>> = { normal: 1, slow: 0.7 }

export interface VoiceInfo {
  uri: string
  name: string
  lang: string
  local: boolean
}

export interface AudioState {
  /** Text currently being spoken, or null. */
  speaking: string | null
  rate: Rate | null
  voices: VoiceInfo[]
  /** speechSynthesis exists in this browser. */
  supported: boolean
  /** Voices have been loaded (they arrive asynchronously in some browsers). */
  ready: boolean
}

type Listener = (s: AudioState) => void

/** Recorded audio manifest: normalized text → URL. Empty until recordings are added. */
const RECORDED: Readonly<Record<string, string>> = {}

function normalizeKey(text: string): string {
  return text.normalize('NFC').trim().toLowerCase()
}

export class AudioService {
  private state: AudioState
  private listeners = new Set<Listener>()
  private preferredUri: string | null = null
  private currentAudio: HTMLAudioElement | null = null
  private synth: SpeechSynthesis | null

  constructor() {
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
    this.state = { speaking: null, rate: null, voices: [], supported: this.synth !== null, ready: false }
    if (this.synth) {
      this.loadVoices()
      this.synth.addEventListener?.('voiceschanged', () => this.loadVoices())
      // Some browsers never fire voiceschanged: mark ready after a short wait.
      setTimeout(() => {
        if (!this.state.ready) this.setState({ ready: true })
      }, 1500)
    }
  }

  private loadVoices(): void {
    if (!this.synth) return
    const all = this.synth.getVoices()
    const voices = all
      .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('fi'))
      .map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang, local: v.localService }))
      .sort((a, b) => Number(b.local) - Number(a.local) || a.name.localeCompare(b.name))
    this.setState({ voices, ready: this.state.ready || all.length > 0 })
  }

  private setState(patch: Partial<AudioState>): void {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l(this.state))
  }

  getState(): AudioState {
    return this.state
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  setPreferredVoice(uri: string | null): void {
    this.preferredUri = uri
  }

  /** True when a Finnish voice (or a recording) can be used. */
  get hasFinnishVoice(): boolean {
    return this.state.voices.length > 0
  }

  private pickVoice(): SpeechSynthesisVoice | undefined {
    const voices = this.synth?.getVoices() ?? []
    const fi = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('fi'))
    return (
      fi.find((v) => v.voiceURI === this.preferredUri) ??
      fi.find((v) => v.localService && /satu/i.test(v.name)) ??
      fi.find((v) => v.localService) ??
      fi[0]
    )
  }

  stop(): void {
    this.currentAudio?.pause()
    this.currentAudio = null
    this.synth?.cancel()
    this.setState({ speaking: null, rate: null })
  }

  /** Speaks Finnish text. Resolves when playback ends (or fails). */
  speak(text: string, rate: Rate = 'normal'): Promise<void> {
    this.stop()
    const recorded = RECORDED[normalizeKey(text)]
    if (recorded) return this.playRecorded(text, recorded, rate)
    const synth = this.synth
    if (!synth) return Promise.resolve()
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'fi-FI'
      u.rate = RATE_VALUE[rate]
      const voice = this.pickVoice()
      if (voice) u.voice = voice
      const done = () => {
        if (this.state.speaking === text) this.setState({ speaking: null, rate: null })
        resolve()
      }
      u.onend = done
      u.onerror = done
      this.setState({ speaking: text, rate })
      synth.speak(u)
    })
  }

  private playRecorded(text: string, src: string, rate: Rate): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio(src)
      audio.playbackRate = RATE_VALUE[rate]
      this.currentAudio = audio
      const done = () => {
        this.setState({ speaking: null, rate: null })
        resolve()
      }
      audio.onended = done
      audio.onerror = done
      this.setState({ speaking: text, rate })
      void audio.play().catch(done)
    })
  }
}

export const audioService = new AudioService()

/**
 * Audio for Finnish words and sentences.
 *
 * Provider chain: a recorded file (if the manifest has one for the text)
 * overrides text-to-speech; otherwise the Web Speech API speaks with a
 * Finnish (fi-FI) voice. Natural-sounding voices are ranked first; Apple's
 * robotic Eloquence voices last. Online voices are skipped while offline.
 * Finnish is never spoken with a non-Finnish voice: an English voice reading
 * Finnish teaches the wrong pronunciation, so silence is better.
 */

export type Rate = 'normal' | 'slow'

export const RATE_VALUE: Readonly<Record<Rate, number>> = { normal: 1, slow: 0.7 }

/** natural: neural/enhanced voices; standard: ordinary voices; robotic: Apple's Eloquence voices. */
export type VoiceQuality = 'natural' | 'standard' | 'robotic'

export interface VoiceInfo {
  uri: string
  name: string
  lang: string
  local: boolean
  quality: VoiceQuality
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

type VoiceLike = Pick<SpeechSynthesisVoice, 'name' | 'voiceURI' | 'lang' | 'localService'>

function isFinnish(v: VoiceLike): boolean {
  return v.lang.toLowerCase().replace('_', '-').startsWith('fi')
}

// Apple ships these Eloquence voices for every language; they share one robotic
// formant engine and sound like an English speaker reading Finnish.
const ELOQUENCE = /eloquence|^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i
// Edge: "Microsoft Noora Online (Natural)"; Apple: "Satu (Enhanced)", "com.apple.voice.premium.fi-FI.Satu".
const NATURAL = /natural|neural|enhanced|premium/i

export function voiceQuality(v: VoiceLike): VoiceQuality {
  if (ELOQUENCE.test(v.name) || ELOQUENCE.test(v.voiceURI)) return 'robotic'
  if (NATURAL.test(v.name) || NATURAL.test(v.voiceURI)) return 'natural'
  return 'standard'
}

const QUALITY_RANK: Readonly<Record<VoiceQuality, number>> = { natural: 2, standard: 1, robotic: 0 }

/** Best first: quality, then on-device, then Satu (Apple's native Finnish voice), then name. */
export function compareVoices(a: VoiceLike, b: VoiceLike): number {
  return (
    QUALITY_RANK[voiceQuality(b)] - QUALITY_RANK[voiceQuality(a)] ||
    Number(b.localService) - Number(a.localService) ||
    Number(/satu/i.test(b.name)) - Number(/satu/i.test(a.name)) ||
    a.name.localeCompare(b.name)
  )
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
      .filter(isFinnish)
      .sort(compareVoices)
      .map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang, local: v.localService, quality: voiceQuality(v) }))
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

  /**
   * The chosen voice, or the best available one. `null` means voices are listed
   * but none is Finnish; `undefined` means the browser lists no voices at all,
   * so only the utterance's lang can select one.
   */
  private pickVoice(localOnly = false): SpeechSynthesisVoice | null | undefined {
    const all = this.synth?.getVoices() ?? []
    if (all.length === 0) return undefined
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    const fi = all.filter((v) => isFinnish(v) && (v.localService || !(offline || localOnly))).sort(compareVoices)
    return fi.find((v) => v.voiceURI === this.preferredUri) ?? fi[0] ?? null
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
    const voice = this.pickVoice()
    if (voice === null) return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => {
        if (this.state.speaking === text) this.setState({ speaking: null, rate: null })
        resolve()
      }
      const say = (v: SpeechSynthesisVoice | undefined) => {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'fi-FI'
        u.rate = RATE_VALUE[rate]
        if (v) u.voice = v
        u.onend = done
        u.onerror = (e) => {
          // An online voice failed (network): retry once with an on-device one.
          const local = v && !v.localService && e.error !== 'interrupted' && e.error !== 'canceled' ? this.pickVoice(true) : null
          if (local) say(local)
          else done()
        }
        synth.speak(u)
      }
      this.setState({ speaking: text, rate })
      say(voice)
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

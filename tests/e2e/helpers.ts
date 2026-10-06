import { expect, type Page } from '@playwright/test'

/** Collects console errors and uncaught exceptions. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

/** Replaces speechSynthesis with a recorder and one Finnish voice. */
export async function stubSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __utterances: { text: string; lang: string; rate: number }[] }
    w.__utterances = []
    const voice = { voiceURI: 'stub-fi', name: 'Stub Finnish', lang: 'fi-FI', localService: true, default: false }
    const synth = {
      getVoices: () => [voice],
      speak: (u: { text: string; lang: string; rate: number; onend?: () => void }) => {
        w.__utterances.push({ text: u.text, lang: u.lang, rate: u.rate })
        setTimeout(() => u.onend?.(), 20)
      },
      cancel: () => {},
      addEventListener: () => {},
      pending: false,
      speaking: false,
      paused: false,
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
    ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string
      lang = ''
      rate = 1
      voice: unknown = null
      onend?: () => void
      onerror?: () => void
      constructor(text: string) {
        this.text = text
      }
    }
  })
}

export async function waitForApp(page: Page): Promise<void> {
  await expect(page.locator('#main h1').first()).toBeVisible()
}

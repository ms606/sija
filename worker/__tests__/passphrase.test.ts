import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { generatePassphrase, normalizePassphrase, passphraseHash } from '../passphrase'

describe('sync passphrase', () => {
  it('is five groups of five base32 characters, already normalized', () => {
    for (let i = 0; i < 200; i++) {
      const phrase = generatePassphrase()
      expect(phrase).toMatch(/^[0-9a-hjkmnp-tv-z]{5}(-[0-9a-hjkmnp-tv-z]{5}){4}$/)
      expect(normalizePassphrase(phrase)).toBe(phrase)
    }
  })

  it('does not repeat, and uses every character', () => {
    const phrases = Array.from({ length: 2000 }, generatePassphrase)
    expect(new Set(phrases).size).toBe(phrases.length)
    expect(new Set(phrases.join('').replaceAll('-', '')).size).toBe(32)
  })

  it('matches however it is pasted', async () => {
    const phrase = 'k7qm2-xvd9r-2bhwe-n4tq8-pz6cy'
    const stored = await passphraseHash(phrase)
    expect(stored).toBe(createHash('sha256').update(phrase).digest('hex'))
    for (const pasted of ['  K7QM2-XVD9R-2BHWE-N4TQ8-PZ6CY\n', 'k7qm2 xvd9r 2bhwe n4tq8 pz6cy', 'k7qm2--xvd9r - 2bhwe-n4tq8-pz6cy']) {
      expect(await passphraseHash(pasted)).toBe(stored)
    }
  })
})

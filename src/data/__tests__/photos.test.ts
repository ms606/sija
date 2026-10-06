import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PHOTOS } from '../images/photos'
import { getNoun, LEXICON } from '../lexicon'

const ACCEPTED = ['CC0', 'Public domain', 'CC BY 2.0', 'CC BY 2.5', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 2.5', 'CC BY-SA 3.0', 'CC BY-SA 4.0']

describe('photos', () => {
  it('every photo has a complete, per-file credit', () => {
    expect(Object.keys(PHOTOS).length).toBeGreaterThan(30)
    for (const [id, p] of Object.entries(PHOTOS)) {
      const c = p.credit
      for (const field of ['provider', 'sourceUrl', 'title', 'author', 'licenseName', 'attributionText', 'retrievedAt', 'reviewedAt', 'modifications'] as const) {
        expect(c[field], `${id}.${field}`).toBeTruthy()
      }
      expect(ACCEPTED, `${id} licence`).toContain(c.licenseName)
      expect(c.restrictions ?? '', `${id} restrictions`).toBe('')
      expect(c.author.toLowerCase(), `${id} author`).not.toContain('unknown')
      if (!['CC0', 'Public domain'].includes(c.licenseName)) expect(c.licenseUrl, `${id} licence URL`).toMatch(/^https?:\/\/creativecommons\.org\//)
      expect(c.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    }
  })
  it('every photo file is shipped locally (no hotlinking) and belongs to a word', () => {
    for (const [id, p] of Object.entries(PHOTOS)) {
      expect(getNoun(id), id).toBeDefined()
      expect(p.src.startsWith('/images/nouns/'), id).toBe(true)
      const file = join('public', p.src)
      expect(existsSync(file), file).toBe(true)
      expect(statSync(file).size, file).toBeLessThan(250_000)
    }
  })
  it('photos are attached to their lexicon entries', () => {
    const withPhoto = LEXICON.filter((n) => n.image?.photo)
    expect(withPhoto.length).toBe(Object.keys(PHOTOS).length)
    for (const n of withPhoto) expect(n.image?.alt.en, n.id).toBeTruthy()
  })
  it('every concrete noun has an emoji fallback', () => {
    const concrete = LEXICON.filter((n) => n.pos === 'noun' && n.image)
    for (const n of concrete) expect(n.image?.emoji || n.image?.illustration || n.image?.photo, n.id).toBeTruthy()
  })
})

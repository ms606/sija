import type { Noun } from '../../types/content'
import { PHOTOS } from '../images/photos'
import { A_NOUNS } from './a-a'
import { ADJECTIVES } from './adjectives'
import { CONSONANT_NOUNS } from './consonant'
import { E_NOUNS } from './e'
import { EVERYDAY } from './everyday'
import { KIELI_FAMILY } from './i-kieli'
import { LEHTI_FAMILY } from './i-lehti'
import { PANKKI_FAMILY } from './i-pankki'
import { UUSI_FAMILY } from './i-uusi'
import { MONOSYLLABLES } from './monosyllable'
import { O_U_NOUNS } from './o-u-y'

/** Attaches the reviewed Commons photos (with their own per-file credits) to their words. */
function withPhotos(nouns: Noun[]): Noun[] {
  return nouns.map((n) => {
    const photo = PHOTOS[n.id]
    if (!photo) return n
    const image = n.image ?? { alt: { en: n.gloss.en.split(/[;,(]/)[0]!.trim() } }
    return { ...n, image: { ...image, photo } }
  })
}

/** The curated lexicon: every word the app teaches. */
export const LEXICON: readonly Noun[] = withPhotos([
  ...O_U_NOUNS,
  ...A_NOUNS,
  ...PANKKI_FAMILY,
  ...LEHTI_FAMILY,
  ...KIELI_FAMILY,
  ...UUSI_FAMILY,
  ...E_NOUNS,
  ...CONSONANT_NOUNS,
  ...MONOSYLLABLES,
  ...EVERYDAY,
  ...ADJECTIVES,
])

const byId = new Map<string, Noun>()
for (const n of LEXICON) {
  if (byId.has(n.id)) throw new Error(`Duplicate lexeme id "${n.id}"`)
  byId.set(n.id, n)
}

export function getNoun(id: string): Noun | undefined {
  return byId.get(id)
}

export function requireNoun(id: string): Noun {
  const n = byId.get(id)
  if (!n) throw new Error(`Unknown lexeme "${id}"`)
  return n
}

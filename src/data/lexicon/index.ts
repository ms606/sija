import type { IGroup } from '../../grammar/types'
import type { Noun } from '../../types/content'
import { PHOTOS } from '../images/photos'
import { A_NOUNS } from './a-a'
import { ADJECTIVES } from './adjectives'
import { CONSONANT_NOUNS } from './consonant'
import { E_NOUNS } from './e'
import { EVERYDAY } from './everyday'
import { KIELI_TYPE } from './i-kieli'
import { LEHTI_TYPE } from './i-lehti'
import { PANKKI_TYPE } from './i-pankki'
import { UUSI_TYPE } from './i-uusi'
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
  ...PANKKI_TYPE,
  ...LEHTI_TYPE,
  ...KIELI_TYPE,
  ...UUSI_TYPE,
  ...E_NOUNS,
  ...CONSONANT_NOUNS,
  ...MONOSYLLABLES,
  ...EVERYDAY,
  ...ADJECTIVES,
])

/** The four -i families as curated lists (for the -i noun lab and its exercises). */
const pickIds = (list: readonly Noun[]) => {
  const ids = new Set(list.map((n) => n.id))
  return LEXICON.filter((n) => ids.has(n.id))
}

export const I_GROUPS: Readonly<Record<IGroup, readonly Noun[]>> = {
  pankki: pickIds(PANKKI_TYPE),
  lehti: pickIds(LEHTI_TYPE),
  kieli: pickIds(KIELI_TYPE),
  uusi: pickIds(UUSI_TYPE),
}

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

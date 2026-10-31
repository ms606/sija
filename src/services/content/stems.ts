import type { Piece } from '../../grammar'
import type { Noun } from '../../types/content'
import { grammar } from '../grammar'

export interface StemForm {
  text: string
  pieces: Piece[]
}

/** The stems a learner is shown for a word, the same on every page that lists them. */
export interface WordStems {
  /** The vowel stem: strong and weak grade when they differ, otherwise one stem. */
  vowel: StemForm[]
  /** Accepted variant weak vowel stems (ruoka: ruua-). */
  vowelAlt: string[]
  /** The consonant stem, only when it is not the base form itself. */
  consonant: StemForm | null
  /** The plural stems, each as its strong and weak grade when they differ. */
  plural: string[][]
}

/** What the consonant stem is used for. */
export const CONSONANT_STEM_USE = 'for -ta/-tä and -ten'

export function wordStems(n: Noun): WordStems {
  const s = grammar.stems(n)
  return {
    vowel: s.vowelStrong.text === s.vowelWeak.text ? [s.vowelStrong] : [s.vowelStrong, s.vowelWeak],
    vowelAlt: s.alt.flatMap((a) => (a.vowelWeak ? [a.vowelWeak] : [])),
    consonant: s.consonant && s.consonant.text !== n.lemma ? s.consonant : null,
    plural: s.plural.map((p) => (p.strong === p.weak ? [p.strong] : [p.strong, p.weak])),
  }
}

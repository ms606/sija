import { LEXICON } from '../data/lexicon'
import { KNOWN_WORDS } from '../data/known-words'
import { createGrammar, type Grammar } from '../grammar'
import type { Noun } from '../types/content'

/** The app's single grammar engine instance, bound to the curated lexicon. */
export const grammar: Grammar<Noun> = createGrammar(LEXICON, { knownWords: KNOWN_WORDS })

export function nounOrThrow(id: string): Noun {
  return grammar.require(id)
}

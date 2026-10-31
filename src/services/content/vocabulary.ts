import { looseKey } from '../../grammar'
import type { Noun, ThemeId } from '../../types/content'
import { grammar } from '../grammar'

export interface VocabularyFilters {
  theme: ThemeId | ''
  /** Words up to this level; 0 for all. */
  level: number
  q: string
}

/** A search matches the Finnish spelling (ä and ö optional) or the English meaning. */
export function wordMatcher(q: string): (n: Noun) => boolean {
  if (!q) return () => true
  const lq = looseKey(q)
  const en = q.toLowerCase()
  return (n) => looseKey(n.lemma).includes(lq) || n.gloss.en.toLowerCase().includes(en)
}

/** The Vocabulary page's words for its filters, in Finnish alphabetical order. */
export function vocabularyWords({ theme, level, q }: VocabularyFilters): Noun[] {
  const matches = wordMatcher(q)
  return grammar.lexicon
    .filter((l) => (!theme || l.themes.includes(theme)) && (!level || l.level <= level) && matches(l))
    .sort((a, b) => a.lemma.localeCompare(b.lemma, 'fi'))
}

/** The letter a word is indexed under (the Finnish alphabet ends …Y, Å, Ä, Ö). */
export function letterOf(n: Noun): string {
  return n.lemma.charAt(0).toLocaleUpperCase('fi')
}

export interface LetterGroup {
  letter: string
  /** Position of the letter's first word in the list. */
  index: number
  words: Noun[]
}

/** The letters a list's words start with, in list order, each with its words. */
export function letterGroups(words: readonly Noun[]): LetterGroup[] {
  const groups = new Map<string, LetterGroup>()
  words.forEach((w, index) => {
    const letter = letterOf(w)
    const group = groups.get(letter)
    if (group) group.words.push(w)
    else groups.set(letter, { letter, index, words: [w] })
  })
  return [...groups.values()]
}

/**
 * Where the list opens for a remembered word: on the word itself; when the
 * filters leave it out, on the next word after it alphabetically (the last
 * word when none follows); with nothing remembered, at the start.
 */
export function deckIndex(words: readonly Noun[], wordId: string | null): number {
  if (!wordId || words.length === 0) return 0
  const at = words.findIndex((w) => w.id === wordId)
  if (at >= 0) return at
  const lemma = grammar.get(wordId)?.lemma
  if (lemma === undefined) return 0
  const next = words.findIndex((w) => w.lemma.localeCompare(lemma, 'fi') >= 0)
  return next >= 0 ? next : words.length - 1
}

/**
 * Type-ahead for a letter key: the first word with that letter, or the next
 * one when the current word already starts with it. null when no word does.
 */
export function letterJump(words: readonly Noun[], index: number, key: string): number | null {
  const letter = key.toLocaleUpperCase('fi')
  const current = words[index]
  if (current && letterOf(current) === letter) {
    for (let step = 1; step <= words.length; step++) {
      const j = (index + step) % words.length
      if (letterOf(words[j]!) === letter) return j
    }
  }
  const first = words.findIndex((w) => letterOf(w) === letter)
  return first >= 0 ? first : null
}

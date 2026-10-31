import { describe, expect, it } from 'vitest'
import type { Noun } from '../../types/content'
import { wordStems } from '../content/stems'
import { deckIndex, letterGroups, letterJump, letterOf, vocabularyWords } from '../content/vocabulary'
import { grammar } from '../grammar'

const all = vocabularyWords({ theme: '', level: 0, q: '' })
const lemmas = (words: readonly Noun[]) => words.map((w) => w.lemma)
const word = (lemma: string) => grammar.byLemma(lemma)[0]!

describe('Vocabulary list', () => {
  it('lists every word, in Finnish alphabetical order (ä after z)', () => {
    expect(all).toHaveLength(grammar.lexicon.length)
    expect(lemmas(all)).toEqual([...lemmas(all)].sort((a, b) => a.localeCompare(b, 'fi')))
    expect(letterOf(all.at(-1)!)).toBe('Ä')
  })

  it('a search matches the Finnish spelling without dots, or the English meaning', () => {
    expect(lemmas(vocabularyWords({ theme: '', level: 0, q: 'paiva' }))).toContain('päivä')
    expect(lemmas(vocabularyWords({ theme: '', level: 0, q: 'house' }))).toContain('talo')
  })

  it('a search ignores capital letters', () => {
    expect(lemmas(vocabularyWords({ theme: '', level: 0, q: 'Päivä' }))).toContain('päivä')
    expect(lemmas(vocabularyWords({ theme: '', level: 0, q: 'HOUSE' }))).toContain('talo')
  })

  it('"up to level" keeps exactly the words of that level and below', () => {
    const upTo2 = vocabularyWords({ theme: '', level: 2, q: '' })
    expect(upTo2.length).toBeGreaterThan(0)
    expect(upTo2).toHaveLength(grammar.lexicon.filter((w) => w.level <= 2).length)
  })
})

describe('deckIndex: where the list opens for the remembered word', () => {
  it('opens on the word itself', () => {
    const i = deckIndex(all, 'vesi')
    expect(all[i]!.id).toBe('vesi')
  })

  it('opens at the start with nothing remembered, or a word that no longer exists', () => {
    expect(deckIndex(all, null)).toBe(0)
    expect(deckIndex(all, 'no-such-word')).toBe(0)
    expect(deckIndex([], 'vesi')).toBe(0)
  })

  it('when the filters leave the word out, opens on the next word after it', () => {
    const even = all.filter((_, i) => i % 2 === 0)
    expect(even[deckIndex(even, all[11]!.id)]).toBe(all[12])
  })

  it('opens on the last word when no word follows the remembered one', () => {
    const start = all.slice(0, 5)
    expect(deckIndex(start, all[40]!.id)).toBe(4)
  })

  it('a homonym left out by the filters opens on its twin with the same spelling', () => {
    expect(grammar.get('kuusi-spruce')?.lemma).toBe(grammar.get('kuusi-six')?.lemma)
    const noSpruce = all.filter((w) => w.id !== 'kuusi-spruce')
    const noSix = all.filter((w) => w.id !== 'kuusi-six')
    expect(noSpruce[deckIndex(noSpruce, 'kuusi-spruce')]!.id).toBe('kuusi-six')
    expect(noSix[deckIndex(noSix, 'kuusi-six')]!.id).toBe('kuusi-spruce')
  })
})

describe('letters', () => {
  const groups = letterGroups(all)

  it('groups the words by their first letter, in list order', () => {
    expect(groups.map((g) => g.letter)).toEqual([...new Set(all.map(letterOf))])
    expect(groups.flatMap((g) => g.words)).toEqual(all)
    for (const g of groups) {
      expect(all[g.index]).toBe(g.words[0])
      for (const w of g.words) expect(letterOf(w)).toBe(g.letter)
    }
  })

  it('an empty list has no letters, and a letter key finds nothing in it', () => {
    expect(letterGroups([])).toEqual([])
    expect(letterJump([], 0, 'k')).toBeNull()
  })

  it('a letter key goes to the first word with that letter, then on through them, and wraps', () => {
    const k = all.findIndex((w) => letterOf(w) === 'K')
    const lastK = all.findLastIndex((w) => letterOf(w) === 'K')
    expect(letterJump(all, 0, 'k')).toBe(k)
    expect(letterJump(all, k, 'k')).toBe(k + 1)
    expect(letterJump(all, lastK, 'K')).toBe(k)
    expect(letterJump(all, 0, 'ä')).toBe(all.findIndex((w) => letterOf(w) === 'Ä'))
    expect(letterJump(all, 0, 'q')).toBeNull()
  })
})

describe('wordStems: the stems shown for a word', () => {
  const texts = (lemma: string) => {
    const s = wordStems(word(lemma))
    return { vowel: s.vowel.map((v) => v.text), alt: s.vowelAlt, consonant: s.consonant?.text ?? null, plural: s.plural }
  }

  it('kauppa: the strong and the weak vowel stem', () => {
    expect(texts('kauppa')).toEqual({ vowel: ['kauppa', 'kaupa'], alt: [], consonant: null, plural: [['kauppoi', 'kaupoi']] })
  })

  it('vesi: vete- / vede- and the consonant stem vet-', () => {
    expect(texts('vesi')).toMatchObject({ vowel: ['vete', 'vede'], consonant: 'vet' })
  })

  it('talo: one vowel stem, no consonant stem', () => {
    expect(texts('talo')).toMatchObject({ vowel: ['talo'], consonant: null })
  })

  it('hammas: a consonant stem that is the base form itself is not repeated', () => {
    expect(texts('hammas')).toMatchObject({ vowel: ['hampaa'], consonant: null })
  })

  it('omena: two plural stems, each listed once (no gradation)', () => {
    expect(texts('omena')).toMatchObject({ vowel: ['omena'], plural: [['omeni'], ['omenoi']] })
  })

  it('ruoka: the accepted variant weak stem ruua-', () => {
    expect(texts('ruoka')).toMatchObject({ vowel: ['ruoka', 'ruoa'], alt: ['ruua'] })
  })

  it('the coloured pieces of every stem spell exactly that stem', () => {
    for (const n of grammar.lexicon) {
      const s = wordStems(n)
      for (const stem of [...s.vowel, ...(s.consonant ? [s.consonant] : [])]) {
        expect(stem.pieces.map((p) => p.text).join(''), n.id).toBe(stem.text)
      }
    }
  })
})

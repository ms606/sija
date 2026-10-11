import type { RuleId, SlotKey } from '../../types/content'

/**
 * General rules, shown in a separate "General rule" panel *after* the
 * word-specific walkthrough. They state the pattern without example words:
 * the examples shown with them are other lexicon words whose own derivation
 * has the same steps (chosen by src/services/explain/related.ts), so an
 * example can never illustrate a different pattern from the one stated.
 *
 * Where the engine chooses an ending per declension type, the rule says so
 * ("in this word type …") instead of claiming that every noun does the same.
 */
export const GENERAL_RULES: Readonly<Record<RuleId, string>> = {
  /* ---------------- endings ---------------- */
  'ending.nominative': 'Nominative singular: the base form, with no ending.',
  'plural.t': 'Nominative plural: vowel stem + -t. The -t closes the syllable, so words with consonant gradation take the weak grade.',
  'ending.genitive': 'Genitive singular: vowel stem + -n. The -n closes the syllable, so words with consonant gradation take the weak grade.',
  'ending.partitive.a': 'Partitive singular -a/-ä: added to a vowel stem that ends in a short vowel.',
  'ending.partitive.ta-vowel': 'Partitive singular -ta/-tä: added to a vowel stem that ends in a long vowel or in a vowel pair such as -io, -ie or -uo.',
  'ending.partitive.ta-consonant': 'Partitive singular -ta/-tä on the consonant stem: used by the word types that have a consonant stem.',
  'ending.partitive.tta': 'Partitive singular -tta/-ttä on the base form: used by -e words of this type.',
  'ending.inessive': 'Inessive "in": stem + -ssa/-ssä. The ending closes the syllable, so words with consonant gradation take the weak grade.',
  'ending.elative': 'Elative "out of, from": stem + -sta/-stä. The ending closes the syllable, so words with consonant gradation take the weak grade.',
  'ending.illative.vn': 'Illative "into": the last vowel of the stem is repeated and -n is added. The illative always keeps the strong grade.',
  'ending.illative.hvn': 'Illative "into" after a one-syllable stem with a long vowel or a vowel pair: h + the last vowel + n.',
  'ending.illative.seen': 'Illative "into" after a long vowel at the end of a longer stem: -seen.',
  'ending.adessive': 'Adessive "on, at": stem + -lla/-llä. The ending closes the syllable, so words with consonant gradation take the weak grade.',
  'ending.ablative': 'Ablative "off, from": stem + -lta/-ltä. The ending closes the syllable, so words with consonant gradation take the weak grade.',
  'ending.allative': 'Allative "onto, to": stem + -lle (one form only). The ending closes the syllable, so words with consonant gradation take the weak grade.',
  'ending.essive': 'Essive "as": stem + -na/-nä. The syllable stays open, so words with consonant gradation keep the strong grade.',
  'ending.translative': 'Translative "becoming": stem + -ksi. The k closes the syllable, so words with consonant gradation take the weak grade.',
  'ending.abessive': 'Abessive "without": stem + -tta/-ttä. The ending closes the syllable, so words with consonant gradation take the weak grade.',
  'ending.comitative': 'Comitative "together with": plural stem + -ne; a noun also takes a possessive suffix.',
  'ending.instructive': 'Instructive: plural stem + -n. Used only in fixed expressions.',
  'ending.genitive-pl.en': 'Plural genitive: plural stem + -en.',
  'ending.genitive-pl.vowel-en': 'Plural genitive in this word type: the singular stem ending in -i + -en.',
  'ending.genitive-pl.den': 'Plural genitive: plural stem + -den (in this word type -tten is also correct).',
  'ending.genitive-pl.tten': 'Plural genitive: plural stem + -tten, a less common alternative to -den.',
  'ending.genitive-pl.ten': 'Plural genitive on the consonant stem: + -ten, with no plural -i-. Used by the word types that have a consonant stem.',
  'ending.partitive-pl.a': 'Plural partitive: plural stem + -a/-ä.',
  'ending.partitive-pl.ta': 'Plural partitive: plural stem + -ta/-tä. Depending on the word type, the plural partitive ending is -a/-ä or -ta/-tä; this type uses -ta/-tä.',
  'ending.illative-pl.hin': 'Plural illative: plural stem + -hin.',
  'ending.illative-pl.in': 'Plural illative: plural stem + -in; the two i\'s make a long ii.',
  'ending.illative-pl.siin': 'Plural illative: plural stem + -siin.',
  'acc.sg.n': 'Accusative singular: a whole, completed object takes the -n form, which is the same as the genitive.',
  'acc.sg.zero': 'Accusative singular without ending: in commands, passive sentences and after words like täytyy, a whole object looks like the base form.',
  'acc.pl.t': 'Accusative plural: a whole plural object looks like the nominative plural (-t).',

  /* ---------------- plural stems ---------------- */
  'plural.append': 'Plural stem in this word type: the plural -i- is added to the stem without other changes.',
  'plural.a-to-o': 'Plural stem in this word type: a final -a/-ä becomes -o-/-ö- before the plural -i-.',
  'plural.drop-final': 'Plural stem in this word type: the final vowel of the stem drops before the plural -i-.',
  'plural.i-to-e': 'Plural stem in this word type: a final -i becomes -e- before the plural -i-.',
  'plural.shorten': 'Plural stem in this word type: a long vowel at the end of the stem becomes short before the plural -i-.',
  'plural.diphthong': 'Plural stem in this word type: the vowel pair ie, uo or yö loses its first vowel before the plural -i-.',
  'plural.lemma': 'Plural stem in this word type: it looks like the base form, and its final i works as the plural -i-.',
  'plural.ks': 'Plural stem in this word type: the final -s becomes -ks- before the plural -i-.',

  /* ---------------- consonant gradation ---------------- */
  'grade.weak.closed-syllable': 'Consonant gradation: in words that alternate, the weak grade appears when the ending closes the syllable (makes it end in a consonant).',
  'grade.weak.long-plural': 'Consonant gradation: in three-syllable words of this type, the long plural forms take the weak grade.',
  'grade.strong.open-syllable': 'Consonant gradation: in words that alternate, the strong grade stays when the syllable stays open (ends in a vowel).',
  'grade.strong.illative': 'Consonant gradation: the illative always keeps the strong grade.',
  'grade.strong.base': 'Consonant gradation: the base form has the strong grade.',
  'grade.inverse.strong-stem': 'Inverse gradation: the base form has the weak grade, and the vowel stem has the strong grade.',
  'grade.inverse.weak-base': 'Inverse gradation: forms built on the base form keep its weak grade.',
}

/**
 * When a general rule has a spelling sub-pattern, the examples must share it:
 * "after a vowel the plural i is written j" vs "after a consonant it stays i".
 */
export const PLURAL_GLIDE_NOTE = {
  glide: 'After a vowel, the plural i is written j: -ja/-jä, -jen.',
  'no-glide': 'After a consonant, the plural i stays i: -ia/-iä, -ien.',
} as const

/**
 * A general statement with example forms. Each example names the rule (and
 * spelling) it must demonstrate; a test checks the engine's derivation of
 * the example against it, so a statement can never cite a word that follows
 * a different pattern.
 */
export interface RuleNote {
  text: string
  examples: { lexemeId: string; slot: SlotKey; rule: RuleId; glide?: boolean }[]
}

/** The plural partitive and genitive endings, as summarised in the Plural Lab. */
export const PLURAL_ENDING_NOTES: readonly RuleNote[] = [
  {
    text: 'Partitive: plural stem + -a/-ä. After a vowel, the plural i is written j:',
    examples: [
      { lexemeId: 'talo', slot: 'pl.partitive', rule: 'ending.partitive-pl.a', glide: true },
      { lexemeId: 'kauppa', slot: 'pl.partitive', rule: 'ending.partitive-pl.a', glide: true },
    ],
  },
  {
    text: 'After a consonant, the plural i stays i:',
    examples: [
      { lexemeId: 'kieli', slot: 'pl.partitive', rule: 'ending.partitive-pl.a', glide: false },
      { lexemeId: 'koira', slot: 'pl.partitive', rule: 'ending.partitive-pl.a', glide: false },
    ],
  },
  {
    text: 'Some word types take -ta/-tä after the plural i instead:',
    examples: [
      { lexemeId: 'maa', slot: 'pl.partitive', rule: 'ending.partitive-pl.ta' },
      { lexemeId: 'perhe', slot: 'pl.partitive', rule: 'ending.partitive-pl.ta' },
    ],
  },
  {
    text: 'Genitive: plural stem + -en, written -jen after a vowel and -ien after a consonant:',
    examples: [
      { lexemeId: 'talo', slot: 'pl.genitive', rule: 'ending.genitive-pl.en', glide: true },
      { lexemeId: 'koira', slot: 'pl.genitive', rule: 'ending.genitive-pl.en', glide: false },
    ],
  },
  {
    text: 'Some word types take -den (or -tten) after the plural i:',
    examples: [
      { lexemeId: 'maa', slot: 'pl.genitive', rule: 'ending.genitive-pl.den' },
      { lexemeId: 'perhe', slot: 'pl.genitive', rule: 'ending.genitive-pl.den' },
    ],
  },
  {
    text: 'Words with a consonant stem often take -ten, with no plural i:',
    examples: [
      { lexemeId: 'kieli', slot: 'pl.genitive', rule: 'ending.genitive-pl.ten' },
      { lexemeId: 'nainen', slot: 'pl.genitive', rule: 'ending.genitive-pl.ten' },
    ],
  },
]

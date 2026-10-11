import { ENGLISH_PLURAL } from '../../data/explanations/walkthrough'

/**
 * English renderings of a lexicon gloss for explanation templates. Only the
 * first sense is used ("shop, store; trade" → "shop"); a sentence annotation
 * can name another sense ("newspaper" for lehti).
 */

/** First sense: text before the first ";" and the first "," outside parentheses. */
export function firstSense(gloss: string): string {
  const head = (gloss.split(';')[0] ?? gloss).trim()
  let depth = 0
  for (let i = 0; i < head.length; i++) {
    const c = head[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === ',' && depth === 0) return head.slice(0, i).trim()
  }
  return head
}

function pluralWord(word: string): string {
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`
  return `${word}s`
}

/** English plural of a sense, or null when English does not use one ("money"). */
export function englishPlural(sense: string): string | null {
  if (sense in ENGLISH_PLURAL) return ENGLISH_PLURAL[sense] ?? null
  // Pluralise the last word outside a trailing parenthesis: "nail (finger/toe)" → "nails (finger/toe)".
  const m = /^(.*?)(\p{L}+)(\s*\([^)]*\))?$/u.exec(sense)
  if (!m) return null
  return `${m[1]}${pluralWord(m[2] as string)}${m[3] ?? ''}`
}

function article(sense: string): string {
  const letter = /[A-Za-z]/.exec(sense)?.[0]?.toLowerCase() ?? ''
  const word = sense.replace(/^[^A-Za-z]+/, '').toLowerCase()
  if (word.startsWith('hour')) return 'an'
  if (/^(eu|uni|use|one)/.test(word)) return 'a'
  return 'aeiou'.includes(letter) ? 'an' : 'a'
}

export interface EnglishNoun {
  /** The sense in the requested number: "doctor" / "doctors". */
  g: string
  sg: string
  pl: string
  /** "a doctor" / "doctors" / "water" */
  a: string
  /** "the doctor" / "the doctors" / "water" */
  the: string
  countable: boolean
}

/**
 * Builds the {g} {a} {the} {pl} renderings. `sense` overrides the first gloss;
 * a capitalised sense is a proper noun ("Finland") and takes no article.
 */
export function englishNoun(gloss: string, number: 'sg' | 'pl', opts: { sense?: string; mass?: boolean } = {}): EnglishNoun {
  const sense = opts.sense ?? firstSense(gloss)
  const proper = /^[A-Z]/.test(sense) && sense !== 'Finnish (language)'
  const definite = sense.startsWith('the ')
  const plural = proper || definite ? null : englishPlural(sense)
  const countable = !proper && !definite && plural !== null && !opts.mass
  const pl = plural ?? sense
  if (proper || definite) return { g: sense, sg: sense, pl: sense, a: sense, the: sense, countable: false }
  if (!countable) return { g: sense, sg: sense, pl, a: sense, the: sense, countable: false }
  return number === 'pl'
    ? { g: pl, sg: sense, pl, a: pl, the: `the ${pl}`, countable }
    : { g: sense, sg: sense, pl, a: `${article(sense)} ${sense}`, the: `the ${sense}`, countable }
}

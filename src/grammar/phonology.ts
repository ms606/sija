/**
 * Finnish phonology helpers: vowels, syllable nuclei and the location of the
 * consonant cluster that undergoes consonant gradation.
 */

export const VOWELS = 'aeiouyäö'
export const BACK_VOWELS = 'aou'
export const FRONT_VOWELS = 'äöy'
export const NEUTRAL_VOWELS = 'ei'

export function isVowel(ch: string | undefined): boolean {
  return ch !== undefined && ch.length === 1 && VOWELS.includes(ch)
}

export function isConsonant(ch: string | undefined): boolean {
  return ch !== undefined && ch.length === 1 && /[a-zåäöšž]/.test(ch) && !isVowel(ch)
}

/** Diphthongs that can occur in any syllable (second component i, u or y). */
const DIPHTHONGS_ANY = new Set([
  'ai', 'ei', 'oi', 'ui', 'yi', 'äi', 'öi',
  'au', 'eu', 'iu', 'ou',
  'ey', 'iy', 'äy', 'öy',
])
/** Opening diphthongs occur only in the first syllable of a word. */
const DIPHTHONGS_FIRST_SYLLABLE = new Set(['ie', 'uo', 'yö'])

export function isLongVowel(pair: string): boolean {
  return pair.length === 2 && pair[0] === pair[1] && isVowel(pair[0])
}

/**
 * Splits a run of adjacent vowels into syllable nuclei.
 * `startsWord` tells whether the run belongs to the first syllable.
 *   'oe'  → ['o', 'e']      (koe)
 *   'aa'  → ['aa']          (maa)
 *   'ie'  → ['ie'] (first syllable: tie) / ['i', 'e'] (later: e.g. -ie- across syllables)
 */
export function splitVowelRun(run: string, startsWord: boolean): string[] {
  const nuclei: string[] = []
  let i = 0
  let first = startsWord
  while (i < run.length) {
    const pair = run.slice(i, i + 2)
    if (
      pair.length === 2 &&
      (isLongVowel(pair) || DIPHTHONGS_ANY.has(pair) || (first && DIPHTHONGS_FIRST_SYLLABLE.has(pair)))
    ) {
      nuclei.push(pair)
      i += 2
    } else {
      nuclei.push(run[i] as string)
      i += 1
    }
    first = false
  }
  return nuclei
}

export interface NucleusPosition {
  /** Index where the last syllable nucleus starts. */
  start: number
  /** Index just after the nucleus. */
  end: number
  nucleus: string
}

/** Locates the nucleus of the last syllable (ignoring word-final consonants). */
export function lastNucleus(word: string): NucleusPosition | null {
  let end = word.length
  while (end > 0 && !isVowel(word[end - 1])) end--
  if (end === 0) return null
  let runStart = end
  while (runStart > 0 && isVowel(word[runStart - 1])) runStart--
  const run = word.slice(runStart, end)
  const startsWord = ![...word.slice(0, runStart)].some((c) => isVowel(c))
  const nuclei = splitVowelRun(run, startsWord)
  const last = nuclei[nuclei.length - 1] as string
  return { start: end - last.length, end, nucleus: last }
}

export interface Site {
  /** Start index of the consonant cluster before the last nucleus. */
  start: number
  /** End index (exclusive) of the cluster = start of the last nucleus. */
  end: number
  cluster: string
}

/**
 * The gradation site: the consonant cluster immediately before the nucleus of
 * the last syllable. Empty when two vowels meet across a syllable boundary
 * (koe: ko|e → the site is between o and e).
 */
export function gradationSite(word: string): Site | null {
  const nucleus = lastNucleus(word)
  if (!nucleus) return null
  let start = nucleus.start
  while (start > 0 && isConsonant(word[start - 1])) start--
  return { start, end: nucleus.start, cluster: word.slice(start, nucleus.start) }
}

/** The last vowel letter of a string (used for illative -Vn / -hVn). */
export function lastVowel(s: string): string | undefined {
  for (let i = s.length - 1; i >= 0; i--) {
    if (isVowel(s[i])) return s[i]
  }
  return undefined
}

/** Number of syllables (approximate, by counting nuclei). */
export function syllableCount(word: string): number {
  let count = 0
  let i = 0
  let first = true
  while (i < word.length) {
    if (isVowel(word[i])) {
      let j = i
      while (j < word.length && isVowel(word[j])) j++
      count += splitVowelRun(word.slice(i, j), first).length
      first = false
      i = j
    } else {
      i++
    }
  }
  return count
}

/**
 * Splits a word into syllables with the two basic rules of Finnish:
 *  - a consonant directly before a vowel starts a new syllable (ta|lo, kaup|pa, kau|pan);
 *  - two vowels that are neither a long vowel nor a diphthong belong to different syllables (ko|e, ra|di|o).
 * Compound boundaries and loanword clusters (kont|rol|li) are not special-cased.
 */
export function syllabify(word: string): string[] {
  const lower = word.toLowerCase()
  const cuts: number[] = []
  let seenVowel = false
  let first = true
  let i = 0
  while (i < lower.length) {
    if (isVowel(lower[i])) {
      let j = i
      while (j < lower.length && isVowel(lower[j])) j++
      let k = i
      splitVowelRun(lower.slice(i, j), first).forEach((n, idx) => {
        if (idx > 0) cuts.push(k)
        k += n.length
      })
      first = false
      seenVowel = true
      i = j
    } else {
      if (seenVowel && isVowel(lower[i + 1])) cuts.push(i)
      i++
    }
  }
  const out: string[] = []
  let prev = 0
  for (const c of cuts) {
    out.push(word.slice(prev, c))
    prev = c
  }
  out.push(word.slice(prev))
  return out
}

/** A syllable is closed when it ends in a consonant (kau|pan: "pan" is closed). */
export function isClosedSyllable(syllable: string): boolean {
  return isConsonant(syllable[syllable.length - 1]?.toLowerCase())
}

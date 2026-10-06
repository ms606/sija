import { BACK_VOWELS, FRONT_VOWELS, NEUTRAL_VOWELS } from './phonology'
import type { Harmony, RuleId } from './types'

export interface HarmonyDecision {
  harmony: Harmony
  ruleId: RuleId
  /** The part of the word that decided (the whole word, or the last part of a compound). */
  decidingPart: string
  /** The vowels that decided: back vowels found, or front/neutral vowels. */
  vowels: string[]
}

/**
 * Vowel harmony (vokaalisointu): endings agree with the vowels of the word.
 *  - a word with any of a, o, u takes back endings (-ssa, -lla, -ta…)
 *  - otherwise (only ä, ö, y, e, i) it takes front endings (-ssä, -llä, -tä…)
 *  - e and i are neutral; a word with only e/i takes front endings
 *  - compounds follow their last part (sähkö|posti → postia)
 */
export function decideHarmony(word: string, compoundHead?: string, override?: Harmony): HarmonyDecision {
  const part = compoundHead ?? word
  const lower = part.toLowerCase()
  const back = [...lower].filter((c) => BACK_VOWELS.includes(c))
  if (override) {
    return { harmony: override, ruleId: 'harmony.lexical', decidingPart: part, vowels: back }
  }
  if (back.length > 0) {
    return {
      harmony: 'back',
      ruleId: compoundHead ? 'harmony.compound-head' : 'harmony.back',
      decidingPart: part,
      vowels: unique(back),
    }
  }
  const front = [...lower].filter((c) => FRONT_VOWELS.includes(c))
  if (front.length > 0) {
    return {
      harmony: 'front',
      ruleId: compoundHead ? 'harmony.compound-head' : 'harmony.front',
      decidingPart: part,
      vowels: unique(front),
    }
  }
  const neutral = [...lower].filter((c) => NEUTRAL_VOWELS.includes(c))
  return {
    harmony: 'front',
    ruleId: compoundHead ? 'harmony.compound-head' : 'harmony.neutral-only',
    decidingPart: part,
    vowels: unique(neutral),
  }
}

/** Replaces the archiphonemes A, O, U in an ending template with a/ä, o/ö, u/y. */
export function realize(template: string, harmony: Harmony): string {
  const back = harmony === 'back'
  return template.replace(/[AOU]/g, (m) => {
    if (m === 'A') return back ? 'a' : 'ä'
    if (m === 'O') return back ? 'o' : 'ö'
    return back ? 'u' : 'y'
  })
}

/** True when an ending template contains a harmonising vowel. */
export function hasHarmonyVowel(template: string): boolean {
  return /[AOU]/.test(template)
}

/** Swaps the harmony of a concrete string (used to build wrong-harmony distractors). */
export function swapHarmony(s: string): string {
  const map: Record<string, string> = { a: 'ä', o: 'ö', u: 'y', ä: 'a', ö: 'o', y: 'u' }
  return [...s].map((c) => map[c] ?? c).join('')
}

function unique(xs: string[]): string[] {
  return [...new Set(xs)]
}

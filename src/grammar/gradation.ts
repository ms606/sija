import { gradationSite } from './phonology'
import type { Grade, GradationId } from './types'

export interface GradationPatternDef {
  id: GradationId
  /** Strong-grade realisation of the site, e.g. 'pp'. */
  strong: string
  /** Weak-grade realisation, e.g. 'p' ('' = the consonant disappears). */
  weak: string
  /** Kotus gradation letter. ht~hd shares F with t~d. */
  kotusLetter: string
  kind: 'length' | 'quality' | 'assimilation' | 'loss'
}

/** The consonant gradation (astevaihtelu) patterns of Finnish nouns. */
export const GRADATION_PATTERNS: Readonly<Record<GradationId, GradationPatternDef>> = {
  'kk-k': { id: 'kk-k', strong: 'kk', weak: 'k', kotusLetter: 'A', kind: 'length' },
  'pp-p': { id: 'pp-p', strong: 'pp', weak: 'p', kotusLetter: 'B', kind: 'length' },
  'tt-t': { id: 'tt-t', strong: 'tt', weak: 't', kotusLetter: 'C', kind: 'length' },
  'k-0': { id: 'k-0', strong: 'k', weak: '', kotusLetter: 'D', kind: 'loss' },
  'p-v': { id: 'p-v', strong: 'p', weak: 'v', kotusLetter: 'E', kind: 'quality' },
  't-d': { id: 't-d', strong: 't', weak: 'd', kotusLetter: 'F', kind: 'quality' },
  'ht-hd': { id: 'ht-hd', strong: 'ht', weak: 'hd', kotusLetter: 'F', kind: 'quality' },
  'nk-ng': { id: 'nk-ng', strong: 'nk', weak: 'ng', kotusLetter: 'G', kind: 'assimilation' },
  'mp-mm': { id: 'mp-mm', strong: 'mp', weak: 'mm', kotusLetter: 'H', kind: 'assimilation' },
  'lt-ll': { id: 'lt-ll', strong: 'lt', weak: 'll', kotusLetter: 'I', kind: 'assimilation' },
  'nt-nn': { id: 'nt-nn', strong: 'nt', weak: 'nn', kotusLetter: 'J', kind: 'assimilation' },
  'rt-rr': { id: 'rt-rr', strong: 'rt', weak: 'rr', kotusLetter: 'K', kind: 'assimilation' },
  'k-j': { id: 'k-j', strong: 'k', weak: 'j', kotusLetter: 'L', kind: 'quality' },
  'k-v': { id: 'k-v', strong: 'k', weak: 'v', kotusLetter: 'M', kind: 'quality' },
}

export interface GradedText {
  text: string
  /** Span of the pattern text (strong or weak realisation) within `text`. */
  gradeStart: number
  gradeEnd: number
  grade: Grade
  /** What the span contained before the change ('' when nothing changed). */
  was?: string
}

export class GradationError extends Error {}

/**
 * Locates the gradation site of `stem` and expresses it in the requested
 * grade. `stem` is in grade `from`; the result is in grade `to`.
 * Throws when the word's site does not match the pattern (a data error).
 */
export function gradeStem(stem: string, pattern: GradationId, from: Grade, to: Grade): GradedText {
  const def = GRADATION_PATTERNS[pattern]
  const site = gradationSite(stem)
  if (!site) throw new GradationError(`No gradation site in "${stem}"`)
  const fromText = from === 'strong' ? def.strong : def.weak
  const toText = to === 'strong' ? def.strong : def.weak
  if (!site.cluster.endsWith(fromText)) {
    throw new GradationError(
      `"${stem}": site "${site.cluster}" does not end with the ${from} grade "${fromText}" of ${pattern}`,
    )
  }
  const spanStart = site.end - fromText.length
  if (from === to) {
    return { text: stem, gradeStart: spanStart, gradeEnd: site.end, grade: to }
  }
  const text = stem.slice(0, spanStart) + toText + stem.slice(site.end)
  return {
    text,
    gradeStart: spanStart,
    gradeEnd: spanStart + toText.length,
    grade: to,
    was: fromText,
  }
}

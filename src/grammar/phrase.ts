import { inflect } from './inflect'
import { withPossessive } from './possessive'
import type { Lexeme, NounForm, PersonId, SlotKey } from './types'

export interface PhraseForm {
  slot: SlotKey
  person?: PersonId
  /** One inflected form per word, in order. */
  words: NounForm[]
  /** Primary rendering, e.g. "uuden auton". */
  text: string
  /** Every accepted rendering (variants combined), primary first. */
  accepted: string[]
}

const MAX_COMBINATIONS = 24

/**
 * Noun phrase agreement (kongruenssi): attributes take the same case and
 * number as the head noun — uusi auto → uuden auton, uudessa autossa.
 * Only the head (last word) takes a possessive suffix: uudessa talossani.
 * In the comitative the attribute has no suffix: uusine taloineen.
 */
export function inflectPhrase(words: Lexeme[], slot: SlotKey, person?: PersonId): PhraseForm {
  if (words.length === 0) throw new Error('Empty phrase')
  const forms = words.map((w, i) => (person && i === words.length - 1 ? withPossessive(w, slot, person) : inflect(w, slot)))
  const lists = forms.map((f) => f.variants.filter((v) => v.register !== 'rare').map((v) => v.text))
  let accepted: string[]
  if (slot.endsWith('.accusative')) {
    // The object form must be consistent across the phrase: uuden auton / uusi auto, never mixed.
    const n = Math.min(...lists.map((l) => l.length))
    accepted = Array.from({ length: n }, (_, i) => lists.map((l) => l[i] as string).join(' '))
  } else {
    accepted = lists.reduce<string[]>(
      (acc, list) => acc.flatMap((prefix) => list.map((w) => (prefix ? `${prefix} ${w}` : w))).slice(0, MAX_COMBINATIONS),
      [''],
    )
  }
  const result: PhraseForm = { slot, words: forms, text: accepted[0] ?? '', accepted }
  if (person) result.person = person
  return result
}

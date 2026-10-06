import type { RuleId } from '../grammar/types'

/**
 * Real Finnish words that learners often produce by mistake while aiming for
 * another form; feedback mentions what the word actually means.
 */
export const KNOWN_WORDS: Readonly<Record<string, RuleId>> = {
  uusin: 'note.uusin',
}

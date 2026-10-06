import type { TypeId } from '../types'
import { K10, K11, K12, K13, K14, K15, K9 } from './a-a'
import { K32, K33, K35, K38, K39, K40, K41, K42, K43, K44 } from './consonant'
import { K48 } from './e'
import { K23, K24, K25, K26, K27, K28, K29, K30, K31, K5, K6, K7 } from './i'
import { K18, K19 } from './long-vowel'
import { K1, K2, K3 } from './o-u'
import type { DeclensionTypeDef } from './schema'

/** Every declension type the engine knows, keyed by id (Kotus numbering). */
export const DECLENSION_TYPES: Readonly<Record<string, DeclensionTypeDef>> = Object.fromEntries(
  [
    K1, K2, K3,
    K5, K6, K7,
    K9, K10, K11, K12, K13, K14, K15,
    K18, K19,
    K23, K24, K25, K26, K27, K28, K29, K30, K31,
    K32, K33, K35, K38, K39, K40, K41, K42, K43, K44,
    K48,
  ].map((t) => [t.id, t]),
)

export function getType(id: TypeId): DeclensionTypeDef {
  const def = DECLENSION_TYPES[id]
  if (!def) throw new Error(`Unknown declension type "${id}"`)
  return def
}

export type { DeclensionTypeDef } from './schema'

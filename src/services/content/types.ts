import { DECLENSION_TYPES, type DeclensionTypeDef } from '../../grammar'
import type { TypeId } from '../../grammar/types'
import type { Noun } from '../../types/content'
import { grammar } from '../grammar'

/** Words of the lexicon in a declension type, most common first. */
export function wordsOfType(typeId: TypeId): Noun[] {
  const rank = { core: 0, common: 1, extra: 2 } as const
  return grammar.lexicon.filter((l) => l.typeId === typeId).sort((a, b) => rank[a.frequency] - rank[b.frequency])
}

/** The Kotus model word when the app teaches it, otherwise the type's most common word. */
export function exampleWord(typeId: TypeId): Noun | undefined {
  const def = DECLENSION_TYPES[typeId]
  if (!def) return undefined
  return grammar.byLemma(def.modelWord).find((l) => l.typeId === typeId) ?? wordsOfType(typeId)[0]
}

export function typeDefs(): DeclensionTypeDef[] {
  return Object.values(DECLENSION_TYPES).sort((a, b) => a.kotus - b.kotus)
}

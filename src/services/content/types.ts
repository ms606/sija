import { MODEL_WORDS } from '../../data/lexicon/models'
import { DECLENSION_TYPES, type DeclensionTypeDef } from '../../grammar'
import type { IGroup, Lexeme, SlotKey, TypeId } from '../../grammar/types'
import type { Noun } from '../../types/content'
import { grammar } from '../grammar'
import { familyName, typeName } from './text'

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

/**
 * The type's own Kotus model word as a lexeme: the lexicon entry when the app
 * teaches it, otherwise the model-word record (MODEL_WORDS). Never a word of
 * another type, and never a substitute word of the same type.
 */
export function modelLexeme(typeId: TypeId): Lexeme | undefined {
  const def = DECLENSION_TYPES[typeId]
  if (!def) return undefined
  return grammar.byLemma(def.modelWord).find((l) => l.typeId === typeId) ?? MODEL_WORDS.find((m) => m.typeId === typeId && m.lemma === def.modelWord)
}

/** Primary form of any lexeme (lexicon or model word) in a slot. */
export function formOf(lex: Lexeme, slot: SlotKey): string | undefined {
  return grammar.inflect(lex, slot).variants[0]?.text
}

export function typeDefs(): DeclensionTypeDef[] {
  return Object.values(DECLENSION_TYPES).sort((a, b) => a.kotus - b.kotus)
}

/** The declension types taught in an -i learning family, read from the registry (not a separate list). */
export function typesOfFamily(group: IGroup): DeclensionTypeDef[] {
  return typeDefs().filter((d) => d.iGroup === group)
}

/** The key forms shown on a type card: genitive, partitive, plural partitive. */
export const CARD_SLOTS: readonly SlotKey[] = ['sg.genitive', 'sg.partitive', 'pl.partitive']

export interface TypeCard {
  typeId: TypeId
  /** The type's own name, from its Kotus model word: "paperi-type". */
  name: string
  kotus: number
  modelWord: string
  /** The type's own Kotus model word, whose forms the card shows. */
  example?: Lexeme
  /** The model word is one of the app's learner words (otherwise it is shown only on type pages). */
  exampleInLexicon: boolean
  /** The example's key forms, from the engine. */
  forms: string[]
  /** How many words of this type the app has. */
  count: number
  /** The -i learning family the type is taught in, labelled as a family. */
  family?: { id: IGroup; label: string }
}

/** Everything a type card shows, all of it about the same declension type. */
export function typeCard(typeId: TypeId): TypeCard {
  const def = DECLENSION_TYPES[typeId]
  if (!def) throw new Error(`Unknown declension type "${typeId}"`)
  const example = modelLexeme(typeId)
  return {
    typeId,
    name: typeName(typeId),
    kotus: def.kotus,
    modelWord: def.modelWord,
    ...(example ? { example } : {}),
    exampleInLexicon: !!example && !!grammar.get(example.id),
    forms: example ? CARD_SLOTS.map((s) => formOf(example, s) ?? '—') : [],
    count: wordsOfType(typeId).length,
    ...(def.iGroup ? { family: { id: def.iGroup, label: familyName(def.iGroup) } } : {}),
  }
}

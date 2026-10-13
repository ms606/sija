import type { Lexeme } from '../../grammar/types'

/**
 * Kotus model words (malliesimerkit) that the learner lexicon does not teach.
 * They are used only to show each declension type with its own model word
 * (the type card for Kotus 5 shows risti – ristin – ristiä, not another
 * word). They are not vocabulary: no lessons, exercises or search.
 *
 * Type and gradation are copied from Kotus' Nykysuomen sanalista 2024 and
 * checked by `npm run verify:kotus`; every form is checked against GiellaLT by
 * `npm run verify:morph`.
 */
const model = (lemma: string, typeId: Lexeme['typeId'], kotus: string, pos: Lexeme['pos'] = 'noun', extra: Partial<Lexeme> = {}): Lexeme => ({
  id: `model:${lemma}`,
  lemma,
  pos,
  typeId,
  kotus,
  ...extra,
})

export const MODEL_WORDS: readonly Lexeme[] = [
  model('valo', 'k1', '1'),
  model('valtio', 'k3', '3'),
  model('risti', 'k5', '5'),
  model('kulkija', 'k12', '12'),
  model('katiska', 'k13', '13'),
  model('solakka', 'k14', '14*A', 'adjective', { gradation: { pattern: 'kk-k' } }),
  model('korkea', 'k15', '15', 'adjective'),
  model('suo', 'k19', '19'),
  model('kytkin', 'k33', '33'),
  model('kalleus', 'k40', '40'),
  model('ohut', 'k43', '43', 'adjective'),
  model('hame', 'k48', '48'),
]

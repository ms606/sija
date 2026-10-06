import type { Noun } from '../../types/content'
import { noun } from './build'

/** Nouns ending in a consonant (Kotus 32–44). */
export const CONSONANT_NOUNS: Noun[] = [
  // Kotus 38 nainen — every -nen word
  noun('nainen', 'k38', '38', 'woman', { emoji: '👩', sem: ['person'], themes: ['people', 'family'], level: 1, freq: 'core' }),
  noun('ihminen', 'k38', '38', 'human being, person', { emoji: '🧑', sem: ['person'], themes: ['people'], level: 3 }),
  // Kotus 39 vastaus
  noun('vastaus', 'k39', '39', 'answer', { emoji: '💬', sem: ['abstract'], themes: ['school', 'language'], level: 3 }),
  noun('kysymys', 'k39', '39', 'question', { emoji: '❓', sem: ['abstract'], themes: ['school', 'language'], level: 3 }),
  noun('kokous', 'k39', '39', 'meeting', { emoji: '👥', sem: ['event'], themes: ['work'], level: 3 }),
  noun('kerros', 'k39', '39', 'storey, floor (of a building); layer', { emoji: '🏢', sem: ['place'], loc: 'inner', themes: ['home'], level: 3, notes: ['note.kerroksessa'] }),
  // Kotus 40 kalleus
  noun('terveys', 'k40', '40', 'health', { sem: ['abstract'], themes: ['health'], level: 3 }),
  noun('rakkaus', 'k40', '40', 'love', { emoji: '❤️', sem: ['abstract'], themes: ['people'], level: 3 }),
  // Kotus 41 vieras
  noun('lounas', 'k41', '41', 'lunch', { emoji: '🥗', sem: ['food', 'event'], themes: ['food', 'work'], level: 3 }),
  noun('vieras', 'k41', '41', 'guest; (adj.) foreign, strange', { emoji: '🙋', sem: ['person'], themes: ['people', 'home'], level: 3 }),
  noun('rengas', 'k41', '41*G', 'tyre; ring', { grad: '<nk-ng', emoji: '🛞', sem: ['object'], themes: ['transport'], level: 4 }),
  noun('hammas', 'k41', '41*H', 'tooth', { grad: '<mp-mm', emoji: '🦷', sem: ['body'], themes: ['body', 'health'], level: 4 }),
  noun('tehdas', 'k41', '41*F', 'factory', { grad: '<ht-hd', emoji: '🏭', sem: ['building'], loc: 'inner', themes: ['work'], level: 4 }),
  // Kotus 42 mies — the only member
  noun('mies', 'k42', '42', 'man', { emoji: '👨', sem: ['person'], themes: ['people', 'family'], level: 1, freq: 'core' }),
  // Kotus 43 ohut
  noun('olut', 'k43', '43', 'beer', { emoji: '🍺', sem: ['drink'], themes: ['food'], level: 3 }),
  // Kotus 44 kevät
  noun('kevät', 'k44', '44', 'spring (season)', { emoji: '🌷', sem: ['time'], themes: ['time', 'weather'], level: 3 }),
  // Kotus 33 kytkin
  noun('puhelin', 'k33', '33', 'telephone, phone', { emoji: '📱', illustration: 'puhelin', sem: ['object'], themes: ['work', 'services'], level: 3 }),
  noun('avain', 'k33', '33', 'key', { emoji: '🗝️', illustration: 'avain', sem: ['object'], themes: ['home'], level: 3 }),
  noun('eläin', 'k33', '33', 'animal', { emoji: '🐾', sem: ['animal'], themes: ['nature'], level: 3 }),
  // Kotus 32 sisar
  noun('sisar', 'k32', '32', 'sister', { sem: ['person'], themes: ['family'], level: 3 }),
  noun('tytär', 'k32', '32*C', 'daughter', { emoji: '👧', grad: '<tt-t', sem: ['person'], themes: ['family'], level: 4 }),
]

import type { Noun } from '../../types/content'
import { noun } from './build'

/** Nouns ending in -a / -ä (Kotus 9–14). */
export const A_NOUNS: Noun[] = [
  // Kotus 9 kala — first syllable a/e/i: a → o before plural -i-
  noun('kauppa', 'k9', '9*B', 'shop, store; trade', { grad: 'pp-p', emoji: '🏪', illustration: 'kauppa', sem: ['place', 'building'], loc: 'inner', themes: ['shop', 'city'], level: 1, freq: 'core' }),
  noun('kirja', 'k9', '9', 'book', { emoji: '📖', illustration: 'kirja', sem: ['object'], themes: ['school', 'leisure'], level: 1, freq: 'core' }),
  noun('kissa', 'k9', '9', 'cat', { emoji: '🐈', illustration: 'kissa', sem: ['animal'], themes: ['home', 'nature'], level: 1, freq: 'core' }),
  noun('kala', 'k9', '9', 'fish', { emoji: '🐟', illustration: 'kala', sem: ['animal', 'food'], themes: ['food', 'nature'], level: 1 }),
  noun('sana', 'k9', '9', 'word', { emoji: '🔤', sem: ['abstract'], themes: ['language'], level: 1 }),
  noun('raha', 'k9', '9', 'money', { emoji: '💶', sem: ['substance', 'object'], themes: ['money'], level: 2 }),
  noun('sauna', 'k9', '9', 'sauna', { emoji: '🧖', sem: ['place'], loc: 'inner', themes: ['home', 'leisure'], level: 1 }),
  noun('kassa', 'k9', '9', 'checkout, till', { emoji: '🛒', sem: ['place'], loc: 'outer', themes: ['shop'], level: 2, notes: ['note.kassalla'] }),
  noun('ilta', 'k9', '9*I', 'evening', { grad: 'lt-ll', emoji: '🌆', sem: ['time'], themes: ['time'], level: 1, freq: 'core' }),
  noun('hinta', 'k9', '9*J', 'price', { grad: 'nt-nn', emoji: '🏷️', sem: ['abstract'], themes: ['shop', 'money'], level: 4 }),
  noun('aika', 'k9', '9*D', 'time', { grad: 'k-0', jGlide: true, emoji: '⏰', sem: ['time', 'abstract'], themes: ['time'], level: 2, freq: 'core', notes: ['note.ajoissa'] }),
  // Kotus 10 koira — -ä words, and -a words with o/u in the first syllable: the vowel drops before -i-
  noun('koira', 'k10', '10', 'dog', { emoji: '🐕', illustration: 'koira', sem: ['animal'], themes: ['home', 'nature'], level: 1, freq: 'core' }),
  noun('juna', 'k10', '10', 'train', { emoji: '🚆', sem: ['vehicle'], loc: 'inner', themes: ['transport'], level: 1 }),
  noun('kuva', 'k10', '10', 'picture, image', { emoji: '🖼️', sem: ['object'], themes: ['leisure'], level: 2 }),
  noun('vuokra', 'k10', '10', 'rent', { sem: ['abstract'], themes: ['home', 'money'], level: 5 }),
  noun('asema', 'k10', '10', 'station', { emoji: '🚉', sem: ['place', 'building'], loc: 'outer', themes: ['transport', 'city'], level: 2 }),
  noun('ruoka', 'k10', '10*D', 'food; meal', {
    grad: 'k-0', emoji: '🍽️', sem: ['food', 'substance'], themes: ['food'], level: 1, freq: 'core',
    altStems: [{ vowelWeak: 'ruua', pluralWeak: 'ruui', register: 'variant', ruleId: 'variant.ruoka-ruua' }],
  }),
  noun('poika', 'k10', '10*D', 'boy; son', { grad: 'k-0', jGlide: true, emoji: '👦', sem: ['person'], themes: ['family', 'people'], level: 2 }),
  noun('päivä', 'k10', '10', 'day', { emoji: '☀️', sem: ['time'], themes: ['time'], level: 1, freq: 'core' }),
  noun('ystävä', 'k10', '10', 'friend', { emoji: '🤝', sem: ['person'], themes: ['people'], level: 1, freq: 'core' }),
  noun('kylä', 'k10', '10', 'village', { emoji: '🏘️', sem: ['place'], loc: 'inner', themes: ['city'], level: 1, notes: ['note.kylassa'] }),
  noun('isä', 'k10', '10', 'father', { emoji: '👨‍👧', sem: ['person'], themes: ['family', 'people'], level: 1, freq: 'core' }),
  noun('kesä', 'k10', '10', 'summer', { emoji: '🏖️', sem: ['time'], themes: ['time', 'weather'], level: 1 }),
  noun('seinä', 'k10', '10', 'wall', { emoji: '🧱', sem: ['object'], themes: ['home'], level: 2 }),
  noun('pöytä', 'k10', '10*F', 'table', { grad: 't-d', illustration: 'poyta', sem: ['furniture'], themes: ['home'], level: 1, freq: 'core' }),
  noun('leipä', 'k10', '10*E', 'bread', { grad: 'p-v', emoji: '🍞', sem: ['food'], themes: ['food'], level: 4 }),
  noun('kenkä', 'k10', '10*G', 'shoe', { grad: 'nk-ng', emoji: '👟', sem: ['clothing'], themes: ['shop'], level: 4 }),
  // Kotus 11 omena — two plural series
  noun('omena', 'k11', '11', 'apple', { emoji: '🍎', illustration: 'omena', sem: ['food'], themes: ['food'], level: 1, freq: 'core' }),
  // Kotus 12 kulkija — three-syllable words with -oita / -öitä
  noun('kahvila', 'k12', '12', 'café', { emoji: '🥐', sem: ['place', 'building'], loc: 'inner', themes: ['city', 'food'], level: 1 }),
  noun('ravintola', 'k12', '12', 'restaurant', { emoji: '🍴', sem: ['place', 'building'], loc: 'inner', themes: ['city', 'food'], level: 1 }),
  noun('ikkuna', 'k12', '12', 'window', { emoji: '🪟', sem: ['object'], themes: ['home'], level: 2 }),
  noun('myymälä', 'k12', '12', 'store, shop', { emoji: '🏬', sem: ['place', 'building'], loc: 'inner', themes: ['shop'], level: 5 }),
  // Kotus 13 katiska
  noun('sairaala', 'k13', '13', 'hospital', { emoji: '🏥', sem: ['building', 'institution'], loc: 'inner', themes: ['health'], level: 2 }),
  // Kotus 14 solakka — three syllables with kk/pp/tt
  noun('lusikka', 'k14', '14*A', 'spoon', { grad: 'kk-k', emoji: '🥄', sem: ['object'], themes: ['home', 'food'], level: 6 }),
  noun('mansikka', 'k14', '14*A', 'strawberry', { grad: 'kk-k', emoji: '🍓', sem: ['food'], themes: ['food'], level: 6 }),
]

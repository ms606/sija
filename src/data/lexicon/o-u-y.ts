import type { Noun } from '../../types/content'
import { noun } from './build'

/** Nouns ending in -o, -u, -y, -ö (Kotus 1, 2, 3). */
export const O_U_NOUNS: Noun[] = [
  // Kotus 1 valo
  noun('talo', 'k1', '1', 'house', { emoji: '🏠', illustration: 'talo', sem: ['building', 'place'], loc: 'inner', themes: ['home', 'city'], level: 1, freq: 'core' }),
  noun('auto', 'k1', '1', 'car', { emoji: '🚗', illustration: 'auto', sem: ['vehicle'], loc: 'inner', themes: ['transport'], level: 1, freq: 'core', noGradationNote: 'lexical.auto-no-gradation' }),
  noun('kello', 'k1', '1', 'clock, watch; (time) o\'clock', { emoji: '🕰️', sem: ['object', 'time'], themes: ['time'], level: 1, notes: ['note.kello'] }),
  noun('asunto', 'k1', '1*J', 'apartment, flat', { grad: 'nt-nn', emoji: '🔑', sem: ['place', 'building'], loc: 'inner', themes: ['home'], level: 1, freq: 'core' }),
  noun('viikko', 'k1', '1*A', 'week', { grad: 'kk-k', emoji: '📆', sem: ['time'], themes: ['time'], level: 2 }),
  noun('maito', 'k1', '1*F', 'milk', { grad: 't-d', emoji: '🥛', sem: ['drink', 'substance'], themes: ['food'], level: 2, numberUse: 'mass' }),
  noun('tyttö', 'k1', '1*C', 'girl', { grad: 'tt-t', emoji: '👧', sem: ['person'], themes: ['family', 'people'], level: 2 }),
  noun('pöllö', 'k1', '1', 'owl', { emoji: '🦉', sem: ['animal'], themes: ['nature'], level: 5, freq: 'extra' }),
  noun('koulu', 'k1', '1', 'school', { emoji: '🏫', illustration: 'koulu', sem: ['building', 'institution'], loc: 'inner', themes: ['school'], level: 1, freq: 'core' }),
  noun('aamu', 'k1', '1', 'morning', { emoji: '🌅', sem: ['time'], themes: ['time'], level: 1, freq: 'core' }),
  noun('mehu', 'k1', '1', 'juice', { emoji: '🧃', sem: ['drink'], themes: ['food'], level: 2 }),
  noun('katu', 'k1', '1*F', 'street', { grad: 't-d', emoji: '🚸', sem: ['place'], loc: 'outer', themes: ['city'], level: 2 }),
  noun('lippu', 'k1', '1*B', 'ticket; flag', { grad: 'pp-p', emoji: '🎫', sem: ['document', 'object'], themes: ['transport'], level: 4 }),
  noun('laukku', 'k1', '1*A', 'bag', { grad: 'kk-k', emoji: '👜', sem: ['object', 'container'], themes: ['shop'], level: 4 }),
  noun('kurkku', 'k1', '1*A', 'cucumber; throat', { grad: 'kk-k', emoji: '🥒', sem: ['food', 'body'], themes: ['food', 'body'], level: 4 }),
  noun('suku', 'k1', '1*M', 'relatives, (extended) family; kin', { grad: 'k-v', sem: ['person'], themes: ['family'], level: 4 }),
  noun('hylly', 'k1', '1', 'shelf', { sem: ['furniture'], themes: ['home'], level: 2 }),
  noun('sänky', 'k1', '1*G', 'bed', { grad: 'nk-ng', emoji: '🛏️', sem: ['furniture'], themes: ['home'], level: 4 }),
  noun('kyky', 'k1', '1*M', 'ability', { grad: 'k-v', sem: ['abstract'], themes: ['work'], level: 4 }),
  // Kotus 2 palvelu
  noun('kirjasto', 'k2', '2', 'library', { emoji: '📚', sem: ['building', 'institution'], loc: 'inner', themes: ['city', 'school'], level: 2 }),
  noun('toimisto', 'k2', '2', 'office', { emoji: '🏢', sem: ['place', 'building'], loc: 'inner', themes: ['work'], level: 2 }),
  noun('palvelu', 'k2', '2', 'service', { emoji: '🛎️', sem: ['abstract'], themes: ['services'], level: 5 }),
  // Kotus 3 valtio
  noun('radio', 'k3', '3', 'radio', { emoji: '📻', sem: ['object'], themes: ['leisure'], level: 1 }),
  noun('museo', 'k3', '3', 'museum', { emoji: '🏛️', sem: ['building', 'institution'], loc: 'inner', themes: ['city', 'leisure'], level: 5 }),
  noun('keittiö', 'k3', '3', 'kitchen', { emoji: '🍳', sem: ['place'], loc: 'inner', themes: ['home'], level: 2 }),
  noun('yhtiö', 'k3', '3', 'company (business)', { sem: ['institution'], themes: ['work'], level: 5 }),
]

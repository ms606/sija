import type { Noun } from '../../types/content'
import { noun } from './build'

/**
 * Nouns ending in -e (Kotus 48 hame): long-vowel stem perhee-.
 * Words with gradation show the weak grade in the base form (inverse gradation):
 * sade → sateen, koe → kokeen.
 */
export const E_NOUNS: Noun[] = [
  noun('perhe', 'k48', '48', 'family', { emoji: '👪', sem: ['person'], themes: ['family'], level: 1, freq: 'core' }),
  noun('huone', 'k48', '48', 'room', { emoji: '🛋️', sem: ['place'], loc: 'inner', themes: ['home'], level: 2 }),
  noun('kirje', 'k48', '48', 'letter (mail)', { emoji: '✉️', sem: ['document'], themes: ['services'], level: 2 }),
  noun('vene', 'k48', '48', 'boat', { emoji: '🚤', sem: ['vehicle'], loc: 'inner', themes: ['transport', 'leisure'], level: 2 }),
  noun('kone', 'k48', '48', 'machine; computer (colloquial)', { emoji: '⚙️', sem: ['object'], themes: ['work'], level: 3 }),
  noun('koe', 'k48', '48*D', 'test, exam; experiment', { grad: '<k-0', emoji: '🧪', sem: ['event'], themes: ['school'], level: 4 }),
  noun('sade', 'k48', '48*F', 'rain', { grad: '<t-d', emoji: '🌧️', sem: ['weather'], themes: ['weather'], level: 4 }),
  noun('liike', 'k48', '48*A', 'business, shop; movement', { grad: '<kk-k', sem: ['place', 'abstract'], loc: 'inner', themes: ['shop', 'work'], level: 4 }),
  noun('parveke', 'k48', '48*A', 'balcony', { grad: '<kk-k', sem: ['place'], loc: 'outer', themes: ['home'], level: 4 }),
  noun('osoite', 'k48', '48*C', 'address', { grad: '<tt-t', emoji: '📍', sem: ['abstract'], themes: ['services', 'home'], level: 4 }),
  noun('lääke', 'k48', '48*A', 'medicine, medication', { grad: '<kk-k', emoji: '💊', sem: ['substance'], themes: ['health'], level: 4 }),
]

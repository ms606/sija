import type { Noun } from '../../types/content'
import { noun } from './build'

/** One-syllable nouns with a long vowel (Kotus 18) or a diphthong ie/uo/yö (Kotus 19). */
export const MONOSYLLABLES: Noun[] = [
  noun('maa', 'k18', '18', 'country, land; ground', { emoji: '🌍', sem: ['place', 'nature'], loc: 'both', themes: ['nature', 'city'], level: 1, freq: 'core' }),
  noun('puu', 'k18', '18', 'tree; wood', { emoji: '🌳', illustration: 'puu', sem: ['plant', 'nature', 'substance'], themes: ['nature'], level: 1 }),
  noun('pää', 'k18', '18', 'head', { sem: ['body'], themes: ['body'], level: 2 }),
  noun('tee', 'k18', '18', 'tea', { emoji: '🍵', sem: ['drink', 'substance'], themes: ['food'], level: 2 }),
  noun('syy', 'k18', '18', 'reason, cause; fault', { sem: ['abstract'], themes: ['language'], level: 5 }),
  noun('kuu', 'k18', '18', 'moon; month', { emoji: '🌙', sem: ['nature', 'time'], themes: ['nature', 'time'], level: 5 }),
  noun('työ', 'k19', '19', 'work, job', { emoji: '💼', sem: ['abstract'], themes: ['work'], level: 1, freq: 'core', notes: ['note.toissa'] }),
  noun('yö', 'k19', '19', 'night', { emoji: '🌃', sem: ['time'], themes: ['time'], level: 2 }),
  noun('tie', 'k19', '19', 'road, way', { emoji: '🛣️', sem: ['place'], loc: 'outer', themes: ['transport'], level: 1 }),
]

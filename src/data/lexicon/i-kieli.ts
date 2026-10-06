import type { Noun } from '../../types/content'
import { adj, noun, replaceForm } from './build'

/**
 * Kieli-type (Kotus 23, 24, 26): -i becomes -e- in the vowel stem, and the
 * partitive is built on the consonant stem: kieli → kielen, kieltä.
 */
export const KIELI_TYPE: Noun[] = [
  noun('kieli', 'k26', '26', 'language; tongue', { emoji: '👅', sem: ['abstract', 'body'], themes: ['language', 'body'], level: 1, freq: 'core' }),
  adj('pieni', 'k26', '26', 'small, little', { level: 1, freq: 'core' }),
  noun('sieni', 'k26', '26', 'mushroom; fungus', { emoji: '🍄', sem: ['food', 'plant'], themes: ['food', 'nature'], level: 5 }),
  adj('suuri', 'k26', '26', 'large, big, great', { level: 1, freq: 'core' }),
  noun('saari', 'k26', '26', 'island', { emoji: '🏝️', illustration: 'saari', sem: ['nature', 'place'], loc: 'outer', themes: ['nature'], level: 2, freq: 'core' }),
  noun('tuuli', 'k26', '26', 'wind', { emoji: '💨', sem: ['weather'], themes: ['weather'], level: 5, freq: 'core' }),
  noun('ääni', 'k26', '26', 'voice; sound; vote', { emoji: '🔊', sem: ['abstract'], themes: ['language'], level: 5 }),
  noun('mieli', 'k26', '26', 'mind', { emoji: '🧠', sem: ['abstract'], themes: ['people'], level: 5 }),
  noun('puoli', 'k26', '26', 'half; side', { emoji: '🌓', sem: ['abstract', 'number'], themes: ['numbers'], level: 5 }),
  noun('vuori', 'k26', '26', 'mountain', { emoji: '⛰️', sem: ['nature', 'place'], loc: 'outer', themes: ['nature'], level: 5 }),
  noun('juuri', 'k26', '26', 'root', { sem: ['plant', 'abstract'], themes: ['nature'], level: 5, notes: ['note.juuri-adverb'] }),
  adj('nuori', 'k26', '26', 'young; young person', { level: 5 }),
  noun('kaari', 'k26', '26', 'arc, arch', { emoji: '🌈', sem: ['object'], themes: ['nature'], level: 5, freq: 'extra' }),
  noun('kuori', 'k26', '26', 'shell; peel, crust; envelope', { emoji: '🥚', sem: ['object'], themes: ['food'], level: 5, freq: 'extra' }),
  noun('sääri', 'k26', '26', 'shin, lower leg', { sem: ['body'], themes: ['body'], level: 5, freq: 'extra' }),
  noun('veri', 'k26', '26', 'blood', {
    emoji: '🩸', sem: ['substance', 'body'], themes: ['body', 'health'], level: 5, numberUse: 'mass',
    overrides: [replaceForm('sg.partitive', ['verta'], 'exception.merta-verta')],
  }),
  noun('meri', 'k24', '24', 'sea', {
    emoji: '🌊', sem: ['nature', 'place'], loc: 'both', themes: ['nature'], level: 2, freq: 'core',
    overrides: [replaceForm('sg.partitive', ['merta'], 'exception.merta-verta')],
  }),
  noun('hiiri', 'k24', '24', 'mouse', { emoji: '🐭', sem: ['animal'], themes: ['nature', 'home'], level: 5 }),
  noun('uni', 'k24', '24', 'sleep; dream', { emoji: '😴', sem: ['abstract'], themes: ['people'], level: 5 }),
  noun('kuusi', 'k24', '24', 'spruce', { id: 'kuusi-spruce', emoji: '🌲', illustration: 'kuusi', sem: ['plant', 'nature'], themes: ['nature'], level: 5, homonyms: ['kuusi-six'] }),
  noun('hiili', 'k24', '24', 'coal; carbon', { sem: ['substance'], themes: ['nature'], level: 5, freq: 'extra' }),
  noun('tuli', 'k23', '23', 'fire', { emoji: '🔥', sem: ['nature'], themes: ['nature'], level: 2, freq: 'core', notes: ['note.tuli-verb'] }),
  noun('lohi', 'k23', '23', 'salmon', { emoji: '🍣', sem: ['animal', 'food'], themes: ['food'], level: 5 }),
  noun('tiili', 'k23', '23', 'brick', { emoji: '🧱', sem: ['object', 'substance'], themes: ['home'], level: 5 }),
  noun('vuohi', 'k23', '23', 'goat', { emoji: '🐐', sem: ['animal'], themes: ['nature'], level: 5 }),
]

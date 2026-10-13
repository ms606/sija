import type { Noun } from '../../types/content'
import { addVariant, adj, noun, num } from './build'

/**
 * The uusi learning family: -si words whose s becomes t (and d) in the stems.
 * Kotus 27 käsi (uusi → uuden, uutta), 28 kynsi (kansi → kannen, kantta) and
 * 31 kaksi (kaksi → kahden, kahta). lapsi and veitsi also end in -si but keep
 * their s (lapsen, veitsen): they are in the kieli family (i-kieli.ts).
 */
export const UUSI_FAMILY: Noun[] = [
  adj('uusi', 'k27', '27', 'new', { level: 1, freq: 'core', notes: ['note.uusin'] }),
  noun('käsi', 'k27', '27', 'hand', { emoji: '✋', illustration: 'kasi', sem: ['body'], themes: ['body'], level: 1, freq: 'core', notes: ['note.kasin'] }),
  noun('vesi', 'k27', '27', 'water', { emoji: '💧', illustration: 'vesi', sem: ['substance', 'drink', 'nature'], themes: ['food', 'nature'], level: 1, freq: 'core' }),
  noun('susi', 'k27', '27', 'wolf', { emoji: '🐺', sem: ['animal'], themes: ['nature'], level: 5 }),
  noun('vuosi', 'k27', '27', 'year', {
    emoji: '📅', sem: ['time'], themes: ['time'], level: 2, freq: 'core', notes: ['note.vuonna'],
    overrides: [addVariant('sg.essive', ['vuonna'], 'irregular.vuonna', 'irregular')],
  }),
  num('viisi', 'k27', '27', 'five', { emoji: '5️⃣', level: 5 }),
  adj('täysi', 'k27', '27', 'full', { level: 5 }),
  num('kuusi', 'k27', '27', 'six', { id: 'kuusi-six', emoji: '6️⃣', level: 5, homonyms: ['kuusi-spruce'] }),
  noun('kuukausi', 'k27', '27', 'month', { emoji: '🗓️', sem: ['time'], themes: ['time'], level: 2, freq: 'core' }),
  noun('kausi', 'k27', '27', 'season, period', { sem: ['time'], themes: ['time'], level: 5 }),
  adj('tosi', 'k27', '27', 'true; (as adverb) really', { level: 5, notes: ['note.totta'] }),
  noun('köysi', 'k27', '27', 'rope', { emoji: '🪢', sem: ['object'], themes: ['home'], level: 5, freq: 'extra' }),
  noun('liesi', 'k27', '27', 'stove, cooker', { sem: ['object'], themes: ['home'], level: 5 }),
  noun('reisi', 'k27', '27', 'thigh', { sem: ['body'], themes: ['body'], level: 5, freq: 'extra' }),
  noun('kansi', 'k28', '28*J', 'lid, cover; deck', { grad: 'nt-nn', sem: ['object'], themes: ['home'], level: 5 }),
  noun('länsi', 'k28', '28*J', 'west', { grad: 'nt-nn', emoji: '🧭', sem: ['direction'], themes: ['nature'], level: 5, numberUse: 'pl-rare' }),
  noun('kynsi', 'k28', '28*J', 'nail (finger/toe); claw', { grad: 'nt-nn', emoji: '💅', sem: ['body'], themes: ['body'], level: 5 }),
  noun('varsi', 'k28', '28*K', 'stem, stalk; handle', { grad: 'rt-rr', sem: ['object', 'plant'], themes: ['nature'], level: 5, freq: 'extra' }),
  num('kaksi', 'k31', '31', 'two', { emoji: '2️⃣', level: 1, freq: 'core' }),
  num('yksi', 'k31', '31', 'one', { emoji: '1️⃣', level: 1, freq: 'core' }),
]

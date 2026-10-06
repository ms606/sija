import type { Noun } from '../../types/content'
import { noun } from './build'

/**
 * Pankki-type (Kotus 5, 6): the -i stays in the stem. Mostly loanwords and
 * newer words. pankki → pankin, pankkia; plural pankkeja.
 */
export const PANKKI_TYPE: Noun[] = [
  noun('pankki', 'k5', '5*A', 'bank', { grad: 'kk-k', emoji: '🏦', illustration: 'pankki', sem: ['building', 'institution'], loc: 'inner', themes: ['money', 'city', 'services'], level: 1, freq: 'core' }),
  noun('bussi', 'k5', '5', 'bus', { emoji: '🚌', illustration: 'bussi', sem: ['vehicle'], loc: 'inner', themes: ['transport'], level: 1, freq: 'core' }),
  noun('posti', 'k5', '5', 'post office; mail', { emoji: '📮', sem: ['institution', 'place'], loc: 'inner', themes: ['services', 'city'], level: 1, freq: 'core' }),
  noun('kahvi', 'k5', '5', 'coffee', { emoji: '☕', illustration: 'kahvi', sem: ['drink', 'substance'], themes: ['food'], level: 1, freq: 'core' }),
  noun('tunti', 'k5', '5*J', 'hour; lesson', { grad: 'nt-nn', emoji: '🕐', sem: ['time'], themes: ['time', 'school'], level: 2, freq: 'core' }),
  noun('kaupunki', 'k5', '5*G', 'city, town', { grad: 'nk-ng', emoji: '🏙️', sem: ['place'], loc: 'inner', themes: ['city'], level: 1, freq: 'core' }),
  noun('kortti', 'k5', '5*C', 'card', { grad: 'tt-t', emoji: '🎴', sem: ['object', 'document'], themes: ['money', 'services'], level: 4 }),
  noun('tuoli', 'k5', '5', 'chair', { emoji: '🪑', illustration: 'tuoli', sem: ['furniture'], themes: ['home'], level: 1, freq: 'core' }),
  noun('lasi', 'k5', '5', 'glass', { emoji: '🥃', sem: ['object', 'container', 'substance'], themes: ['home', 'food'], level: 5 }),
  noun('tili', 'k5', '5', '(bank) account', { sem: ['abstract'], themes: ['money', 'services'], level: 5 }),
  noun('taksi', 'k5', '5', 'taxi', { emoji: '🚕', sem: ['vehicle'], loc: 'inner', themes: ['transport'], level: 5 }),
  noun('kurssi', 'k5', '5', 'course', { sem: ['event', 'abstract'], themes: ['school'], level: 5 }),
  noun('passi', 'k5', '5', 'passport', { emoji: '🛂', sem: ['document'], themes: ['services'], level: 5 }),
  noun('kuitti', 'k5', '5*C', 'receipt', { grad: 'tt-t', emoji: '🧾', sem: ['document'], themes: ['shop'], level: 4 }),
  noun('kaappi', 'k5', '5*B', 'cupboard, cabinet', { grad: 'pp-p', emoji: '🗄️', sem: ['furniture', 'container'], loc: 'inner', themes: ['home'], level: 4 }),
  noun('kuppi', 'k5', '5*B', 'cup', { grad: 'pp-p', sem: ['object', 'container'], themes: ['home', 'food'], level: 4 }),
  noun('hissi', 'k5', '5', 'lift, elevator', { emoji: '🛗', sem: ['object', 'place'], loc: 'inner', themes: ['home'], level: 5 }),
  noun('metri', 'k5', '5', 'metre', { emoji: '📏', sem: ['number'], themes: ['numbers'], level: 5, freq: 'extra' }),
  noun('tentti', 'k5', '5*C', 'exam (at university)', { grad: 'tt-t', emoji: '📝', sem: ['event'], themes: ['school'], level: 4 }),
  noun('äiti', 'k5', '5*F', 'mother', { grad: 't-d', emoji: '👩‍👧', sem: ['person'], themes: ['family', 'people'], level: 1, freq: 'core' }),
  noun('koti', 'k5', '5*F', 'home', { grad: 't-d', emoji: '🏡', sem: ['place'], loc: 'inner', themes: ['home'], level: 1, freq: 'core', notes: ['note.koti-kotona'] }),
  noun('apteekki', 'k5', '5*A', 'pharmacy', { grad: 'kk-k', emoji: '⚕️', sem: ['place', 'building'], loc: 'inner', themes: ['health', 'shop'], level: 4 }),
  noun('mökki', 'k5', '5*A', 'cottage, cabin', { grad: 'kk-k', emoji: '🛖', sem: ['building', 'place'], loc: 'outer', themes: ['leisure', 'home'], level: 2, notes: ['note.mokilla'] }),
  noun('hotelli', 'k6', '6', 'hotel', { emoji: '🏨', sem: ['building'], loc: 'inner', themes: ['city', 'leisure'], level: 5, preferred: { 'pl.partitive': ['hotelleja'] } }),
  noun('paperi', 'k6', '6', 'paper', { emoji: '📄', sem: ['substance', 'object'], themes: ['school', 'work'], level: 5 }),
  noun('naapuri', 'k6', '6', 'neighbour', { sem: ['person'], themes: ['home', 'people'], level: 5 }),
  noun('lääkäri', 'k6', '6', 'doctor', { emoji: '🧑‍⚕️', sem: ['person'], themes: ['health', 'people'], level: 2, freq: 'core', notes: ['note.laakarissa'] }),
  noun('banaani', 'k6', '6', 'banana', { emoji: '🍌', sem: ['food'], themes: ['food'], level: 5, preferred: { 'pl.partitive': ['banaaneja'] } }),
  noun('sähköposti', 'k5', '', 'email', { emoji: '📧', compound: ['sähkö', 'posti'], sem: ['document'], themes: ['work'], level: 5 }),
  noun('pankkikortti', 'k5', '', 'bank card', { grad: 'tt-t', emoji: '💳', compound: ['pankki', 'kortti'], sem: ['object'], themes: ['money', 'shop'], level: 5 }),
  noun('päiväkoti', 'k5', '', 'daycare centre, kindergarten', { grad: 't-d', emoji: '🧸', compound: ['päivä', 'koti'], sem: ['place', 'institution'], loc: 'inner', themes: ['daycare', 'family'], level: 5 }),
]

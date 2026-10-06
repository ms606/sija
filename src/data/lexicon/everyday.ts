import type { Noun } from '../../types/content'
import { noun } from './build'

/**
 * Everyday and service-domain nouns (school, work, health, housing, public
 * services) used in sentences, case explanations and YKI practice.
 * Kotus types verified against the 2024 list; compounds inflect like their head.
 */
export const EVERYDAY: Noun[] = [
  // People
  noun('opettaja', 'k10', '10', 'teacher', { emoji: '🧑‍🏫', sem: ['person'], themes: ['school', 'people'], level: 1, freq: 'core' }),
  noun('opiskelija', 'k12', '12', 'student', { emoji: '🧑‍🎓', sem: ['person'], themes: ['school', 'people'], level: 2 }),
  noun('johtaja', 'k10', '10', 'manager, director', { emoji: '🧑‍💼', sem: ['person'], themes: ['work', 'people'], level: 2 }),
  noun('hoitaja', 'k10', '10', 'carer, nurse; (daycare) teacher', { emoji: '🧑‍⚕️', sem: ['person'], themes: ['health', 'daycare'], level: 3 }),
  noun('sairaanhoitaja', 'k10', '', 'nurse', { emoji: '💉', compound: ['sairaan', 'hoitaja'], sem: ['person'], themes: ['health', 'people'], level: 3 }),
  noun('vauva', 'k9', '9', 'baby', { emoji: '👶', sem: ['person'], themes: ['family', 'daycare'], level: 2 }),
  noun('asiakas', 'k41', '41*A', 'customer, client', { grad: '<kk-k', sem: ['person'], themes: ['shop', 'services', 'work'], level: 4 }),
  noun('asukas', 'k41', '41*A', 'resident', { grad: '<kk-k', sem: ['person'], themes: ['home', 'services'], level: 4 }),
  // Language and places
  noun('suomi', 'k7', '7', 'Finnish (language); Suomi = Finland', { sem: ['abstract'], themes: ['language'], level: 1, freq: 'core', notes: ['note.suomi'] }),
  noun('tori', 'k5', '5', 'market square, marketplace', { emoji: '🧺', sem: ['place'], loc: 'outer', themes: ['city', 'shop'], level: 2, notes: ['note.torilla'] }),
  noun('piha', 'k9', '9', 'yard, courtyard', { emoji: '🏡', sem: ['place'], loc: 'outer', themes: ['home'], level: 1 }),
  noun('lattia', 'k12', '12', 'floor', { sem: ['object', 'place'], loc: 'outer', themes: ['home'], level: 1 }),
  noun('paikka', 'k9', '9*A', 'place, spot; seat', { emoji: '📍', grad: 'kk-k', sem: ['place'], loc: 'both', themes: ['city'], level: 4 }),
  noun('työpaikka', 'k9', '', 'workplace; job', { grad: 'kk-k', compound: ['työ', 'paikka'], sem: ['place'], loc: 'outer', themes: ['work'], level: 4 }),
  noun('keskus', 'k39', '39', 'centre', { sem: ['place'], loc: 'inner', themes: ['city'], level: 3 }),
  noun('terveyskeskus', 'k39', '', 'health centre', { emoji: '🩺', compound: ['terveys', 'keskus'], sem: ['place', 'institution'], loc: 'inner', themes: ['health', 'services'], level: 3 }),
  noun('kauppakeskus', 'k39', '', 'shopping centre, mall', { emoji: '🛍️', compound: ['kauppa', 'keskus'], sem: ['place', 'building'], loc: 'inner', themes: ['shop', 'city'], level: 3 }),
  noun('ruokakauppa', 'k9', '', 'grocery store', { grad: 'pp-p', emoji: '🛒', compound: ['ruoka', 'kauppa'], sem: ['place', 'building'], loc: 'inner', themes: ['shop', 'food'], level: 2 }),
  noun('virasto', 'k1', '1', 'government office, agency', { emoji: '🏛️', sem: ['institution', 'place'], loc: 'inner', themes: ['services'], level: 4 }),
  noun('kunta', 'k10', '10*J', 'municipality', { grad: 'nt-nn', sem: ['institution', 'place'], loc: 'inner', themes: ['services'], level: 4 }),
  // Services, money, work
  noun('lomake', 'k48', '48*A', 'form (to fill in)', { grad: '<kk-k', emoji: '📋', sem: ['document'], themes: ['services'], level: 4 }),
  noun('hakemus', 'k39', '39', 'application', { emoji: '📝', sem: ['document'], themes: ['services', 'work'], level: 4 }),
  noun('ilmoitus', 'k39', '39', 'notice, announcement; notification', { emoji: '📢', sem: ['document'], themes: ['services'], level: 4 }),
  noun('tilaus', 'k39', '39', 'order (purchase)', { sem: ['abstract'], themes: ['shop'], level: 4 }),
  noun('jono', 'k1', '1', 'queue, line', { sem: ['abstract'], themes: ['services', 'shop'], level: 2, notes: ['note.jonossa'] }),
  noun('lasku', 'k1', '1', 'bill, invoice', { emoji: '🧾', sem: ['document'], themes: ['money', 'services'], level: 2 }),
  noun('vuoro', 'k1', '1', 'turn; (work) shift', { sem: ['abstract', 'time'], themes: ['work', 'services'], level: 3 }),
  noun('palkka', 'k9', '9*A', 'salary, pay', { grad: 'kk-k', sem: ['abstract'], themes: ['work', 'money'], level: 4 }),
  noun('vero', 'k1', '1', 'tax', { sem: ['abstract'], themes: ['money', 'services'], level: 4 }),
  noun('hoito', 'k1', '1*F', 'care, treatment', { grad: 't-d', sem: ['abstract'], themes: ['health', 'daycare'], level: 4 }),
  noun('päivähoito', 'k1', '', 'day care (for children)', { grad: 't-d', compound: ['päivä', 'hoito'], sem: ['abstract', 'institution'], themes: ['daycare', 'family'], level: 4 }),
  noun('resepti', 'k5', '5', 'prescription; recipe', { sem: ['document'], themes: ['health', 'food'], level: 5 }),
  noun('opas', 'k41', '41*B', 'guide; guidebook', { grad: '<pp-p', sem: ['person', 'document'], themes: ['leisure'], level: 4 }),
  // Health and body
  noun('silmä', 'k10', '10', 'eye', { emoji: '👁️', sem: ['body'], themes: ['body'], level: 2 }),
  noun('tukka', 'k10', '10*A', 'hair (on the head)', { emoji: '💇', grad: 'kk-k', sem: ['body'], themes: ['body'], level: 3 }),
  noun('vatsa', 'k9', '9', 'stomach, belly', { sem: ['body'], themes: ['body', 'health'], level: 3 }),
  noun('kuume', 'k48', '48', 'fever, temperature', { emoji: '🤒', sem: ['abstract'], themes: ['health'], level: 3 }),
  noun('flunssa', 'k10', '10', 'flu, cold', { emoji: '🤧', sem: ['abstract'], themes: ['health'], level: 3 }),
  // Time and leisure
  noun('maanantai', 'k18', '18', 'Monday', { sem: ['time'], themes: ['time'], level: 2, notes: ['note.maanantaina'] }),
  noun('joulu', 'k1', '1', 'Christmas', { emoji: '🎄', sem: ['time', 'event'], themes: ['time'], level: 2 }),
  noun('loma', 'k10', '10', 'holiday, vacation', { emoji: '🧳', sem: ['time', 'event'], themes: ['leisure', 'work'], level: 2 }),
  noun('matka', 'k9', '9', 'trip, journey; distance', { emoji: '✈️', sem: ['event'], themes: ['transport', 'leisure'], level: 2 }),
  noun('juhla', 'k10', '10', 'party, celebration', { emoji: '🎉', sem: ['event'], themes: ['leisure', 'people'], level: 2 }),
  noun('lahja', 'k9', '9', 'gift, present', { emoji: '🎁', sem: ['object'], themes: ['people'], level: 2 }),
  noun('elokuva', 'k10', '', 'film, movie', { emoji: '🎬', compound: ['elo', 'kuva'], sem: ['event'], themes: ['leisure'], level: 2 }),
  noun('sää', 'k18', '18', 'weather', { emoji: '🌤️', sem: ['weather'], themes: ['weather'], level: 2 }),
  noun('kilo', 'k1', '1', 'kilo(gram)', { sem: ['number'], themes: ['shop', 'numbers'], level: 2 }),
  // Nouns the example sentences already used as plain text (grammar audit S20, 2026-10-06);
  // now engine-generated. Kotus info copied from the 2024 list.
  noun('aurinko', 'k1', '1*G', 'sun', { grad: 'nk-ng', emoji: '☀️', sem: ['nature', 'weather'], themes: ['weather', 'nature'], level: 2 }),
  noun('elokuu', 'k18', '', 'August', { compound: ['elo', 'kuu'], sem: ['time'], themes: ['time'], level: 3 }),
  noun('euro', 'k1', '1', 'euro', { emoji: '💶', sem: ['object'], themes: ['money', 'shop'], level: 2 }),
  noun('jää', 'k18', '18', 'ice', { emoji: '🧊', sem: ['substance', 'nature'], themes: ['weather', 'nature'], level: 3 }),
  noun('keitto', 'k1', '1*C', 'soup', { grad: 'tt-t', emoji: '🥣', sem: ['food'], themes: ['food'], level: 3 }),
  noun('keskusta', 'k13', '13', 'town centre, downtown', { emoji: '🏙️', sem: ['place'], loc: 'inner', themes: ['city'], level: 2 }),
  noun('lauantai', 'k18', '18', 'Saturday', { sem: ['time'], themes: ['time'], level: 2, notes: ['note.maanantaina'] }),
  noun('lintu', 'k1', '1*J', 'bird', { grad: 'nt-nn', emoji: '🐦', sem: ['animal'], themes: ['nature'], level: 2 }),
  noun('metsä', 'k10', '10', 'forest, woods', { emoji: '🌲', sem: ['nature', 'place'], loc: 'inner', themes: ['nature'], level: 2, freq: 'core' }),
  noun('perjantai', 'k18', '18', 'Friday', { sem: ['time'], themes: ['time'], level: 2, notes: ['note.maanantaina'] }),
  noun('peruna', 'k12', '12', 'potato', { emoji: '🥔', sem: ['food'], themes: ['food'], level: 3 }),
  noun('ranta', 'k9', '9*J', 'shore, beach', { grad: 'nt-nn', emoji: '🏖️', sem: ['nature', 'place'], loc: 'outer', themes: ['nature', 'leisure'], level: 3 }),
  noun('ruoho', 'k1', '1', 'grass', { emoji: '🌱', sem: ['plant', 'nature'], themes: ['nature'], level: 4 }),
  noun('sunnuntai', 'k18', '18', 'Sunday', { sem: ['time'], themes: ['time'], level: 1, notes: ['note.maanantaina'] }),
  noun('syksy', 'k1', '1', 'autumn, fall', { emoji: '🍂', sem: ['time'], themes: ['time', 'weather'], level: 2 }),
  noun('taivas', 'k41', '41', 'sky; heaven', { emoji: '🌌', sem: ['nature'], themes: ['nature', 'weather'], level: 3 }),
  noun('takki', 'k5', '5*A', 'coat, jacket', { grad: 'kk-k', emoji: '🧥', sem: ['clothing'], themes: ['shop'], level: 3 }),
  noun('uutinen', 'k38', '38', 'piece of news; (pl.) the news', { emoji: '📰', sem: ['document'], themes: ['leisure'], level: 4 }),
]

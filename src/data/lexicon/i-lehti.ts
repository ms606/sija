import type { Noun } from '../../types/content'
import { noun } from './build'

/**
 * Lehti-type (Kotus 7): old native words. -i becomes -e- in the stem and the
 * partitive is built on that vowel stem: lehti → lehden, lehteä.
 */
export const LEHTI_FAMILY: Noun[] = [
  noun('lehti', 'k7', '7*F', 'leaf; newspaper, magazine', { grad: 'ht-hd', emoji: '📰', sem: ['object', 'plant', 'document'], themes: ['nature', 'leisure'], level: 1, freq: 'core' }),
  noun('järvi', 'k7', '7', 'lake', { emoji: '🏞️', illustration: 'jarvi', sem: ['nature', 'place'], loc: 'both', themes: ['nature'], level: 1, freq: 'core', notes: ['note.jarvella'] }),
  noun('kivi', 'k7', '7', 'stone, rock', { emoji: '🪨', sem: ['nature', 'substance'], themes: ['nature'], level: 1 }),
  noun('nimi', 'k7', '7', 'name', { emoji: '📛', sem: ['abstract'], themes: ['people', 'language'], level: 1, freq: 'core' }),
  noun('ovi', 'k7', '7', 'door', { emoji: '🚪', illustration: 'ovi', sem: ['object'], themes: ['home'], level: 1, freq: 'core' }),
  noun('talvi', 'k7', '7', 'winter', { emoji: '❄️', sem: ['time', 'weather'], themes: ['time', 'weather'], level: 2, freq: 'core' }),
  noun('tähti', 'k7', '7*F', 'star', { grad: 'ht-hd', emoji: '⭐', sem: ['nature'], themes: ['nature'], level: 4 }),
  noun('joki', 'k7', '7*D', 'river', { grad: 'k-0', emoji: '🛶', sem: ['nature', 'place'], loc: 'both', themes: ['nature'], level: 4 }),
  noun('mäki', 'k7', '7*D', 'hill', { grad: 'k-0', emoji: '🛷', sem: ['nature', 'place'], loc: 'outer', themes: ['nature'], level: 4 }),
  noun('henki', 'k7', '7*G', 'spirit, life; person (in counts)', { grad: 'nk-ng', sem: ['abstract', 'person'], themes: ['people'], level: 5, notes: ['note.henkea'] }),
  noun('sormi', 'k7', '7', 'finger', { emoji: '☝️', sem: ['body'], themes: ['body'], level: 5 }),
  noun('lampi', 'k7', '7*H', 'pond', { grad: 'mp-mm', sem: ['nature', 'place'], loc: 'both', themes: ['nature'], level: 4 }),
  noun('arki', 'k7', '7*L', 'everyday life; weekday', { grad: 'k-j', sem: ['abstract', 'time'], themes: ['time'], level: 5, numberUse: 'pl-rare' }),
  noun('poski', 'k7', '7', 'cheek', { emoji: '😊', sem: ['body'], themes: ['body'], level: 5 }),
  noun('lahti', 'k7', '7*F', 'bay', { grad: 'ht-hd', sem: ['nature', 'place'], loc: 'both', themes: ['nature'], level: 5, id: 'lahti' }),
  noun('kylki', 'k7', '7*L', 'side (of the body)', { grad: 'k-j', sem: ['body'], themes: ['body'], level: 5, freq: 'extra' }),
  noun('väki', 'k7', '7*D', 'people, folk; crowd', { emoji: '👥', grad: 'k-0', sem: ['person'], themes: ['people'], level: 5, numberUse: 'pl-rare' }),
  noun('onni', 'k7', '7', 'happiness; luck', { emoji: '🍀', sem: ['abstract'], themes: ['people'], level: 5, numberUse: 'pl-rare', notes: ['note.onnea'] }),
  noun('pilvi', 'k7', '7', 'cloud', { emoji: '☁️', sem: ['weather', 'nature'], themes: ['weather'], level: 5 }),
  noun('hirvi', 'k7', '7', 'elk, moose', { emoji: '🫎', sem: ['animal'], themes: ['nature'], level: 5 }),
  noun('polvi', 'k7', '7', 'knee', { emoji: '🦵', sem: ['body'], themes: ['body'], level: 5 }),
  noun('hetki', 'k7', '7', 'moment', { emoji: '⏳', sem: ['time'], themes: ['time'], level: 4 }),
  noun('retki', 'k7', '7', 'excursion, outing; trip', { emoji: '🎒', sem: ['event'], themes: ['leisure'], level: 5 }),
  noun('suksi', 'k7', '7', 'ski', { emoji: '🎿', sem: ['object'], themes: ['leisure'], level: 5 }),
  noun('jälki', 'k7', '7*L', 'trace, track, mark', { grad: 'k-j', emoji: '👣', sem: ['abstract'], themes: ['nature'], level: 4, notes: ['note.jalkeen'] }),
  noun('hiki', 'k7', '7*D', 'sweat', { grad: 'k-0', emoji: '💦', sem: ['substance', 'body'], themes: ['body', 'health'], level: 5, numberUse: 'mass' }),
]

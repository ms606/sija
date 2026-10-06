import type { Noun } from '../../types/content'
import { adj } from './build'

/**
 * Adjectives for noun–adjective agreement (uusi auto → uuden auton).
 * The -i adjectives (uusi, pieni, suuri, nuori, täysi, tosi) live with their -i families.
 */
export const ADJECTIVES: Noun[] = [
  adj('vanha', 'k9', '9', 'old', { level: 1, freq: 'core' }),
  adj('kiva', 'k9', '9', 'nice', { level: 2 }),
  adj('halpa', 'k9', '9*E', 'cheap', { grad: 'p-v', level: 4 }),
  adj('iso', 'k1', '1', 'big', { level: 1, freq: 'core' }),
  adj('helppo', 'k1', '1*B', 'easy', { grad: 'pp-p', level: 4 }),
  adj('hyvä', 'k10', '10', 'good', { level: 1, freq: 'core' }),
  adj('musta', 'k10', '10', 'black', { level: 2 }),
  adj('kylmä', 'k10', '10', 'cold', { level: 2 }),
  adj('kuuma', 'k10', '10', 'hot', { level: 2 }),
  adj('pitkä', 'k10', '10', 'long; tall', { level: 2 }),
  adj('vihreä', 'k15', '15', 'green', { level: 3 }),
  adj('vaikea', 'k15', '15', 'difficult', { level: 3 }),
  adj('kaunis', 'k41', '41', 'beautiful', { level: 3 }),
  adj('kallis', 'k41', '41', 'expensive; dear', { level: 3 }),
  adj('lyhyt', 'k43', '43', 'short', { level: 3 }),
  adj('punainen', 'k38', '38', 'red', { level: 1 }),
  adj('sininen', 'k38', '38', 'blue', { level: 2 }),
  adj('valkoinen', 'k38', '38', 'white', { level: 2 }),
  adj('lämmin', 'k35', '35*H', 'warm', { grad: '<mp-mm', level: 4 }),
]

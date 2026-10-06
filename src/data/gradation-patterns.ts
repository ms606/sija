import type { GradationId } from '../grammar/types'
import type { LocalizedText, ModeText } from '../types/content'
import { m, t } from './explanations/text'

export interface GradationPatternInfo {
  id: GradationId
  /** Strong → weak, as learners see it. */
  title: string
  kindLabel: LocalizedText
  explanation: ModeText
  /** Lexeme ids that show the pattern well (normal direction first). */
  featured: string[]
  /** Words with the same pattern in the opposite direction (sade → sateen). */
  inverse: string[]
  notes: ModeText[]
}

const LENGTH = t('Double → single consonant', 'Kvantitatiivinen vaihtelu')
const QUALITY = t('One consonant changes into another', 'Kvalitatiivinen vaihtelu')
const ASSIMILATION = t('The second consonant becomes like the first', 'Assimilaatio')
const LOSS = t('The consonant disappears', 'Kato')

/** Consonant gradation patterns (astevaihtelu), in teaching order. */
export const GRADATION_INFO: readonly GradationPatternInfo[] = [
  {
    id: 'kk-k',
    title: 'kk → k',
    kindLabel: LENGTH,
    explanation: m('A double kk becomes a single k in the weak grade: pankki → pankin, viikko → viikon.', 'Kaksois-kk muuttuu k:ksi heikossa asteessa: pankki → pankin.'),
    featured: ['pankki', 'viikko', 'mökki', 'laukku', 'apteekki', 'palkka', 'paikka', 'lusikka'],
    inverse: ['liike', 'parveke', 'lääke', 'lomake', 'asiakas', 'asukas'],
    notes: [],
  },
  {
    id: 'pp-p',
    title: 'pp → p',
    kindLabel: LENGTH,
    explanation: m('A double pp becomes a single p: kauppa → kaupan, lippu → lipun.', 'pp → p: kauppa → kaupan.'),
    featured: ['kauppa', 'kaappi', 'kuppi', 'lippu', 'helppo', 'ruokakauppa'],
    inverse: ['opas'],
    notes: [],
  },
  {
    id: 'tt-t',
    title: 'tt → t',
    kindLabel: LENGTH,
    explanation: m('A double tt becomes a single t: kortti → kortin, tyttö → tytön.', 'tt → t: kortti → kortin.'),
    featured: ['kortti', 'tentti', 'kuitti', 'tyttö'],
    inverse: ['osoite', 'tytär'],
    notes: [],
  },
  {
    id: 't-d',
    title: 't → d',
    kindLabel: QUALITY,
    explanation: m('A single t between vowels becomes d: pöytä → pöydän, äiti → äidin, katu → kadun.', 't → d: pöytä → pöydän.'),
    featured: ['pöytä', 'äiti', 'koti', 'katu', 'maito', 'hoito'],
    inverse: ['sade'],
    notes: [
      m(
        'Uusi-type words (uusi, vesi, käsi) and kalleus-type words (terveys) also alternate t ~ d, as part of their type: uuden, veden, terveyden.',
        'Myös uusi-tyypissä t ~ d: uuden, veden.',
      ),
    ],
  },
  {
    id: 'ht-hd',
    title: 'ht → hd',
    kindLabel: QUALITY,
    explanation: m('After h, t becomes d: lehti → lehden, tähti → tähden. (Kotus counts this as t ~ d.)', 'ht → hd: lehti → lehden.'),
    featured: ['lehti', 'tähti', 'lahti'],
    inverse: ['tehdas'],
    notes: [],
  },
  {
    id: 'nt-nn',
    title: 'nt → nn',
    kindLabel: ASSIMILATION,
    explanation: m('After n, t becomes n: tunti → tunnin, asunto → asunnon, hinta → hinnan.', 'nt → nn: tunti → tunnin.'),
    featured: ['tunti', 'asunto', 'hinta', 'kunta', 'kansi', 'länsi', 'kynsi'],
    inverse: [],
    notes: [],
  },
  {
    id: 'lt-ll',
    title: 'lt → ll',
    kindLabel: ASSIMILATION,
    explanation: m('After l, t becomes l: ilta → illan.', 'lt → ll: ilta → illan.'),
    featured: ['ilta'],
    inverse: [],
    notes: [],
  },
  {
    id: 'rt-rr',
    title: 'rt → rr',
    kindLabel: ASSIMILATION,
    explanation: m('After r, t becomes r: varsi → varren (stem varte- → varre-).', 'rt → rr: varsi → varren.'),
    featured: ['varsi'],
    inverse: [],
    notes: [],
  },
  {
    id: 'mp-mm',
    title: 'mp → mm',
    kindLabel: ASSIMILATION,
    explanation: m('After m, p becomes m: lampi → lammen.', 'mp → mm: lampi → lammen.'),
    featured: ['lampi'],
    inverse: ['hammas', 'lämmin'],
    notes: [],
  },
  {
    id: 'nk-ng',
    title: 'nk → ng',
    kindLabel: ASSIMILATION,
    explanation: m('After n, k becomes g (pronounced as a long ng-sound): kaupunki → kaupungin, kenkä → kengän.', 'nk → ng: kenkä → kengän.'),
    featured: ['kaupunki', 'kenkä', 'henki', 'sänky'],
    inverse: ['rengas'],
    notes: [],
  },
  {
    id: 'k-0',
    title: 'k → ∅',
    kindLabel: LOSS,
    explanation: m(
      'A single k disappears: ruoka → ruoan, joki → joen. Between identical vowels an apostrophe marks the break (vaaka → vaa’an). In aika → ajan and poika → pojan the i is then written j.',
      'k katoaa: ruoka → ruoan, joki → joen.',
    ),
    featured: ['ruoka', 'joki', 'mäki', 'aika', 'poika', 'väki'],
    inverse: ['koe'],
    notes: [m('ruoka also has the accepted variant ruuan, ruuassa…', 'Myös ruuan.')],
  },
  {
    id: 'p-v',
    title: 'p → v',
    kindLabel: QUALITY,
    explanation: m('A single p becomes v: leipä → leivän, halpa → halvan.', 'p → v: leipä → leivän.'),
    featured: ['leipä', 'halpa'],
    inverse: [],
    notes: [],
  },
  {
    id: 'k-j',
    title: 'k → j',
    kindLabel: QUALITY,
    explanation: m('After l or r and before e, k becomes j: jälki → jäljen, arki → arjen, kylki → kyljen.', 'k → j: jälki → jäljen.'),
    featured: ['jälki', 'arki', 'kylki'],
    inverse: [],
    notes: [],
  },
  {
    id: 'k-v',
    title: 'k → v',
    kindLabel: QUALITY,
    explanation: m('Between two u\'s or two y\'s, k becomes v: suku → suvun, kyky → kyvyn.', 'k → v: kyky → kyvyn.'),
    featured: ['kyky', 'suku'],
    inverse: [],
    notes: [],
  },
]

/** When gradation does not happen — taught explicitly so learners do not over-apply it. */
export const NO_GRADATION_NOTES: readonly ModeText[] = [
  m('Newer loanwords often do not alternate: auto → auton (not *audon), kahvi, bussi.', 'Uudet lainasanat: auto → auton.'),
  m('The clusters sk, st, tk, sp never alternate: posti → postin, hetki → hetken, matka → matkan.', 'sk, st, tk, sp eivät vaihtele.'),
  m('Personal names keep single consonants: Kati → Katin (but double ones alternate: Pekka → Pekan).', 'Nimissä yksinkertainen konsonantti ei vaihtele.'),
  m('Whether a word alternates is part of the word: it is easy for kk/pp/tt, but for single t/k/p you learn it with the word.', 'Astevaihtelu on opittava sanan mukana.'),
]

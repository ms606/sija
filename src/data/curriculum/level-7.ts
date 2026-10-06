import type { Lesson } from '../../types/curriculum'
import { examples, forms, idea, lesson, m, possessives, t, text } from './build'

const PX_WORDS = ['talo', 'koti', 'auto', 'perhe', 'ystävä', 'koira', 'kissa', 'kirja']

export const LEVEL_7: Lesson[] = [
  lesson({
    id: '7.1',
    level: 7,
    minutes: 8,
    title: t('-ni, -si, -nsa, -mme, -nne', 'Omistusliitteet'),
    goal: m('Add possessive suffixes to the base form: taloni, talosi, talonsa, talomme, talonne.', 'Taloni, talosi, talonsa.'),
    why: m('Written and formal Finnish marks "my, your, his/her" on the noun itself. You will see these suffixes in every form, letter and news text.', 'Kirjakielessä omistusliite.'),
    prerequisites: ['3.1'],
    skills: ['possessives'],
    blocks: [
      possessives('talo', 'sg.nominative'),
      idea('-ni (minun), -si (sinun), -nsa/-nsä (hänen, heidän), -mme (meidän), -nne (teidän). The pronoun is optional with 1st and 2nd person: (minun) taloni.', 'Pronomini voi puuttua.', 'rule'),
      idea('Spoken Finnish usually drops the suffix and keeps a pronoun instead: mun talo, sun auto.', 'Puhekielessä: mun talo.', 'variant'),
      examples(['h.14', 'h.16', 'w.49', 'd.18']),
    ],
    check: { skill: 'possessives', slots: ['sg.nominative'], words: PX_WORDS, count: 6 },
  }),
  lesson({
    id: '7.2',
    level: 7,
    minutes: 7,
    title: t('The strong grade comes back', 'Vahva aste palaa'),
    goal: m('Use the strong-grade stem before a possessive suffix: kauppani, pöytäni.', 'Kauppani, pöytäni.'),
    why: m('kaupan but kauppani: the suffix goes on the vowel stem, whose syllable stays open.', 'Avoin tavu.'),
    prerequisites: ['7.1', '4.2'],
    skills: ['possessives', 'gradation'],
    blocks: [
      forms([
        ['kauppa', 'sg.genitive'],
        ['kauppa', 'sg.genitive', 'my shop / of my shop', '1sg'],
        ['pöytä', 'sg.genitive'],
        ['pöytä', 'sg.nominative', 'my table', '1sg'],
        ['äiti', 'sg.genitive'],
        ['äiti', 'sg.nominative', 'my mother', '1sg'],
      ]),
      idea('The -n of the genitive (and the -t of the plural) drops before the suffix, and the syllable is open again, so the strong grade returns: kaupan → kauppani.', '-n ja -t katoavat; vahva aste.', 'rule'),
      idea('That makes kauppani mean "my shop", "of my shop" or "my shops". The context tells which.', 'Monitulkintainen muoto.', 'pattern'),
    ],
    check: { skill: 'possessives', slots: ['sg.nominative'], words: ['kauppa', 'pöytä', 'äiti', 'koti', 'kortti', 'lippu', 'kenkä', 'katu'], count: 6 },
  }),
  lesson({
    id: '7.3',
    level: 7,
    minutes: 8,
    title: t('Possessives with cases', 'Omistusliite ja sijat'),
    goal: m('Add possessive suffixes to case forms: talossani, taloosi, talokseni.', 'Talossani, talooni.'),
    why: m('Kotonani, perheeni kanssa, kodissani: possessives combine with every case except the instructive.', 'Kaikki sijat.'),
    prerequisites: ['7.1'],
    skills: ['possessives'],
    blocks: [
      forms([
        ['talo', 'sg.inessive', 'in my house', '1sg'],
        ['talo', 'sg.illative', 'into my house', '1sg'],
        ['talo', 'sg.translative', '(to become) my house', '1sg'],
        ['talo', 'pl.inessive', 'in my houses', '1sg'],
        ['perhe', 'sg.elative', 'about my family', '1sg'],
      ]),
      idea('The case ending stays: talossa → talossani. The illative loses its -n (talooni), and -ksi becomes -kse- (talokseni).', 'Illatiivin -n katoaa; -ksi → -kse-.', 'rule'),
      examples(['h.15', 'h.17', 'h.19']),
    ],
    check: { skill: 'possessives', slots: ['sg.inessive', 'sg.illative', 'sg.elative', 'sg.adessive'], words: PX_WORDS, count: 6 },
  }),
  lesson({
    id: '7.4',
    level: 7,
    minutes: 7,
    title: t('The third person: -nsa or -Vn', 'Kolmas persoona'),
    goal: m('Use both third-person forms: talossaan ~ talossansa, and know when only -nsa is possible.', 'Talossaan ~ talossansa.'),
    why: m('The -Vn form (talossaan) is the usual one in writing; -nsa appears after the nominative and in some styles.', '-Vn on tavallisempi.'),
    prerequisites: ['7.3'],
    skills: ['possessives'],
    blocks: [
      forms([
        ['talo', 'sg.inessive', 'in his/her house', '3'],
        ['talo', 'sg.adessive', 'on/at his/her house', '3'],
        ['talo', 'sg.nominative', 'his/her house', '3'],
      ]),
      idea('After a case ending that ends in a short vowel, the 3rd person can be a long vowel + n: talossa → talossaan (also talossansa). After the base form only -nsa: talonsa.', 'Lyhyen vokaalin jälkeen -Vn.', 'variant'),
      text('Spoken Finnish: sen talo or hänen talo for "his/her house" — the written form is hänen talonsa.', 'Puhekieli: sen talo.'),
      examples(['p.65', 'w.51']),
    ],
    check: { skill: 'possessives', persons: ['3'], slots: ['sg.inessive', 'sg.nominative', 'sg.adessive', 'sg.illative'], words: PX_WORDS, count: 6 },
  }),
]

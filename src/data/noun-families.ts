import type { IGroup, SlotKey, TypeId } from '../grammar/types'
import type { LocalizedText, ModeText } from '../types/content'
import { m, t } from './explanations/text'

export interface IGroupInfo {
  id: IGroup
  title: LocalizedText
  model: string
  kotusTypes: number[]
  keyChange: LocalizedText
  summary: ModeText
  recognize: ModeText
  featured: string[]
}

export const I_GROUP_ORDER: readonly IGroup[] = ['pankki', 'lehti', 'kieli', 'uusi']

/** The four families of -i nouns, as taught in the -i Noun Lab. */
export const I_GROUP_INFO: Readonly<Record<IGroup, IGroupInfo>> = {
  pankki: {
    id: 'pankki',
    title: t('Pankki-type', 'Pankki-tyyppi'),
    model: 'pankki',
    kotusTypes: [5, 6],
    keyChange: t('i stays i', 'i säilyy'),
    summary: m(
      'The -i stays in the stem: pankki → pankin, pankkia. In the plural the stem i becomes e before the plural -i-: pankkeja, pankeissa.',
      'I säilyy vartalossa: pankin, pankkia. Monikossa pankkeja.',
    ),
    recognize: m(
      'Mostly loanwords and newer words (bussi, posti, kahvi, tili, lasi, tuoli). Longer loanwords like paperi and hotelli belong here too.',
      'Yleensä lainasanat ja uudet sanat.',
    ),
    featured: ['pankki', 'bussi', 'kahvi', 'tunti', 'kaupunki', 'tuoli', 'lasi', 'tili', 'äiti', 'koti'],
  },
  lehti: {
    id: 'lehti',
    title: t('Lehti-type', 'Lehti-tyyppi'),
    model: 'lehti',
    kotusTypes: [7],
    keyChange: t('i → e', 'i → e'),
    summary: m(
      'The -i becomes -e- in the stem (lehden), and the partitive is built on that e-stem: lehteä. In the plural the e drops before -i-: lehtiä, lehdissä.',
      'Vartalossa e: lehden, lehteä. Monikossa lehtiä.',
    ),
    recognize: m('Old native words: ovi, kivi, järvi, nimi, talvi, joki. The partitive ends in -eA (ovea, kiveä).', 'Vanhat omaperäiset sanat.'),
    featured: ['lehti', 'järvi', 'kivi', 'nimi', 'ovi', 'talvi', 'tähti', 'joki', 'mäki', 'henki'],
  },
  kieli: {
    id: 'kieli',
    title: t('Kieli-type', 'Kieli-tyyppi'),
    model: 'kieli',
    kotusTypes: [23, 24, 25, 26],
    keyChange: t('i → e, partitive -tA', 'i → e, partitiivi -tA'),
    summary: m(
      'The -i becomes -e- in the vowel stem (kielen), but the partitive is built on the short consonant stem: kiel- + tä = kieltä. The plural genitive often has -ten: kielten.',
      'Kielen, mutta kieltä (konsonanttivartalo). Monikon genetiivi kielten.',
    ),
    recognize: m(
      'Old words ending in -li, -ni, -ri, -si, -hi after a long vowel or diphthong: tuuli, ääni, saari, kuusi (spruce), lohi. But tuoli and tili look similar and are pankki-type!',
      'Usein -li, -ni, -ri pitkän vokaalin jälkeen.',
    ),
    featured: ['kieli', 'pieni', 'suuri', 'meri', 'saari', 'tuuli', 'ääni', 'tuli', 'uni', 'kuusi-spruce'],
  },
  uusi: {
    id: 'uusi',
    title: t('Uusi-type', 'Uusi-tyyppi'),
    model: 'uusi',
    kotusTypes: [27, 28, 29, 30, 31],
    keyChange: t('i → e, s ~ t ~ d', 'i → e, s ~ t ~ d'),
    summary: m(
      'The s of the base form alternates with t and d: uusi → uuden (weak d), uuteen (strong t), uutta (consonant stem uut- + ta). The plural keeps -si-: uusia.',
      'S ~ t ~ d: uusi, uuden, uutta, uusia.',
    ),
    recognize: m(
      'Old words in -si: käsi, vesi, vuosi, susi, kuusi (six). But lasi and suksi do not follow it, and kuusi "spruce" is kieli-type. Related special words: kansi → kannen, lapsi → lasta, veitsi → veistä, kaksi → kahta.',
      'Vanhat -si-sanat: käsi, vesi, vuosi.',
    ),
    featured: ['uusi', 'käsi', 'vesi', 'vuosi', 'susi', 'kuukausi', 'kuusi-six', 'kansi', 'lapsi', 'kaksi'],
  },
}

/** The key forms that show which family an -i word belongs to. */
export const I_COMPARE_SLOTS: readonly SlotKey[] = [
  'sg.nominative',
  'sg.genitive',
  'sg.partitive',
  'sg.inessive',
  'sg.illative',
  'pl.nominative',
  'pl.genitive',
  'pl.partitive',
  'pl.inessive',
  'pl.illative',
]

/** Look-alike pairs that prove the type cannot be read from spelling alone. */
export const MINIMAL_PAIRS: readonly { a: string; b: string; note: ModeText }[] = [
  { a: 'tili', b: 'tiili', note: m('tili → tilin, tiliä (pankki-type); tiili → tiilen, tiiltä (kieli-type).', 'tilin / tiilen') },
  { a: 'tuoli', b: 'tuuli', note: m('tuoli → tuolin, tuolia (pankki-type); tuuli → tuulen, tuulta (kieli-type).', 'tuolin / tuulen') },
  { a: 'lasi', b: 'käsi', note: m('lasi → lasin, lasia (pankki-type); käsi → käden, kättä (uusi-type).', 'lasin / käden') },
  { a: 'suksi', b: 'uusi', note: m('suksi → suksen, suksea (lehti-type); uusi → uuden, uutta (uusi-type).', 'suksen / uuden') },
  {
    a: 'kuusi-spruce',
    b: 'kuusi-six',
    note: m('The same word, two declensions: kuusi "spruce" → kuusen, kuusta; kuusi "six" → kuuden, kuutta.', 'kuusen / kuuden'),
  },
]

export interface FamilyInfo {
  id: string
  title: LocalizedText
  summary: ModeText
  types: TypeId[]
}

/** Declension types grouped by how the base form ends. */
export const FAMILIES: readonly FamilyInfo[] = [
  {
    id: 'o-u',
    title: t('Words in -o, -u, -y, -ö', 'O-, u-, y-, ö-loppuiset'),
    summary: m('The most regular group: the stem is the base form (talo-, koulu-).', 'Säännöllisimmät: talo, koulu.'),
    types: ['k1', 'k2', 'k3'],
  },
  {
    id: 'a-a',
    title: t('Words in -a, -ä', 'A- ja ä-loppuiset'),
    summary: m(
      'The stem is the base form. In the plural the a becomes o (kala → kaloja) or drops (koira → koiria), depending on the first vowel.',
      'Monikossa a → o tai a katoaa.',
    ),
    types: ['k9', 'k10', 'k11', 'k12', 'k13', 'k14', 'k15'],
  },
  {
    id: 'i',
    title: t('Words in -i', 'I-loppuiset'),
    summary: m('Four families that look alike but inflect differently — see the -i Noun Lab.', 'Neljä ryhmää: pankki, lehti, kieli, uusi.'),
    types: ['k5', 'k6', 'k7', 'k23', 'k24', 'k25', 'k26', 'k27', 'k28', 'k29', 'k30', 'k31'],
  },
  {
    id: 'e',
    title: t('Words in -e', 'E-loppuiset'),
    summary: m('Long ee in the stem (perhe → perheen), partitive -tta/-ttä.', 'Perhe → perheen, perhettä.'),
    types: ['k48'],
  },
  {
    id: 'mono',
    title: t('One-syllable words', 'Yksitavuiset'),
    summary: m('Long vowel or diphthong: partitive -tA, illative -hVn (maata, maahan).', 'Maata, maahan.'),
    types: ['k18', 'k19'],
  },
  {
    id: 'consonant',
    title: t('Words ending in a consonant', 'Konsonanttiloppuiset'),
    summary: m('A vowel stem is added (nainen → naise-, vastaus → vastaukse-, vieras → vieraa-).', 'Vokaalivartalo: naise-, vastaukse-.'),
    types: ['k32', 'k33', 'k35', 'k38', 'k39', 'k40', 'k41', 'k42', 'k43', 'k44'],
  },
]

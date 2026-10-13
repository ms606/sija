import type { IGroup, SlotKey, TypeId } from '../grammar/types'
import type { LocalizedText, ModeText } from '../types/content'
import { m, t } from './explanations/text'

/**
 * What a learning family is, shown wherever a family is named next to a type.
 * The families are a teaching convenience of this app, not a linguistic class.
 */
export const LEARNING_FAMILY_NOTE = t(
  'A learning family is a teaching group used in this app, not an official class of Finnish grammar. Each word’s Kotus declension type decides its forms. A family only puts together types that share one stem pattern; its types still differ in other forms.',
  'Oppimisryhmä on sovelluksen opetusryhmä, ei virallinen kielioppiluokka. Sanan taivutuksen ratkaisee sen Kotus-taivutustyyppi.',
)

/**
 * One of the four *learning families* of -i nouns. A family is a teaching
 * group, not a declension type: it covers several Kotus types (read from the
 * registry's `iGroup`, never listed here) that share the property in
 * `criterion`. Its name is a well-known member word, not a Kotus model word.
 *
 * Finnish forms in the English texts are marked ⟦…⟧ (a stem: ⟦kiel⟧-); tests
 * check every marked form against the engine.
 */
export interface IGroupInfo {
  id: IGroup
  title: LocalizedText
  /** The word the family is named after (a member of the family, shown as its example). */
  model: string
  /** The documented property every member type shares (tests check it against each word's derivation). */
  criterion: LocalizedText
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
    title: t('The pankki family', 'Pankki-ryhmä'),
    model: 'pankki',
    criterion: t('The singular vowel stem keeps the -i: ⟦pankki⟧-, ⟦risti⟧-, ⟦paperi⟧-.', 'Yksikön vokaalivartalossa säilyy i.'),
    keyChange: t('i stays i', 'i säilyy'),
    summary: m(
      'The -i stays in the singular stem: ⟦pankki⟧ → ⟦pankin⟧, ⟦pankkia⟧, ⟦pankkiin⟧. In the plural the i becomes e before the plural marker: ⟦pankkeja⟧, ⟦pankeissa⟧.',
      'I säilyy vartalossa: pankin, pankkia. Monikossa pankkeja.',
    ),
    recognize: m(
      'Mostly loanwords and newer words: ⟦bussi⟧, ⟦posti⟧, ⟦kahvi⟧, ⟦tili⟧, ⟦lasi⟧, ⟦tuoli⟧ (risti-type, Kotus 5). Longer words like ⟦paperi⟧, ⟦hotelli⟧ and ⟦lääkäri⟧ are paperi-type (Kotus 6), which also has a second plural series: ⟦papereita⟧ ~ ⟦papereja⟧.',
      'Yleensä lainasanat ja uudet sanat.',
    ),
    featured: ['pankki', 'bussi', 'kahvi', 'tunti', 'kaupunki', 'tuoli', 'lasi', 'tili', 'äiti', 'koti'],
  },
  lehti: {
    id: 'lehti',
    title: t('The lehti family', 'Lehti-ryhmä'),
    model: 'lehti',
    criterion: t(
      'The -i becomes -e- in the singular vowel stem, and the partitive is built on that vowel stem (⟦lehteä⟧, ⟦ovea⟧). There is no consonant stem.',
      'Vartalossa e, partitiivi vokaalivartalosta.',
    ),
    keyChange: t('i → e', 'i → e'),
    summary: m(
      'The -i becomes -e- in the stem: ⟦lehti⟧ → ⟦lehden⟧, ⟦lehteä⟧, ⟦lehteen⟧. In the plural the plural -i- replaces the e: ⟦lehtiä⟧, ⟦lehdissä⟧.',
      'Vartalossa e: lehden, lehteä. Monikossa lehtiä.',
    ),
    recognize: m(
      'Old native words: ⟦ovi⟧, ⟦kivi⟧, ⟦järvi⟧, ⟦nimi⟧, ⟦talvi⟧, ⟦joki⟧ — all ovi-type (Kotus 7), the only type in this family. The partitive ends in -eA: ⟦ovea⟧, ⟦kiveä⟧.',
      'Vanhat omaperäiset sanat.',
    ),
    featured: ['lehti', 'järvi', 'kivi', 'nimi', 'ovi', 'talvi', 'tähti', 'joki', 'mäki', 'henki'],
  },
  kieli: {
    id: 'kieli',
    title: t('The kieli family', 'Kieli-ryhmä'),
    model: 'kieli',
    criterion: t(
      'The -i becomes -e- in the singular vowel stem, which is the same in every case (no consonant gradation), and an s stays s (⟦kiele⟧-, ⟦lapse⟧-, ⟦veitse⟧-). The singular partitive is built on a shorter consonant stem with -tA; each type makes that consonant stem in its own way.',
      'Vokaalivartalossa e, partitiivi konsonanttivartalosta.',
    ),
    keyChange: t('i → e, partitive -tA', 'i → e, partitiivi -tA'),
    summary: m(
      'Shared: the vowel stem in -e- (⟦kielen⟧, ⟦toimen⟧, ⟦lapsen⟧, ⟦veitsen⟧) and a partitive on a consonant stem. Not shared: how the consonant stem is made, so the partitives differ — ⟦kiel⟧- + -tä = ⟦kieltä⟧ (the e drops), ⟦toin⟧- + -ta = ⟦tointa⟧ (m → n), ⟦las⟧- + -ta = ⟦lasta⟧ (the p drops), ⟦veis⟧- + -tä = ⟦veistä⟧ (the t drops). The plural genitive can use the same stem: ⟦kielten⟧, ⟦lasten⟧, ⟦veisten⟧.',
      'Kielen, mutta kieltä (konsonanttivartalo). Konsonanttivartalo muodostetaan tyypin mukaan: kiel-, toin-, las-, veis-.',
    ),
    recognize: m(
      'Old words in -li, -ni, -ri, -si, -hi, often after a long vowel or diphthong: ⟦tuuli⟧, ⟦ääni⟧, ⟦saari⟧, ⟦kuusi⟧ (spruce), ⟦lohi⟧. Also -mi words such as ⟦lumi⟧ → ⟦lunta⟧, and ⟦lapsi⟧ and ⟦veitsi⟧, each a Kotus type of its own. But ⟦tuoli⟧ and ⟦tili⟧ look similar and are in the pankki family!',
      'Usein -li, -ni, -ri pitkän vokaalin jälkeen.',
    ),
    featured: ['kieli', 'pieni', 'suuri', 'meri', 'saari', 'tuuli', 'ääni', 'tuli', 'uni', 'kuusi-spruce', 'lumi', 'lapsi', 'veitsi'],
  },
  uusi: {
    id: 'uusi',
    title: t('The uusi family', 'Uusi-ryhmä'),
    model: 'uusi',
    criterion: t(
      '-si words whose s becomes t in the singular vowel stem (⟦käte⟧-, ⟦kynte⟧-, ⟦kahte⟧-) and changes again in the weak grade (⟦käde⟧-, ⟦kynne⟧-, ⟦kahde⟧-). The plural keeps -si-: ⟦käsiä⟧, ⟦kynsiä⟧, ⟦kaksia⟧.',
      'S muuttuu yksikön vartalossa t:ksi; monikossa -si- säilyy.',
    ),
    keyChange: t('i → e, s ~ t ~ d', 'i → e, s ~ t ~ d'),
    summary: m(
      'The s of the base form alternates with t and d: ⟦uusi⟧ → ⟦uuteen⟧ (strong grade, t), ⟦uuden⟧ (weak grade, d), ⟦uutta⟧ (consonant stem ⟦uut⟧- + -ta). The plural keeps -si-: ⟦uusia⟧. The kynsi-type and the kaksi-type share the s → t change but differ in other forms.',
      'S ~ t ~ d: uusi, uuden, uutta, uusia.',
    ),
    recognize: m(
      'Old words in -si: ⟦käsi⟧, ⟦vesi⟧, ⟦vuosi⟧, ⟦susi⟧, ⟦kuusi⟧ (six) — käsi-type, Kotus 27. ⟦kynsi⟧, ⟦kansi⟧ and ⟦varsi⟧ (kynsi-type, Kotus 28) and the numerals ⟦yksi⟧ and ⟦kaksi⟧ (kaksi-type, Kotus 31) are separate types with changes of their own. But ⟦lasi⟧ is in the pankki family, ⟦suksi⟧ in the lehti family, and ⟦kuusi⟧ “spruce”, ⟦lapsi⟧ and ⟦veitsi⟧ in the kieli family: their s does not become t.',
      'Vanhat -si-sanat: käsi, vesi, vuosi.',
    ),
    featured: ['uusi', 'käsi', 'vesi', 'vuosi', 'susi', 'kuukausi', 'kuusi-six', 'kansi', 'kynsi', 'kaksi'],
  },
}

/**
 * What each -i type does within its family: what it shares and what is its
 * own, with real forms. Keyed by type; the family comes from the registry.
 * Every ⟦form⟧ is checked against the engine (noun-types.test.ts).
 */
export const I_TYPE_NOTES: Readonly<Partial<Record<TypeId, LocalizedText>>> = {
  k5: t(
    'The -i stays in every singular form: ⟦risti⟧ → ⟦ristin⟧, ⟦ristiä⟧, ⟦ristiin⟧. In the plural the i becomes e before the plural marker: ⟦ristejä⟧, ⟦pankkeja⟧.',
  ),
  k6: t(
    'Like the risti-type in the singular (⟦paperin⟧, ⟦paperia⟧), but the plural has two accepted series: ⟦papereita⟧ ~ ⟦papereja⟧, ⟦papereiden⟧ ~ ⟦paperien⟧.',
  ),
  k7: t(
    'The only type in the lehti family. Some of its words also have consonant gradation in the weak grade — ⟦lehti⟧ → ⟦lehden⟧ (ht ~ hd), ⟦joki⟧ → ⟦joen⟧ (the k drops) — others have none: ⟦ovi⟧ → ⟦oven⟧.',
  ),
  k23: t(
    'The consonant stem is the vowel stem without its -e: ⟦tiil⟧- + -tä → ⟦tiiltä⟧, ⟦tuli⟧ → ⟦tulta⟧, ⟦lohi⟧ → ⟦lohta⟧. Plural genitive ⟦tiilien⟧ or ⟦tiilten⟧.',
  ),
  k24: t(
    'In every form the app teaches it follows the same steps as the tiili-type: ⟦un⟧- + -ta → ⟦unta⟧, ⟦meri⟧ → ⟦merta⟧, ⟦kuusi⟧ “spruce” → ⟦kuusta⟧; plural genitive ⟦unien⟧ or ⟦unten⟧. Kotus lists it as a separate type.',
  ),
  k25: t(
    'Before the -t- of the consonant stem, m becomes n: ⟦toin⟧- + -ta → ⟦tointa⟧, ⟦lumi⟧ → ⟦lunta⟧, plural genitive ⟦tointen⟧ or ⟦toimien⟧. A partitive on the vowel stem is also correct: ⟦toimea⟧, ⟦lumea⟧.',
  ),
  k26: t(
    'The consonant stem is the vowel stem without its -e: ⟦pien⟧- + -tä → ⟦pientä⟧, ⟦kieli⟧ → ⟦kieltä⟧, ⟦suuri⟧ → ⟦suurta⟧. The plural genitive can be built on it too: ⟦pienten⟧, ⟦kielten⟧ (also ⟦pienien⟧, ⟦kielien⟧).',
  ),
  k27: t(
    'The s becomes t in the vowel stem, and t ~ d by consonant gradation: ⟦käteen⟧ (strong ⟦käte⟧-), ⟦käden⟧ (weak ⟦käde⟧-). Consonant stem ⟦kät⟧- + -tä → ⟦kättä⟧, with a double t. The plural keeps s: ⟦käsiä⟧, ⟦käsien⟧ (also ⟦kätten⟧).',
  ),
  k28: t(
    'Its words in the app end in -nsi or -rsi. The s becomes t as in the käsi-type (⟦kynteen⟧, ⟦kynttä⟧), but the weak grade has nn or rr, not nd or rd: ⟦kynsi⟧ → ⟦kynnen⟧, ⟦kansi⟧ → ⟦kannen⟧, ⟦varsi⟧ → ⟦varren⟧. The plural keeps s: ⟦kynsiä⟧, ⟦kansia⟧.',
  ),
  k29: t(
    'Shares the kieli family’s e-stem: the vowel stem keeps ps, ⟦lapse⟧- → ⟦lapsen⟧, ⟦lapseen⟧. Its own consonant stem drops the p: ⟦las⟧- + -ta → ⟦lasta⟧, plural genitive ⟦lasten⟧ (also ⟦lapsien⟧). The rest of the plural keeps ps: ⟦lapsia⟧, ⟦lapsissa⟧.',
  ),
  k30: t(
    'Shares the kieli family’s e-stem: the vowel stem keeps ts, ⟦veitse⟧- → ⟦veitsen⟧, ⟦veitseen⟧. Its own consonant stem drops the t: ⟦veis⟧- + -tä → ⟦veistä⟧, plural genitive ⟦veisten⟧ (also ⟦veitsien⟧). The rest of the plural keeps ts: ⟦veitsiä⟧, ⟦veitsissä⟧.',
  ),
  k31: t(
    'A distinct pattern inside the uusi family: the type of the numerals ⟦yksi⟧ and ⟦kaksi⟧. Two sounds change in the vowel stem, not one — k becomes h and s becomes t: ⟦kahte⟧- (⟦kahteen⟧, ⟦kahtena⟧), and in the weak grade t becomes d: ⟦kahde⟧- (⟦kahden⟧, ⟦kahdessa⟧). The consonant stem is ⟦kah⟧-, so the partitive ⟦kahta⟧ has a single t (compare ⟦kättä⟧). The plural keeps ks: ⟦kaksia⟧, ⟦kaksien⟧, ⟦kaksissa⟧.',
  ),
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
  { a: 'tili', b: 'tiili', note: m('tili → tilin, tiliä (pankki family); tiili → tiilen, tiiltä (kieli family).', 'tilin / tiilen') },
  { a: 'tuoli', b: 'tuuli', note: m('tuoli → tuolin, tuolia (pankki family); tuuli → tuulen, tuulta (kieli family).', 'tuolin / tuulen') },
  { a: 'lasi', b: 'käsi', note: m('lasi → lasin, lasia (pankki family); käsi → käden, kättä (uusi family).', 'lasin / käden') },
  { a: 'suksi', b: 'uusi', note: m('suksi → suksen, suksea (lehti family); uusi → uuden, uutta (uusi family).', 'suksen / uuden') },
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
    summary: m(
      'Twelve declension types. For learning, the app groups them into four learning families — pankki, lehti, kieli and uusi — by how the -i behaves in the stem. The families are teaching groups, not official classes: each word’s Kotus type decides its forms. See the -i Noun Lab.',
      'Kaksitoista tyyppiä neljässä oppimisryhmässä: pankki, lehti, kieli, uusi.',
    ),
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

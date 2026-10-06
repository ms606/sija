import {
  ILL_VN,
  PAR_CONS_TA,
  PAR_VOWEL_A,
  PLGEN_CONS_TEN,
  PLGEN_CONS_TEN_RARE,
  PLGEN_DEN,
  PLGEN_EN,
  PLGEN_TTEN,
  PLGEN_VOWEL_EN,
  PLILL_HIN,
  PLILL_IN,
  PLPAR_A,
  PLPAR_TA,
  type DeclensionTypeDef,
} from './schema'

const I_TO_E = { kind: 'replace', strip: 'i', add: 'e', ruleId: 'stem.i-to-e', label: 'pattern' } as const
const DROP_I = { kind: 'replace', strip: 'i', add: '', ruleId: 'stem.consonant.drop-i', label: 'pattern' } as const

/* ---------------- Pankki-type: the stem keeps its -i ---------------- */

/** Kotus 5 — risti: mostly loanwords and newer words; -i stays in the stem (pankki → pankin, pankkia). */
export const K5: DeclensionTypeDef = {
  id: 'k5',
  kotus: 5,
  modelWord: 'risti',
  iGroup: 'pankki',
  membership: 'lexical',
  membershipRuleId: 'type.k5.membership',
  gradation: 'normal',
  vowel: { kind: 'same' },
  plural: [{ kind: 'i-to-e' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_VOWEL_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_HIN],
  },
}

/** Kotus 6 — paperi: longer loanwords in -i; two plural series (papereita ~ papereja). */
export const K6: DeclensionTypeDef = {
  id: 'k6',
  kotus: 6,
  modelWord: 'paperi',
  iGroup: 'pankki',
  membership: 'lexical',
  membershipRuleId: 'type.k6.membership',
  gradation: 'none',
  vowel: { kind: 'same' },
  plural: [{ kind: 'i-to-e' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_VOWEL_EN, PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_TA, PLPAR_A],
    'pl.illative': [PLILL_HIN],
  },
}

/* ---------------- Lehti-type: i → e, partitive from the vowel stem ---------------- */

/** Kotus 7 — ovi: old native words; stem -e- (lehti → lehde-, lehte-), partitive -eA (lehteä). */
export const K7: DeclensionTypeDef = {
  id: 'k7',
  kotus: 7,
  modelWord: 'ovi',
  iGroup: 'lehti',
  membership: 'lexical',
  membershipRuleId: 'type.k7.membership',
  gradation: 'normal',
  vowel: I_TO_E,
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/* ---------------- Kieli-type: i → e, partitive from the consonant stem ---------------- */

/** Kotus 23 — tiili: consonant-stem partitive (tiiltä); plural genitive -ien ~ -ten. */
export const K23: DeclensionTypeDef = {
  id: 'k23',
  kotus: 23,
  modelWord: 'tiili',
  iGroup: 'kieli',
  membership: 'lexical',
  membershipRuleId: 'type.k23.membership',
  gradation: 'none',
  vowel: I_TO_E,
  consonant: DROP_I,
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN, PLGEN_CONS_TEN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 24 — uni: consonant-stem partitive (unta); plural genitive -ien ~ -ten. */
export const K24: DeclensionTypeDef = {
  id: 'k24',
  kotus: 24,
  modelWord: 'uni',
  iGroup: 'kieli',
  membership: 'lexical',
  membershipRuleId: 'type.k24.membership',
  gradation: 'none',
  vowel: I_TO_E,
  consonant: DROP_I,
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN, PLGEN_CONS_TEN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 25 — toimi: -mi words whose consonant stem has n (lumi → lunta). */
export const K25: DeclensionTypeDef = {
  id: 'k25',
  kotus: 25,
  modelWord: 'toimi',
  iGroup: 'kieli',
  membership: 'lexical',
  membershipRuleId: 'type.k25.membership',
  gradation: 'none',
  vowel: I_TO_E,
  consonant: { kind: 'replace', strip: 'mi', add: 'n', ruleId: 'stem.consonant.m-to-n', label: 'pattern' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA, PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN, PLGEN_CONS_TEN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 26 — pieni: consonant-stem partitive (kieltä); plural genitive -ten ~ -ien (kielten, kielien). */
export const K26: DeclensionTypeDef = {
  id: 'k26',
  kotus: 26,
  modelWord: 'pieni',
  iGroup: 'kieli',
  membership: 'lexical',
  membershipRuleId: 'type.k26.membership',
  gradation: 'none',
  vowel: I_TO_E,
  consonant: DROP_I,
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_CONS_TEN, PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/* ---------------- Uusi-type and other -si words ---------------- */

/** Kotus 27 — käsi: -si words with stems -te-/-de- and -t- (uusi → uuden, uutta). */
export const K27: DeclensionTypeDef = {
  id: 'k27',
  kotus: 27,
  modelWord: 'käsi',
  iGroup: 'uusi',
  membership: 'lexical',
  membershipRuleId: 'type.k27.membership',
  gradation: 'intrinsic',
  intrinsicPattern: 't-d',
  vowel: { kind: 'replace', strip: 'si', add: 'te', ruleId: 'stem.si-to-te', label: 'pattern' },
  consonant: { kind: 'replace', strip: 'si', add: 't', ruleId: 'stem.consonant.si-to-t', label: 'pattern' },
  plural: [{ kind: 'lemma' }],
  pluralNoGradation: true,
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN, PLGEN_CONS_TEN_RARE],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 28 — kynsi: -nsi/-rsi/-lsi words; stems -nte-/-nne- (kansi → kannen, kantta). */
export const K28: DeclensionTypeDef = {
  id: 'k28',
  kotus: 28,
  modelWord: 'kynsi',
  iGroup: 'uusi',
  membership: 'lexical',
  membershipRuleId: 'type.k28.membership',
  gradation: 'normal',
  vowel: { kind: 'replace', strip: 'si', add: 'te', ruleId: 'stem.si-to-te', label: 'pattern' },
  consonant: { kind: 'replace', strip: 'si', add: 't', ruleId: 'stem.consonant.si-to-t', label: 'pattern' },
  plural: [{ kind: 'lemma' }],
  pluralNoGradation: true,
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN, PLGEN_CONS_TEN_RARE],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 29 — lapsi: the only member; ps → s before the partitive (lasta, lasten). */
export const K29: DeclensionTypeDef = {
  id: 'k29',
  kotus: 29,
  modelWord: 'lapsi',
  iGroup: 'uusi',
  membership: 'irregular',
  membershipRuleId: 'type.k29.membership',
  gradation: 'none',
  vowel: I_TO_E,
  consonant: { kind: 'replace', strip: 'psi', add: 's', ruleId: 'stem.consonant.psi-to-s', label: 'irregular' },
  plural: [{ kind: 'lemma' }],
  pluralNoGradation: true,
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_CONS_TEN, PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 30 — veitsi: ts → s before the partitive (veistä, veisten). */
export const K30: DeclensionTypeDef = {
  id: 'k30',
  kotus: 30,
  modelWord: 'veitsi',
  iGroup: 'uusi',
  membership: 'irregular',
  membershipRuleId: 'type.k30.membership',
  gradation: 'none',
  vowel: I_TO_E,
  consonant: { kind: 'replace', strip: 'tsi', add: 's', ruleId: 'stem.consonant.tsi-to-s', label: 'irregular' },
  plural: [{ kind: 'lemma' }],
  pluralNoGradation: true,
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_CONS_TEN, PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 31 — kaksi: ks ~ ht ~ hd (kaksi → kahden, kahta). Also yksi. */
export const K31: DeclensionTypeDef = {
  id: 'k31',
  kotus: 31,
  modelWord: 'kaksi',
  iGroup: 'uusi',
  membership: 'irregular',
  membershipRuleId: 'type.k31.membership',
  gradation: 'intrinsic',
  intrinsicPattern: 'ht-hd',
  vowel: { kind: 'replace', strip: 'ksi', add: 'hte', ruleId: 'stem.ksi-to-hte', label: 'irregular' },
  consonant: { kind: 'replace', strip: 'ksi', add: 'h', ruleId: 'stem.consonant.ksi-to-h', label: 'irregular' },
  plural: [{ kind: 'lemma' }],
  pluralNoGradation: true,
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

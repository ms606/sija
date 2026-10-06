import {
  ILL_SEEN,
  ILL_VN,
  PAR_CONS_TA,
  PLGEN_CONS_TEN,
  PLGEN_DEN,
  PLGEN_EN,
  PLGEN_TTEN,
  PLILL_HIN,
  PLILL_HIN_RARE,
  PLILL_IN,
  PLILL_SIIN,
  PLPAR_A,
  PLPAR_TA,
  r,
  type DeclensionTypeDef,
} from './schema'

/** Kotus 32 — sisar: consonant-final words in -r/-l/-n with stem + e (sisar → sisare-). tytär → tyttären. */
export const K32: DeclensionTypeDef = {
  id: 'k32',
  kotus: 32,
  modelWord: 'sisar',
  membership: 'lexical',
  membershipRuleId: 'type.k32.membership',
  gradation: 'inverse',
  vowel: { kind: 'replace', strip: '', add: 'e', ruleId: 'stem.add-e', label: 'pattern' },
  consonant: { kind: 'lemma' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_CONS_TEN, PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 33 — kytkin: -in words with stem -ime- (puhelin → puhelimen, puhelinta). */
export const K33: DeclensionTypeDef = {
  id: 'k33',
  kotus: 33,
  modelWord: 'kytkin',
  membership: 'pattern',
  membershipRuleId: 'type.k33.membership',
  gradation: 'inverse',
  vowel: { kind: 'replace', strip: 'n', add: 'me', ruleId: 'stem.n-to-me', label: 'pattern' },
  consonant: { kind: 'lemma' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN, PLGEN_CONS_TEN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 35 — lämmin: the only member; stem lämpimä- (inverse mm ~ mp). */
export const K35: DeclensionTypeDef = {
  id: 'k35',
  kotus: 35,
  modelWord: 'lämmin',
  membership: 'irregular',
  membershipRuleId: 'type.k35.membership',
  gradation: 'inverse',
  vowel: { kind: 'replace', strip: 'n', add: 'mA', ruleId: 'stem.n-to-ma', label: 'irregular' },
  consonant: { kind: 'lemma' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 38 — nainen: all -nen words (nainen → naise-, nais-). Highly predictable. */
export const K38: DeclensionTypeDef = {
  id: 'k38',
  kotus: 38,
  modelWord: 'nainen',
  membership: 'rule',
  membershipRuleId: 'type.k38.membership',
  gradation: 'none',
  vowel: { kind: 'replace', strip: 'nen', add: 'se', ruleId: 'stem.nen-to-se', label: 'rule' },
  consonant: { kind: 'replace', strip: 'nen', add: 's', ruleId: 'stem.consonant.nen-to-s', label: 'rule' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_CONS_TEN, PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 39 — vastaus: -s words with stem -kse- (vastaus → vastauksen, vastausta). */
export const K39: DeclensionTypeDef = {
  id: 'k39',
  kotus: 39,
  modelWord: 'vastaus',
  membership: 'lexical',
  membershipRuleId: 'type.k39.membership',
  gradation: 'none',
  vowel: { kind: 'replace', strip: 's', add: 'kse', ruleId: 'stem.s-to-kse', label: 'pattern' },
  consonant: { kind: 'lemma' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_CONS_TEN, PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 40 — kalleus: -us/-ys nouns from adjectives; stem -ute-/-ude-, plural -uksi- (terveys → terveyden, terveyksiä). */
export const K40: DeclensionTypeDef = {
  id: 'k40',
  kotus: 40,
  modelWord: 'kalleus',
  membership: 'lexical',
  membershipRuleId: 'type.k40.membership',
  gradation: 'intrinsic',
  intrinsicPattern: 't-d',
  vowel: { kind: 'replace', strip: 's', add: 'te', ruleId: 'stem.s-to-te', label: 'pattern' },
  consonant: { kind: 'replace', strip: 's', add: 't', ruleId: 'stem.consonant.s-to-t', label: 'pattern' },
  plural: [{ kind: 'ks' }],
  pluralNoGradation: true,
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 41 — vieras: -as/-äs/-is words with a long-vowel stem (vieraa-). rengas → renkaan, hammas → hampaan. */
export const K41: DeclensionTypeDef = {
  id: 'k41',
  kotus: 41,
  modelWord: 'vieras',
  membership: 'pattern',
  membershipRuleId: 'type.k41.membership',
  gradation: 'inverse',
  vowel: { kind: 'lengthen', strip: 's', ruleId: 'stem.s-lengthen', label: 'pattern' },
  consonant: { kind: 'lemma' },
  plural: [{ kind: 'shorten' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_SEEN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN, r('consonant', 'ten', 'ending.genitive-pl.ten', { register: 'rare' })],
    'pl.partitive': [PLPAR_TA],
    'pl.illative': [PLILL_SIIN, PLILL_HIN_RARE],
  },
}

/** Kotus 42 — mies: the only member; stem miehe- (mies → miehen, miestä). */
export const K42: DeclensionTypeDef = {
  id: 'k42',
  kotus: 42,
  modelWord: 'mies',
  membership: 'irregular',
  membershipRuleId: 'type.k42.membership',
  gradation: 'none',
  vowel: { kind: 'replace', strip: 's', add: 'he', ruleId: 'stem.s-to-he', label: 'irregular' },
  consonant: { kind: 'lemma' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_CONS_TEN, PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 43 — ohut: -ut/-yt words with stem -ue-/-ye- (olut → oluen, olutta). */
export const K43: DeclensionTypeDef = {
  id: 'k43',
  kotus: 43,
  modelWord: 'ohut',
  membership: 'pattern',
  membershipRuleId: 'type.k43.membership',
  gradation: 'none',
  vowel: { kind: 'replace', strip: 't', add: 'e', ruleId: 'stem.t-to-e', label: 'pattern' },
  consonant: { kind: 'lemma' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_TA],
    'pl.illative': [PLILL_SIIN, PLILL_HIN],
  },
}

/** Kotus 44 — kevät: -Vt word with a long-vowel stem (kevät → kevään, kevättä). */
export const K44: DeclensionTypeDef = {
  id: 'k44',
  kotus: 44,
  modelWord: 'kevät',
  membership: 'irregular',
  membershipRuleId: 'type.k44.membership',
  gradation: 'none',
  vowel: { kind: 'lengthen', strip: 't', ruleId: 'stem.t-lengthen', label: 'irregular' },
  consonant: { kind: 'lemma' },
  plural: [{ kind: 'shorten' }],
  slots: {
    'sg.partitive': [PAR_CONS_TA],
    'sg.illative': [ILL_SEEN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_TA],
    'pl.illative': [PLILL_SIIN, PLILL_HIN_RARE],
  },
}

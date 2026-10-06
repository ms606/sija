import {
  ILL_VN,
  PAR_VOWEL_A,
  PAR_VOWEL_TA,
  PLGEN_DEN,
  PLGEN_EN,
  PLGEN_TTEN,
  PLILL_HIN,
  PLPAR_A,
  PLPAR_TA,
  type DeclensionTypeDef,
} from './schema'

/** Kotus 1 — valo: two-syllable (and some longer) words in -o, -u, -y, -ö. talo, auto, koulu, asunto. */
export const K1: DeclensionTypeDef = {
  id: 'k1',
  kotus: 1,
  modelWord: 'valo',
  membership: 'pattern',
  membershipRuleId: 'type.k1.membership',
  gradation: 'normal',
  vowel: { kind: 'same' },
  plural: [{ kind: 'append' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_HIN],
  },
}

/** Kotus 2 — palvelu: three-syllable words in -o/-u etc. with two plural series. kirjasto, toimisto. */
export const K2: DeclensionTypeDef = {
  id: 'k2',
  kotus: 2,
  modelWord: 'palvelu',
  membership: 'pattern',
  membershipRuleId: 'type.k2.membership',
  gradation: 'none',
  vowel: { kind: 'same' },
  plural: [{ kind: 'append' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN, PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_A, PLPAR_TA],
    'pl.illative': [PLILL_HIN],
  },
}

/** Kotus 3 — valtio: words in -io, -iö, -eo with partitive -ta/-tä. radio, museo, keittiö, yhtiö. */
export const K3: DeclensionTypeDef = {
  id: 'k3',
  kotus: 3,
  modelWord: 'valtio',
  membership: 'pattern',
  membershipRuleId: 'type.k3.membership',
  gradation: 'none',
  vowel: { kind: 'same' },
  plural: [{ kind: 'append' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_TA],
    'pl.illative': [PLILL_HIN],
  },
}

import {
  ILL_HVN,
  PAR_VOWEL_TA,
  PLGEN_DEN,
  PLGEN_TTEN,
  PLILL_HIN,
  PLPAR_TA,
  type DeclensionTypeDef,
} from './schema'

/** Kotus 18 — maa: one-syllable words with a long vowel. Partitive -tA, illative -hVn. */
export const K18: DeclensionTypeDef = {
  id: 'k18',
  kotus: 18,
  modelWord: 'maa',
  membership: 'rule',
  membershipRuleId: 'type.k18.membership',
  gradation: 'none',
  vowel: { kind: 'same' },
  plural: [{ kind: 'shorten' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_TA],
    'sg.illative': [ILL_HVN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_TA],
    'pl.illative': [PLILL_HIN],
  },
}

/** Kotus 19 — suo: one-syllable words with the diphthong ie, uo or yö (tie, suo, työ, yö). */
export const K19: DeclensionTypeDef = {
  id: 'k19',
  kotus: 19,
  modelWord: 'suo',
  membership: 'rule',
  membershipRuleId: 'type.k19.membership',
  gradation: 'none',
  vowel: { kind: 'same' },
  plural: [{ kind: 'diphthong' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_TA],
    'sg.illative': [ILL_HVN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_TA],
    'pl.illative': [PLILL_HIN],
  },
}

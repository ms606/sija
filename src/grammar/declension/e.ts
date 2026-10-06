import {
  ILL_SEEN,
  PAR_LEMMA_TTA,
  PLGEN_DEN,
  PLGEN_TTEN,
  PLILL_HIN,
  PLILL_SIIN,
  PLPAR_TA,
  type DeclensionTypeDef,
} from './schema'

/**
 * Kotus 48 — hame: words in -e with a long-vowel stem (perhe → perhee-).
 * Words with gradation have the weak grade in the nominative (sade → sateen).
 */
export const K48: DeclensionTypeDef = {
  id: 'k48',
  kotus: 48,
  modelWord: 'hame',
  membership: 'pattern',
  membershipRuleId: 'type.k48.membership',
  gradation: 'inverse',
  vowel: { kind: 'lengthen', strip: '', ruleId: 'stem.e-to-ee', label: 'pattern' },
  consonant: { kind: 'lemma' },
  plural: [{ kind: 'shorten' }],
  slots: {
    'sg.partitive': [PAR_LEMMA_TTA],
    'sg.illative': [ILL_SEEN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_TA],
    'pl.illative': [PLILL_SIIN, PLILL_HIN],
  },
}

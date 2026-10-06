import {
  ILL_VN,
  PAR_VOWEL_A,
  PAR_VOWEL_TA,
  PLGEN_DEN,
  PLGEN_EN,
  PLGEN_TTEN,
  PLILL_HIN,
  PLILL_IN,
  PLILL_SIIN,
  PLPAR_A,
  PLPAR_TA,
  r,
  type DeclensionTypeDef,
} from './schema'

/** Kotus 9 — kala: two-syllable -a words whose first syllable has a, e or i: a → o before plural -i-. kauppa → kauppoja. */
export const K9: DeclensionTypeDef = {
  id: 'k9',
  kotus: 9,
  modelWord: 'kala',
  membership: 'pattern',
  membershipRuleId: 'type.k9.membership',
  gradation: 'normal',
  vowel: { kind: 'same' },
  plural: [{ kind: 'a-to-o' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_HIN],
  },
}

/** Kotus 10 — koira: -ä words, and -a words whose first syllable has o or u: final vowel drops before plural -i-. */
export const K10: DeclensionTypeDef = {
  id: 'k10',
  kotus: 10,
  modelWord: 'koira',
  membership: 'pattern',
  membershipRuleId: 'type.k10.membership',
  gradation: 'normal',
  vowel: { kind: 'same' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_EN],
    'pl.partitive': [PLPAR_A],
    'pl.illative': [PLILL_IN],
  },
}

/** Kotus 11 — omena: two complete plural series (omenia ~ omenoita). */
export const K11: DeclensionTypeDef = {
  id: 'k11',
  kotus: 11,
  modelWord: 'omena',
  membership: 'lexical',
  membershipRuleId: 'type.k11.membership',
  gradation: 'none',
  vowel: { kind: 'same' },
  plural: [{ kind: 'drop-final' }, { kind: 'a-to-o', register: 'variant' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [
      r('plural', 'en', 'ending.genitive-pl.en', { pluralIndex: 0 }),
      r('plural', 'den', 'ending.genitive-pl.den', { pluralIndex: 1 }),
      r('plural', 'tten', 'ending.genitive-pl.tten', { pluralIndex: 1 }),
      r('plural', 'en', 'ending.genitive-pl.en', { pluralIndex: 1, register: 'rare' }),
    ],
    'pl.partitive': [
      r('plural', 'A', 'ending.partitive-pl.a', { pluralIndex: 0 }),
      r('plural', 'tA', 'ending.partitive-pl.ta', { pluralIndex: 1 }),
      r('plural', 'A', 'ending.partitive-pl.a', { pluralIndex: 1, register: 'rare' }),
    ],
    'pl.illative': [
      r('plural', 'in', 'ending.illative-pl.in', { pluralIndex: 0 }),
      r('plural', 'hin', 'ending.illative-pl.hin', { pluralIndex: 1 }),
    ],
  },
}

/** Kotus 12 — kulkija: three-syllable -a/-ä words with plural -oi-/-öi-. ravintola → ravintoloita. */
export const K12: DeclensionTypeDef = {
  id: 'k12',
  kotus: 12,
  modelWord: 'kulkija',
  membership: 'pattern',
  membershipRuleId: 'type.k12.membership',
  gradation: 'none',
  vowel: { kind: 'same' },
  plural: [{ kind: 'a-to-o' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_TA],
    'pl.illative': [PLILL_HIN],
  },
}

/** Kotus 13 — katiska: like kulkija, but also allows short plural forms (sairaaloita ~ sairaaloja). */
export const K13: DeclensionTypeDef = {
  id: 'k13',
  kotus: 13,
  modelWord: 'katiska',
  membership: 'lexical',
  membershipRuleId: 'type.k13.membership',
  gradation: 'none',
  vowel: { kind: 'same' },
  plural: [{ kind: 'a-to-o' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN, PLGEN_EN],
    'pl.partitive': [PLPAR_TA, PLPAR_A],
    'pl.illative': [PLILL_HIN],
  },
}

/**
 * Kotus 14 — solakka: three-syllable words with -kk-/-pp-/-tt- before the last vowel.
 * Long plural forms (-oita, -oiden) take the weak grade; short ones (-koja, -kojen) the strong grade.
 */
export const K14: DeclensionTypeDef = {
  id: 'k14',
  kotus: 14,
  modelWord: 'solakka',
  membership: 'pattern',
  membershipRuleId: 'type.k14.membership',
  gradation: 'normal',
  vowel: { kind: 'same' },
  plural: [{ kind: 'a-to-o' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A],
    'sg.illative': [ILL_VN],
    'pl.genitive': [
      r('plural', 'den', 'ending.genitive-pl.den', { grade: 'weak' }),
      r('plural', 'tten', 'ending.genitive-pl.tten', { grade: 'weak' }),
      r('plural', 'en', 'ending.genitive-pl.en', { grade: 'strong' }),
    ],
    'pl.partitive': [
      r('plural', 'tA', 'ending.partitive-pl.ta', { grade: 'weak' }),
      r('plural', 'A', 'ending.partitive-pl.a', { grade: 'strong' }),
    ],
    'pl.illative': [
      r('plural', 'hin', 'ending.illative-pl.hin', { grade: 'weak' }),
      r('plural', 'hin', 'ending.illative-pl.hin', { grade: 'strong' }),
    ],
  },
}

/** Kotus 15 — korkea: words in -ea, -eä, -oa (vihreä, vaikea). Partitive -A ~ -tA. */
export const K15: DeclensionTypeDef = {
  id: 'k15',
  kotus: 15,
  modelWord: 'korkea',
  membership: 'pattern',
  membershipRuleId: 'type.k15.membership',
  gradation: 'none',
  vowel: { kind: 'same' },
  plural: [{ kind: 'drop-final' }],
  slots: {
    'sg.partitive': [PAR_VOWEL_A, PAR_VOWEL_TA],
    'sg.illative': [ILL_VN],
    'pl.genitive': [PLGEN_DEN, PLGEN_TTEN],
    'pl.partitive': [PLPAR_TA],
    'pl.illative': [PLILL_SIIN, PLILL_HIN],
  },
}

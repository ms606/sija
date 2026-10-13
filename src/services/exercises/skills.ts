import { CASES_INFO } from '../../data/cases'
import { GRADATION_PATTERNS, parseSlot, type IGroup, type Lexeme, type PersonId, type SlotKey } from '../../grammar'
import type { CategoryId, ExerciseType, SkillId } from '../../types/exercise'
import { grammar } from '../grammar'
import { familyName, typeName } from '../content/text'

export const CATEGORY_ORDER: readonly CategoryId[] = [
  'cases',
  'case-endings',
  'singular',
  'plural',
  'genitive',
  'partitive',
  'noun-types',
  'i-words',
  'gradation',
  'vowel-harmony',
  'stem-formation',
  'possessives',
  'vocabulary',
  'listening',
  'production',
]

export const CATEGORY_INFO: Readonly<Record<CategoryId, { label: string; fi: string; practice: string }>> = {
  cases: { label: 'Cases: meaning & use', fi: 'Sijojen käyttö', practice: 'cases' },
  'case-endings': { label: 'Case endings', fi: 'Sijapäätteet', practice: 'case-endings' },
  singular: { label: 'Singular forms', fi: 'Yksikkö', practice: 'singular' },
  plural: { label: 'Plural forms', fi: 'Monikko', practice: 'plural' },
  genitive: { label: 'Genitive', fi: 'Genetiivi', practice: 'genitive' },
  partitive: { label: 'Partitive', fi: 'Partitiivi', practice: 'partitive' },
  'noun-types': { label: 'Noun types', fi: 'Taivutustyypit', practice: 'noun-types' },
  'i-words': { label: '-i words', fi: 'I-loppuiset sanat', practice: 'i-words' },
  gradation: { label: 'Consonant gradation', fi: 'Astevaihtelu', practice: 'gradation' },
  'vowel-harmony': { label: 'Vowel harmony', fi: 'Vokaalisointu', practice: 'vowel-harmony' },
  'stem-formation': { label: 'Stems', fi: 'Vartalot', practice: 'stem-formation' },
  possessives: { label: 'Possessive suffixes', fi: 'Omistusliitteet', practice: 'possessives' },
  vocabulary: { label: 'Vocabulary', fi: 'Sanasto', practice: 'vocabulary' },
  listening: { label: 'Listening', fi: 'Kuullun ymmärtäminen', practice: 'listening' },
  production: { label: 'Writing forms', fi: 'Tuottaminen', practice: 'production' },
}

export function isCategory(skill: string): skill is CategoryId {
  return (CATEGORY_ORDER as readonly string[]).includes(skill)
}

/** Human label for any skill id. */
export function skillLabel(skill: SkillId): string {
  if (isCategory(skill)) return CATEGORY_INFO[skill].label
  const [kind, value = ''] = skill.split(':')
  switch (kind) {
    case 'case':
      return `${CASES_INFO[value as keyof typeof CASES_INFO]?.en ?? value} case`
    case 'itype':
      return familyName(value as IGroup)
    case 'grad': {
      const p = GRADATION_PATTERNS[value as keyof typeof GRADATION_PATTERNS]
      return p ? `gradation ${p.strong} → ${p.weak || '∅'}` : value
    }
    case 'type':
      return typeName(value as `k${number}`)
    default:
      return skill
  }
}

/** The category a fine-grained skill rolls up into. */
export function categoryOf(skill: SkillId): CategoryId {
  if (isCategory(skill)) return skill
  if (skill.startsWith('case:')) return 'cases'
  if (skill.startsWith('itype:')) return 'i-words'
  if (skill.startsWith('grad:')) return 'gradation'
  return 'noun-types'
}

const HARMONY_VOWEL = /[aouäöy]/

/**
 * Which skills an exercise about one form trains. Derived from the engine's
 * derivation of that form, so "gradation" is only tagged when the form really
 * involves it.
 */
export function skillsFor(lex: Lexeme, slot: SlotKey, type: ExerciseType, person?: PersonId): SkillId[] {
  const { number, kase } = parseSlot(slot)
  const skills = new Set<SkillId>([`case:${kase}`, number === 'sg' ? 'singular' : 'plural', `type:${lex.typeId}`])
  if (type === 'identify-case' || type === 'identify-number-case') skills.add('cases')
  else skills.add('case-endings')
  if (kase === 'genitive') skills.add('genitive')
  if (kase === 'partitive') skills.add('partitive')
  const def = grammar.type(lex)
  if (def.iGroup) {
    skills.add('i-words')
    skills.add(`itype:${def.iGroup}`)
  }
  if (def.membership !== 'rule' || def.iGroup) skills.add('noun-types')
  const form = person ? grammar.withPossessive(lex, slot, person) : grammar.inflect(lex, slot)
  const v = form.variants[0]
  const grad = grammar.gradation(lex)
  if (grad && v?.pieces.some((p) => p.role === 'grade')) {
    skills.add('gradation')
    skills.add(`grad:${grad.pattern}`)
  }
  if (v?.pieces.some((p) => p.role === 'stem')) skills.add('stem-formation')
  const ending = v?.pieces.filter((p) => p.role === 'ending').map((p) => p.text).join('') ?? ''
  if (HARMONY_VOWEL.test(ending)) skills.add('vowel-harmony')
  if (person) skills.add('possessives')
  if (type === 'listening') skills.add('listening')
  if (type === 'production') {
    skills.add('production')
    skills.add('vocabulary')
  }
  return [...skills]
}

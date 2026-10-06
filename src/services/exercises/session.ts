import { CASE_ORDER } from '../../data/cases'
import { I_COMPARE_SLOTS } from '../../data/noun-families'
import { ALL_SLOTS, PERSONS, parseSlot, type CaseId, type PersonId, type SlotKey } from '../../grammar'
import type { LearnerMode } from '../../stores/settings'
import type { Noun } from '../../types/content'
import type { Exercise, ExerciseTarget, ExerciseType, SkillId } from '../../types/exercise'
import { pick, seeded, shuffle } from '../../utils/random'
import { grammar } from '../grammar'
import { GENERATORS, type GenContext } from './generators'

export interface PracticeScope {
  pool: Noun[]
  slots: SlotKey[]
  persons?: PersonId[]
  types: ExerciseType[]
}

const CORE_SLOTS: SlotKey[] = ['sg.genitive', 'sg.partitive', 'sg.inessive', 'sg.elative', 'sg.illative', 'sg.adessive', 'sg.ablative', 'sg.allative', 'sg.essive', 'sg.translative', 'pl.nominative', 'pl.genitive', 'pl.partitive', 'pl.inessive', 'pl.illative', 'pl.adessive']
const FORM_TYPES: ExerciseType[] = ['transform', 'multiple-choice', 'fill-blank', 'build-word', 'error-correction']
const ALL_TYPES: ExerciseType[] = ['multiple-choice', 'fill-blank', 'transform', 'identify-case', 'identify-number-case', 'identify-morphology', 'build-word', 'listening', 'error-correction', 'production']

const nouns = () => grammar.lexicon.filter((l) => l.pos === 'noun')
const commonNouns = (maxLevel = 8) => nouns().filter((l) => l.frequency !== 'extra' && l.level <= maxLevel)

/** Which words, forms and exercise types train a skill. */
export function scopeFor(skill: SkillId | 'mixed', maxLevel = 8): PracticeScope {
  const [kind, value = ''] = skill.split(':')
  switch (kind) {
    case 'case': {
      const c = value as CaseId
      const slots = (['sg', 'pl'] as const).map((n) => `${n}.${c}` as SlotKey).filter((s) => !(c === 'comitative' || c === 'instructive') || s.startsWith('pl'))
      return { pool: commonNouns(maxLevel), slots, types: c === 'accusative' ? ['fill-blank'] : [...FORM_TYPES, 'identify-case', 'production'] }
    }
    case 'grad': {
      const pool = grammar.lexicon.filter((l) => grammar.gradation(l)?.pattern === value)
      return { pool, slots: ['sg.genitive', 'sg.partitive', 'sg.inessive', 'sg.illative', 'sg.adessive', 'pl.nominative', 'pl.partitive', 'pl.inessive'], types: ['transform', 'multiple-choice', 'build-word', 'identify-morphology', 'error-correction'] }
    }
    case 'itype': {
      const pool = grammar.lexicon.filter((l) => grammar.type(l).iGroup === value)
      return { pool, slots: I_COMPARE_SLOTS.filter((s) => s !== 'sg.nominative'), types: ['transform', 'multiple-choice', 'fill-blank', 'error-correction'] }
    }
    case 'type': {
      const pool = grammar.lexicon.filter((l) => l.typeId === value)
      return { pool, slots: ['sg.genitive', 'sg.partitive', 'sg.illative', 'sg.inessive', 'pl.genitive', 'pl.partitive', 'pl.inessive'], types: ['transform', 'multiple-choice', 'build-word'] }
    }
  }
  switch (skill) {
    case 'cases':
      return { pool: commonNouns(maxLevel), slots: CORE_SLOTS, types: ['identify-case', 'identify-number-case', 'fill-blank', 'production'] }
    case 'case-endings':
      return { pool: commonNouns(maxLevel), slots: CORE_SLOTS, types: ['transform', 'multiple-choice', 'build-word'] }
    case 'singular':
      return { pool: commonNouns(maxLevel), slots: CORE_SLOTS.filter((s) => s.startsWith('sg')), types: FORM_TYPES }
    case 'plural':
      return { pool: commonNouns(maxLevel), slots: ALL_SLOTS.filter((s) => s.startsWith('pl') && !['pl.comitative', 'pl.instructive', 'pl.abessive', 'pl.accusative'].includes(s)), types: [...FORM_TYPES, 'identify-number-case'] }
    case 'genitive':
      return { pool: commonNouns(maxLevel), slots: ['sg.genitive', 'pl.genitive'], types: FORM_TYPES }
    case 'partitive':
      return { pool: commonNouns(maxLevel), slots: ['sg.partitive', 'pl.partitive'], types: FORM_TYPES }
    case 'gradation':
      return { pool: grammar.lexicon.filter((l) => grammar.gradation(l)), slots: ['sg.genitive', 'sg.partitive', 'sg.inessive', 'sg.illative', 'pl.nominative', 'pl.partitive', 'pl.inessive'], types: ['transform', 'multiple-choice', 'build-word', 'identify-morphology', 'error-correction'] }
    case 'i-words':
      return { pool: grammar.lexicon.filter((l) => grammar.type(l).iGroup), slots: I_COMPARE_SLOTS.filter((s) => s !== 'sg.nominative'), types: ['transform', 'multiple-choice', 'fill-blank', 'error-correction'] }
    case 'noun-types':
      return { pool: grammar.lexicon.filter((l) => grammar.type(l).membership !== 'rule' || grammar.type(l).iGroup), slots: ['sg.genitive', 'sg.partitive', 'pl.partitive'], types: ['transform', 'multiple-choice'] }
    case 'vowel-harmony':
      return { pool: commonNouns(maxLevel), slots: ['sg.partitive', 'sg.inessive', 'sg.elative', 'sg.adessive', 'sg.ablative', 'sg.essive', 'pl.partitive'], types: ['build-word', 'multiple-choice', 'error-correction'] }
    case 'stem-formation':
      return { pool: grammar.lexicon.filter((l) => l.typeId !== 'k1' && l.typeId !== 'k9' && l.typeId !== 'k10'), slots: CORE_SLOTS, types: ['identify-morphology', 'build-word', 'transform'] }
    case 'possessives':
      return {
        pool: nouns().filter((l) => l.semantics.some((s) => ['place', 'building', 'person', 'body', 'object', 'furniture'].includes(s)) && l.frequency !== 'extra'),
        slots: ['sg.nominative', 'sg.inessive', 'sg.elative', 'sg.illative', 'sg.adessive', 'sg.partitive', 'pl.nominative'],
        persons: [...PERSONS],
        types: ['transform', 'multiple-choice', 'build-word'],
      }
    case 'vocabulary':
    case 'production':
      return { pool: commonNouns(maxLevel), slots: CORE_SLOTS, types: ['production'] }
    case 'listening':
      return { pool: commonNouns(maxLevel), slots: CORE_SLOTS, types: ['listening'] }
    default:
      return { pool: commonNouns(maxLevel), slots: CORE_SLOTS, types: ALL_TYPES }
  }
}

export interface SessionSpec {
  skill?: SkillId | 'mixed'
  /** Restrict to some exercise types. */
  types?: ExerciseType[]
  /** Restrict to some words. */
  words?: string[]
  slots?: SlotKey[]
  /** Possessive practice: only these persons. */
  persons?: PersonId[]
  /** Sentence exercises: only sentences with these tags. */
  tags?: string[]
  lemmaHintOnly?: boolean
  count?: number
  /** Highest lexicon level to draw words from. */
  maxLevel?: number
  /** Review items to include first (spaced repetition). */
  due?: { target: ExerciseTarget; kind: 'form' | 'recognize' }[]
  seed: number
  mode: LearnerMode
  audio: boolean
}

const RECOGNITION_TYPES: ExerciseType[] = ['identify-case', 'identify-number-case', 'listening']

/**
 * Builds a practice session: due reviews first, then interleaved exercise
 * types over the skill's words and forms. The same target never appears
 * twice in a row.
 */
export function buildSession(spec: SessionSpec): Exercise[] {
  const rng = seeded(spec.seed)
  const scope = scopeFor(spec.skill ?? 'mixed', spec.maxLevel)
  const pool = spec.words?.length ? grammar.lexicon.filter((l) => spec.words!.includes(l.id)) : scope.pool
  const slots = spec.slots?.length ? spec.slots : scope.slots
  let types = (spec.types?.length ? spec.types : scope.types).filter((t) => spec.audio || t !== 'listening')
  if (!types.length) types = ['transform']
  const persons = spec.persons?.length ? spec.persons : scope.persons
  const ctx: GenContext = {
    rng,
    mode: spec.mode,
    pool,
    slots,
    audio: spec.audio,
    ...(persons ? { persons } : {}),
    ...(spec.tags?.length ? { tags: spec.tags } : {}),
    ...(spec.lemmaHintOnly ? { lemmaHintOnly: true } : {}),
  }
  const count = spec.count ?? 12
  const out: Exercise[] = []
  const used = new Set<string>()
  let guard = 0
  const push = (ex: Exercise | null) => {
    if (!ex) return false
    const target = ex.target ? `${ex.target.lexemeId}:${ex.target.slot}:${ex.target.person ?? ''}` : ex.id
    const prev = out[out.length - 1]?.target
    // Never the same form twice in a row; avoid repeating an item at all until options run out.
    if (prev && target === `${prev.lexemeId}:${prev.slot}:${prev.person ?? ''}`) return false
    if (used.has(`${ex.type}:${target}`) && guard < count * 6) return false
    out.push(ex)
    used.add(`${ex.type}:${target}`)
    return true
  }
  for (const { target, kind } of spec.due ?? []) {
    if (out.length >= Math.ceil(count / 2)) break
    const kindTypes = types.filter((t) => RECOGNITION_TYPES.includes(t) === (kind === 'recognize'))
    const type = pick(rng, kindTypes.length ? kindTypes : types)!
    push(GENERATORS[type](ctx, target) ?? GENERATORS.transform(ctx, target))
  }
  let order = shuffle(rng, types)
  let i = 0
  while (out.length < count && guard++ < count * 12) {
    if (i >= order.length) {
      order = shuffle(rng, types)
      i = 0
    }
    const type = order[i++]!
    push(GENERATORS[type](ctx))
  }
  return out
}

/** Every case except the accusative (for "all cases" style pickers). */
export const PRACTICE_CASES: CaseId[] = CASE_ORDER.filter((c) => c !== 'accusative')

export function slotNumberLabel(slot: SlotKey): 'sg' | 'pl' {
  return parseSlot(slot).number
}

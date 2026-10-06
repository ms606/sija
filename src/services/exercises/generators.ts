import { CASE_ORDER, CASES_INFO } from '../../data/cases'
import {
  ALL_SLOTS,
  parseSlot,
  realize,
  type CaseId,
  type FormVariant,
  type Lexeme,
  type NounForm,
  type PersonId,
  type PieceRole,
  type RenderedSentence,
  type SlotKey,
} from '../../grammar'
import type { LearnerMode } from '../../stores/settings'
import type { Noun } from '../../types/content'
import type { ChoiceOption, Exercise, ExerciseTarget, ExerciseType } from '../../types/exercise'
import { pick, sample, shuffle, type Rng } from '../../utils/random'
import { caseName, PERSON_LABEL, pickLabel, slotLabel } from '../content/text'
import { sentencesFor } from '../content/sentences'
import { grammar } from '../grammar'
import { skillsFor } from './skills'

export interface GenContext {
  rng: Rng
  mode: LearnerMode
  /** Candidate words. */
  pool: readonly Noun[]
  /** Allowed slots. */
  slots: readonly SlotKey[]
  /** Possessive practice: persons to use. */
  persons?: readonly PersonId[]
  /** Text-to-speech is available (listening exercises). */
  audio: boolean
  /** Sentence exercises: only sentences with one of these tags. */
  tags?: readonly string[]
  /** Fill-blank hints show only the lemma, not the case to use. */
  lemmaHintOnly?: boolean
}

export type Generator = (ctx: GenContext, target?: ExerciseTarget) => Exercise | null

let counter = 0
const nextId = (type: ExerciseType) => `${type}-${++counter}`

/* ---------------- helpers ---------------- */

function formOf(lex: Lexeme, slot: SlotKey, person?: PersonId): NounForm {
  return person ? grammar.withPossessive(lex, slot, person) : grammar.inflect(lex, slot)
}

function usable(lex: Noun, slot: SlotKey, person?: PersonId): boolean {
  const f = formOf(lex, slot, person)
  if (f.status === 'not-used' || !f.variants[0]) return false
  const { number } = parseSlot(slot)
  if (number === 'pl' && (lex.numberUse === 'mass' || lex.numberUse === 'pl-rare')) return false
  return true
}

function standard(f: NounForm): string[] {
  return f.variants.filter((v) => v.register !== 'rare').map((v) => v.text)
}

function rareForms(f: NounForm): string[] {
  return f.variants.filter((v) => v.register === 'rare').map((v) => v.text)
}

/** Picks a usable (word, slot[, person]) — or validates the requested one. */
function chooseTarget(ctx: GenContext, target?: ExerciseTarget, accept?: (lex: Noun, slot: SlotKey) => boolean): { lex: Noun; slot: SlotKey; person?: PersonId } | null {
  if (target) {
    const lex = grammar.get(target.lexemeId)
    if (!lex || !usable(lex, target.slot, target.person) || (accept && !accept(lex, target.slot))) return null
    return { lex, slot: target.slot, ...(target.person ? { person: target.person } : {}) }
  }
  for (let i = 0; i < 40; i++) {
    const lex = pick(ctx.rng, ctx.pool)
    const slot = pick(ctx.rng, ctx.slots)
    if (!lex || !slot) return null
    const person = ctx.persons?.length && lex.pos === 'noun' ? pick(ctx.rng, ctx.persons) : undefined
    if (usable(lex, slot, person) && (!accept || accept(lex, slot))) return { lex, slot, ...(person ? { person } : {}) }
  }
  return null
}

function difficulty(lex: Lexeme, slot: SlotKey, person?: PersonId): 1 | 2 | 3 {
  const { number, kase } = parseSlot(slot)
  if (person || ['abessive', 'comitative', 'instructive'].includes(kase) || slot === 'pl.genitive') return 3
  if (number === 'pl' || grammar.gradation(lex) || grammar.type(lex).iGroup) return 2
  return 1
}

const RECOGNITION: ExerciseType[] = ['identify-case', 'identify-number-case', 'identify-morphology', 'listening']

function reviewKey(type: ExerciseType, lex: Lexeme, slot: SlotKey, person?: PersonId): string {
  const kind = RECOGNITION.includes(type) ? 'recognize' : 'form'
  return `${kind}:${lex.id}:${slot}${person ? `:${person}` : ''}`
}

function base(type: ExerciseType, lex: Noun, slot: SlotKey, person?: PersonId): Pick<Exercise, 'id' | 'type' | 'skills' | 'reviewKey' | 'difficulty' | 'target'> {
  return {
    id: nextId(type),
    type,
    skills: skillsFor(lex, slot, type, person),
    reviewKey: reviewKey(type, lex, slot, person),
    difficulty: difficulty(lex, slot, person),
    target: { lexemeId: lex.id, slot, ...(person ? { person } : {}) },
  }
}

function gloss(lex: Noun): string {
  return lex.gloss.en.split(/[;,(]/)[0]!.trim()
}

/** "genitive singular" or, with a possessive, "my … (inessive singular)". */
function targetLabel(slot: SlotKey, mode: LearnerMode, person?: PersonId): string {
  const s = slotLabel(slot, mode)
  return person ? `${pickLabel(PERSON_LABEL[person], mode)} + ${s}` : s
}

/** Every slot of the lexeme in which `text` is an accepted form. */
function slotsWithForm(lex: Lexeme, text: string): SlotKey[] {
  return ALL_SLOTS.filter((s) => !s.endsWith('.accusative') && grammar.accepted(lex, s).includes(text))
}

/* ---------------- A. multiple choice ---------------- */

export const multipleChoice: Generator = (ctx, target) => {
  const t = chooseTarget(ctx, target)
  if (!t) return null
  const f = formOf(t.lex, t.slot, t.person)
  const accepted = new Set(f.variants.map((v) => v.text))
  const correct = f.variants[0]!.text
  const options: ChoiceOption[] = [{ id: correct, label: correct, fi: true }]
  const seen = new Set([correct])
  if (!t.person) {
    for (const m of grammar.malforms(t.lex, t.slot)) {
      if (options.length >= 4) break
      if (seen.has(m.text) || accepted.has(m.text)) continue
      seen.add(m.text)
      options.push({ id: m.text, label: m.text, fi: true, diagnosisId: m.diagnosisId, params: m.params })
    }
  } else {
    for (const p of shuffle(ctx.rng, ['1sg', '2sg', '3', '1pl', '2pl'] as PersonId[])) {
      if (options.length >= 4) break
      const other = formOf(t.lex, t.slot, p).variants[0]?.text
      if (!other || seen.has(other) || accepted.has(other)) continue
      seen.add(other)
      options.push({ id: other, label: other, fi: true, diagnosisId: 'wrong-person', params: { person: p } })
    }
  }
  for (const s of shuffle(ctx.rng, ALL_SLOTS)) {
    if (options.length >= 4) break
    const other = formOf(t.lex, s, t.person).variants[0]?.text
    if (!other || seen.has(other) || accepted.has(other) || s.endsWith('.accusative')) continue
    seen.add(other)
    options.push({ id: other, label: other, fi: true, diagnosisId: 'wrong-case', params: { slot: s } })
  }
  if (options.length < 3) return null
  return {
    ...base('multiple-choice', t.lex, t.slot, t.person),
    prompt: { instruction: `Choose the ${targetLabel(t.slot, ctx.mode, t.person)}`, word: t.lex.lemma, detail: gloss(t.lex) },
    answer: { kind: 'choice', options: shuffle(ctx.rng, options), correct: [correct] },
  }
}

/* ---------------- C. transform ---------------- */

export const transform: Generator = (ctx, target) => {
  const t = chooseTarget(ctx, target)
  if (!t) return null
  const f = formOf(t.lex, t.slot, t.person)
  return {
    ...base('transform', t.lex, t.slot, t.person),
    prompt: { instruction: `Write the ${targetLabel(t.slot, ctx.mode, t.person)}`, word: t.lex.lemma, detail: gloss(t.lex) },
    answer: { kind: 'text', accept: standard(f), rare: rareForms(f) },
  }
}

/* ---------------- B. fill in the blank (sentence) ---------------- */

function focusSentence(ctx: GenContext, target?: ExerciseTarget, singleWord = false): { view: RenderedSentence; blank: number; lex: Noun; slot: SlotKey; person?: PersonId; en: string } | null {
  const lexemes = target ? [grammar.get(target.lexemeId)].filter((l): l is Noun => !!l) : shuffle(ctx.rng, ctx.pool).slice(0, 40)
  for (const lex of lexemes) {
    const views = shuffle(ctx.rng, sentencesFor(lex.id, target?.slot)).filter((v) => !ctx.tags?.length || v.sentence.tags.some((t) => ctx.tags!.includes(t)))
    for (const v of views) {
      const blank = v.parts.findIndex((p) => p.token?.focus && p.token.lexemeIds.includes(lex.id))
      const tok = v.parts[blank]?.token
      if (!tok || !ctx.slots.includes(tok.slot) && !target) continue
      if (tok.literal || (singleWord && tok.lexemeIds.length > 1)) continue
      if (target && (tok.slot !== target.slot || (tok.person ?? undefined) !== target.person)) continue
      if (tok.slot.endsWith('.accusative') && singleWord) continue
      return { view: v, blank, lex, slot: tok.slot, ...(tok.person ? { person: tok.person } : {}), en: v.sentence.en }
    }
  }
  return null
}

export const fillBlank: Generator = (ctx, target) => {
  const found = focusSentence(ctx, target)
  if (!found) return null
  const tok = found.view.parts[found.blank]!.token!
  const lemmas = tok.lexemeIds.map((id) => grammar.require(id).lemma).join(' ')
  const pron = tok.person ? `${(PERSON_LABEL[tok.person].fi ?? '').split(' / ')[0]} ` : ''
  const hint = ctx.mode === 'beginner' && !ctx.lemmaHintOnly ? `${pron}${lemmas} → ${slotLabel(tok.slot, ctx.mode)}` : `${pron}${lemmas}`
  return {
    ...base('fill-blank', found.lex, found.slot, found.person),
    prompt: { instruction: 'Fill in the missing word', sentence: { view: found.view, blank: found.blank, translation: found.en, hint } },
    answer: { kind: 'text', accept: tok.accepted },
  }
}

/* ---------------- D. identify the case ---------------- */

const CASE_POOL: CaseId[] = CASE_ORDER.filter((c) => c !== 'accusative')

export const identifyCase: Generator = (ctx, target) => {
  const t = chooseTarget(ctx, target, (_l, s) => !s.endsWith('.accusative'))
  if (!t || t.person) return null
  const text = grammar.primary(t.lex, t.slot)!
  const correctCases = [...new Set(slotsWithForm(t.lex, text).map((s) => parseSlot(s).kase))]
  const own = parseSlot(t.slot).kase
  const group = CASES_INFO[own].group
  const nearby = shuffle(ctx.rng, CASE_POOL.filter((c) => !correctCases.includes(c) && CASES_INFO[c].group === group))
  const others = shuffle(ctx.rng, CASE_POOL.filter((c) => !correctCases.includes(c) && CASES_INFO[c].group !== group && CASES_INFO[c].frequency !== 'rare'))
  const distractors = [...nearby, ...others].slice(0, 3)
  // A form shared by several cases offers every one of them as a correct option.
  const options = shuffle(ctx.rng, [...correctCases, ...distractors]).map((c) => ({ id: c, label: `${caseName(c, ctx.mode)} (${CASES_INFO[c].questions[0]?.fi ?? ''})` }))
  return {
    ...base('identify-case', t.lex, t.slot),
    prompt: { instruction: 'Which case is this form?', word: text, detail: `${t.lex.lemma} — ${gloss(t.lex)}` },
    answer: { kind: 'choice', options, correct: correctCases },
  }
}

/* ---------------- E. identify number + case ---------------- */

export const identifyNumberCase: Generator = (ctx, target) => {
  const t = chooseTarget(ctx, target, (_l, s) => !s.endsWith('.accusative'))
  if (!t || t.person) return null
  const text = grammar.primary(t.lex, t.slot)!
  const correct = slotsWithForm(t.lex, text)
  const { number, kase } = parseSlot(t.slot)
  const twin = `${number === 'sg' ? 'pl' : 'sg'}.${kase}` as SlotKey
  const candidates = [twin, ...shuffle(ctx.rng, ALL_SLOTS.filter((s) => parseSlot(s).number === number && CASES_INFO[parseSlot(s).kase].frequency !== 'rare'))]
  const distractors: SlotKey[] = []
  for (const s of candidates) {
    if (distractors.length >= 3) break
    if (correct.includes(s) || distractors.includes(s) || s.endsWith('.accusative') || !usable(t.lex, s)) continue
    distractors.push(s)
  }
  // A form can fill several slots (lauantaita: sg. and pl. partitive); every one is offered and accepted.
  const options = shuffle(ctx.rng, [...correct, ...distractors]).map((s) => ({ id: s, label: slotLabel(s, ctx.mode) }))
  return {
    ...base('identify-number-case', t.lex, t.slot),
    prompt: { instruction: 'Which form is this — number and case?', word: text, detail: `${t.lex.lemma} — ${gloss(t.lex)}` },
    answer: { kind: 'choice', options, correct },
  }
}

/* ---------------- F. identify a part of the word ---------------- */

const ROLE_QUESTION: Partial<Record<PieceRole, string>> = {
  ending: 'Tap the case ending',
  grade: 'Tap the consonant(s) that changed (consonant gradation)',
  plural: 'Tap the plural marker',
  stem: 'Tap the part where the stem changed',
  possessive: 'Tap the possessive suffix',
}

/** Joins neighbouring root/stem pieces the learner is not asked about. */
function displayPieces(v: FormVariant, keep: PieceRole): { text: string; role: PieceRole }[] {
  const out: { text: string; role: PieceRole }[] = []
  for (const p of v.pieces) {
    if (p.text === '') continue
    const last = out[out.length - 1]
    const plain = p.role === 'root' || (p.role !== keep && p.role !== 'ending' && p.role !== 'plural' && p.role !== 'possessive')
    if (last && plain && last.role === 'root') last.text += p.text
    else out.push({ text: p.text, role: plain ? 'root' : p.role })
  }
  return out
}

export const identifyMorphology: Generator = (ctx, target) => {
  for (let attempt = 0; attempt < (target ? 1 : 12); attempt++) {
    const t = chooseTarget(ctx, target)
    if (!t) return null
    const v = formOf(t.lex, t.slot, t.person).variants[0]!
    const roles: PieceRole[] = []
    if (v.pieces.some((p) => p.role === 'grade' && p.text !== '' && p.was !== undefined && p.was !== p.text)) roles.push('grade', 'grade')
    if (v.pieces.some((p) => p.role === 'stem' && p.text !== '')) roles.push('stem')
    if (v.pieces.some((p) => p.role === 'plural' && p.text !== '')) roles.push('plural')
    if (v.pieces.some((p) => p.role === 'possessive' && p.text !== '')) roles.push('possessive')
    if (v.pieces.some((p) => p.role === 'ending' && p.text !== '')) roles.push('ending')
    const role = pick(ctx.rng, roles)
    if (!role) continue
    const pieces = displayPieces(v, role)
    if (pieces.length < 2) continue
    const correct = pieces.map((p, i) => (p.role === role ? i : -1)).filter((i) => i >= 0)
    return {
      ...base('identify-morphology', t.lex, t.slot, t.person),
      prompt: { instruction: ROLE_QUESTION[role] ?? 'Tap the part', word: v.text, detail: `${t.lex.lemma} · ${targetLabel(t.slot, ctx.mode, t.person)}` },
      answer: { kind: 'pieces', pieces, role, correct },
    }
  }
  return null
}

/* ---------------- G. build the word from tiles ---------------- */

const SWAP: Record<string, string> = { a: 'ä', o: 'ö', u: 'y', ä: 'a', ö: 'o', y: 'u' }

export const buildWord: Generator = (ctx, target) => {
  const t = chooseTarget(ctx, target)
  if (!t) return null
  const f = formOf(t.lex, t.slot, t.person)
  const v = f.variants[0]!
  // Tiles: consecutive root/stem letters stay together; grade, plural, ending and possessive are separate.
  const tiles: string[] = []
  for (const p of v.pieces) {
    if (p.text === '') continue
    const last = tiles.length - 1
    const prevRole = v.pieces.filter((q) => q.text !== '')[tiles.length - 1]?.role
    if (last >= 0 && (p.role === 'root' || p.role === 'stem') && (prevRole === 'root' || prevRole === 'stem')) tiles[last] += p.text
    else tiles.push(p.text)
  }
  if (tiles.length < 2) return null
  const distractors = new Set<string>()
  const grade = v.pieces.find((p) => p.role === 'grade' && p.was !== undefined && p.was !== p.text && p.was !== '' && p.text !== '')
  if (grade?.was) distractors.add(grade.was)
  const ending = [...v.pieces].reverse().find((p) => p.role === 'ending' && p.text !== '')
  if (ending) {
    const swapped = [...ending.text].map((c) => SWAP[c] ?? c).join('')
    if (swapped !== ending.text) distractors.add(swapped)
    else distractors.add(realize(pick(ctx.rng, ['ssA', 'stA', 'llA', 'nA'])!, grammar.harmony(t.lex).harmony))
  }
  for (const d of tiles) distractors.delete(d)
  const all = [...tiles.map((text, i) => ({ id: `t${i}`, text })), ...[...distractors].slice(0, 2).map((text, i) => ({ id: `d${i}`, text }))]
  return {
    ...base('build-word', t.lex, t.slot, t.person),
    prompt: { instruction: `Build the ${targetLabel(t.slot, ctx.mode, t.person)}`, word: t.lex.lemma, detail: gloss(t.lex) },
    answer: { kind: 'build', tiles: shuffle(ctx.rng, all), accept: standard(f) },
  }
}

/* ---------------- H. listening ---------------- */

export const listening: Generator = (ctx, target) => {
  if (!ctx.audio) return null
  const t = chooseTarget(ctx, target, (_l, s) => !s.endsWith('.accusative'))
  if (!t || t.person) return null
  const text = grammar.primary(t.lex, t.slot)!
  const { number } = parseSlot(t.slot)
  const others: string[] = []
  for (const s of shuffle(ctx.rng, ALL_SLOTS.filter((x) => parseSlot(x).number === number || ctx.rng() < 0.3))) {
    if (others.length >= 3) break
    const o = grammar.primary(t.lex, s)
    if (!o || o === text || others.includes(o) || s.endsWith('.accusative') || !usable(t.lex, s)) continue
    others.push(o)
  }
  if (others.length < 2) return null
  return {
    ...base('listening', t.lex, t.slot),
    prompt: { instruction: 'Listen. Which form do you hear?', audio: text, detail: `${t.lex.lemma} — ${gloss(t.lex)}` },
    answer: { kind: 'choice', options: shuffle(ctx.rng, [text, ...others]).map((o) => ({ id: o, label: o, fi: true })), correct: [text] },
  }
}

/* ---------------- I. error correction ---------------- */

/** Mistakes worth correcting in context. Other-number/other-case forms are excluded: they could make a valid sentence. */
const TEACHABLE = new Set(['no-gradation', 'wrong-grade', 'wrong-harmony', 'wrong-igroup', 'wrong-partitive-ending', 'wrong-illative', 'lemma-plus-ending'])

export const errorCorrection: Generator = (ctx, target) => {
  for (let attempt = 0; attempt < (target ? 1 : 6); attempt++) {
    const found = focusSentence(ctx, target, true)
    if (!found) return null
    if (found.person) continue
    const tok = found.view.parts[found.blank]!.token!
    const realForms = new Set(ALL_SLOTS.flatMap((x) => grammar.accepted(found.lex, x)))
    // The "mistake" must not be a real word form, or the sentence might be correct after all.
    const wrong = grammar
      .malforms(found.lex, found.slot)
      .find((m) => TEACHABLE.has(m.diagnosisId) && !tok.accepted.includes(m.text) && !realForms.has(m.text) && grammar.analyze(m.text).length === 0)
    if (!wrong) continue
    const shown = found.view.parts[found.blank]!.text
    const wrongText = shown[0] && shown[0] !== shown[0].toLowerCase() ? wrong.text[0]!.toUpperCase() + wrong.text.slice(1) : wrong.text
    const parts = found.view.parts.map((p, i) => (i === found.blank ? { ...p, text: wrongText } : p))
    const view: RenderedSentence = { text: parts.map((p) => p.text).join(''), parts }
    return {
      ...base('error-correction', found.lex, found.slot),
      prompt: {
        instruction: 'The underlined word has a mistake. Write it correctly.',
        sentence: { view, blank: found.blank, translation: found.en, marked: true },
        error: { text: wrong.text, diagnosisId: wrong.diagnosisId, params: wrong.params },
      },
      answer: { kind: 'text', accept: tok.accepted },
    }
  }
  return null
}

/* ---------------- J. production (English → Finnish form) ---------------- */

interface Frame {
  slot: SlotKey
  en: (g: string) => string
  when: (lex: Noun) => boolean
}

const isPlace = (l: Noun) => l.semantics.includes('place') || l.semantics.includes('building') || !!l.locative
const FRAMES: Frame[] = [
  { slot: 'sg.inessive', en: (g) => `in the ${g}`, when: (l) => (l.locative === 'inner' || l.locative === 'both') && isPlace(l) },
  { slot: 'sg.elative', en: (g) => `out of the ${g}`, when: (l) => (l.locative === 'inner' || l.locative === 'both') && isPlace(l) },
  { slot: 'sg.illative', en: (g) => `into the ${g}`, when: (l) => (l.locative === 'inner' || l.locative === 'both') && isPlace(l) },
  { slot: 'sg.adessive', en: (g) => `at the ${g}`, when: (l) => (l.locative === 'outer' || l.locative === 'both') && isPlace(l) },
  { slot: 'sg.ablative', en: (g) => `from the ${g}`, when: (l) => (l.locative === 'outer' || l.locative === 'both') && isPlace(l) },
  { slot: 'sg.allative', en: (g) => `to the ${g}`, when: (l) => (l.locative === 'outer' || l.locative === 'both') && isPlace(l) },
  { slot: 'sg.adessive', en: (g) => `on the ${g}`, when: (l) => l.semantics.includes('furniture') },
  { slot: 'sg.essive', en: (g) => `as a ${g}`, when: (l) => l.semantics.includes('person') },
  { slot: 'sg.allative', en: (g) => `to the ${g} (a person)`, when: (l) => l.semantics.includes('person') },
  { slot: 'sg.partitive', en: (g) => `some ${g}`, when: (l) => l.semantics.includes('substance') || l.semantics.includes('drink') || l.numberUse === 'mass' },
  {
    slot: 'sg.genitive',
    en: (g) => `of the ${g} (the ${g}'s)`,
    when: (l) => l.pos === 'noun' && l.semantics.some((x) => ['object', 'building', 'place', 'person', 'animal', 'vehicle', 'furniture'].includes(x)),
  },
  { slot: 'sg.abessive', en: (g) => `without ${g} (formal)`, when: (l) => l.id === 'raha' },
]

export const production: Generator = (ctx, target) => {
  const frames = target
    ? FRAMES.filter((f) => f.slot === target.slot)
    : FRAMES.filter((f) => ctx.slots.includes(f.slot) || ctx.slots.length >= 20)
  for (let i = 0; i < 40; i++) {
    const lex = target ? grammar.get(target.lexemeId) : pick(ctx.rng, ctx.pool)
    if (!lex) return null
    const options = frames.filter((f) => f.when(lex) && usable(lex, f.slot))
    // Prefer the place and role frames; the genitive frame fits almost every noun.
    const specific = options.filter((f) => f.slot !== 'sg.genitive')
    const frame = pick(ctx.rng, specific.length && ctx.rng() < 0.8 ? specific : options)
    if (!frame) {
      if (target) return null
      continue
    }
    const f = grammar.inflect(lex, frame.slot)
    const g = gloss(lex)
    return {
      ...base('production', lex, frame.slot),
      prompt: {
        instruction: 'Write in Finnish',
        word: frame.en(g),
        detail: ctx.mode === 'advanced' ? `(${lex.lemma})` : `${lex.lemma} = ${g} · ${slotLabel(frame.slot, ctx.mode)}`,
      },
      answer: { kind: 'text', accept: standard(f), rare: rareForms(f) },
    }
  }
  return null
}

export const GENERATORS: Readonly<Record<ExerciseType, Generator>> = {
  'multiple-choice': multipleChoice,
  'fill-blank': fillBlank,
  transform,
  'identify-case': identifyCase,
  'identify-number-case': identifyNumberCase,
  'identify-morphology': identifyMorphology,
  'build-word': buildWord,
  listening,
  'error-correction': errorCorrection,
  production,
}

/** Distinct example forms for a list of words (used by previews). */
export function sampleTargets(rng: Rng, pool: readonly Noun[], slots: readonly SlotKey[], n: number): ExerciseTarget[] {
  return sample(rng, pool, n).flatMap((lex) => {
    const slot = pick(rng, slots.filter((s) => usable(lex, s)))
    return slot ? [{ lexemeId: lex.id, slot }] : []
  })
}

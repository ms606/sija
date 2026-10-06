import { Form } from './builder'
import type { SlotRecipe } from './declension/schema'
import { GRADATION_PATTERNS } from './gradation'
import { hasHarmonyVowel, realize } from './harmony'
import { lastVowel } from './phonology'
import { ALL_SLOTS, DEFAULT_RECIPES, NOT_USED, SLOT_GRADE, endingLabel, parseSlot } from './slots'
import { getStems, type StemSet } from './stems'
import type {
  DerivationStep,
  FormOverride,
  FormVariant,
  Grade,
  GradationInfo,
  Lexeme,
  NounForm,
  Piece,
  Register,
  SlotKey,
} from './types'

interface Built {
  form: Form
  register: Register
}

function pickStems(stems: StemSet, recipe: SlotRecipe, grade: Grade | null): Built[] {
  switch (recipe.stem) {
    case 'lemma':
      return [{ form: stems.lemma, register: 'standard' }]
    case 'consonant':
      if (!stems.consonant) {
        throw new Error(`${stems.lexeme.id}: type ${stems.def.id} has no consonant stem`)
      }
      return [{ form: stems.consonant, register: 'standard' }]
    case 'vowel':
      return [{ form: grade === 'weak' ? stems.vowelWeak : stems.vowelStrong, register: 'standard' }]
    case 'plural': {
      const list =
        recipe.pluralIndex !== undefined ? [stems.plurals[recipe.pluralIndex]] : stems.plurals
      return list.flatMap((p) => (p ? [{ form: grade === 'weak' ? p.weak : p.strong, register: p.register }] : []))
    }
  }
}

function realizeEnding(template: string, stems: StemSet, stemText: string): string {
  let ending = realize(template, stems.harmony.harmony)
  if (ending.includes('V')) {
    const v = lastVowel(stemText)
    if (!v) throw new Error(`No vowel to copy for ${template} after "${stemText}"`)
    ending = ending.replace('V', v)
  }
  return ending
}

/** Adds the slot-specific reason for the grade (or relabels the generic weak-grade step). */
function explainGrade(f: Form, stems: StemSet, slot: SlotKey, recipe: SlotRecipe, grade: Grade | null, ending: string): void {
  const g = stems.gradation
  if (!g) return
  const usesVowelStem = recipe.stem === 'vowel' || recipe.stem === 'plural'
  if (g.direction === 'normal') {
    if (recipe.stem === 'plural' && stems.def.pluralNoGradation) return
    if (usesVowelStem && grade === 'weak') {
      const step = [...f.steps].reverse().find((s) => s.ruleId === 'grade.weak')
      if (step) {
        step.ruleId =
          recipe.grade === 'weak' && SLOT_GRADE[slot] === 'strong' ? 'grade.weak.long-plural' : 'grade.weak.closed-syllable'
        step.params = { ...step.params, ending: `-${ending}`, slot }
      }
      return
    }
    const site = f.segs.find((s) => s.role === 'grade')
    if (!site) return
    if (usesVowelStem && grade === 'strong') {
      const ruleId = parseSlot(slot).kase === 'illative' ? 'grade.strong.illative' : 'grade.strong.open-syllable'
      f.step('gradation', ruleId, f.text, 'rule', { pattern: g.pattern, strong: site.text, ending: `-${ending}`, slot })
    } else if (slot === 'sg.nominative') {
      f.step('gradation', 'grade.strong.base', f.text, 'rule', { pattern: g.pattern, strong: site.text })
    }
    return
  }
  if (recipe.stem === 'lemma' || recipe.stem === 'consonant') {
    const site = f.segs.find((s) => s.role === 'grade')
    f.step('gradation', 'grade.inverse.weak-base', f.text, 'rule', { pattern: g.pattern, weak: site?.text ?? '', slot })
  }
}

function attachEnding(f: Form, stems: StemSet, slot: SlotKey, recipe: SlotRecipe, ending: string): void {
  const { number, kase } = parseSlot(slot)
  const before = f.text
  if (slot === 'sg.nominative') {
    f.step('ending', recipe.ruleId, before, 'rule', { ending: '', case: kase, number })
    return
  }
  if (slot === 'pl.comitative') {
    f.append(ending, 'ending', recipe.ruleId)
    f.step('ending', recipe.ruleId, before, 'rule', { ending: `-i${ending}-`, case: kase, number })
    return
  }
  f.append(ending, slot === 'pl.nominative' ? 'plural' : 'ending', recipe.ruleId)
  f.step('ending', recipe.ruleId, before, endingLabel(recipe.ruleId), { ending: `-${ending}`, case: kase, number })
  if (hasHarmonyVowel(recipe.ending)) {
    f.step('harmony', stems.harmony.ruleId, f.text, 'rule', {
      vowels: stems.harmony.vowels.join(', '),
      ending,
      part: stems.harmony.decidingPart,
      harmony: stems.harmony.harmony,
    })
  }
}

function buildVariants(stems: StemSet, slot: SlotKey, recipe: SlotRecipe, base: Built): Built[] {
  const grade = recipe.grade ?? SLOT_GRADE[slot]
  const f = base.form.clone()
  const ending = realizeEnding(recipe.ending, stems, f.text)
  explainGrade(f, stems, slot, recipe, grade, ending)
  attachEnding(f, stems, slot, recipe, ending)
  f.applyPluralGlide()
  if (slot !== 'pl.comitative') return [{ form: f, register: base.register }]
  // Comitative: nouns always carry a possessive suffix (taloineen ~ taloinensa);
  // adjectives and numerals agree without one (uusine taloineen).
  if (stems.lexeme.pos !== 'noun') {
    f.step('ending', 'ending.comitative.agreement', f.text, 'rule')
    return [{ form: f, register: base.register }]
  }
  return [
    { suffix: 'en', ruleId: 'px.3.comitative-vn' },
    { suffix: realize('nsA', stems.harmony.harmony), ruleId: 'px.3.comitative-nsa' },
  ].map(({ suffix, ruleId }, i) => {
    const v = f.clone()
    const before = v.text
    v.append(suffix, 'possessive', ruleId)
    v.step('possessive', ruleId, before, 'rule', { suffix: `-${suffix}` })
    return { form: v, register: i === 0 ? base.register : 'variant' }
  })
}

function headSteps(stems: StemSet): DerivationStep[] {
  const lex = stems.lexeme
  const def = stems.def
  const steps: DerivationStep[] = [
    { kind: 'lemma', ruleId: 'step.lemma', before: '', after: lex.lemma, label: 'rule' },
    {
      kind: 'type',
      ruleId: def.membershipRuleId,
      before: lex.lemma,
      after: lex.lemma,
      label: def.membership,
      params: {
        typeId: def.id,
        kotus: lex.kotus || `${def.kotus}`,
        model: def.modelWord,
        ...(def.iGroup ? { group: def.iGroup } : {}),
      },
    },
  ]
  if (lex.compound) {
    steps.push({
      kind: 'type',
      ruleId: 'compound.head',
      before: lex.lemma,
      after: lex.lemma,
      label: 'rule',
      params: { modifier: lex.compound.modifier, head: lex.lemma.slice(lex.compound.modifier.length) },
    })
  }
  if (lex.noGradationNote) {
    steps.push({ kind: 'gradation', ruleId: lex.noGradationNote, before: lex.lemma, after: lex.lemma, label: 'lexical' })
  }
  return steps
}

function toVariant(stems: StemSet, built: Built): FormVariant {
  const text = built.form.text
  return {
    text,
    pieces: built.form.pieces(),
    steps: [...headSteps(stems), ...built.form.steps],
    register: built.register,
  }
}

/** Rebuilds `reference` so that its text becomes `text`, marking the differing tail as an exception. */
function overrideVariant(stems: StemSet, text: string, ov: FormOverride, reference: FormVariant | undefined): FormVariant {
  const pieces: Piece[] = []
  let consumed = 0
  if (reference) {
    for (const p of reference.pieces) {
      const next = consumed + p.text.length
      if (text.slice(consumed, next) === p.text && next <= text.length) {
        pieces.push({ ...p })
        consumed = next
      } else {
        break
      }
    }
  }
  const rest = text.slice(consumed)
  if (rest) {
    const piece: Piece = { text: rest, role: 'exception', ruleId: ov.ruleId }
    if (reference) piece.was = reference.text.slice(consumed)
    pieces.push(piece)
  }
  const baseSteps = reference
    ? reference.steps.filter((s) => s.kind !== 'result')
    : headSteps(stems)
  const steps: DerivationStep[] = [
    ...baseSteps,
    { kind: 'override', ruleId: ov.ruleId, before: reference?.text ?? stems.lexeme.lemma, after: text, label: ov.label },
    { kind: 'result', ruleId: 'step.result', before: text, after: text, label: 'rule' },
  ]
  return { text, pieces, steps, register: ov.label === 'variant' ? 'variant' : 'standard' }
}

function finalize(lex: Lexeme, slot: SlotKey, variants: FormVariant[]): FormVariant[] {
  const pref = lex.preferred?.[slot]
  if (pref) {
    const rank = (v: FormVariant) => {
      const i = pref.indexOf(v.text)
      return i < 0 ? pref.length : i
    }
    variants = [...variants].sort((a, b) => rank(a) - rank(b))
  }
  const seen = new Set<string>()
  const unique = variants.filter((v) => (seen.has(v.text) ? false : (seen.add(v.text), true)))
  return unique.map((v, i) => {
    const register: Register =
      v.register === 'rare' || v.register === 'colloquial' ? v.register : i === 0 ? 'standard' : 'variant'
    const steps = v.steps.filter((s) => s.kind !== 'result')
    steps.push(
      i === 0
        ? { kind: 'result', ruleId: 'step.result', before: v.text, after: v.text, label: 'rule' }
        : {
            kind: 'result',
            ruleId: 'step.result.variant',
            before: v.text,
            after: v.text,
            label: 'variant',
            params: { primary: unique[0]?.text ?? '' },
          },
    )
    return { ...v, register, steps }
  })
}

function accusative(lex: Lexeme, slot: SlotKey): NounForm {
  const tag = (v: FormVariant, ruleId: string): FormVariant => ({
    ...v,
    steps: [
      ...v.steps.filter((s) => s.kind !== 'result'),
      { kind: 'ending', ruleId, before: v.text, after: v.text, label: 'pattern' },
      { kind: 'result', ruleId: 'step.result', before: v.text, after: v.text, label: 'rule' },
    ],
  })
  if (slot === 'sg.accusative') {
    const gen = inflect(lex, 'sg.genitive').variants
    const nom = inflect(lex, 'sg.nominative').variants
    return {
      lexemeId: lex.id,
      slot,
      status: 'ok',
      variants: [...gen.map((v) => tag(v, 'acc.sg.n')), ...nom.map((v) => tag({ ...v, register: 'standard' }, 'acc.sg.zero'))],
    }
  }
  const nom = inflect(lex, 'pl.nominative')
  return { ...nom, slot, variants: nom.variants.map((v) => tag(v, 'acc.pl.t')) }
}

const formCache = new WeakMap<Lexeme, Map<SlotKey, NounForm>>()

/**
 * Inflects a lexeme for one case/number slot. Returns every accepted
 * variant ([0] = primary), each with typed pieces and derivation steps.
 */
export function inflect(lex: Lexeme, slot: SlotKey): NounForm {
  let perLex = formCache.get(lex)
  if (!perLex) {
    perLex = new Map()
    formCache.set(lex, perLex)
  }
  const cached = perLex.get(slot)
  if (cached) return cached
  const result = computeForm(lex, slot)
  perLex.set(slot, result)
  return result
}

function computeForm(lex: Lexeme, slot: SlotKey): NounForm {
  const notUsed = NOT_USED[slot]
  if (notUsed) return { lexemeId: lex.id, slot, variants: [], status: 'not-used', statusRuleId: notUsed }
  if (parseSlot(slot).kase === 'accusative') return accusative(lex, slot)

  const stems = getStems(lex)
  const recipes = stems.def.slots[slot] ?? DEFAULT_RECIPES[slot]
  if (!recipes) throw new Error(`No recipe for ${slot} in type ${stems.def.id}`)

  const built: FormVariant[] = []
  recipes.forEach((recipe, i) => {
    const grade = recipe.grade ?? SLOT_GRADE[slot]
    for (const base of pickStems(stems, recipe, grade)) {
      for (const b of buildVariants(stems, slot, recipe, base)) {
        built.push(toVariant(stems, { form: b.form, register: recipe.register ?? (i === 0 ? b.register : 'variant') }))
      }
    }
    // Alternative stems (ruoka: ruoan ~ ruuan) add variants wherever the weak stem is used.
    if (grade === 'weak') {
      for (const alt of stems.alt) {
        const altForm = recipe.stem === 'vowel' ? alt.vowelWeak : recipe.stem === 'plural' ? alt.pluralWeak : undefined
        if (!altForm) continue
        for (const b of buildVariants(stems, slot, recipe, { form: altForm, register: alt.register })) {
          built.push(toVariant(stems, b))
        }
      }
    }
  })

  let variants = built
  for (const ov of lex.overrides?.filter((o) => o.slot === slot) ?? []) {
    const reference = variants[0]
    const overridden = ov.forms.map((text) => overrideVariant(stems, text, ov, reference))
    variants = ov.mode === 'replace' ? overridden : [...variants, ...overridden]
  }

  const final = finalize(lex, slot, variants)
  const plural = slot.startsWith('pl.')
  if (plural && (lex.numberUse === 'mass' || lex.numberUse === 'pl-rare')) {
    return {
      lexemeId: lex.id,
      slot,
      variants: final,
      status: 'rare',
      statusRuleId: lex.numberUse === 'mass' ? 'number.mass' : 'number.pl-rare',
    }
  }
  return { lexemeId: lex.id, slot, variants: final, status: 'ok' }
}

export type Paradigm = Record<SlotKey, NounForm>

/** All 30 slots (15 cases × singular/plural). */
export function paradigm(lex: Lexeme): Paradigm {
  return Object.fromEntries(ALL_SLOTS.map((s) => [s, inflect(lex, s)])) as Paradigm
}

/** Primary form of a slot, or undefined when the slot is not used. */
export function primary(lex: Lexeme, slot: SlotKey): string | undefined {
  return inflect(lex, slot).variants[0]?.text
}

/** All accepted forms of a slot (standard + variants). */
export function accepted(lex: Lexeme, slot: SlotKey): string[] {
  return inflect(lex, slot).variants.map((v) => v.text)
}

/** Answers "does consonant gradation apply, and how?" for a lexeme. */
export function gradationInfo(lex: Lexeme): GradationInfo | null {
  const stems = getStems(lex)
  const g = stems.gradation
  if (!g) return null
  const def = GRADATION_PATTERNS[g.pattern]
  const strongSlots: SlotKey[] = []
  const weakSlots: SlotKey[] = []
  for (const slot of ALL_SLOTS) {
    const form = inflect(lex, slot)
    const v = form.variants[0]
    if (!v || form.status === 'not-used') continue
    const site = v.pieces.find((p) => p.role === 'grade')
    if (!site?.grade) continue
    ;(site.grade === 'strong' ? strongSlots : weakSlots).push(slot)
  }
  const inverse = g.direction === 'inverse'
  return {
    pattern: g.pattern,
    direction: g.direction,
    strong: def.strong,
    weak: def.weak,
    kotusLetter: def.kotusLetter,
    strongStem: stems.vowelStrong.text,
    weakStem: inverse ? lex.lemma : stems.vowelWeak.text,
    strongSlots,
    weakSlots,
    intrinsic: g.intrinsic,
  }
}

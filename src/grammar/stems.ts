import { Form, type Seg } from './builder'
import { getType } from './declension/registry'
import type { DeclensionTypeDef, PluralRecipe } from './declension/schema'
import { decideHarmony, realize, type HarmonyDecision } from './harmony'
import { lastVowel } from './phonology'
import type { GradationId, Lexeme, Register, RuleId } from './types'

export interface GradationSpec {
  pattern: GradationId
  direction: 'normal' | 'inverse'
  /** Alternation built into the declension type (Kotus 27, 31, 40). */
  intrinsic: boolean
}

export interface PluralStems {
  strong: Form
  weak: Form
  register: Register
}

export interface AltStemForms {
  vowelWeak?: Form
  pluralWeak?: Form
  register: Register
  ruleId: RuleId
}

/** Every stem of a word, each as a typed `Form` that records how it was derived. */
export interface StemSet {
  lexeme: Lexeme
  def: DeclensionTypeDef
  harmony: HarmonyDecision
  gradation: GradationSpec | null
  /** Nominative singular (with the gradation site marked when it matches). */
  lemma: Form
  /** Vowel stem (vokaalivartalo) in the strong and weak grade. Identical when the word does not alternate. */
  vowelStrong: Form
  vowelWeak: Form
  /** Consonant stem (konsonanttivartalo), for types that have one. */
  consonant: Form | null
  /** Plural stems; usually one, two for types with two plural series (omena). */
  plurals: PluralStems[]
  alt: AltStemForms[]
}

export class LexiconError extends Error {}

export function resolveGradation(lex: Lexeme, def: DeclensionTypeDef): GradationSpec | null {
  if (def.gradation === 'intrinsic') {
    if (!def.intrinsicPattern) throw new LexiconError(`${def.id} is intrinsic but has no pattern`)
    return { pattern: def.intrinsicPattern, direction: 'normal', intrinsic: true }
  }
  if (!lex.gradation) return null
  if (def.gradation === 'none') {
    throw new LexiconError(`${lex.id}: type ${def.id} does not alternate, but the lexeme declares ${lex.gradation.pattern}`)
  }
  const inverse = lex.gradation.inverse === true
  if (inverse !== (def.gradation === 'inverse')) {
    throw new LexiconError(`${lex.id}: gradation direction does not match type ${def.id}`)
  }
  return { pattern: lex.gradation.pattern, direction: inverse ? 'inverse' : 'normal', intrinsic: false }
}

function applyVowelRecipe(form: Form, def: DeclensionTypeDef, harmony: HarmonyDecision): void {
  const before = form.text
  const recipe = def.vowel
  switch (recipe.kind) {
    case 'same':
      form.step('stem', 'stem.same', before, 'rule')
      return
    case 'replace': {
      const add = realize(recipe.add, harmony.harmony)
      form.replaceEnd(recipe.strip, add, 'stem', recipe.ruleId)
      form.step('stem', recipe.ruleId, before, recipe.label, { from: recipe.strip, to: add })
      return
    }
    case 'lengthen': {
      const stripped = before.slice(0, before.length - recipe.strip.length)
      const v = lastVowel(stripped)
      if (!v) throw new LexiconError(`No vowel to lengthen in "${before}"`)
      form.replaceEnd(recipe.strip, v, 'stem', recipe.ruleId)
      form.step('stem', recipe.ruleId, before, recipe.label, { from: recipe.strip, to: v })
      return
    }
  }
}

function buildConsonantStem(lemma: Form, def: DeclensionTypeDef): Form | null {
  const recipe = def.consonant
  if (!recipe) return null
  const form = lemma.clone()
  const before = form.text
  if (recipe.kind === 'lemma') {
    form.step('stem', 'stem.consonant.lemma', before, 'pattern')
  } else {
    form.replaceEnd(recipe.strip, recipe.add, 'stem', recipe.ruleId)
    form.step('stem', recipe.ruleId, before, recipe.label, { from: recipe.strip, to: recipe.add })
  }
  return form
}

function buildPlural(recipe: PluralRecipe, lemma: Form, vowelStrong: Form): Form {
  const fromLemma = recipe.kind === 'lemma' || recipe.kind === 'ks'
  const form = (fromLemma ? lemma : vowelStrong).clone()
  const before = form.text
  const last = before.slice(-1)
  const ruleId = `plural.${recipe.kind}`
  switch (recipe.kind) {
    case 'append':
      form.append('i', 'plural', 'plural.i')
      form.step('plural', ruleId, before, 'rule')
      return form
    case 'a-to-o': {
      const to = last === 'ä' ? 'ö' : 'o'
      form.replaceEnd(last, to, 'stem', ruleId)
      form.append('i', 'plural', 'plural.i')
      form.step('plural', ruleId, before, 'pattern', { from: last, to })
      return form
    }
    case 'drop-final':
      form.replaceEnd(last, '', 'stem', ruleId)
      form.append('i', 'plural', 'plural.i')
      form.step('plural', ruleId, before, 'pattern', { from: last })
      return form
    case 'i-to-e':
      form.replaceEnd('i', 'e', 'stem', ruleId)
      form.append('i', 'plural', 'plural.i')
      form.step('plural', ruleId, before, 'pattern')
      return form
    case 'shorten':
      form.replaceEnd(last, '', 'stem', ruleId)
      form.append('i', 'plural', 'plural.i')
      form.step('plural', ruleId, before, 'rule', { from: last + last })
      return form
    case 'diphthong': {
      const pair = before.slice(-2)
      form.replaceEnd(pair, pair.slice(1), 'stem', ruleId)
      form.append('i', 'plural', 'plural.i')
      form.step('plural', ruleId, before, 'rule', { from: pair, to: pair.slice(1) })
      return form
    }
    case 'lemma':
      form.replaceEnd('i', 'i', 'plural', 'plural.i')
      form.step('plural', ruleId, before, 'pattern')
      return form
    case 'ks':
      form.replaceEnd('s', 'ks', 'stem', ruleId)
      form.append('i', 'plural', 'plural.i')
      form.step('plural', ruleId, before, 'pattern')
      return form
  }
}

/** The regular form's segments from character `from` to the end, roles kept (a straddling segment is cut). */
function tailSegs(form: Form, from: number): Seg[] {
  const out: Seg[] = []
  let pos = 0
  for (const seg of form.segs) {
    const end = pos + seg.text.length
    if (pos >= from) out.push({ ...seg })
    else if (end > from) {
      const cut: Seg = { ...seg, text: seg.text.slice(from - pos) }
      delete cut.was
      out.push(cut)
    }
    pos = end
  }
  return out
}

/**
 * Builds a variant stem from literal text, segmented against the regular stem
 * it varies: only the letters that differ are the variant change; a shared
 * ending keeps its own roles (the i of ruui- stays the plural marker).
 */
function altForm(text: string, regular: Form, ruleId: RuleId): Form {
  let k = 0
  const reg = regular.text
  while (k < text.length && k < reg.length && text[k] === reg[k]) k++
  let s = 0
  while (s < text.length - k && s < reg.length - k && text[text.length - 1 - s] === reg[reg.length - 1 - s]) s++
  const form = new Form([
    { text: text.slice(0, k), role: 'root' },
    { text: text.slice(k, text.length - s), role: 'stem', was: reg.slice(k, reg.length - s), ruleId },
    ...(s > 0 ? tailSegs(regular, reg.length - s) : []),
  ])
  form.steps = regular.steps.map((s) => ({ ...s }))
  form.step('stem-change', ruleId, reg, 'variant')
  return form
}

/** Builds every stem of a lexeme from its declension type and gradation pattern. */
export function buildStems(lex: Lexeme): StemSet {
  const def = getType(lex.typeId)
  const modifier = lex.compound?.modifier ?? ''
  if (modifier && !lex.lemma.startsWith(modifier)) {
    throw new LexiconError(`${lex.id}: compound modifier "${modifier}" is not a prefix of "${lex.lemma}"`)
  }
  const head = lex.lemma.slice(modifier.length)
  const harmony = decideHarmony(lex.lemma, modifier ? head : undefined, lex.harmony)
  const gradation = resolveGradation(lex, def)

  const lemma = Form.of(lex.lemma)
  if (gradation?.direction === 'inverse') {
    if (!lemma.markGrade(gradation.pattern, 'weak')) {
      throw new LexiconError(`${lex.id}: weak-grade site of ${gradation.pattern} not found in "${lex.lemma}"`)
    }
  } else if (gradation && !gradation.intrinsic) {
    lemma.markGrade(gradation.pattern, 'strong') // the nominative of -si words (kansi) has no visible site
  }

  const vowelStrong = lemma.clone()
  if (gradation?.direction === 'inverse') {
    vowelStrong.grade(gradation.pattern, 'weak', 'strong', 'grade.inverse.strong-stem', 'rule')
  }
  applyVowelRecipe(vowelStrong, def, harmony)
  if (gradation?.direction === 'normal' && !vowelStrong.markGrade(gradation.pattern, 'strong')) {
    throw new LexiconError(`${lex.id}: strong-grade site of ${gradation.pattern} not found in "${vowelStrong.text}"`)
  }

  const weaken = (strong: Form): Form => {
    if (!gradation) return strong
    const weak = strong.clone()
    weak.grade(gradation.pattern, 'strong', 'weak', 'grade.weak', 'rule')
    if (lex.jGlide) weak.applyJGlide()
    weak.applyApostrophe()
    return weak
  }

  const vowelWeak = gradation?.direction === 'normal' ? weaken(vowelStrong) : vowelStrong

  const consonant = buildConsonantStem(lemma, def)

  const plurals: PluralStems[] = def.plural.map((recipe) => {
    const strong = buildPlural(recipe, lemma, vowelStrong)
    const weak = gradation?.direction === 'normal' && !def.pluralNoGradation ? weaken(strong) : strong
    return { strong, weak, register: recipe.register ?? 'standard' }
  })

  const alt: AltStemForms[] = (lex.altStems ?? []).map((a) => {
    const out: AltStemForms = { register: a.register, ruleId: a.ruleId }
    if (a.vowelWeak) out.vowelWeak = altForm(a.vowelWeak, vowelWeak, a.ruleId)
    const firstPlural = plurals[0]
    if (a.pluralWeak && firstPlural) out.pluralWeak = altForm(a.pluralWeak, firstPlural.weak, a.ruleId)
    return out
  })

  return { lexeme: lex, def, harmony, gradation, lemma, vowelStrong, vowelWeak, consonant, plurals, alt }
}

const cache = new WeakMap<Lexeme, StemSet>()

/** Memoised `buildStems` (lexeme objects are immutable data). */
export function getStems(lex: Lexeme): StemSet {
  let s = cache.get(lex)
  if (!s) {
    s = buildStems(lex)
    cache.set(lex, s)
  }
  return s
}

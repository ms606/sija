import { CASES_INFO } from '../../data/cases'
import { RULES } from '../../data/explanations/rules'
import {
  NO_GRADATION,
  ROUGH_MEANING,
  STEP_TEMPLATES,
  STEP_TITLES,
  TERMS,
  type TermId,
  type WalkStepKind,
} from '../../data/explanations/walkthrough'
import { SENTENCES } from '../../data/sentences'
import { gradationSite, parseSlot, parseTemplate, syllabify, syllableCount } from '../../grammar'
import type {
  CaseId,
  DerivationStep,
  FormVariant,
  Grade,
  GradationId,
  NounForm,
  NumberId,
  PersonId,
  PieceRole,
  Predictability,
  Register,
  RuleId,
  SlotKey,
} from '../../grammar/types'
import type { Noun } from '../../types/content'
import { PERSON_LABEL, familyName, patternLabel, slotLabel } from '../content/text'
import { grammar } from '../grammar'
import { englishNoun, firstSense } from './english'
import { fi, fill, plain } from './markup'

/**
 * Word-specific explanations of a noun form ("Explain this form").
 *
 * Everything here is read from the engine's own derivation of the form: its
 * steps (with their before/after text), its typed pieces and the word's stem
 * set. The explanation never builds a form itself. Each explanation also
 * checks itself against the engine (pieces spell the form, the named stem is
 * one of the word's stems, stem + ending reproduces the engine's result) and
 * reports what it could not explain in `issues`.
 */

export type StemKind = 'vowel' | 'consonant' | 'plural' | 'lemma'

/** complete: every step explained and verified; recorded: a memorized form, no derivation claimed. */
export type Coverage = 'complete' | 'partial' | 'recorded' | 'not-used'

export interface ExplainedStep {
  key: string
  kind: WalkStepKind
  title: string
  /** Word-specific text with Finnish marked up (see markup.ts). */
  text: string
  detail?: string
  /** Terms explained for the first time at this step. */
  terms: { id: TermId; term: string; fi: string; definition: string }[]
  label: Predictability
  ruleId: RuleId
  before: string
  after: string
  changed: boolean
}

export interface VisiblePiece {
  text: string
  role: PieceRole
  /** "partitive ending", "plural marker", "weak grade", "stem change", "unchanged". */
  label: string
  /** For screen readers and the piece detail: "p — weak grade (was pp)". */
  description: string
  grade?: Grade
  was?: string
  /** Removed material: rendered as a marker, never as letters. */
  ghost?: boolean
  ruleId?: RuleId
}

export interface ChainNode {
  text: string
  label: string
}

export interface FormulaPart {
  text: string
  role: 'stem' | 'ending' | 'plural' | 'possessive' | 'whole'
  label: string
}

export interface FormExplanation {
  key: string
  lexemeId: string
  lemma: string
  /** First English sense ("doctor"). */
  gloss: string
  glossFull: string
  pos: Noun['pos']
  slot: SlotKey
  caseId: CaseId
  number: NumberId
  person?: PersonId
  form: string
  /** "partitive plural" (+ possessive). */
  formLabel: string
  /** "monikon partitiivi". */
  formLabelFi: string
  register: Register
  status: NounForm['status']
  statusNote?: string
  /** Rough English equivalent, nouns only ("into a doctor, (to become) a doctor"). */
  rough?: string
  summary: string[]
  chain: ChainNode[]
  formula: { parts: FormulaPart[]; result: string; note?: string }
  pieces: VisiblePiece[]
  steps: ExplainedStep[]
  stemKind: StemKind
  /** The stem the ending is added to, without the hyphen. */
  stem: string
  /** The case ending (or plural -t) actually added, without hyphen; '' when none. */
  ending: string
  gradation: { applies: boolean; text: string; short: string }
  alternatives: { text: string; register: Register }[]
  /** Set when the form is memorized rather than built by the rules. */
  recorded?: { text: string; regular?: string }
  coverage: Coverage
  issues: string[]
}

const CHANGE_KINDS = new Set(['stem', 'gradation', 'plural', 'spelling', 'stem-change'])
const BASE_PX = new Set(['px.base.strong-grade', 'px.base.vowel-stem', 'px.drop-n', 'px.ksi-to-kse'])

const isTag = (s: DerivationStep) => s.ruleId.startsWith('acc.') || s.ruleId === 'ending.comitative.agreement'

function changeText(from: string | undefined, to: string | undefined): string {
  if (from === undefined) return ''
  if (to === '' || to === undefined) return `${fi(from)} disappears`
  return `${fi(from)} → ${fi(to)}`
}

export function stemKindOf(steps: readonly DerivationStep[]): StemKind {
  if (steps.some((s) => s.kind === 'plural')) return 'plural'
  if (steps.some((s) => s.kind === 'stem' && s.ruleId.startsWith('stem.consonant.'))) return 'consonant'
  if (steps.some((s) => s.kind === 'stem' || s.ruleId === 'grade.inverse.strong-stem' || s.ruleId.startsWith('px.base.'))) return 'vowel'
  return 'lemma'
}

function lastVowel(s: string): string {
  for (let i = s.length - 1; i >= 0; i--) if ('aeiouyäö'.includes(s[i] as string)) return s[i] as string
  return ''
}

function caseOf(slot: SlotKey): CaseId {
  return parseSlot(slot).kase
}

function stemLabel(kind: StemKind, stem: string, lemma: string): string {
  switch (kind) {
    case 'plural':
      return 'plural stem'
    case 'consonant':
      return 'consonant stem'
    case 'lemma':
      return 'base form'
    case 'vowel':
      return stem === lemma ? 'stem' : 'vowel stem'
  }
}

function stemPhrase(kind: StemKind, stem: string, lemma: string): string {
  switch (kind) {
    case 'plural':
      return `the plural stem ${fi(stem)}-`
    case 'consonant':
      return `the consonant stem ${fi(stem)}-`
    case 'lemma':
      return `the base form ${fi(stem)}`
    case 'vowel':
      return stem === lemma ? `the stem ${fi(stem)}- (the same as the base form)` : `the stem ${fi(stem)}-`
  }
}

function pieceInfo(text: string, role: PieceRole, grade: Grade | undefined, was: string | undefined, caseId: CaseId, slot: SlotKey): { label: string; description: string } {
  const caseName = CASES_INFO[caseId].en
  switch (role) {
    case 'root':
      return { label: 'unchanged', description: `${text} — unchanged, as in the base form` }
    case 'grade': {
      const g = grade ?? 'strong'
      return { label: `${g} grade`, description: was !== undefined && was !== text ? `${text}, was ${was} — ${g} grade` : `${text} — ${g} grade` }
    }
    case 'stem':
      return {
        label: 'stem change',
        description: text === '' ? `${was ?? ''} dropped — stem change` : `${text}, was ${was || 'nothing'} — stem change`,
      }
    case 'plural':
      if (text === 't' && (slot === 'pl.nominative' || slot === 'pl.accusative')) return { label: 'plural -t', description: 't — plural marker' }
      return { label: 'plural marker', description: was === 'i' ? `${text} — plural marker (i written j)` : `${text} — plural marker` }
    case 'ending':
      return { label: `${caseName} ending`, description: `${text} — ${caseName} ending` }
    case 'possessive':
      return { label: 'possessive suffix', description: `${text} — possessive suffix` }
    case 'exception':
      return {
        label: 'exception',
        description: was !== undefined ? `${text}, regular pattern ${was || 'nothing'} — exception: memorize` : `${text} — exception: memorize`,
      }
  }
}

interface Ctx {
  lex: Noun
  slot: SlotKey
  caseId: CaseId
  number: NumberId
  variant: FormVariant
  form: string
  sense: string
  primary: string
  stemKind: StemKind
  issues: string[]
}

/** Fills a template, records unfilled placeholders as issues. */
function fillTemplate(ctx: Ctx, ruleId: string, template: string, vars: Record<string, string | undefined>): string {
  const out = fill(template, vars)
  const left = /\{(\w+)\}/.exec(out)
  if (left) ctx.issues.push(`unfilled:${ruleId}:${left[1]}`)
  return out
}

/** Is the step's `before` text a stem (written with a hyphen) rather than a word form? */
function beforeIsStem(ctx: Ctx, s: DerivationStep): boolean {
  const endingIndex = ctx.variant.steps.findIndex((x) => x.kind === 'ending' && !isTag(x))
  switch (s.kind) {
    case 'stem':
      return s.before !== ctx.lex.lemma
    case 'gradation':
      return s.ruleId.startsWith('grade.weak')
    case 'plural':
      return s.ruleId !== 'plural.lemma' && s.ruleId !== 'plural.ks'
    case 'stem-change':
      return true
    case 'spelling':
      return endingIndex < 0 || ctx.variant.steps.indexOf(s) < endingIndex
    default:
      return false
  }
}

function baseVars(ctx: Ctx, s: DerivationStep): Record<string, string | undefined> {
  const p = s.params ?? {}
  const added = s.after.startsWith(s.before) ? s.after.slice(s.before.length) : (p.ending ?? '').replace(/-/g, '')
  return {
    lemma: fi(ctx.lex.lemma),
    gloss: ctx.sense,
    form: fi(ctx.form),
    before: `${fi(s.before)}${beforeIsStem(ctx, s) ? '-' : ''}`,
    after: fi(s.after),
    from: p.from !== undefined ? fi(p.from || '∅') : undefined,
    to: p.to !== undefined ? fi(p.to || '∅') : undefined,
    change: changeText(p.from, p.to),
    strong: p.strong !== undefined ? fi(p.strong) : undefined,
    weak: p.weak !== undefined ? fi(p.weak || '∅') : undefined,
    pattern: p.pattern ? fi(patternLabel(p.pattern as GradationId)) : undefined,
    stem: fi(s.before),
    ending: fi(s.kind === 'harmony' ? (p.ending ?? '') : added),
    raw: fi(s.after),
    mid: s.kind === 'plural' && s.after.endsWith('i') ? fi(s.after.slice(0, -1)) : undefined,
    v: fi(lastVowel(s.before)),
    stemEnd: fi(s.before.slice(-2)),
    syllables: fi(syllabify(ctx.form).join('·')),
    part: p.part !== undefined ? fi(p.part) : undefined,
    vowels: p.vowels !== undefined ? fi(p.vowels) : undefined,
    suffix: p.suffix !== undefined ? fi(p.suffix.replace(/^-/, '')) : undefined,
    modifier: p.modifier !== undefined ? fi(p.modifier) : undefined,
    head: p.head !== undefined ? fi(p.head) : undefined,
    primary: fi(ctx.primary),
  }
}

function termsOf(ids: readonly TermId[] | undefined, seen: Set<TermId>): ExplainedStep['terms'] {
  const out: ExplainedStep['terms'] = []
  for (const id of ids ?? []) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, ...TERMS[id] })
  }
  return out
}

/** The consonant-gradation statement for a form, from the word's own data. */
function gradationStatement(ctx: Ctx): { applies: boolean; text: string; short: string; ruleId: RuleId } {
  const steps = ctx.variant.steps
  const lex = ctx.lex
  const grade = steps.filter((s) => s.kind === 'gradation' && s.ruleId.startsWith('grade.'))
  if (grade.length > 0) {
    const s = grade[grade.length - 1] as DerivationStep
    const tpl = STEP_TEMPLATES[s.ruleId]
    const short = tpl?.short ? fill(tpl.short, baseVars(ctx, s)) : 'consonant gradation'
    return { applies: true, text: short, short, ruleId: s.ruleId }
  }
  const pxStrong = steps.find((s) => s.ruleId === 'px.base.strong-grade')
  const info0 = grammar.gradation(lex)
  if (pxStrong && info0) {
    const short = `the strong grade ${fi(info0.strong)} stays before the suffix`
    return {
      applies: true,
      text: `${fi(lex.lemma)} has consonant gradation (${fi(patternLabel(info0.pattern))}). Before a possessive suffix the stem keeps the strong grade ${fi(info0.strong)}: ${fi(pxStrong.after)}-.`,
      short,
      ruleId: 'px.base.strong-grade',
    }
  }
  const lexical = steps.find((s) => s.kind === 'gradation')
  if (lexical) {
    const tpl = STEP_TEMPLATES[lexical.ruleId]
    return { applies: false, text: tpl ? fill(tpl.text, baseVars(ctx, lexical)) : '', short: 'no consonant gradation', ruleId: lexical.ruleId }
  }
  const stems = grammar.stems(lex)
  const vowelStem = stems.vowelStrong.text
  const syllables = fi(`${syllabify(vowelStem).join('·')}${vowelStem === lex.lemma ? '' : '-'}`)
  const info = grammar.gradation(lex)
  if (info) {
    const where =
      ctx.stemKind === 'lemma'
        ? `the base form ${fi(lex.lemma)}`
        : ctx.stemKind === 'consonant'
          ? `the consonant stem ${fi(stemOfForm(ctx))}-`
          : `the plural stem ${fi(stemOfForm(ctx))}-`
    const text = fillTemplate(ctx, 'nograd.stem-not-graded', NO_GRADATION['stem-not-graded'] as string, {
      lemma: fi(lex.lemma),
      pattern: fi(patternLabel(info.pattern)),
      stems: `${fi(info.strongStem)}- / ${fi(info.weakStem)}-`,
      where,
    })
    return { applies: false, text, short: 'no consonant change in this form', ruleId: 'nograd.stem-not-graded' }
  }
  const head = lex.compound ? grammar.get(lex.compound.headId) : undefined
  const kotus = lex.kotus || head?.kotus || String(grammar.type(lex).kotus)
  if (syllableCount(vowelStem) <= 1) {
    return { applies: false, text: fill(NO_GRADATION.monosyllable as string, { lemma: fi(lex.lemma) }), short: 'no consonant gradation', ruleId: 'nograd.monosyllable' }
  }
  const site = gradationSite(vowelStem)
  if (!site || site.cluster === '') {
    return { applies: false, text: fill(NO_GRADATION['no-site'] as string, { syllables }), short: 'no consonant gradation', ruleId: 'nograd.no-site' }
  }
  const cluster = fi(site.cluster)
  if (!/[kpt]/.test(site.cluster)) {
    let text = fill(NO_GRADATION['no-kpt'] as string, { cluster, syllables })
    const earlier = [...new Set(vowelStem.slice(0, site.start).match(/kk|pp|tt|[kpt]/g) ?? [])]
    if (earlier.length > 0) {
      const key = earlier.length > 1 ? 'no-kpt.elsewhere.many' : 'no-kpt.elsewhere'
      const kpt = earlier.length > 1 ? `${earlier.slice(0, -1).map((x) => fi(x)).join(', ')} and ${fi(earlier[earlier.length - 1] as string)}` : fi(earlier[0] as string)
      text += ` ${fill(NO_GRADATION[key] as string, { kpt, lemma: fi(lex.lemma) })}`
    }
    return { applies: false, text, short: 'no consonant gradation', ruleId: 'nograd.no-kpt' }
  }
  if (/(sk|st|tk|sp)$/.test(site.cluster)) {
    return {
      applies: false,
      text: fill(NO_GRADATION['never-cluster'] as string, { lemma: fi(lex.lemma), cluster, syllables }),
      short: 'no consonant gradation',
      ruleId: 'nograd.never-cluster',
    }
  }
  return {
    applies: false,
    text: fill(NO_GRADATION.kotus as string, { lemma: fi(lex.lemma), cluster, syllables, kotus }),
    short: 'no consonant gradation',
    ruleId: 'nograd.kotus',
  }
}

/** Replays the letters a spelling step changed (i → j at one position) on another string. */
function respell(text: string, spelling: readonly DerivationStep[]): string {
  let out = text
  for (const s of spelling) {
    if (s.before.length !== s.after.length) continue
    for (let i = 0; i < s.before.length; i++) {
      if (s.before[i] !== s.after[i] && out[i] === s.before[i]) out = out.slice(0, i) + (s.after[i] as string) + out.slice(i + 1)
    }
  }
  return out
}

function stemOfForm(ctx: Ctx): string {
  const e = [...ctx.variant.steps].reverse().find((s) => s.kind === 'ending' && !isTag(s))
  if (e) return e.before
  const base = [...ctx.variant.steps].reverse().find((s) => BASE_PX.has(s.ruleId))
  return base?.after ?? ctx.lex.lemma
}

function expectedStems(lex: Noun, kind: StemKind): string[] {
  const st = grammar.stems(lex)
  switch (kind) {
    case 'vowel':
      return [st.vowelStrong.text, st.vowelWeak.text, ...st.alt.flatMap((a) => (a.vowelWeak ? [a.vowelWeak] : []))]
    case 'consonant':
      return st.consonant ? [st.consonant.text] : []
    case 'plural':
      return [...st.plural.flatMap((p) => [p.strong, p.weak]), ...st.alt.flatMap((a) => (a.pluralWeak ? [a.pluralWeak] : []))]
    case 'lemma':
      return [lex.lemma]
  }
}

function formLabels(slot: SlotKey, person: PersonId | undefined): { en: string; fi: string } {
  const en = slotLabel(slot, 'beginner')
  const fiLabel = slotLabel(slot, 'intermediate')
  if (!person) return { en, fi: fiLabel }
  return { en: `${en} + possessive suffix "${PERSON_LABEL[person].en}"`, fi: `${fiLabel} + omistusliite` }
}

function roughMeaning(lex: Noun, caseId: CaseId, number: NumberId, person: PersonId | undefined): string | undefined {
  if (lex.pos !== 'noun' || person) return undefined
  const tpl = ROUGH_MEANING[caseId]?.[number]
  if (!tpl) return undefined
  if (number === 'pl' && lex.numberUse === 'mass') return undefined
  const e = englishNoun(lex.gloss.en, number, { mass: lex.numberUse === 'mass' })
  const sg = englishNoun(lex.gloss.en, 'sg', { mass: lex.numberUse === 'mass' })
  if (number === 'pl' && !e.countable) return undefined
  return fill(tpl, { a: e.a, the: e.the, pl: e.pl, thepl: `the ${e.pl}`, g: number === 'pl' ? e.pl : sg.g })
}

function visiblePieces(variant: FormVariant, caseId: CaseId, slot: SlotKey, irregular: boolean): VisiblePiece[] {
  if (irregular) {
    return [{ text: variant.text, role: 'exception', label: 'memorized', description: `${variant.text} — memorized as a whole word` }]
  }
  return variant.pieces.map((p) => {
    const ghost = p.text === ''
    const info = pieceInfo(p.text, p.role, p.grade, p.was, caseId, slot)
    const out: VisiblePiece = { text: p.text, role: p.role, ...info }
    if (p.grade) out.grade = p.grade
    if (p.was !== undefined) out.was = p.was
    if (ghost) out.ghost = true
    if (p.ruleId) out.ruleId = p.ruleId
    return out
  })
}

function chainOf(ctx: Ctx, formLabel: string): ChainNode[] {
  const nodes: ChainNode[] = [{ text: ctx.lex.lemma, label: 'base word' }]
  const steps = ctx.variant.steps
  const endingIndex = steps.findIndex((s) => s.kind === 'ending' && !isTag(s))
  steps.forEach((s, i) => {
    const changed = s.after !== s.before
    let label: string | null = null
    if (s.kind === 'stem') {
      // An unchanged singular stem is worth showing only when the ending is added to it directly.
      if (!changed && ctx.stemKind === 'plural') return
      label = s.ruleId.startsWith('stem.consonant.') ? 'consonant stem' : changed ? 'vowel stem' : 'stem (same as the base form)'
    }
    else if (s.kind === 'gradation' && s.ruleId.startsWith('grade.') && changed) label = s.ruleId.includes('weak') ? 'weak grade' : 'strong grade'
    else if (s.kind === 'plural') label = 'plural stem'
    else if (s.kind === 'stem-change') label = 'variant stem'
    else if (s.kind === 'spelling' && (endingIndex < 0 || i < endingIndex)) label = 'spelling'
    else if (BASE_PX.has(s.ruleId) && changed) label = 'stem before the suffix'
    if (!label) return
    nodes.push({ text: `${s.after}-`, label })
  })
  nodes.push({ text: ctx.form, label: formLabel })
  // Drop repeats (a strong grade that did not change the stem), but keep an explicit stem node after the base word.
  return nodes.filter((n, i) => i === 0 || i === nodes.length - 1 || n.text !== (nodes[i - 1] as ChainNode).text)
}

/** Explains one variant of one form. */
function explainVariant(lex: Noun, form: NounForm, variant: FormVariant, person: PersonId | undefined): FormExplanation {
  const slot = form.slot
  const { number, kase: caseId } = parseSlot(slot)
  const issues: string[] = []
  const stemKind = stemKindOf(variant.steps)
  const ctx: Ctx = {
    lex,
    slot,
    caseId,
    number,
    variant,
    form: variant.text,
    sense: firstSense(lex.gloss.en),
    primary: form.variants[0]?.text ?? variant.text,
    stemKind,
    issues,
  }
  const labels = formLabels(slot, person)
  const override = variant.steps.find((s) => s.kind === 'override')
  const irregular = override?.label === 'irregular'
  const seen = new Set<TermId>()
  const steps: ExplainedStep[] = []
  const def = grammar.type(lex)
  const gradation = gradationStatement(ctx)
  const graded = variant.steps.some((s) => s.kind === 'gradation')

  const push = (s: DerivationStep, kind: WalkStepKind, title: string, ruleId: RuleId, extraVars: Record<string, string | undefined> = {}) => {
    const tpl = STEP_TEMPLATES[ruleId]
    if (!tpl) {
      issues.push(`missing-template:${ruleId}`)
      return
    }
    const text = fillTemplate(ctx, ruleId, tpl.text, { ...baseVars(ctx, s), ...extraVars })
    const step: ExplainedStep = {
      key: `${steps.length}:${ruleId}`,
      kind,
      title,
      text,
      terms: termsOf(tpl.terms, seen),
      label: s.label,
      ruleId,
      before: s.before,
      after: s.after,
      changed: s.before !== s.after,
    }
    if (tpl.detail) step.detail = tpl.detail
    steps.push(step)
  }

  const pushNoGradation = () => {
    steps.push({
      key: `${steps.length}:${gradation.ruleId}`,
      kind: 'gradation',
      title: STEP_TITLES.gradation as string,
      text: gradation.text,
      terms: termsOf(['gradation'], seen),
      label: 'rule',
      ruleId: gradation.ruleId,
      before: '',
      after: '',
      changed: false,
    })
  }
  let noGradationPlaced = graded

  // A memorized whole-word form gets no regular derivation: only the word, its type and the recorded form.
  const walk = irregular ? variant.steps.filter((s) => s.kind === 'lemma' || s.kind === 'type' || s.kind === 'override') : variant.steps
  if (irregular) noGradationPlaced = true
  for (const s of walk) {
    if (!noGradationPlaced && ['plural', 'ending', 'possessive', 'override', 'harmony'].includes(s.kind)) {
      pushNoGradation()
      noGradationPlaced = true
    }
    switch (s.kind) {
      case 'lemma':
        push(s, 'lemma', STEP_TITLES.lemma as string, 'step.lemma')
        break
      case 'type': {
        if (s.ruleId === 'compound.head') {
          push(s, 'type', 'Compound word', 'compound.head')
          break
        }
        const kotus = String(def.kotus)
        const model = def.modelWord
        // The type is named by its own Kotus model word; the -i learning family is named separately.
        const group = def.iGroup
          ? `. For learning, the app teaches this type in the ${familyName(def.iGroup)}, a teaching group of -i types that share one stem pattern`
          : ''
        let text =
          model === lex.lemma
            ? `${fi(lex.lemma)} is the model word of its type (Kotus type ${kotus})${group}.`
            : `${fi(lex.lemma)} inflects like ${fi(model)} (Kotus type ${kotus})${group}.`
        if (def.iGroup && def.membership === 'lexical') {
          text += ' Words ending in -i belong to four families that you cannot tell apart from the spelling, so learn the type with the word.'
        } else if (def.membership === 'lexical') {
          text += ' Which type a word belongs to is a property of the word: learn it with the word.'
        } else if (def.membership === 'irregular') {
          text += ' This word is irregular: memorize its forms.'
        }
        steps.push({
          key: `${steps.length}:${s.ruleId}`,
          kind: 'type',
          title: STEP_TITLES.type as string,
          text,
          terms: [],
          label: s.label,
          ruleId: s.ruleId,
          before: s.before,
          after: s.after,
          changed: false,
        })
        break
      }
      case 'stem':
        push(s, 'stem', (s.ruleId.startsWith('stem.consonant.') ? STEP_TITLES['stem.consonant'] : STEP_TITLES['stem.vowel']) as string, s.ruleId)
        break
      case 'gradation':
        push(s, 'gradation', STEP_TITLES.gradation as string, s.ruleId)
        break
      case 'stem-change':
        push(s, 'variant-stem', STEP_TITLES['variant-stem'] as string, s.ruleId)
        break
      case 'plural':
        push(s, 'plural', STEP_TITLES.plural as string, s.ruleId)
        break
      case 'ending': {
        if (s.ruleId.startsWith('acc.')) push(s, 'ending', 'Accusative', s.ruleId)
        else if (s.ruleId === 'ending.comitative.agreement') push(s, 'ending', 'Agreement', s.ruleId)
        else if (s.ruleId === 'plural.t') push(s, 'ending', STEP_TITLES['plural.t'] as string, s.ruleId)
        else if (s.ruleId === 'ending.nominative') push(s, 'ending', STEP_TITLES['ending.none'] as string, s.ruleId)
        else push(s, 'ending', `Add the ${CASES_INFO[caseOf(slot)].en} ending`, s.ruleId)
        break
      }
      case 'harmony':
        push(s, 'harmony', STEP_TITLES.harmony as string, s.ruleId)
        break
      case 'spelling':
        push(s, 'spelling', STEP_TITLES.spelling as string, s.ruleId)
        break
      case 'possessive': {
        const base = BASE_PX.has(s.ruleId)
        const ending = s.params?.ending
        const dropped =
          s.ruleId.startsWith('px.base.') && ending
            ? `The ${ending === '-t' ? 'plural -t' : `${CASES_INFO[caseOf(slot)].en} ending -n`} is not used before a possessive suffix. `
            : ''
        push(s, 'possessive', (base ? STEP_TITLES['possessive.base'] : STEP_TITLES.possessive) as string, s.ruleId, { dropped })
        break
      }
      case 'override':
        push(s, 'override', STEP_TITLES.override as string, s.ruleId)
        break
      case 'result':
        break
    }
  }
  if (!noGradationPlaced) pushNoGradation()

  /* ---------- formula: stem + ending (+ suffix) ---------- */
  const endingStep = [...variant.steps].reverse().find((s) => s.kind === 'ending' && !isTag(s))
  const suffixStep = [...variant.steps].reverse().find((s) => s.kind === 'possessive' && !BASE_PX.has(s.ruleId))
  const pxMods = variant.steps.filter((s) => s.ruleId === 'px.drop-n' || s.ruleId === 'px.ksi-to-kse')
  const baseStep = [...variant.steps].reverse().find((s) => s.ruleId.startsWith('px.base.'))
  const stem = endingStep ? endingStep.before : (baseStep?.after ?? lex.lemma)
  const ending = endingStep ? (endingStep.after.startsWith(endingStep.before) ? endingStep.after.slice(endingStep.before.length) : '') : ''
  if (endingStep && !endingStep.after.startsWith(endingStep.before)) issues.push('formula:ending-not-appended')
  const parts: FormulaPart[] = []
  const notes: string[] = []
  if (irregular) {
    parts.push({ text: variant.text, role: 'whole', label: 'memorized form' })
  } else if (!endingStep && !baseStep) {
    issues.push('formula:no-ending-step')
  } else {
    parts.push({ text: endingStep?.ruleId === 'ending.nominative' && !suffixStep ? stem : `${stem}-`, role: 'stem', label: stemLabel(stemKind, stem, lex.lemma) })
    let shownEnding = ending
    for (const m of pxMods) {
      if (m.after.length < m.before.length || m.ruleId === 'px.ksi-to-kse') {
        // The ending loses its -n or -ksi becomes -kse- before the suffix.
        shownEnding = m.after.slice(stem.length)
        notes.push(m.ruleId === 'px.drop-n' ? `-${ending} loses its -n before the suffix` : '-ksi becomes -kse- before the suffix')
      }
    }
    if (override && endingStep && override.after.startsWith(stem)) {
      // A recorded ending (merta): the stem is regular, the ending is memorized.
      parts.push({ text: `-${override.after.slice(stem.length)}`, role: 'ending', label: `${CASES_INFO[caseId].en} ending (exception)` })
    } else if (ending) {
      parts.push(
        endingStep?.ruleId === 'plural.t'
          ? { text: '-t', role: 'plural', label: 'plural marker' }
          : { text: `-${shownEnding}`, role: 'ending', label: `${CASES_INFO[caseId].en} ending` },
      )
    }
    if (suffixStep) {
      const sfx = suffixStep.after.slice(suffixStep.before.length)
      parts.push({ text: `-${sfx}`, role: 'possessive', label: 'possessive suffix' })
    }
  }
  const built = parts.filter((p) => p.role !== 'whole').map((p) => p.text.replace(/^-|-$/g, '')).join('')
  const spellingAfter = endingStep ? variant.steps.slice(variant.steps.indexOf(endingStep) + 1).filter((s) => s.kind === 'spelling') : []
  // The engine's text right after the last building step; spelling changes it recorded are replayed letter by letter.
  const lastBuild = [...variant.steps].reverse().find((s) => (s.kind === 'ending' && !isTag(s)) || s.kind === 'possessive' || s.kind === 'override')
  if (!irregular && lastBuild && built !== lastBuild.after && respell(built, spellingAfter) !== lastBuild.after) {
    issues.push(`formula:${built}≠${lastBuild.after}`)
  }
  if (!irregular) for (const s of spellingAfter) notes.unshift(plain(STEP_TEMPLATES[s.ruleId]?.short ?? s.ruleId))
  if (override && !irregular) notes.push(`the regular pattern would give *${override.before}`)
  const note = notes.length > 0 ? notes.join('; ') : undefined

  /* ---------- checks against the engine ---------- */
  const pieces = visiblePieces(variant, caseId, slot, irregular)
  const spelled = pieces.filter((p) => !p.ghost).map((p) => p.text).join('')
  if (spelled !== variant.text) issues.push(`pieces:${spelled}≠${variant.text}`)
  if (!irregular && endingStep && !override) {
    const expected = expectedStems(lex, stemKind)
    if (!expected.includes(stem)) issues.push(`stem:${stem} is not a ${stemKind} stem of ${lex.lemma} (${expected.join(', ')})`)
  }
  const lastStep = [...variant.steps].reverse().find((s) => s.kind !== 'result')
  if (lastStep && lastStep.after !== variant.text) issues.push(`derivation:${lastStep.after}≠${variant.text}`)

  /* ---------- result step ---------- */
  const formulaText = parts.map((p) => fi(p.text)).join(' + ')
  const resultText = irregular
    ? `${fi(variant.text)} is learned as a whole word.`
    : override
      ? `The real form is ${fi(variant.text)}. (The regular pattern would give *${fi(override.before)}.)`
      : built === variant.text
        ? `${formulaText} = ${fi(variant.text)} ✓`
        : `${formulaText} → ${fi(built)}, written ${fi(variant.text)} ✓`
  steps.push({
    key: `${steps.length}:step.result`,
    kind: 'result',
    title: STEP_TITLES.result as string,
    text: resultText,
    terms: [],
    label: 'rule',
    ruleId: 'step.result',
    before: variant.text,
    after: variant.text,
    changed: false,
  })

  /* ---------- summary ---------- */
  const summary: string[] = []
  const of = person ? ` with the possessive suffix "${PERSON_LABEL[person].en}"` : ''
  summary.push(`${fi(variant.text)} is the ${slotLabel(slot, 'beginner')} of ${fi(lex.lemma)} "${ctx.sense}"${of}.`)
  if (irregular) {
    summary.push(`It is a special form that is learned as a whole word; the regular rules do not build it. The regular ${slotLabel(slot, 'beginner')} is ${fi(ctx.primary)}.`)
  } else if (override && override.after.startsWith(stem)) {
    summary.push(
      `It is built on ${stemPhrase(stemKind, stem, lex.lemma)}, but its ending is an exception: ${fi(`-${override.after.slice(stem.length)}`)} instead of the regular ${fi(`-${ending}`)}. Memorize it.`,
    )
  } else if (endingStep?.ruleId === 'ending.nominative' && !suffixStep) {
    summary.push(
      caseId === 'accusative'
        ? 'It has no ending: in this use, the accusative looks exactly like the base form.'
        : 'It is the base form itself: the nominative singular has no ending.',
    )
  } else {
    const pieces2: string[] = [stemPhrase(stemKind, stem, lex.lemma)]
    if (ending) pieces2.push(endingStep?.ruleId === 'plural.t' ? `the plural marker ${fi('-t')}` : `the ${CASES_INFO[caseId].en} ending ${fi(`-${ending}`)}`)
    if (suffixStep) pieces2.push(`the possessive suffix ${fi(`-${suffixStep.after.slice(suffixStep.before.length)}`)}`)
    summary.push(`It is built from ${pieces2.join(' + ')}.`)
  }
  const changes = (irregular ? [] : variant.steps)
    .filter((s) => (CHANGE_KINDS.has(s.kind) || BASE_PX.has(s.ruleId)) && (s.after !== s.before || s.ruleId.startsWith('grade.strong')))
    .map((s) => {
      const tpl = STEP_TEMPLATES[s.ruleId]
      return tpl?.short ? fill(tpl.short, baseVars(ctx, s)) : null
    })
    .filter((x): x is string => !!x)
  if (changes.length > 0) summary.push(`${capitalize(changes.join('; '))}.`)
  if (!irregular && !gradation.applies) summary.push(`${capitalize(gradation.short)}.`)

  const alternatives = form.variants.filter((v) => v.text !== variant.text).map((v) => ({ text: v.text, register: v.register }))
  const out: FormExplanation = {
    key: `${lex.id}:${slot}:${person ?? ''}:${variant.text}`,
    lexemeId: lex.id,
    lemma: lex.lemma,
    gloss: ctx.sense,
    glossFull: lex.gloss.en,
    pos: lex.pos,
    slot,
    caseId,
    number,
    form: variant.text,
    formLabel: labels.en,
    formLabelFi: labels.fi,
    register: variant.register,
    status: form.status,
    summary,
    chain: irregular
      ? [
          { text: lex.lemma, label: 'base word' },
          { text: variant.text, label: 'learned as a word' },
        ]
      : chainOf(ctx, labels.en),
    formula: { parts, result: variant.text, ...(note ? { note } : {}) },
    pieces,
    steps,
    stemKind,
    stem,
    ending: endingStep?.ruleId === 'ending.nominative' ? '' : ending,
    gradation: irregular ? { applies: false, text: '', short: '' } : { applies: gradation.applies, text: gradation.text, short: gradation.short },
    alternatives,
    coverage: override ? 'recorded' : issues.length > 0 ? 'partial' : 'complete',
    issues,
  }
  if (person) out.person = person
  const rough = override ? undefined : roughMeaning(lex, caseId, number, person)
  if (rough) out.rough = rough
  if (form.statusRuleId && RULES[form.statusRuleId]) out.statusNote = RULES[form.statusRuleId]!.beginner.en
  if (override) out.recorded = irregular ? { text: STEP_TEMPLATES[override.ruleId] ? fill(STEP_TEMPLATES[override.ruleId]!.text, baseVars(ctx, override)) : '', regular: ctx.primary } : { text: '', regular: override.before }
  return out
}

/** A lexicalised form shown in a sentence (kotona) that the rules do not build. */
function explainRecorded(lex: Noun, slot: SlotKey, text: string, form: NounForm): FormExplanation {
  const { number, kase: caseId } = parseSlot(slot)
  const labels = formLabels(slot, undefined)
  const notes = (lex.notes ?? []).map((n) => RULES[n]?.beginner.en).filter((x): x is string => !!x)
  const sense = firstSense(lex.gloss.en)
  const summary = [
    `${fi(text)} is a special form of ${fi(lex.lemma)} "${sense}" that you learn as a word. It is not built by the regular rules, so there is no step-by-step derivation to show.`,
    ...notes,
  ]
  return {
    key: `${lex.id}:${slot}::${text}`,
    lexemeId: lex.id,
    lemma: lex.lemma,
    gloss: sense,
    glossFull: lex.gloss.en,
    pos: lex.pos,
    slot,
    caseId,
    number,
    form: text,
    formLabel: labels.en,
    formLabelFi: labels.fi,
    register: 'standard',
    status: form.status,
    summary,
    chain: [
      { text: lex.lemma, label: 'base word' },
      { text, label: 'learned as a word' },
    ],
    formula: { parts: [{ text, role: 'whole', label: 'memorized form' }], result: text },
    pieces: [{ text, role: 'exception', label: 'memorized', description: `${text} — memorized as a whole word` }],
    steps: [],
    stemKind: 'lemma',
    stem: lex.lemma,
    ending: '',
    gradation: { applies: false, text: '', short: '' },
    alternatives: form.variants.map((v) => ({ text: v.text, register: v.register })),
    recorded: { text: notes.join(' ') },
    coverage: 'recorded',
    issues: [],
  }
}

function capitalize(s: string): string {
  // Leave a leading Finnish word (marked up) as it is: Finnish forms are written in lower case.
  if (s.startsWith('⟦')) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

let literals: Map<string, Set<string>> | null = null

/**
 * Lexicalised forms that sentences record for a word and slot ({=kotona|koti:ess}).
 * Only these count as recorded forms: any other text that is not one of the
 * engine's forms is an error, never a "memorized" form.
 */
function recordedLiterals(): Map<string, Set<string>> {
  if (literals) return literals
  literals = new Map()
  for (const s of SENTENCES) {
    for (const part of parseTemplate(s.fi)) {
      if (part.kind !== 'token' || part.token.literal === undefined) continue
      const lex = grammar.resolve(part.token.refs[0] ?? '')
      if (!lex) continue
      const key = `${lex.id}:${part.token.slot}`
      const set = literals.get(key) ?? new Set<string>()
      set.add(part.token.literal.toLocaleLowerCase('fi-FI'))
      literals.set(key, set)
    }
  }
  return literals
}

export interface ExplainOptions {
  person?: PersonId
  /** Explain this accepted variant (or a lexicalised sentence form) instead of the primary one. */
  variantText?: string
}

/**
 * Explains one form of one word. Returns null for slots that are not used,
 * and for a `variantText` that is neither one of the engine's forms nor a
 * lexicalised form recorded in the sentence data (kotona): a label such as
 * "essive singular" or a word part is never explained as a word.
 */
export function explainForm(lexemeId: string, slot: SlotKey, opts: ExplainOptions = {}): FormExplanation | null {
  const key = `${lexemeId}:${slot}:${opts.person ?? ''}:${opts.variantText ?? ''}`
  if (cache.has(key)) return cache.get(key) ?? null
  const result = computeExplanation(lexemeId, slot, opts)
  cache.set(key, result)
  return result
}

/** Explanations are pure functions of the static lexicon, so they are cached. */
const cache = new Map<string, FormExplanation | null>()

function computeExplanation(lexemeId: string, slot: SlotKey, opts: ExplainOptions): FormExplanation | null {
  const lex = grammar.get(lexemeId)
  if (!lex) return null
  const form = opts.person ? grammar.withPossessive(lex, slot, opts.person) : grammar.inflect(lex, slot)
  if (form.status === 'not-used') return null
  const wanted = opts.variantText?.toLocaleLowerCase('fi-FI')
  if (wanted) {
    const v = form.variants.find((x) => x.text === wanted)
    if (v) return explainVariant(lex, form, v, opts.person)
    if (!opts.person && recordedLiterals().get(`${lex.id}:${slot}`)?.has(wanted)) return explainRecorded(lex, slot, wanted, form)
    return null
  }
  const v = form.variants[0]
  return v ? explainVariant(lex, form, v, opts.person) : null
}

/** Every variant of a form (for audits). */
export function explainAllVariants(lexemeId: string, slot: SlotKey, person?: PersonId): FormExplanation[] {
  const lex = grammar.get(lexemeId)
  if (!lex) return []
  const form = person ? grammar.withPossessive(lex, slot, person) : grammar.inflect(lex, slot)
  if (form.status === 'not-used') return []
  return form.variants.map((v) => explainVariant(lex, form, v, person))
}

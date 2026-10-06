/**
 * Public API of the Finnish noun grammar engine.
 *
 * `createGrammar(lexicon)` binds the engine to a lexicon and answers the
 * questions the app asks:
 *   1  What noun type is this?                  classify()
 *   2  What is its stem?                        stems()
 *   3–5 Does gradation apply? strong? weak?     gradation()
 *   6–11 Singular/plural forms of every case    inflect() / paradigm()
 *   12 What transformations occurred?           FormVariant.steps
 *   13–14 Which parts are rules / lexical?       predictability()
 * plus possessives, phrase agreement, reverse analysis, error diagnosis and
 * sentence templates.
 */
import { Analyzer, type AnalysisHit } from './analyze'
import { classify, type Classification } from './classify'
import { getType, type DeclensionTypeDef } from './declension/registry'
import { accepted, gradationInfo, inflect, paradigm, primary, type Paradigm } from './inflect'
import { diagnose, malforms, type Diagnosis, type Malform } from './malforms'
import { inflectPhrase, type PhraseForm } from './phrase'
import { withPossessive } from './possessive'
import { headlineLabel, predictability } from './predictability'
import { renderSentence, type RenderedSentence } from './sentence'
import { getStems } from './stems'
import type { HarmonyDecision } from './harmony'
import type { GradationInfo, Lexeme, NounForm, PersonId, Piece, RuleId, SlotKey } from './types'

export interface StemSummary {
  lemma: string
  vowelStrong: { text: string; pieces: Piece[] }
  vowelWeak: { text: string; pieces: Piece[] }
  consonant: { text: string; pieces: Piece[] } | null
  plural: { strong: string; weak: string }[]
}

export function stemSummary(lex: Lexeme): StemSummary {
  const s = getStems(lex)
  const view = (f: { text: string; pieces(): Piece[] }) => ({ text: f.text, pieces: f.pieces() })
  return {
    lemma: lex.lemma,
    vowelStrong: view(s.vowelStrong),
    vowelWeak: view(s.vowelWeak),
    consonant: s.consonant ? view(s.consonant) : null,
    plural: s.plurals.map((p) => ({ strong: p.strong.text, weak: p.weak.text })),
  }
}

export interface Grammar<L extends Lexeme = Lexeme> {
  readonly lexicon: readonly L[]
  get(id: string): L | undefined
  require(id: string): L
  byLemma(lemma: string): L[]
  /** Resolves a template/lesson reference: a lexeme id or an unambiguous lemma. */
  resolve(ref: string): L | undefined
  type(lex: Lexeme): DeclensionTypeDef
  classify(word: string): Classification
  stems(lex: Lexeme): StemSummary
  /** Vowel harmony of a lexeme (compound-aware, with lexical overrides). */
  harmony(lex: Lexeme): HarmonyDecision
  gradation(lex: Lexeme): GradationInfo | null
  inflect(lex: Lexeme, slot: SlotKey): NounForm
  paradigm(lex: Lexeme): Paradigm
  primary(lex: Lexeme, slot: SlotKey): string | undefined
  accepted(lex: Lexeme, slot: SlotKey): string[]
  withPossessive(lex: Lexeme, slot: SlotKey, person: PersonId): NounForm
  inflectPhrase(words: Lexeme[], slot: SlotKey, person?: PersonId): PhraseForm
  analyze(surface: string): AnalysisHit[]
  analyzeLoose(surface: string): AnalysisHit[]
  malforms(lex: Lexeme, slot: SlotKey): Malform[]
  diagnose(lex: Lexeme, slot: SlotKey, answer: string): Diagnosis | null
  predictability: typeof predictability
  headlineLabel: typeof headlineLabel
  renderSentence(template: string): RenderedSentence
}

export function createGrammar<L extends Lexeme>(
  lexicon: readonly L[],
  opts: { knownWords?: Readonly<Record<string, RuleId>> } = {},
): Grammar<L> {
  const byId = new Map(lexicon.map((l) => [l.id, l]))
  const byLemmaMap = new Map<string, L[]>()
  for (const l of lexicon) byLemmaMap.set(l.lemma, [...(byLemmaMap.get(l.lemma) ?? []), l])
  const analyzer = new Analyzer(lexicon)
  const resolve = (ref: string): L | undefined => {
    const direct = byId.get(ref)
    if (direct) return direct
    const list = byLemmaMap.get(ref)
    return list && list.length === 1 ? list[0] : undefined
  }
  return {
    lexicon,
    get: (id) => byId.get(id),
    require: (id) => {
      const l = byId.get(id)
      if (!l) throw new Error(`Unknown lexeme "${id}"`)
      return l
    },
    byLemma: (lemma) => byLemmaMap.get(lemma) ?? [],
    resolve,
    type: (lex) => getType(lex.typeId),
    classify: (word) => classify(word, lexicon),
    stems: stemSummary,
    harmony: (lex) => getStems(lex).harmony,
    gradation: gradationInfo,
    inflect,
    paradigm,
    primary,
    accepted,
    withPossessive,
    inflectPhrase,
    analyze: (s) => analyzer.analyze(s),
    analyzeLoose: (s) => analyzer.analyzeLoose(s),
    malforms,
    diagnose: (lex, slot, answer) => diagnose(lex, slot, answer, { analyzer, knownWords: opts.knownWords ?? {} }),
    predictability,
    headlineLabel,
    renderSentence: (template) => renderSentence(template, resolve),
  }
}

export { DECLENSION_TYPES, getType } from './declension/registry'
export type { DeclensionTypeDef, PluralRecipeKind, SlotRecipe } from './declension/schema'
export { GRADATION_PATTERNS, type GradationPatternDef } from './gradation'
export { decideHarmony, realize, type HarmonyDecision } from './harmony'
export { isClosedSyllable, syllabify, syllableCount } from './phonology'
export { ALL_SLOTS, PRINCIPAL_SLOTS, SLOT_GRADE, parseSlot, slotKey } from './slots'
export { CASE_ABBR, parseTemplate, type RenderedPart, type RenderedSentence, type TemplateToken } from './sentence'
export { PX_SUFFIX } from './possessive'
export { normalizeForm, looseKey, type AnalysisHit } from './analyze'
export { PREDICTABILITY_ORDER } from './predictability'
export type { Classification, Confidence, TypeCandidate } from './classify'
export type { Diagnosis, DiagnosisId, Malform } from './malforms'
export type { Paradigm } from './inflect'
export type { PhraseForm } from './phrase'
export * from './types'

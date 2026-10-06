/**
 * Content types: lexicon entries, media, sentences and curriculum.
 * Grammar types are owned by the engine (src/grammar/types.ts) and re-exported here.
 */
import type { CaseId, Lexeme, RuleId, SlotKey } from '../grammar/types'

export type {
  Analysis,
  CaseId,
  DerivationStep,
  FormVariant,
  Grade,
  GradationId,
  Harmony,
  IGroup,
  Lexeme,
  NounForm,
  NumberId,
  PersonId,
  Piece,
  PieceRole,
  Predictability,
  RuleId,
  SlotKey,
  TypeId,
} from '../grammar/types'

export interface LocalizedText {
  en: string
  fi?: string
}

/** Text with optional variants per learner mode (falls back to `beginner`). */
export interface ModeText {
  beginner: LocalizedText
  intermediate?: LocalizedText
  advanced?: LocalizedText
}

export type SemanticTag =
  | 'person'
  | 'animal'
  | 'place'
  | 'building'
  | 'vehicle'
  | 'food'
  | 'drink'
  | 'object'
  | 'furniture'
  | 'body'
  | 'nature'
  | 'weather'
  | 'time'
  | 'abstract'
  | 'substance'
  | 'number'
  | 'quality'
  | 'event'
  | 'document'
  | 'institution'
  | 'container'
  | 'clothing'
  | 'plant'
  | 'direction'

export type ThemeId =
  | 'home'
  | 'family'
  | 'food'
  | 'shop'
  | 'city'
  | 'transport'
  | 'work'
  | 'school'
  | 'health'
  | 'nature'
  | 'weather'
  | 'time'
  | 'body'
  | 'people'
  | 'money'
  | 'services'
  | 'daycare'
  | 'leisure'
  | 'language'
  | 'numbers'
  | 'descriptions'

/**
 * Attribution and licensing for one media asset, copied verbatim from what
 * the provider states. Never generalised across assets.
 */
export interface MediaCredit {
  provider: 'wikimedia-commons' | 'original' | 'recorded'
  sourceUrl: string
  title: string
  author: string
  /** Exactly as stated by the provider, e.g. "CC BY-SA 4.0". */
  licenseName: string
  licenseUrl?: string
  attributionRequired: boolean
  /** The attribution line to display. */
  attributionText: string
  usageTerms?: string
  restrictions?: string
  /** e.g. "Resized to 640 px wide". */
  modifications?: string
  /** ISO date the metadata was retrieved. */
  retrievedAt: string
  /** ISO date a human looked at the asset and its metadata. */
  reviewedAt: string
}

export type IllustrationId = string

export interface Image {
  /** Unicode emoji, drawn by the user's system font (no emoji images are bundled). */
  emoji?: string
  /** Original SVG illustration shipped with the app. */
  illustration?: IllustrationId
  photo?: { src: string; w: number; h: number; credit: MediaCredit }
  alt: LocalizedText
}

/** Where a content item comes from. Verification results live in the generated report. */
export interface Provenance {
  source: 'curated' | 'imported'
  author: string
  /** Has a native speaker reviewed this item? */
  nativeReview: boolean
}

/** A lexicon entry: the engine's `Lexeme` plus learner-facing content. */
export interface Noun extends Lexeme {
  gloss: LocalizedText
  semantics: SemanticTag[]
  /** For places: inside (kaupassa) or on/at (torilla) locatives. */
  locative?: 'inner' | 'outer' | 'both'
  themes: ThemeId[]
  /** Curriculum level where the word is introduced (1–8). */
  level: number
  frequency: 'core' | 'common' | 'extra'
  image?: Image
  /** Lexemes with the same spelling (kuusi 'spruce' / kuusi 'six'). */
  homonyms?: string[]
  /** Explanation keys for word-specific notes (e.g. koti → kotona). */
  notes?: RuleId[]
  provenance: Provenance
}

export interface Audio {
  text: string
  lang: 'fi-FI'
  /** A recorded file overrides TTS when present. */
  src?: string
  credit?: MediaCredit
}

export interface ExampleSentence {
  id: string
  /** Template, e.g. 'Menen {*kauppa:ill}.' — noun forms are produced by the engine. */
  fi: string
  en: string
  register: 'standard' | 'spoken'
  level: number
  tags: string[]
  provenance: Provenance
}

export interface CaseUsage {
  title: LocalizedText
  body?: ModeText
  sentenceIds: string[]
}

export interface CaseMistake {
  wrong: string
  right: string
  why: ModeText
}

export interface CaseInfo {
  id: CaseId
  fi: string
  en: string
  group: 'grammatical' | 'inner-local' | 'outer-local' | 'state' | 'marginal'
  questions: LocalizedText[]
  /** Ending summaries, e.g. ['-ssa', '-ssä']. */
  endings: { sg: string[]; pl: string[] }
  meaning: ModeText
  usages: CaseUsage[]
  mistakes: CaseMistake[]
  spatial?: { motion: 'static' | 'from' | 'to'; surface: 'inside' | 'surface' }
  frequency: 'core' | 'common' | 'rare'
  demoNounId: string
  /** Slot used for the "Why?" decomposition on the case card. */
  demoSlot: SlotKey
}

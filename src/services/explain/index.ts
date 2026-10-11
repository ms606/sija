/**
 * Word-specific explanations ("Explain this form"), built from the grammar
 * engine's own derivations and the curated sentence annotations. Works fully
 * offline: no remote service is involved.
 */
export { explainAllVariants, explainForm, stemKindOf, type ChainNode, type Coverage, type ExplainedStep, type ExplainOptions, type FormExplanation, type FormulaPart, type StemKind, type VisiblePiece } from './form'
export { englishNoun, englishPlural, firstSense } from './english'
export { fi, plain, segments, type Segment } from './markup'
export { compareForms, generalRules, samePattern, signature, type CompareForm, type GeneralRule, type PatternExample } from './related'
export { allUsages, usageFor, type UsageExplanation } from './usage'

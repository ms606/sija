import type { CaseId, RuleId } from '../../types/content'

/**
 * Word-specific explanation templates for the step-by-step walkthrough
 * ("Explain this form"). Each template is keyed by a rule id the engine
 * emits and is filled with *that word's* derivation: the step's own
 * before/after text, the stem the ending attaches to, the actual ending and
 * the actual consonant change. The general rule texts in `rules.ts` stay the
 * source for general-rule panels; nothing here contains an example word of
 * its own.
 *
 * Placeholders (filled by src/services/explain/):
 *   {lemma} {gloss} {form}          the word, its first English sense, the form studied
 *   {before} {after}                the step's text before and after (engine output)
 *   {from} {to}                     what changed (engine params)
 *   {change}                        "pp → p", "k disappears", "t → d"
 *   {strong} {weak} {pattern}       gradation grades and pattern ("pp → p")
 *   {stem}                          the stem an ending is added to
 *   {ending}                        the ending actually added (no hyphen)
 *   {raw}                           the result before a spelling rule (taloia)
 *   {v} {stemEnd}                   last vowel / last two letters of the stem
 *   {syllables}                     syllables of the finished form (kau·pan)
 *   {part} {vowels}                 vowel harmony: deciding word part and its vowels
 *   {suffix} {owner}                possessive suffix and its meaning
 *   {dropped}                       sentence about an ending that disappears before a suffix
 *   {primary}                       the standard form when this one is a variant
 */
export interface StepTemplate {
  /** The step-by-step text. */
  text: string
  /** Short clause for the one-paragraph summary, e.g. "the final a is replaced by the plural marker i". */
  short?: string
  /** Technical background, shown under "More detail". */
  detail?: string
  /** Glossary terms this step introduces. */
  terms?: TermId[]
}

export type TermId =
  | 'base-form'
  | 'stem'
  | 'vowel-stem'
  | 'consonant-stem'
  | 'plural-stem'
  | 'plural-marker'
  | 'case-ending'
  | 'gradation'
  | 'strong-grade'
  | 'weak-grade'
  | 'closed-syllable'
  | 'open-syllable'
  | 'inverse-gradation'
  | 'vowel-harmony'
  | 'possessive-suffix'

/** Plain-English definitions, shown the first time a term matters in a walkthrough. */
export const TERMS: Readonly<Record<TermId, { term: string; fi: string; definition: string }>> = {
  'base-form': { term: 'base form', fi: 'perusmuoto', definition: 'the dictionary form of a word (the nominative singular).' },
  stem: { term: 'stem', fi: 'vartalo', definition: 'the form of a word that grammatical endings are attached to.' },
  'vowel-stem': {
    term: 'vowel stem',
    fi: 'vokaalivartalo',
    definition: 'the stem that ends in a vowel. Most case endings are added to it.',
  },
  'consonant-stem': {
    term: 'consonant stem',
    fi: 'konsonanttivartalo',
    definition: 'a shorter stem that ends in a consonant. Only a few endings (such as partitive -ta/-tä and plural genitive -ten) are added to it.',
  },
  'plural-stem': {
    term: 'plural stem',
    fi: 'monikkovartalo',
    definition: 'the stem used to build plural forms. It contains the plural marker -i-.',
  },
  'plural-marker': {
    term: 'plural marker',
    fi: 'monikon tunnus',
    definition: 'the part of a word that means "more than one": -t in the nominative plural, -i- in all other plural forms.',
  },
  'case-ending': {
    term: 'case ending',
    fi: 'sijapääte',
    definition: 'the ending that shows the case, i.e. the word\'s role in the sentence (in, into, becoming, partitive …).',
  },
  gradation: {
    term: 'consonant gradation',
    fi: 'astevaihtelu',
    definition: 'a regular change of k, p or t at the start of the last syllable of the stem, depending on the ending.',
  },
  'strong-grade': { term: 'strong grade', fi: 'vahva aste', definition: 'the fuller consonant form in a gradation pattern (for example pp, t, k).' },
  'weak-grade': {
    term: 'weak grade',
    fi: 'heikko aste',
    definition: 'the weaker consonant form in a gradation pattern (for example pp → p, t → d, or k disappearing).',
  },
  'closed-syllable': { term: 'closed syllable', fi: 'umpitavu', definition: 'a syllable that ends in a consonant.' },
  'open-syllable': { term: 'open syllable', fi: 'avotavu', definition: 'a syllable that ends in a vowel.' },
  'inverse-gradation': {
    term: 'inverse gradation',
    fi: 'käänteinen astevaihtelu',
    definition: 'gradation in the other direction: the base form has the weak grade and the vowel stem has the strong grade.',
  },
  'vowel-harmony': {
    term: 'vowel harmony',
    fi: 'vokaalisointu',
    definition: 'endings use a/o/u after words with back vowels and ä/ö/y after words with front vowels (or only e and i).',
  },
  'possessive-suffix': { term: 'possessive suffix', fi: 'omistusliite', definition: 'an ending meaning "my, your, his/her, our, their".' },
}

export type WalkStepKind =
  | 'lemma'
  | 'type'
  | 'stem'
  | 'gradation'
  | 'plural'
  | 'ending'
  | 'harmony'
  | 'spelling'
  | 'possessive'
  | 'override'
  | 'variant-stem'
  | 'result'

export const STEP_TITLES: Readonly<Record<string, string>> = {
  lemma: 'Start with the word',
  type: 'Word type',
  'stem.vowel': 'Find the stem',
  'stem.consonant': 'Find the consonant stem',
  'stem.lemma': 'Find the stem',
  gradation: 'Consonant gradation',
  plural: 'Build the plural stem',
  'plural.t': 'Add the plural marker -t',
  ending: 'Add the case ending',
  'ending.none': 'No case ending',
  harmony: 'Vowel harmony',
  spelling: 'Spelling',
  possessive: 'Possessive suffix',
  'possessive.base': 'Prepare the stem for the suffix',
  override: 'A form to memorize',
  'variant-stem': 'Variant stem',
  result: 'Check the result',
}

/** Templates keyed by the engine's rule ids. */
export const STEP_TEMPLATES: Readonly<Record<RuleId, StepTemplate>> = {
  /* ---------------- frame ---------------- */
  'step.lemma': {
    text: '{lemma} means "{gloss}". This is its base form (nominative singular), the form you find in a dictionary.',
    terms: ['base-form'],
  },
  'compound.head': {
    text: '{lemma} is a compound: {modifier} + {head}. Only the last part, {head}, changes; {modifier} stays as it is.',
  },
  'lexical.auto-no-gradation': {
    text: 'No consonant gradation: {lemma} has t between two vowels, but it does not alternate ({lemma} → autoa, auton, not *audon). Many newer loanwords have no gradation; learn this with the word.',
    short: 'no consonant gradation',
  },

  /* ---------------- vowel stems ---------------- */
  'stem.same': {
    text: 'The stem of {lemma} is the same as the base form: {after}-.',
    short: 'the stem is {after}-, the same as the base form',
    terms: ['stem'],
  },
  'stem.i-to-e': {
    text: 'In the vowel stem, the final -i of {lemma} changes to -e: {before} → {after}-.',
    short: 'the final -i changes to -e ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.si-to-te': {
    text: 'In the vowel stem, -si changes to -te: {before} → {after}-.',
    short: '-si changes to -te ({after}-)',
    detail: 'The s of the base form goes back to an old t that changed into s before i. In the stem, where no i follows, the t is still there.',
    terms: ['vowel-stem'],
  },
  'stem.ksi-to-hte': {
    text: 'In the vowel stem, -ksi changes to -hte: {before} → {after}-.',
    short: '-ksi changes to -hte ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.e-to-ee': {
    text: 'In the vowel stem, the final -e becomes a long -ee: {before} → {after}-.',
    short: 'the final -e becomes long ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.add-e': {
    text: '{lemma} ends in a consonant, so the vowel stem adds -e: {before} → {after}-.',
    short: '-e is added ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.n-to-me': {
    text: 'In the vowel stem, the final -n changes to -me: {before} → {after}-.',
    short: '-n changes to -me ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.n-to-ma': {
    text: 'The vowel stem of {lemma} is irregular: the final -n changes to -{to}: {before} → {after}-. Memorize it.',
    short: 'irregular stem {after}-',
    terms: ['vowel-stem'],
  },
  'stem.nen-to-se': {
    text: 'In the vowel stem, -nen changes to -se: {before} → {after}-. Every word ending in -nen does this.',
    short: '-nen changes to -se ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.s-to-kse': {
    text: 'In the vowel stem, the final -s changes to -kse: {before} → {after}-.',
    short: '-s changes to -kse ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.s-to-te': {
    text: 'In the vowel stem, the final -s changes to -te: {before} → {after}-.',
    short: '-s changes to -te ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.s-lengthen': {
    text: 'In the vowel stem, the final -s disappears and the vowel before it becomes long: {before} → {after}-.',
    short: 'the -s disappears and the vowel becomes long ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.s-to-he': {
    text: 'The vowel stem of {lemma} is irregular: -s changes to -he: {before} → {after}-. Memorize it.',
    short: 'irregular stem {after}-',
    terms: ['vowel-stem'],
  },
  'stem.t-to-e': {
    text: 'In the vowel stem, the final -t changes to -e: {before} → {after}-.',
    short: '-t changes to -e ({after}-)',
    terms: ['vowel-stem'],
  },
  'stem.t-lengthen': {
    text: 'In the vowel stem, the final -t disappears and the vowel before it becomes long: {before} → {after}-.',
    short: 'the -t disappears and the vowel becomes long ({after}-)',
    terms: ['vowel-stem'],
  },

  /* ---------------- consonant stems ---------------- */
  'stem.consonant.lemma': {
    text: 'This form is built on the consonant stem. For {lemma}, the consonant stem is the base form itself: {after}-.',
    short: 'the consonant stem is the base form ({after}-)',
    terms: ['consonant-stem'],
  },
  'stem.consonant.drop-i': {
    text: 'This form is built on the consonant stem: drop the final -i of {lemma}: {before} → {after}-.',
    short: 'the consonant stem drops the final -i ({after}-)',
    terms: ['consonant-stem'],
  },
  'stem.consonant.m-to-n': {
    text: 'This form is built on the consonant stem: drop the final -i, and m becomes n, because Finnish does not have m directly before t: {before} → {after}-.',
    short: 'the consonant stem is {after}- (m → n)',
    terms: ['consonant-stem'],
  },
  'stem.consonant.si-to-t': {
    text: 'This form is built on the consonant stem: -si becomes -t: {before} → {after}-.',
    short: 'the consonant stem is {after}- (-si → -t)',
    terms: ['consonant-stem'],
  },
  'stem.consonant.psi-to-s': {
    text: 'This form is built on the consonant stem: -psi becomes -s: {before} → {after}-.',
    short: 'the consonant stem is {after}-',
    terms: ['consonant-stem'],
  },
  'stem.consonant.tsi-to-s': {
    text: 'This form is built on the consonant stem: -tsi becomes -s: {before} → {after}-.',
    short: 'the consonant stem is {after}-',
    terms: ['consonant-stem'],
  },
  'stem.consonant.ksi-to-h': {
    text: 'This form is built on the consonant stem: -ksi becomes -h: {before} → {after}-.',
    short: 'the consonant stem is {after}-',
    terms: ['consonant-stem'],
  },
  'stem.consonant.nen-to-s': {
    text: 'This form is built on the consonant stem: -nen becomes -s: {before} → {after}-.',
    short: 'the consonant stem is {after}- (-nen → -s)',
    terms: ['consonant-stem'],
  },
  'stem.consonant.s-to-t': {
    text: 'This form is built on the consonant stem: the final -s becomes -t: {before} → {after}-.',
    short: 'the consonant stem is {after}- (-s → -t)',
    terms: ['consonant-stem'],
  },

  /* ---------------- consonant gradation ---------------- */
  'grade.weak.closed-syllable': {
    text: '{lemma} has consonant gradation ({pattern}). The ending -{ending} closes the syllable ({syllables}: it now ends in a consonant), so the weak grade appears: {change}: {before} → {after}-.',
    short: 'weak grade: {change}',
    terms: ['gradation', 'weak-grade', 'closed-syllable'],
  },
  'grade.weak.long-plural': {
    text: '{lemma} has consonant gradation ({pattern}). In this long plural form ({syllables}) the weak grade appears: {change}: {before} → {after}-.',
    short: 'weak grade: {change}',
    detail: 'In three-syllable words like this one, the long plural forms (-oita, -oiden, -oihin) behave as if the syllable were closed.',
    terms: ['gradation', 'weak-grade'],
  },
  'grade.weak': {
    text: 'Weak grade: {change}: {before} → {after}-.',
    short: 'weak grade: {change}',
    terms: ['gradation', 'weak-grade'],
  },
  'grade.strong.open-syllable': {
    text: '{lemma} has consonant gradation ({pattern}), but here it keeps the strong grade {strong}: the syllable stays open ({syllables}: it ends in a vowel).',
    short: 'the strong grade {strong} stays',
    terms: ['gradation', 'strong-grade', 'open-syllable'],
  },
  'grade.strong.illative': {
    text: '{lemma} has consonant gradation ({pattern}). The illative always keeps the strong grade {strong}, even though the syllable looks closed ({syllables}).',
    short: 'the strong grade {strong} stays (the illative is always strong)',
    detail: 'The illative ending was once -hen. The old open syllable still decides the grade.',
    terms: ['gradation', 'strong-grade'],
  },
  'grade.strong.base': {
    text: '{lemma} has consonant gradation ({pattern}). The base form has the strong grade {strong}.',
    short: 'the base form has the strong grade {strong}',
    terms: ['gradation', 'strong-grade'],
  },
  'grade.inverse.strong-stem': {
    text: '{lemma} has inverse gradation: the base form has the weak grade ({from}), but the stem has the strong grade ({to}): {before} → {after}-.',
    short: 'inverse gradation: {from} → {to}',
    terms: ['gradation', 'inverse-gradation'],
  },
  'grade.inverse.weak-base': {
    text: '{lemma} has inverse gradation: the stem has a strong grade, but this form is built on the base form, so it keeps the base form\'s weak grade ({weak}).',
    short: 'weak grade {weak} as in the base form',
    terms: ['gradation', 'inverse-gradation'],
  },

  /* ---------------- plural stems ---------------- */
  'plural.append': {
    text: 'Add the plural marker -i- to the stem: {before} + i → {after}-. This is the plural stem.',
    short: 'the plural marker i is added ({after}-)',
    terms: ['plural-stem', 'plural-marker'],
  },
  'plural.a-to-o': {
    text: 'Before the plural marker -i-, the final -{from} of the stem changes to -{to}, and then the plural marker follows: {before} → {mid}- + i → {after}-. This is the plural stem.',
    short: 'the final -{from} changes to -{to} before the plural marker i ({after}-)',
    terms: ['plural-stem', 'plural-marker'],
  },
  'plural.drop-final': {
    text: 'Before the plural marker -i-, the final -{from} of the stem drops, and the plural marker takes its place: {before} → {mid}- + i → {after}-. This is the plural stem.',
    short: 'the final -{from} is replaced by the plural marker i ({after}-)',
    terms: ['plural-stem', 'plural-marker'],
  },
  'plural.i-to-e': {
    text: 'Before the plural marker -i-, the final -i of the stem changes to -e, and then the plural marker follows: {before} → {mid}- + i → {after}-. This is the plural stem.',
    short: 'the final -i changes to -e before the plural marker i ({after}-)',
    terms: ['plural-stem', 'plural-marker'],
  },
  'plural.shorten': {
    text: 'Before the plural marker -i-, the long vowel -{from} becomes short, and then the plural marker follows: {before} → {mid}- + i → {after}-. This is the plural stem.',
    short: 'the long -{from} becomes short before the plural marker i ({after}-)',
    terms: ['plural-stem', 'plural-marker'],
  },
  'plural.diphthong': {
    text: 'Before the plural marker -i-, the vowel pair {from} loses its first vowel, and then the plural marker follows: {before} → {mid}- + i → {after}-. This is the plural stem.',
    short: '{from} becomes {to} before the plural marker i ({after}-)',
    terms: ['plural-stem', 'plural-marker'],
  },
  'plural.lemma': {
    text: 'The plural stem looks exactly like the base form: {after}-. Its final i now works as the plural marker -i-, and the consonants stay as they are in the base form.',
    short: 'the plural stem is {after}-, like the base form',
    terms: ['plural-stem', 'plural-marker'],
  },
  'plural.ks': {
    text: 'In the plural stem, the final -s becomes -ks-, and then the plural marker -i- follows: {before} → {mid}- + i → {after}-.',
    short: '-s becomes -ksi- in the plural stem ({after}-)',
    terms: ['plural-stem', 'plural-marker'],
  },
  'plural.t': {
    text: 'Add the plural marker -t: {stem}- + t → {after}. In the nominative plural, -t is the only marker: there is no separate case ending.',
    short: 'the plural marker -t is added',
    terms: ['plural-marker'],
  },

  /* ---------------- case endings ---------------- */
  'ending.nominative': {
    text: 'No ending is added: the nominative singular is the base form itself.',
    short: 'no ending',
  },
  'ending.genitive': {
    text: 'Add the genitive ending -n: {stem}- + -n → {after}.',
    short: 'the genitive ending -n',
    terms: ['case-ending'],
  },
  'ending.partitive.a': {
    text: 'Add the partitive ending -{ending}: {stem}- + -{ending} → {after}. The stem ends in a short vowel ({v}), so the partitive is just -a/-ä.',
    short: 'the partitive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.partitive.ta-vowel': {
    text: 'Add the partitive ending -{ending}: {stem}- + -{ending} → {after}. The stem ends in two vowels ({stemEnd}), so the partitive is -ta/-tä.',
    short: 'the partitive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.partitive.ta-consonant': {
    text: 'Add the partitive ending -{ending} to the consonant stem: {stem}- + -{ending} → {after}.',
    short: 'the partitive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.partitive.tta': {
    text: 'Add the partitive ending -{ending} to the base form: {stem} + -{ending} → {after}. In this word type the partitive is -tta/-ttä.',
    short: 'the partitive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.inessive': {
    text: 'Add the inessive ending -{ending} ("in"): {stem}- + -{ending} → {after}.',
    short: 'the inessive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.elative': {
    text: 'Add the elative ending -{ending} ("out of, from"): {stem}- + -{ending} → {after}.',
    short: 'the elative ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.illative.vn': {
    text: 'Add the illative ending ("into"): repeat the last vowel of the stem ({v}) and add -n: {stem}- + -{ending} → {after}.',
    short: 'the illative ending -{ending} (last vowel + n)',
    terms: ['case-ending'],
  },
  'ending.illative.hvn': {
    text: 'Add the illative ending ("into"). After a one-syllable stem with a long vowel or a vowel pair, it is h + the last vowel + n: {stem}- + -{ending} → {after}.',
    short: 'the illative ending -{ending} (h + vowel + n)',
    terms: ['case-ending'],
  },
  'ending.illative.seen': {
    text: 'Add the illative ending ("into"). After a long vowel at the end of a longer stem, it is -seen: {stem}- + -{ending} → {after}.',
    short: 'the illative ending -seen',
    terms: ['case-ending'],
  },
  'ending.adessive': {
    text: 'Add the adessive ending -{ending} ("on, at; having; by means of"): {stem}- + -{ending} → {after}.',
    short: 'the adessive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.ablative': {
    text: 'Add the ablative ending -{ending} ("off, from"): {stem}- + -{ending} → {after}.',
    short: 'the ablative ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.allative': {
    text: 'Add the allative ending -{ending} ("onto, to"): {stem}- + -{ending} → {after}. This ending has only one form; it never becomes -llä.',
    short: 'the allative ending -lle',
    terms: ['case-ending'],
  },
  'ending.essive': {
    text: 'Add the essive ending -{ending} ("as, in the role of"): {stem}- + -{ending} → {after}.',
    short: 'the essive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.translative': {
    text: 'Add the translative ending -ksi ("becoming, into"): {stem}- + -ksi → {after}. The ending is always -ksi; it has no front or back vowel versions.',
    short: 'the translative ending -ksi',
    terms: ['case-ending'],
  },
  'ending.abessive': {
    text: 'Add the abessive ending -{ending} ("without"): {stem}- + -{ending} → {after}.',
    short: 'the abessive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.comitative': {
    text: 'Add the comitative ending -ne ("together with") after the plural stem: {stem}- + -ne → {after}. The comitative is always built on the plural stem, even when it means one thing.',
    short: 'the comitative ending -ne',
    terms: ['case-ending'],
  },
  'ending.comitative.agreement': {
    text: '{form} is an adjective or numeral in the comitative. It takes no possessive suffix: the noun it describes carries the suffix.',
  },
  'ending.instructive': {
    text: 'Add the instructive ending -n after the plural stem: {stem}- + -n → {after}. The instructive is used only in fixed expressions.',
    short: 'the instructive ending -n',
    terms: ['case-ending'],
  },
  'ending.genitive-pl.en': {
    text: 'Add the plural genitive ending -en after the plural stem: {stem}- + -en → {raw}.',
    short: 'the genitive ending -en',
    terms: ['case-ending'],
  },
  'ending.genitive-pl.vowel-en': {
    text: 'Add the plural genitive ending -en to the stem: {stem}- + -en → {after}. In this word type you do not see a separate plural -i-: the -en follows the i at the end of the stem.',
    short: 'the genitive ending -en',
    terms: ['case-ending'],
  },
  'ending.genitive-pl.den': {
    text: 'Add the plural genitive ending -den after the plural stem: {stem}- + -den → {after}.',
    short: 'the genitive ending -den',
    terms: ['case-ending'],
  },
  'ending.genitive-pl.tten': {
    text: 'Add the plural genitive ending -tten after the plural stem: {stem}- + -tten → {after}. This is a less common alternative to -den.',
    short: 'the genitive ending -tten',
    terms: ['case-ending'],
  },
  'ending.genitive-pl.ten': {
    text: 'Add the plural genitive ending -ten to the consonant stem: {stem}- + -ten → {after}. This form has no plural -i-: the ending -ten itself shows plural and genitive.',
    short: 'the genitive ending -ten',
    terms: ['case-ending'],
  },
  'ending.partitive-pl.a': {
    text: 'Add the partitive ending -{ending} after the plural stem: {stem}- + -{ending} → {raw}.',
    short: 'the partitive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.partitive-pl.ta': {
    text: 'Add the partitive ending -{ending} after the plural stem: {stem}- + -{ending} → {after}. In this word type the plural partitive ending is -ta/-tä.',
    short: 'the partitive ending -{ending}',
    terms: ['case-ending'],
  },
  'ending.illative-pl.hin': {
    text: 'Add the plural illative ending -hin after the plural stem: {stem}- + -hin → {after}.',
    short: 'the illative ending -hin',
    terms: ['case-ending'],
  },
  'ending.illative-pl.in': {
    text: 'Add the plural illative ending -in: {stem}- + -in → {after}. The plural i and the i of the ending together make a long ii.',
    short: 'the illative ending -in',
    terms: ['case-ending'],
  },
  'ending.illative-pl.siin': {
    text: 'Add the plural illative ending -siin after the plural stem: {stem}- + -siin → {after}.',
    short: 'the illative ending -siin',
    terms: ['case-ending'],
  },
  'acc.sg.n': {
    text: 'As a whole, finished object (accusative), the noun uses its -n form, which looks exactly like the genitive: {form}.',
    short: 'the accusative -n (same form as the genitive)',
  },
  'acc.sg.zero': {
    text: 'As a whole object in a command, in a passive sentence or after words like täytyy, the accusative has no ending: it looks like the base form, {form}.',
    short: 'the accusative without an ending (same form as the base form)',
  },
  'acc.pl.t': {
    text: 'In the plural, the whole object (accusative) looks exactly like the nominative plural: {form}.',
    short: 'the plural accusative -t (same form as the nominative plural)',
  },

  /* ---------------- vowel harmony & spelling ---------------- */
  'harmony.back': {
    text: 'Vowel harmony: {part} has the back vowels {vowels}, so the ending uses a/o/u: -{ending}, not the ä/ö/y version.',
    terms: ['vowel-harmony'],
  },
  'harmony.front': {
    text: 'Vowel harmony: {part} has the front vowels {vowels}, so the ending uses ä/ö/y: -{ending}, not the a/o/u version.',
    terms: ['vowel-harmony'],
  },
  'harmony.neutral-only': {
    text: 'Vowel harmony: {part} has only e and i, and such words take the ä/ö/y version of an ending: -{ending}.',
    terms: ['vowel-harmony'],
  },
  'harmony.compound-head': {
    text: 'Vowel harmony: in a compound, the last part decides. {part} has the vowels {vowels}, so the ending is -{ending}.',
    terms: ['vowel-harmony'],
  },
  'harmony.lexical': {
    text: 'Vowel harmony: {lemma} has a fixed vowel harmony that you learn with the word: -{ending}.',
    terms: ['vowel-harmony'],
  },
  'spelling.plural-glide': {
    text: 'Spelling: the plural i now stands between two vowels, so it is written j: {before} → {after}. The j is still the plural marker.',
    short: 'the plural i is written j between vowels',
  },
  'spelling.j-glide': {
    text: 'Spelling: when the k disappears, the i between two vowels is written j in this word: {before} → {after}-.',
    short: 'the i between the vowels is written j ({after}-)',
  },
  'spelling.apostrophe': {
    text: 'Spelling: when the k disappears between two identical vowels, an apostrophe marks the syllable break: {before} → {after}-.',
    short: 'an apostrophe marks where the k was ({after}-)',
  },

  /* ---------------- possessive suffixes ---------------- */
  'px.base.strong-grade': {
    text: '{dropped}The possessive suffix is added to the vowel stem {after}-, which has the strong grade.',
    short: 'the suffix goes on the vowel stem {after}-',
    terms: ['possessive-suffix'],
  },
  'px.base.vowel-stem': {
    text: '{dropped}The possessive suffix is added to the vowel stem {after}-.',
    short: 'the suffix goes on the vowel stem {after}-',
    terms: ['possessive-suffix'],
  },
  'px.drop-n': {
    text: 'Before a possessive suffix, the final -n of the ending drops: {before} → {after}-.',
    short: 'the final -n drops',
  },
  'px.ksi-to-kse': {
    text: 'Before a possessive suffix, the translative -ksi becomes -kse-: {before} → {after}-.',
    short: '-ksi becomes -kse-',
  },
  'px.1sg': { text: 'Add the possessive suffix -ni ("my"): {before} + -ni → {after}.', short: 'the suffix -ni "my"', terms: ['possessive-suffix'] },
  'px.2sg': { text: 'Add the possessive suffix -si ("your", one person): {before} + -si → {after}.', short: 'the suffix -si "your"', terms: ['possessive-suffix'] },
  'px.3.nsa': {
    text: 'Add the possessive suffix -{suffix} ("his, her, their"): {before} + -{suffix} → {after}.',
    short: 'the suffix -{suffix} "his/her/their"',
    terms: ['possessive-suffix'],
  },
  'px.3.vn': {
    text: 'Add the third-person suffix -{suffix} ("his, her, their"). After a short vowel, this suffix can be the vowel repeated + n: {before} + -{suffix} → {after}.',
    short: 'the suffix -{suffix} "his/her/their"',
    terms: ['possessive-suffix'],
  },
  'px.1pl': { text: 'Add the possessive suffix -mme ("our"): {before} + -mme → {after}.', short: 'the suffix -mme "our"', terms: ['possessive-suffix'] },
  'px.2pl': { text: 'Add the possessive suffix -nne ("your", several people): {before} + -nne → {after}.', short: 'the suffix -nne "your"', terms: ['possessive-suffix'] },
  'px.3.comitative-vn': {
    text: 'A noun in the comitative always has a possessive suffix. The usual one is -en ("his, her, their"): {before} + -en → {after}.',
    short: 'the suffix -en',
    terms: ['possessive-suffix'],
  },
  'px.3.comitative-nsa': {
    text: 'A noun in the comitative always has a possessive suffix; -{suffix} is also possible: {before} + -{suffix} → {after}.',
    short: 'the suffix -{suffix}',
    terms: ['possessive-suffix'],
  },

  /* ---------------- recorded forms and variants ---------------- */
  'exception.merta-verta': {
    text: 'The regular pattern would give *{before}, but the real form is {after}: by exception, the ending has a instead of ä. Memorize this form.',
    short: 'an exception: {after}, not *{before}',
  },
  'irregular.vuonna': {
    text: '{after} is a special form used with years and with tänä, viime and ensi (vuonna 2024, tänä vuonna). It is learned as a whole word, not built by the regular rules. The regular essive is {primary}.',
    short: 'a special form learned as a whole word',
  },
  'variant.ruoka-ruua': {
    text: 'Variant: the stem {before} can also be {after}-. Both forms are correct.',
    short: 'variant stem {after}-',
  },
}

/**
 * Why a form shows no consonant change. Picked by the explanation service from
 * the word's own data (syllables, the consonant before the last vowel, its Kotus
 * entry), never from a generic statement.
 */
export const NO_GRADATION: Readonly<Record<string, string>> = {
  monosyllable:
    'No consonant gradation: {lemma} has only one syllable. Gradation changes the consonant at the start of a later syllable, so one-syllable words never have it.',
  'no-site': 'No consonant gradation: no consonant stands before the last vowel of the stem ({syllables}), so there is nothing to change.',
  'no-kpt':
    'No consonant gradation: the consonant before the last vowel of the stem is {cluster} ({syllables}). Only k, p and t (alone or in clusters such as kk, nt, lt) take part in gradation, so nothing changes.',
  'no-kpt.elsewhere': 'The {kpt} earlier in {lemma} is not at that position, so it does not change either.',
  'no-kpt.elsewhere.many': 'The {kpt} earlier in {lemma} are not at that position, so they do not change either.',
  'never-cluster':
    'No consonant gradation: {lemma} has {cluster} before the last vowel ({syllables}), and the clusters sk, st, tk and sp never alternate.',
  kotus:
    'No consonant gradation: {lemma} has {cluster} before the last vowel ({syllables}), but in this word it does not alternate. Kotus lists {lemma} as type {kotus} with no gradation letter, so learn it with the word.',
  'stem-not-graded':
    '{lemma} has consonant gradation ({pattern}) in its vowel stem ({stems}). This form is built on {where}, where it does not apply, so the consonants stay as they are.',
}

/**
 * A rough English equivalent of a noun form, built from the word's first
 * gloss. Marked "roughly" in the UI: the real meaning depends on the sentence.
 *   {the} = "the doctor", {a} = "a doctor", {pl} = "doctors", {thepl} = "the doctors".
 */
export const ROUGH_MEANING: Readonly<Partial<Record<CaseId, { sg: string; pl: string }>>> = {
  nominative: { sg: '{a}', pl: '{pl}' },
  genitive: { sg: "{the}'s, of {the}", pl: "{thepl}', of {thepl}" },
  partitive: { sg: '{g}', pl: '{pl}' },
  accusative: { sg: '{the} (as a whole object)', pl: '{thepl} (as a whole object)' },
  inessive: { sg: 'in {the}', pl: 'in {thepl}' },
  elative: { sg: 'out of {the}, from {the}', pl: 'out of {thepl}, from {thepl}' },
  illative: { sg: 'into {the}, to {the}', pl: 'into {thepl}, to {thepl}' },
  adessive: { sg: 'on {the}, at {the}', pl: 'on {thepl}, at {thepl}' },
  ablative: { sg: 'off {the}, from {the}', pl: 'off {thepl}, from {thepl}' },
  allative: { sg: 'onto {the}, to {the}', pl: 'onto {thepl}, to {thepl}' },
  essive: { sg: 'as {a}', pl: 'as {pl}' },
  translative: { sg: 'into {a}, (to become) {a}', pl: 'into {pl}, (to become) {pl}' },
  abessive: { sg: 'without {a}', pl: 'without {pl}' },
  comitative: { sg: '', pl: "with one's {pl}" },
  instructive: { sg: '', pl: 'with {pl}, by {pl} (fixed expressions)' },
}

/**
 * English plurals that the regular rule (-s, -es, -ies) gets wrong, keyed by
 * the first gloss. Words whose plural is not used in English get `null`
 * ("water" → no plural shown).
 */
export const ENGLISH_PLURAL: Readonly<Record<string, string | null>> = {
  child: 'children',
  man: 'men',
  woman: 'women',
  person: 'people',
  tooth: 'teeth',
  mouse: 'mice',
  knife: 'knives',
  leaf: 'leaves',
  wolf: 'wolves',
  half: 'halves',
  shelf: 'shelves',
  fish: 'fish',
  salmon: 'salmon',
  elk: 'elk',
  potato: 'potatoes',
  stomach: 'stomachs',
  'piece of news': 'pieces of news',
  'kilo(gram)': 'kilos',
  'day care (for children)': null,
  'Finnish (language)': null,
  water: null,
  milk: null,
  money: null,
  rent: null,
  sweat: null,
  blood: null,
  health: null,
  love: null,
  happiness: null,
  snow: null,
  'everyday life': null,
  hair: null,
  weather: null,
  grass: null,
  ice: null,
  sleep: null,
  coal: null,
  west: null,
  care: null,
  relatives: null,
  people: null,
  work: null,
  bread: null,
  food: null,
  flu: null,
  rain: null,
  'hair (on the head)': null,
}

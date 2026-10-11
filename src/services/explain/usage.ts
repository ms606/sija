import { CASES_INFO } from '../../data/cases'
import { CUE_GLOSS, SENTENCE_USAGE, USAGE_REASONS, type SentenceUsage, type UsageReason } from '../../data/explanations/usage'
import type { RenderedPart } from '../../grammar'
import { renderSentenceById, sentencesFor, type SentenceView } from '../content/sentences'
import { grammar } from '../grammar'
import { englishNoun, firstSense } from './english'
import type { FormExplanation } from './form'
import { fi, fill } from './markup'

/**
 * "Why this case here?" for an explained form: an example sentence that
 * contains exactly this form, and the reason (from the curated annotation
 * of that sentence) why the noun has this case and number there.
 */
export interface UsageExplanation {
  sentenceId: string
  view: SentenceView
  /** Index of the token in `view.parts`. */
  part: number
  /** The sentence has a reviewed-for-machine-checks reason for this token. */
  annotated: boolean
  title?: string
  /** Marked-up paragraphs (see markup.ts). */
  why: string[]
  compare?: { view: SentenceView; note: string }
}

interface Candidate {
  view: SentenceView
  part: number
  focus: boolean
  annotation?: SentenceUsage
  /** Index of the lexeme inside a phrase token (uuden auton): the head is last. */
  member: number
  members: number
}

function lower(s: string): string {
  return s.toLocaleLowerCase('fi-FI')
}

/** The token text that belongs to this lexeme ("uuden auton" → "auton" for auto). */
function memberText(part: RenderedPart, member: number): string {
  const words = part.text.split(' ')
  const count = part.token?.lexemeIds.length ?? 1
  return words.length === count ? (words[member] ?? part.text) : part.text
}

function candidatesIn(view: SentenceView, exp: FormExplanation): Candidate[] {
  const out: Candidate[] = []
  view.parts.forEach((p, i) => {
    const t = p.token
    if (!t || t.slot !== exp.slot || (t.person ?? undefined) !== exp.person) return
    const member = t.lexemeIds.indexOf(exp.lexemeId)
    if (member < 0) return
    if (lower(memberText(p, member)) !== lower(exp.form)) return
    const annotation = t.focus ? SENTENCE_USAGE[view.sentence.id] : undefined
    out.push({ view, part: i, focus: t.focus, member, members: t.lexemeIds.length, ...(annotation ? { annotation } : {}) })
  })
  return out
}

function rank(c: Candidate): number {
  return (c.annotation ? 0 : 2) + (c.focus ? 0 : 1) + c.view.sentence.level / 100
}

function reasonText(reason: UsageReason, a: SentenceUsage, exp: FormExplanation, lexemeId: string, form: string): string {
  const lex = grammar.require(lexemeId)
  const e = englishNoun(lex.gloss.en, exp.number, { ...(a.sense ? { sense: a.sense } : {}), mass: lex.numberUse === 'mass' })
  const cue = a.cue
  return fill(reason.why, {
    form: fi(form),
    lemma: fi(lex.lemma),
    g: e.g,
    a: e.a,
    the: e.the,
    pl: e.pl,
    cue: cue ? fi(cue) : undefined,
    cueGloss: cue ? CUE_GLOSS[lower(cue)] : undefined,
    note: a.note,
  })
}

function explainCandidate(c: Candidate, exp: FormExplanation): UsageExplanation {
  const base = { sentenceId: c.view.sentence.id, view: c.view, part: c.part }
  const a = c.annotation
  if (!a) return { ...base, annotated: false, why: [] }
  const reason: UsageReason = USAGE_REASONS[a.reason]
  const why: string[] = []
  const token = c.view.parts[c.part]?.token
  const head = token && c.member < c.members - 1 ? token.lexemeIds[c.members - 1] : undefined
  if (head && token) {
    // An adjective or numeral inside a phrase: it agrees with its noun, which carries the reason.
    const headForm = memberText(c.view.parts[c.part] as RenderedPart, c.members - 1)
    why.push(
      `${fi(exp.form)} describes ${fi(headForm)} and agrees with it: an adjective or numeral takes the same case and number as its noun. ${fi(headForm)} is in the ${CASES_INFO[exp.caseId].en} for this reason:`,
    )
    why.push(reasonText(reason, a, exp, head, lower(headForm)))
  } else {
    why.push(reasonText(reason, a, exp, exp.lexemeId, exp.form))
  }
  if (a.note && a.reason !== 'fixed') why.push(a.note)
  if (a.numberNote && exp.number === 'pl') why.push(a.numberNote)
  else if (exp.number === 'pl' && !reason.explainsNumber && !head) {
    const lex = grammar.require(exp.lexemeId)
    why.push(`${fi(exp.form)} is plural because the sentence is about more than one ${a.sense ?? firstSense(lex.gloss.en)}.`)
  }
  const out: UsageExplanation = { ...base, annotated: true, title: reason.title, why }
  const cmp = a.compare && renderSentenceById(a.compare.sentenceId)
  if (a.compare && cmp) out.compare = { view: cmp, note: a.compare.note }
  return out
}

/**
 * The best example for a form. With `sentenceId` (the learner tapped a word in
 * that sentence), that sentence is used if it contains the form; otherwise the
 * best annotated focus sentence. Returns null when no sentence contains this
 * exact form.
 */
export function usageFor(exp: FormExplanation, opts: { sentenceId?: string } = {}): UsageExplanation | null {
  if (opts.sentenceId) {
    const view = renderSentenceById(opts.sentenceId)
    const c = view && candidatesIn(view, exp).sort((x, y) => rank(x) - rank(y))[0]
    if (c) return explainCandidate(c, exp)
  }
  const all = sentencesFor(exp.lexemeId, exp.slot).flatMap((v) => candidatesIn(v, exp))
  const best = all.sort((x, y) => rank(x) - rank(y))[0]
  return best ? explainCandidate(best, exp) : null
}

/** Every sentence containing the form (for audits). */
export function allUsages(exp: FormExplanation): UsageExplanation[] {
  return sentencesFor(exp.lexemeId, exp.slot)
    .flatMap((v) => candidatesIn(v, exp))
    .map((c) => explainCandidate(c, exp))
}

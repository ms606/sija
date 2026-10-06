import { inflect } from './inflect'
import { inflectPhrase } from './phrase'
import { withPossessive } from './possessive'
import { CASES, PERSONS, type CaseId, type Lexeme, type PersonId, type SlotKey } from './types'

/**
 * Example sentences are stored as templates; the engine produces every noun
 * form, so sentences can never disagree with the grammar. Token syntax:
 *
 *   {kauppa:ill}        → kauppaan        (lexeme id or unique lemma : slot)
 *   {*kauppa:ill}       → focus form (highlighted, used for blanks)
 *   {koira:pl.par}      → koiria          (plural slots start with "pl.")
 *   {uusi+auto:gen}     → uuden auton     (agreeing phrase)
 *   {talo:ine:1sg}      → talossani       (possessive suffix)
 *   {ruoka:gen#1}       → ruuan           (choose a variant by index)
 *   {maito:acc0}        → maito           (nominative-form object)
 *   {=kotona|koti}      → kotona          (lexicalised form, linked to a lexeme)
 *   {koira}             → koira           (nominative singular)
 *   {^suomi:ine}        → Suomessa        (capitalised: proper noun use)
 */

const ABBR: Record<string, CaseId> = {
  nom: 'nominative', gen: 'genitive', par: 'partitive', acc: 'accusative', ine: 'inessive',
  ela: 'elative', ill: 'illative', ade: 'adessive', abl: 'ablative', all: 'allative',
  ess: 'essive', tra: 'translative', abe: 'abessive', com: 'comitative', ins: 'instructive',
}
export const CASE_ABBR: Readonly<Record<CaseId, string>> = Object.fromEntries(
  Object.entries(ABBR).map(([k, v]) => [v, k]),
) as Record<CaseId, string>

export interface TemplateToken {
  raw: string
  focus: boolean
  /** Capitalise (proper-noun use: Suomi 'Finland'). */
  cap: boolean
  refs: string[]
  slot: SlotKey
  person?: PersonId
  variant: number
  literal?: string
}

export type TemplatePart = { kind: 'text'; text: string } | { kind: 'token'; token: TemplateToken }

export class TemplateError extends Error {}

export function parseToken(raw: string): TemplateToken {
  let body = raw
  let focus = false
  let cap = false
  while (body.startsWith('*') || body.startsWith('^')) {
    if (body.startsWith('*')) focus = true
    else cap = true
    body = body.slice(1)
  }
  if (body.startsWith('=')) {
    const [literal = '', rest = ''] = body.slice(1).split('|')
    const [ref = '', slotPart] = rest.split(':')
    const slot: SlotKey = slotPart ? parseSlotAbbr(slotPart, raw).slot : 'sg.nominative'
    return { raw, focus, cap, refs: [ref], slot, variant: 0, literal }
  }
  const [refPart = '', slotPart = 'nom', personPart] = body.split(':')
  const refs = refPart.split('+').filter(Boolean)
  if (refs.length === 0) throw new TemplateError(`Empty reference in {${raw}}`)
  const { slot, variant } = parseSlotAbbr(slotPart, raw)
  const token: TemplateToken = { raw, focus, cap, refs, slot, variant }
  if (personPart) {
    if (!(PERSONS as readonly string[]).includes(personPart)) throw new TemplateError(`Unknown person "${personPart}" in {${raw}}`)
    token.person = personPart as PersonId
  }
  return token
}

function parseSlotAbbr(s: string, raw: string): { slot: SlotKey; variant: number } {
  const [abbrPart = 'nom', idx] = s.split('#')
  let abbr = abbrPart
  let variant = idx ? Number(idx) : 0
  let number: 'sg' | 'pl' = 'sg'
  if (abbr.startsWith('pl.')) {
    number = 'pl'
    abbr = abbr.slice(3)
  }
  if (abbr === 'acc0') {
    abbr = 'acc'
    variant = number === 'sg' ? Math.max(variant, 1) : variant
  }
  const kase = ABBR[abbr]
  if (!kase || !(CASES as readonly string[]).includes(kase)) throw new TemplateError(`Unknown case "${abbr}" in {${raw}}`)
  return { slot: `${number}.${kase}`, variant }
}

export function parseTemplate(template: string): TemplatePart[] {
  const parts: TemplatePart[] = []
  const re = /\{([^}]+)\}/g
  let last = 0
  for (let m = re.exec(template); m; m = re.exec(template)) {
    if (m.index > last) parts.push({ kind: 'text', text: template.slice(last, m.index) })
    parts.push({ kind: 'token', token: parseToken(m[1] as string) })
    last = m.index + m[0].length
  }
  if (last < template.length) parts.push({ kind: 'text', text: template.slice(last) })
  return parts
}

export interface RenderedPart {
  text: string
  token?: TemplateToken & { lexemeIds: string[]; accepted: string[] }
}

export interface RenderedSentence {
  text: string
  parts: RenderedPart[]
}

function capitalize(s: string): string {
  return s.charAt(0).toLocaleUpperCase('fi-FI') + s.slice(1)
}

/** Renders a template with engine-generated forms. `resolve` maps a ref (id or lemma) to a lexeme. */
export function renderSentence(template: string, resolve: (ref: string) => Lexeme | undefined): RenderedSentence {
  const parts: RenderedPart[] = []
  for (const part of parseTemplate(template)) {
    if (part.kind === 'text') {
      parts.push({ text: part.text })
      continue
    }
    const t = part.token
    const lexemes = t.refs.map((ref) => {
      const lex = resolve(ref)
      if (!lex) throw new TemplateError(`Unknown lexeme "${ref}" in {${t.raw}}`)
      return lex
    })
    let accepted: string[]
    if (t.literal !== undefined) {
      accepted = [t.literal]
    } else if (lexemes.length > 1) {
      accepted = inflectPhrase(lexemes, t.slot, t.person).accepted
    } else {
      const lex = lexemes[0] as Lexeme
      const form = t.person ? withPossessive(lex, t.slot, t.person) : inflect(lex, t.slot)
      if (form.status === 'not-used') throw new TemplateError(`{${t.raw}}: ${t.slot} is not used`)
      accepted = form.variants.map((v) => v.text)
    }
    if (t.cap) accepted = accepted.map(capitalize)
    const text = accepted[t.variant] ?? accepted[0]
    if (!text) throw new TemplateError(`{${t.raw}} produced no form`)
    // Variant chosen explicitly goes first among the accepted answers.
    const ordered = [text, ...accepted.filter((a) => a !== text)]
    parts.push({ text, token: { ...t, lexemeIds: lexemes.map((l) => l.id), accepted: ordered } })
  }
  // Capitalise the first word of each sentence.
  let atStart = true
  for (const p of parts) {
    if (atStart && p.text.trim()) {
      const lead = p.text.length - p.text.trimStart().length
      p.text = p.text.slice(0, lead) + capitalize(p.text.slice(lead))
      atStart = false
    }
    if (/[.!?]\s*$/.test(p.text)) atStart = true
  }
  return { text: parts.map((p) => p.text).join(''), parts }
}

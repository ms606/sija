/**
 * Explanation audit: does the app explain every form it shows, from the
 * engine's own derivation, and do the general texts cite only examples that
 * really follow the rule they state?
 *
 *   npm run audit:explanations            base forms (all lexemes × 30 slots × variants)
 *   npm run audit:explanations -- --px    possessive forms too (~50k forms, slower)
 *
 * Writes tools/audit/out/explanations.{json,md} and prints a summary. Exits 1
 * when there are failures: an explanation that does not reproduce the engine's
 * form, pieces that do not spell the form, a named stem that is not one of the
 * word's stems, an invalid sentence annotation, or a rule text / rule note
 * whose example does not follow the rule. Missing sentence notes are gaps,
 * reported but not failures. Passing this audit does not mean the content is
 * linguistically verified: that needs native-speaker review (docs/NATIVE_REVIEW.md).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CASES_INFO } from '../../src/data/cases.ts'
import { GENERAL_RULES, PLURAL_ENDING_NOTES } from '../../src/data/explanations/general.ts'
import { RULES } from '../../src/data/explanations/rules.ts'
import { CUE_GLOSS, SENTENCE_USAGE, USAGE_REASONS, type UsageReason } from '../../src/data/explanations/usage.ts'
import { SENTENCES } from '../../src/data/sentences/index.ts'
import { ALL_SLOTS, PERSONS, parseSlot, type PersonId, type SlotKey } from '../../src/grammar/index.ts'
import { renderSentenceById } from '../../src/services/content/sentences.ts'
import { explainAllVariants, plain, samePattern, usageFor, type FormExplanation } from '../../src/services/explain/index.ts'
import { grammar } from '../../src/services/grammar.ts'

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out')
const withPx = process.argv.includes('--px')

interface Finding {
  check: string
  subject: string
  message: string
}
const failures: Finding[] = []
const gaps: Finding[] = []
const fail = (check: string, subject: string, message: string) => failures.push({ check, subject, message })
const gap = (check: string, subject: string, message: string) => gaps.push({ check, subject, message })

/* ------------------------------------------------------------------ */
/* E1–E3: every form, explained from its own derivation                */
/* ------------------------------------------------------------------ */

const coverage = { total: 0, complete: 0, partial: 0, recorded: 0, none: 0 }
const coveragePx = { total: 0, complete: 0, partial: 0, recorded: 0, none: 0 }
const issueKinds = new Map<string, number>()
let piecesMismatch = 0
let stepsMismatch = 0
const explained: FormExplanation[] = []

function record(exp: FormExplanation, bucket: typeof coverage) {
  bucket.total++
  if (exp.coverage === 'complete') bucket.complete++
  else if (exp.coverage === 'recorded') bucket.recorded++
  else bucket.partial++
  for (const issue of exp.issues) {
    const kind = issue.split(':')[0] as string
    issueKinds.set(kind, (issueKinds.get(kind) ?? 0) + 1)
    if (kind === 'pieces') piecesMismatch++
    if (kind === 'formula' || kind === 'stem' || kind === 'derivation') stepsMismatch++
    fail(`E1-${kind}`, `form:${exp.lexemeId}:${exp.slot}${exp.person ? `:${exp.person}` : ''}`, `${exp.form}: ${issue}`)
  }
  // E2: the explanation names this word and this form, not another one.
  const text = plain([...exp.summary, ...exp.steps.map((s) => s.text)].join(' '))
  if (!text.includes(exp.lemma) || !text.includes(exp.form)) {
    fail('E2-names-word', `form:${exp.lexemeId}:${exp.slot}`, `${exp.form}: the explanation does not name ${exp.lemma} and ${exp.form}`)
  }
}

for (const lex of grammar.lexicon) {
  for (const slot of ALL_SLOTS) {
    const all = explainAllVariants(lex.id, slot)
    if (all.length === 0 && grammar.inflect(lex, slot).status !== 'not-used') {
      coverage.none++
      fail('E1-none', `form:${lex.id}:${slot}`, 'no explanation')
    }
    for (const exp of all) {
      record(exp, coverage)
      explained.push(exp)
    }
    if (withPx && lex.pos === 'noun') {
      for (const person of PERSONS) for (const exp of explainAllVariants(lex.id, slot, person as PersonId)) record(exp, coveragePx)
    }
  }
}

/* ------------------------------------------------------------------ */
/* E4: "why this case here" — example sentences and their reasons      */
/* ------------------------------------------------------------------ */

const usage = { forms: 0, annotated: 0, sentenceOnly: 0, noSentence: 0 }
const usageByCase = new Map<string, { forms: number; annotated: number }>()
for (const exp of explained) {
  if (exp.register !== 'standard' || exp.coverage === 'recorded') continue
  usage.forms++
  const u = usageFor(exp)
  const c = usageByCase.get(exp.slot) ?? { forms: 0, annotated: 0 }
  c.forms++
  if (!u) usage.noSentence++
  else if (u.annotated) {
    usage.annotated++
    c.annotated++
  } else usage.sentenceOnly++
  usageByCase.set(exp.slot, c)
}

const annotations = { sentences: SENTENCES.length, annotated: 0, missing: [] as string[] }
for (const s of SENTENCES) {
  const a = SENTENCE_USAGE[s.id]
  const view = renderSentenceById(s.id)
  if (!view) continue
  const focus = view.parts.filter((p) => p.token?.focus)
  if (!a) {
    annotations.missing.push(s.id)
    gap('E4-no-reason', `sentence:${s.id}`, `no "why this case" note for: ${view.text}`)
    continue
  }
  annotations.annotated++
  const reason: UsageReason = USAGE_REASONS[a.reason]
  if (!reason) {
    fail('E4-reason', `sentence:${s.id}`, `unknown reason ${a.reason}`)
    continue
  }
  const token = focus[0]?.token
  if (!token) {
    fail('E4-focus', `sentence:${s.id}`, 'annotated sentence has no focus token')
    continue
  }
  const { kase, number } = parseSlot(token.slot)
  if (!reason.cases.includes(kase)) fail('E4-case', `sentence:${s.id}`, `reason ${a.reason} does not explain the ${kase}`)
  if (reason.number && reason.number !== number) fail('E4-number', `sentence:${s.id}`, `reason ${a.reason} is for the ${reason.number}, token is ${number}`)
  if (reason.needsCue && !a.cue) fail('E4-cue', `sentence:${s.id}`, `reason ${a.reason} needs a trigger word`)
  if (a.cue && !new RegExp(`(^|[^\\p{L}])${a.cue}([^\\p{L}]|$)`, 'u').test(view.text)) fail('E4-cue', `sentence:${s.id}`, `trigger "${a.cue}" is not in: ${view.text}`)
  if (reason.why.includes('{cueGloss}') && a.cue && !CUE_GLOSS[a.cue.toLocaleLowerCase('fi-FI')]) fail('E4-cue-gloss', `sentence:${s.id}`, `no meaning for trigger "${a.cue}"`)
  if (reason.needsNote && !a.note) fail('E4-note', `sentence:${s.id}`, `reason ${a.reason} needs a note`)
  if (reason.outerPlace) {
    const head = grammar.get(token.lexemeIds[token.lexemeIds.length - 1] as string)
    if (head && head.locative !== 'outer' && head.locative !== 'both') fail('E4-outer', `sentence:${s.id}`, `${head.lemma} is not marked as an outer-case place`)
  }
  if (a.compare && !renderSentenceById(a.compare.sentenceId)) fail('E4-compare', `sentence:${s.id}`, `compare sentence ${a.compare.sentenceId} does not exist`)
}
for (const id of Object.keys(SENTENCE_USAGE)) {
  if (!SENTENCES.some((s) => s.id === id)) fail('E4-orphan', `sentence:${id}`, 'annotation for a sentence that does not exist')
}

/* ------------------------------------------------------------------ */
/* E5: general texts and their examples                                */
/* ------------------------------------------------------------------ */

const DERIVATION_PREFIXES = ['ending.', 'plural.', 'stem.', 'grade.', 'spelling.', 'px.', 'acc.', 'exception.', 'irregular.', 'variant.']
/**
 * Forms a rule text cites on purpose as counter-examples ("not after the
 * genitive or illative: taloonsa"). Listed here, with the reason, so they are
 * reported as deliberate rather than silently skipped.
 */
const CONTRASTS: Readonly<Record<string, { words: string[]; why: string }>> = {
  'px.3.vn': { words: ['taloonsa', 'taloihinsa'], why: 'counter-examples: after the genitive and illative only -nsa/-nsä is used' },
}
const contrastNotes: string[] = []
const ruleChecks = { texts: 0, citations: 0, mismatched: 0 }
const typeCitations: string[] = []

function ruleIdsOf(lexemeId: string, slot: SlotKey, person?: PersonId): Set<string> {
  const lex = grammar.require(lexemeId)
  const form = person ? grammar.withPossessive(lex, slot, person) : grammar.inflect(lex, slot)
  return new Set(form.variants.flatMap((v) => v.steps.map((s) => s.ruleId)))
}

for (const [ruleId, text] of Object.entries(RULES)) {
  const derivational = DERIVATION_PREFIXES.some((p) => ruleId.startsWith(p))
  const typeRule = /^type\.k(\d+)\.membership$/.exec(ruleId)
  if (!derivational && !typeRule) continue
  ruleChecks.texts++
  // English texts cite Finnish forms as examples. Finnish texts are prose ("lyhyen vokaalin jälkeen"):
  // only their parenthesised examples are checked.
  const fiTexts = [text.beginner.fi, text.intermediate?.fi, text.advanced?.fi].filter((x): x is string => !!x)
  const strings = new Set([text.beginner.en, ...fiTexts.flatMap((t) => [...t.matchAll(/\(([^)]*)\)/g)].map((m) => m[1] as string))])
  for (const str of strings) {
    for (const m of str.matchAll(/[a-zåäö’]{3,}/giu)) {
      const word = m[0].toLocaleLowerCase('fi-FI')
      const at = m.index ?? 0
      // Ending notation (-isiin) and the input of an arrow (taloon → talooni) are not examples of the result.
      if (str[at - 1] === '-' || /^\s*→/.test(str.slice(at + m[0].length))) continue
      if (CONTRASTS[ruleId]?.words.includes(word)) {
        contrastNotes.push(`${ruleId}: "${word}" — ${CONTRASTS[ruleId]?.why}`)
        continue
      }
      // A base form cited as the starting point (koira → koiri-) is not a claim about the ending.
      const all = grammar.analyze(word).filter((h) => h.form === word)
      const hits = all.filter((h) => h.slot !== 'sg.nominative' && h.slot !== 'sg.accusative')
      if (typeRule) {
        // A word-type text names words (base forms too): each should belong to that type, unless it is a stated contrast.
        // "the kieli family" / "kieli-ryhmä" names a learning family, not a word.
        if (all.length === 0 || /^(\s+family|-ryhm)/.test(str.slice(at + m[0].length))) continue
        ruleChecks.citations++
        const types = [...new Set(all.map((h) => grammar.require(h.lexemeId).typeId))]
        if (!types.includes(`k${typeRule[1]}` as `k${number}`)) typeCitations.push(`${ruleId}: "${word}" is ${types.join('/')}`)
        continue
      }
      if (hits.length === 0) continue
      ruleChecks.citations++
      // The analyser indexes the -n and -t accusatives under the genitive and nominative they look like.
      const slotFor = (slot: SlotKey): SlotKey =>
        ruleId.startsWith('acc.') ? ((slot.startsWith('pl') ? 'pl.accusative' : 'sg.accusative') as SlotKey) : slot
      const ok = hits.some((h) => ruleIdsOf(h.lexemeId, slotFor(h.slot), h.person).has(ruleId))
      if (!ok) {
        ruleChecks.mismatched++
        fail('E5-rule-example', `rule:${ruleId}`, `cites "${word}", whose derivation does not use ${ruleId} (${hits.map((h) => `${h.lexemeId} ${h.slot}${h.person ? `+${h.person}` : ''}`).join(', ')})`)
      }
    }
  }
}

for (const [ruleId, text] of Object.entries(GENERAL_RULES)) {
  for (const m of text.matchAll(/[a-zåäö’]{3,}/giu)) {
    const word = m[0].toLocaleLowerCase('fi-FI')
    if (grammar.analyze(word).some((h) => h.form === word && h.slot !== 'sg.nominative')) {
      fail('E5-general-example', `general:${ruleId}`, `general rule cites "${word}": general rules take their examples from the engine`)
    }
  }
}

for (const note of PLURAL_ENDING_NOTES) {
  for (const e of note.examples) {
    const v = grammar.inflect(grammar.require(e.lexemeId), e.slot).variants[0]
    const ids = new Set(v?.steps.map((s) => s.ruleId) ?? [])
    const glide = ids.has('spelling.plural-glide')
    if (!ids.has(e.rule) || (e.glide !== undefined && e.glide !== glide)) {
      fail('E5-note-example', `note:${note.text}`, `${e.lexemeId} ${e.slot} (${v?.text}) does not show ${e.rule}${e.glide !== undefined ? `, glide=${e.glide}` : ''}`)
    }
  }
}

/* E6: same-pattern examples really share the derivation of the explained variant */
let patternChecked = 0
for (const exp of explained.filter((_, i) => i % 5 === 0)) {
  const own = exp.steps.map((s) => s.ruleId).filter((r) => r.startsWith('ending.') || r.startsWith('plural.') || r.startsWith('stem.') || r.startsWith('grade.'))
  for (const p of samePattern(exp)) {
    patternChecked++
    const other = grammar.inflect(grammar.require(p.lexemeId), exp.slot).variants.find((v) => v.text === p.form)
    const ids = new Set(other?.steps.map((s) => s.ruleId) ?? [])
    const missing = own.filter((r) => !ids.has(r))
    if (missing.length) fail('E6-same-pattern', `form:${exp.lexemeId}:${exp.slot}`, `${exp.form}: example ${p.form} lacks ${missing.join(', ')}`)
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const pct = (n: number, d: number) => (d === 0 ? '—' : `${((100 * n) / d).toFixed(1)} %`)
const lines: string[] = []
lines.push('# Explanation audit', '')
lines.push(`Generated by \`npm run audit:explanations${withPx ? ' -- --px' : ''}\`. Automated checks only: this is **not** a linguistic verification. Native-speaker review status is tracked separately (docs/NATIVE_REVIEW.md).`, '')
lines.push('## Word-specific explanations (derivation)', '')
lines.push('| Forms | Total | Complete, derivation-backed | Partial | Recorded (memorized, no derivation claimed) | No explanation |', '|---|---|---|---|---|---|')
lines.push(`| Base forms (all slots, all variants) | ${coverage.total} | ${coverage.complete} (${pct(coverage.complete, coverage.total)}) | ${coverage.partial} | ${coverage.recorded} | ${coverage.none} |`)
if (withPx) lines.push(`| Possessive forms | ${coveragePx.total} | ${coveragePx.complete} (${pct(coveragePx.complete, coveragePx.total)}) | ${coveragePx.partial} | ${coveragePx.recorded} | ${coveragePx.none} |`)
lines.push('', `Mismatched visual pieces: ${piecesMismatch}. Mismatched derivation steps (formula, stem or result): ${stepsMismatch}.`, '')
lines.push('## "Why this case here?" (usage in a sentence)', '')
lines.push(`Standard forms: ${usage.forms}. With an annotated example sentence: ${usage.annotated} (${pct(usage.annotated, usage.forms)}). With a sentence but no note: ${usage.sentenceOnly}. With no example sentence: ${usage.noSentence} — these show the general meaning of the case, labelled as general.`, '')
lines.push(`Sentences: ${annotations.sentences}; with a reason for their focus word: ${annotations.annotated} (${pct(annotations.annotated, annotations.sentences)}).`, '')
lines.push('| Slot | Forms | With an annotated example |', '|---|---|---|')
for (const slot of ALL_SLOTS) {
  const c = usageByCase.get(slot)
  if (c) lines.push(`| ${slot} (${CASES_INFO[parseSlot(slot).kase].en}) | ${c.forms} | ${c.annotated} (${pct(c.annotated, c.forms)}) |`)
}
lines.push('', '## General texts', '')
lines.push(`Rule texts checked: ${ruleChecks.texts}; Finnish forms cited in them: ${ruleChecks.citations}; cited forms whose derivation does not use the rule: ${ruleChecks.mismatched}.`)
lines.push(`Same-pattern examples checked: ${patternChecked}.`, '')
if (contrastNotes.length) {
  lines.push('Deliberate counter-examples in rule texts:', '')
  for (const t of contrastNotes) lines.push(`- ${t}`)
  lines.push('')
}
if (typeCitations.length) {
  lines.push('Word-type texts that mention words of another type (usually deliberate contrasts — check the wording):', '')
  for (const t of typeCitations) lines.push(`- ${t}`)
  lines.push('')
}
lines.push(`## Failures (${failures.length})`, '')
for (const f of failures.slice(0, 300)) lines.push(`- **${f.check}** ${f.subject}: ${f.message}`)
lines.push('', `## Gaps (${gaps.length})`, '')
lines.push('Sentences without a "why this case" note (the app then shows the sentence with the general meaning of the case):', '')
lines.push(annotations.missing.join(', ') || '—')

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'explanations.md'), `${lines.join('\n')}\n`)
writeFileSync(
  join(OUT, 'explanations.json'),
  JSON.stringify({ coverage, coveragePx: withPx ? coveragePx : null, piecesMismatch, stepsMismatch, usage, annotations, ruleChecks, typeCitations, failures, gaps }, null, 1),
)

console.log(`Explanations: ${coverage.complete}/${coverage.total} base forms complete (${pct(coverage.complete, coverage.total)}), ${coverage.partial} partial, ${coverage.recorded} recorded, ${coverage.none} none`)
if (withPx) console.log(`  possessive forms: ${coveragePx.complete}/${coveragePx.total} complete, ${coveragePx.partial} partial, ${coveragePx.recorded} recorded`)
console.log(`  mismatched pieces: ${piecesMismatch}, mismatched derivation steps: ${stepsMismatch}`)
console.log(`Usage: ${usage.annotated}/${usage.forms} standard forms have an annotated example (${pct(usage.annotated, usage.forms)}); ${usage.sentenceOnly} sentence without note; ${usage.noSentence} no sentence`)
console.log(`  sentences annotated: ${annotations.annotated}/${annotations.sentences}`)
console.log(`Rule texts: ${ruleChecks.citations} cited forms checked, ${ruleChecks.mismatched} do not follow their rule; ${typeCitations.length} type-text mentions to review`)
console.log(`Failures: ${failures.length}. Gaps: ${gaps.length}. Report: tools/audit/out/explanations.md`)
if (failures.length > 0) {
  for (const f of failures.slice(0, 40)) console.log(`  ✗ ${f.check} ${f.subject}: ${f.message}`)
  process.exitCode = 1
}

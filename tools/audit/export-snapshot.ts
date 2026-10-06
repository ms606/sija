/**
 * Exports everything the grammar audit (tools/audit/*.py) inspects into one
 * JSON snapshot: the lexicon with its content fields, every engine form with
 * its coloured pieces (possessives included), the rendered example sentences
 * with their tokens, what the curriculum and case pages reference, and all
 * hand-written Finnish copy (lesson text, YKI model answers, glossary…).
 *
 * The audits never import the app; they only read this file.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CASES_INFO } from '../../src/data/cases.ts'
import { LESSONS, LEVELS } from '../../src/data/curriculum/index.ts'
import { DIAGNOSES } from '../../src/data/explanations/diagnoses.ts'
import { RULES } from '../../src/data/explanations/rules.ts'
import { GLOSSARY } from '../../src/data/glossary.ts'
import { GRADATION_INFO, NO_GRADATION_NOTES } from '../../src/data/gradation-patterns.ts'
import { LEXICON } from '../../src/data/lexicon/index.ts'
import { FAMILIES, I_GROUP_INFO, MINIMAL_PAIRS } from '../../src/data/noun-families.ts'
import { SENTENCES } from '../../src/data/sentences/index.ts'
import { YKI_DOMAINS } from '../../src/data/yki/index.ts'
import { ALL_SLOTS, createGrammar, DECLENSION_TYPES, GRADATION_PATTERNS, PERSONS } from '../../src/grammar/index.ts'
import type { FormVariant, NounForm, PersonId, SlotKey } from '../../src/grammar/types.ts'
import type { LessonBlock } from '../../src/types/curriculum.ts'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out', 'snapshot.json')
const grammar = createGrammar(LEXICON)

/** [text, role, grade?] — compact, since there are tens of thousands of forms. */
type PieceRow = [string, string] | [string, string, string]

const variant = (v: FormVariant) => ({
  text: v.text,
  register: v.register,
  pieces: v.pieces.map((p): PieceRow => (p.grade ? [p.text, p.role, p.grade] : [p.text, p.role])),
})

const formOf = (f: NounForm) => ({
  status: f.status,
  ...(f.statusRuleId ? { statusRuleId: f.statusRuleId } : {}),
  variants: f.variants.map(variant),
})

const SLOTS = ALL_SLOTS.filter((s) => !s.endsWith('.accusative'))

const lexicon = LEXICON.map((n) => {
  const paradigm: Record<string, ReturnType<typeof formOf>> = {}
  const possessives: Record<string, Partial<Record<PersonId, ReturnType<typeof variant>[]>>> = {}
  for (const slot of SLOTS) {
    const f = grammar.inflect(n, slot)
    paradigm[slot] = formOf(f)
    // The same forms the app's analyser indexes: nouns, every used slot.
    if (n.pos !== 'noun' || f.status === 'not-used') continue
    possessives[slot] = Object.fromEntries(PERSONS.map((p) => [p, grammar.withPossessive(n, slot, p).variants.map(variant)]))
  }
  const harmony = grammar.harmony(n)
  return {
    id: n.id,
    lemma: n.lemma,
    pos: n.pos,
    typeId: n.typeId,
    kotus: n.kotus,
    gradation: n.gradation ?? null,
    compound: n.compound ?? null,
    declaredHarmony: n.harmony ?? null,
    harmony: { value: harmony.harmony, decidingPart: harmony.decidingPart, ruleId: harmony.ruleId },
    gloss: n.gloss,
    semantics: n.semantics,
    locative: n.locative ?? null,
    themes: n.themes,
    level: n.level,
    frequency: n.frequency,
    image: { emoji: n.image?.emoji ?? null, illustration: n.image?.illustration ?? null, photo: Boolean(n.image?.photo) },
    homonyms: n.homonyms ?? [],
    notes: n.notes ?? [],
    numberUse: n.numberUse ?? 'both',
    overrides: (n.overrides ?? []).map((o) => ({ slot: o.slot, forms: o.forms, mode: o.mode, label: o.label })),
    provenance: n.provenance,
    paradigm,
    possessives,
  }
})

const sentences = SENTENCES.map((s) => {
  const base = { id: s.id, template: s.fi, en: s.en, register: s.register, level: s.level, tags: s.tags, provenance: s.provenance }
  try {
    const r = grammar.renderSentence(s.fi)
    return {
      ...base,
      text: r.text,
      parts: r.parts.map((p) =>
        p.token
          ? {
              text: p.text,
              token: {
                raw: p.token.raw,
                focus: p.token.focus,
                refs: p.token.refs,
                lexemeIds: p.token.lexemeIds,
                slot: p.token.slot,
                person: p.token.person ?? null,
                variant: p.token.variant,
                literal: p.token.literal ?? null,
                accepted: p.token.accepted,
              },
            }
          : { text: p.text },
      ),
    }
  } catch (e) {
    return { ...base, text: null, parts: [], error: e instanceof Error ? e.message : String(e) }
  }
})

/* ------------------------------------------------------------------ */
/* What lessons reference                                              */
/* ------------------------------------------------------------------ */

interface LessonRef {
  lexemeId: string
  slot?: SlotKey
  person?: PersonId
  where: string
}

function blockRefs(b: LessonBlock, where: string): { words: LessonRef[]; sentenceIds: string[] } {
  const words: LessonRef[] = []
  const ref = (lexemeId: string, extra: Omit<LessonRef, 'lexemeId' | 'where'> = {}) => words.push({ lexemeId, where, ...extra })
  const sentenceIds: string[] = []
  switch (b.kind) {
    case 'pipeline':
      ref(b.nounId, { slot: b.slot, ...(b.person ? { person: b.person } : {}) })
      break
    case 'builder':
    case 'possessives':
      ref(b.nounId, { slot: b.slot })
      break
    case 'paradigm':
    case 'grade-map':
      ref(b.nounId)
      break
    case 'gradation':
      if (b.nounId) ref(b.nounId)
      break
    case 'compare':
      for (const id of b.nounIds) for (const slot of b.slots) ref(id, { slot })
      break
    case 'endings':
      for (const id of b.words) ref(id, { slot: b.slot })
      break
    case 'plural-stems':
      for (const id of b.words ?? []) ref(id)
      break
    case 'forms':
      for (const it of b.items) ref(it.nounId, { slot: it.slot, ...(it.person ? { person: it.person } : {}) })
      break
    case 'quick-check':
      for (const id of b.spec.words ?? []) ref(id)
      break
    case 'examples':
      sentenceIds.push(...b.sentenceIds)
      break
    default:
      break
  }
  return { words, sentenceIds }
}

const lessons = LESSONS.map((l) => {
  const words: LessonRef[] = []
  const sentenceIds: string[] = []
  l.blocks.forEach((b, i) => {
    const r = blockRefs(b, `blocks[${i}].${b.kind}`)
    words.push(...r.words)
    sentenceIds.push(...r.sentenceIds)
  })
  for (const id of l.check.words ?? []) words.push({ lexemeId: id, where: 'check' })
  return { id: l.id, level: l.level, title: l.title.en, advanced: l.advanced ?? false, words, sentenceIds }
})

const cases = Object.values(CASES_INFO).map((c) => ({
  id: c.id,
  demoNounId: c.demoNounId,
  demoSlot: c.demoSlot,
  usages: c.usages.map((u) => ({ title: u.title.en, sentenceIds: u.sentenceIds })),
}))

/* ------------------------------------------------------------------ */
/* Hand-written Finnish copy                                           */
/* ------------------------------------------------------------------ */

interface CopyItem {
  source: string
  path: string
  kind: 'copy' | 'term' | 'model-answer' | 'prompt' | 'correction'
  text: string
}

const copy: CopyItem[] = []
const seen = new Set<string>()

function addCopy(item: CopyItem) {
  const key = `${item.source}\u0000${item.text}`
  if (seen.has(key) || !item.text.trim()) return
  seen.add(key)
  copy.push(item)
}

/** Every `fi` string of a LocalizedText (an object that also has `en`), anywhere in `value`. */
function collectFi(value: unknown, source: string, path: string) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectFi(v, source, `${path}[${i}]`))
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.fi === 'string' && 'en' in obj) addCopy({ source, path: `${path}.fi`, kind: 'copy', text: obj.fi })
    for (const [k, v] of Object.entries(obj)) if (k !== 'fi') collectFi(v, source, path ? `${path}.${k}` : k)
  }
}

for (const l of LESSONS) collectFi(l, `lesson:${l.id}`, '')
for (const l of LEVELS) collectFi(l, `level:${l.id}`, '')
for (const c of Object.values(CASES_INFO)) {
  collectFi(c, `case:${c.id}`, '')
  // `wrong` is a deliberate mistake and is never checked; `right` must be correct Finnish.
  c.mistakes.forEach((m, i) => addCopy({ source: `case:${c.id}`, path: `mistakes[${i}].right`, kind: 'correction', text: m.right }))
}
for (const [id, text] of Object.entries(RULES)) collectFi(text, `rule:${id}`, '')
for (const [id, text] of Object.entries(DIAGNOSES)) collectFi(text, `diagnosis:${id}`, '')
for (const g of GLOSSARY) addCopy({ source: `glossary:${g.fi}`, path: 'fi', kind: 'term', text: g.fi })
for (const g of GRADATION_INFO) collectFi(g, `gradation:${g.id}`, '')
NO_GRADATION_NOTES.forEach((n, i) => collectFi(n, `no-gradation-note:${i}`, ''))
for (const g of Object.values(I_GROUP_INFO)) collectFi(g, `i-group:${g.id}`, '')
for (const f of FAMILIES) collectFi(f, `family:${f.id}`, '')
for (const p of MINIMAL_PAIRS) collectFi(p, `minimal-pair:${p.a}/${p.b}`, '')
for (const d of YKI_DOMAINS) {
  collectFi(d, `yki:${d.id}`, '')
  addCopy({ source: `yki:${d.id}`, path: 'writing.model', kind: 'model-answer', text: d.writing.model })
  d.speaking.forEach((q, i) => addCopy({ source: `yki:${d.id}`, path: `speaking[${i}]`, kind: 'prompt', text: q }))
}
for (const n of LEXICON) if (n.gloss.fi) addCopy({ source: `lexeme:${n.id}`, path: 'gloss.fi', kind: 'copy', text: n.gloss.fi })

const snapshot = {
  generatedAt: new Date().toISOString(),
  slots: SLOTS,
  persons: PERSONS,
  gradationPatterns: GRADATION_PATTERNS,
  types: Object.fromEntries(
    Object.values(DECLENSION_TYPES).map((t) => [t.id, { kotus: t.kotus, modelWord: t.modelWord, gradation: t.gradation, iGroup: t.iGroup ?? null }]),
  ),
  lexicon,
  sentences,
  lessons,
  cases,
  copy,
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(snapshot))
const forms = lexicon.reduce((n, l) => n + Object.values(l.paradigm).reduce((m, f) => m + f.variants.length, 0), 0)
const pxForms = lexicon.reduce(
  (n, l) => n + Object.values(l.possessives).reduce((m, byPerson) => m + Object.values(byPerson).reduce((k, vs) => k + (vs?.length ?? 0), 0), 0),
  0,
)
console.log(
  `Snapshot: ${lexicon.length} lexemes, ${forms} forms, ${pxForms} possessive forms, ${sentences.length} sentences, ` +
    `${lessons.length} lessons, ${copy.length} Finnish copy strings → ${out}`,
)

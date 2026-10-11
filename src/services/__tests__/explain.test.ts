import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GENERAL_RULES, PLURAL_ENDING_NOTES } from '../../data/explanations/general'
import { RULES } from '../../data/explanations/rules'
import { CUE_GLOSS, SENTENCE_USAGE, USAGE_REASONS, type UsageReason } from '../../data/explanations/usage'
import { STEP_TEMPLATES } from '../../data/explanations/walkthrough'
import { SENTENCES } from '../../data/sentences'
import { ALL_SLOTS, parseSlot, type SlotKey } from '../../grammar'
import { renderSentenceById } from '../content/sentences'
import { compareForms, explainAllVariants, explainForm, generalRules, plain, samePattern, signature, usageFor, type FormExplanation } from '../explain'
import { grammar } from '../grammar'

const req = (lexemeId: string, slot: SlotKey, opts: Parameters<typeof explainForm>[2] = {}): FormExplanation => {
  const e = explainForm(lexemeId, slot, opts)
  if (!e) throw new Error(`no explanation for ${lexemeId} ${slot}`)
  return e
}
const allText = (e: FormExplanation) => plain([...e.summary, ...e.steps.map((s) => s.text)].join(' '))
const visible = (e: FormExplanation) => e.pieces.filter((p) => !p.ghost)

/** Every base-form explanation, computed once. */
const EVERY: FormExplanation[] = grammar.lexicon.flatMap((lex) => ALL_SLOTS.flatMap((slot) => explainAllVariants(lex.id, slot)))

describe('1. opettaja → opettajia', () => {
  const e = req('opettaja', 'pl.partitive')
  it('names the word, its meaning and the form', () => {
    expect(e.lemma).toBe('opettaja')
    expect(e.gloss).toBe('teacher')
    expect(e.form).toBe('opettajia')
    expect(e.formLabel).toBe('partitive plural')
    expect(plain(e.summary[0] as string)).toBe('opettajia is the partitive plural of opettaja "teacher".')
  })
  it('builds the plural stem opettaji- from opettaja by replacing the final -a, not by adding an i', () => {
    expect(e.stemKind).toBe('plural')
    expect(e.stem).toBe('opettaji')
    expect(e.chain.map((n) => n.text)).toEqual(['opettaja', 'opettaji-', 'opettajia'])
    expect(e.chain[1]?.label).toBe('plural stem')
    const plural = e.steps.find((s) => s.kind === 'plural')
    expect(plain(plural!.text)).toContain('opettaja- → opettaj- + i → opettaji-')
    expect(plain(plural!.text)).toContain('the final -a of the stem drops')
  })
  it('identifies -a as the partitive ending and i as the plural marker', () => {
    expect(e.formula.parts.map((p) => [p.text, p.label])).toEqual([
      ['opettaji-', 'plural stem'],
      ['-a', 'partitive ending'],
    ])
    expect(visible(e).map((p) => [p.text, p.label])).toEqual([
      ['opettaj', 'unchanged'],
      ['i', 'plural marker'],
      ['a', 'partitive ending'],
    ])
    // The dropped a is a marker, never a visible letter: the word is not opettaj-a-i-a.
    expect(e.pieces.find((p) => p.ghost)).toMatchObject({ was: 'a', role: 'stem' })
  })
  it('explains the sentence: paljon takes the partitive, and the form is plural because there are many teachers', () => {
    const u = usageFor(e)!
    expect(u.view.text).toBe('Koulussa on paljon opettajia.')
    expect(u.view.sentence.en).toBe('There are many teachers at the school.')
    const why = u.why.map(plain).join(' ')
    expect(why).toContain('paljon ("a lot, many") expresses an amount')
    expect(why).toContain('opettajia is plural')
    expect(u.compare?.view.text).toBe('Koulussa on kaksi opettajaa.')
  })
  it('the generic plural-partitive note no longer groups taloja and kieliä as one -ja/-jä pattern', () => {
    expect(RULES['ending.partitive-pl.a']?.beginner.en).not.toMatch(/-ja\/-jä between vowels: taloja; kieliä/)
    const rules = generalRules(e).map((r) => r.text).join(' ')
    expect(rules).toContain('After a consonant, the plural i stays i')
    expect(rules).not.toContain('written j')
    for (const p of samePattern(e)) expect(req(p.lexemeId, 'pl.partitive').steps.some((s) => s.ruleId === 'spelling.plural-glide')).toBe(false)
  })
})

describe('2. lääkäri → lääkäriksi', () => {
  const e = req('lääkäri', 'sg.translative')
  it('uses the stem lääkäri- and the translative ending -ksi', () => {
    expect(e.stemKind).toBe('vowel')
    expect(e.stem).toBe('lääkäri')
    expect(e.ending).toBe('ksi')
    expect(e.chain.map((n) => n.text)).toEqual(['lääkäri', 'lääkäri-', 'lääkäriksi'])
    expect(e.formula.parts.map((p) => p.text)).toEqual(['lääkäri-', '-ksi'])
    expect(visible(e).map((p) => [p.text, p.label])).toEqual([
      ['lääkäri', 'unchanged'],
      ['ksi', 'translative ending'],
    ])
  })
  it('says explicitly that consonant gradation does not apply, and why, without an unrelated word', () => {
    expect(e.gradation.applies).toBe(false)
    expect(plain(e.gradation.text)).toContain('the consonant before the last vowel of the stem is r (lää·kä·ri)')
    expect(plain(e.gradation.text)).toContain('The k earlier in lääkäri is not at that position')
    expect(allText(e)).not.toMatch(/kauppa|kaupa/)
  })
  it('explains the sentence and contrasts it with Hän on lääkäri', () => {
    const u = usageFor(e)!
    expect(u.view.text).toBe('Hän opiskelee lääkäriksi.')
    expect(u.title).toBe('Becoming, the result of a change')
    expect(u.why.map(plain).join(' ')).toContain('They are not a doctor yet')
    expect(u.compare?.view.text).toBe('Hän on lääkäri.')
    expect(u.compare?.note).toContain('base form (nominative)')
  })
  it('builds the plural lääkäreiksi from the plural stem lääkärei- + -ksi, not from an ending -iksi', () => {
    const pl = req('lääkäri', 'pl.translative')
    expect(pl.stem).toBe('lääkärei')
    expect(pl.formula.parts.map((p) => p.text)).toEqual(['lääkärei-', '-ksi'])
    expect(visible(pl).map((p) => [p.text, p.label])).toEqual([
      ['lääkär', 'unchanged'],
      ['e', 'stem change'],
      ['i', 'plural marker'],
      ['ksi', 'translative ending'],
    ])
    expect(plain(pl.steps.find((s) => s.kind === 'plural')!.text)).toContain('lääkäri- → lääkäre- + i → lääkärei-')
  })
})

describe('3–5. every form is explained from its own derivation', () => {
  it('covers every base form with no self-check issue', () => {
    const bad = EVERY.filter((e) => e.issues.length > 0).map((e) => `${e.lexemeId} ${e.slot} ${e.form}: ${e.issues.join(', ')}`)
    expect(bad).toEqual([])
    expect(EVERY.length).toBeGreaterThan(9000)
  })
  it('3. the visible pieces spell exactly the form', () => {
    for (const e of EVERY) expect(visible(e).map((p) => p.text).join(''), `${e.lexemeId} ${e.slot}`).toBe(e.form)
  })
  it('4. every named intermediate form is one the engine produced, and the named stem is one of the word\'s stems', () => {
    for (const e of EVERY) {
      if (e.coverage === 'recorded') continue
      const lex = grammar.require(e.lexemeId)
      const v = grammar.inflect(lex, e.slot).variants.find((x) => x.text === e.form)!
      const produced = new Set([lex.lemma, e.form, ...v.steps.flatMap((s) => [s.before, s.after])])
      for (const n of e.chain) expect(produced.has(n.text.replace(/-$/, '')), `${e.form}: chain ${n.text}`).toBe(true)
      const st = grammar.stems(lex)
      const stems = [lex.lemma, st.vowelStrong.text, st.vowelWeak.text, st.consonant?.text, ...st.plural.flatMap((p) => [p.strong, p.weak]), ...st.alt.flatMap((a) => [a.vowelWeak, a.pluralWeak])]
      expect(stems.includes(e.stem), `${e.form}: stem ${e.stem}`).toBe(true)
    }
  })
  it('5. names the selected word and form, never another word of the lexicon', () => {
    for (const e of EVERY) {
      const text = allText(e)
      expect(text, e.form).toContain(e.lemma)
      expect(text, e.form).toContain(e.form)
    }
    // Finnish words in the text belong to this word (or are its type's model word / compound parts).
    for (const e of EVERY.filter((_, i) => i % 3 === 0)) {
      const lex = grammar.require(e.lexemeId)
      // The word itself, its compound head, and homographs (kuusi 'spruce' / kuusi 'six' share forms).
      const allowed = new Set([lex.id, lex.compound?.headId, ...grammar.byLemma(lex.lemma).map((l) => l.id)].filter(Boolean))
      const model = grammar.type(lex).modelWord
      for (const s of [...e.summary, ...e.steps.map((x) => x.text)]) {
        // Whole words only: a stem written with a hyphen (kuut-) is checked by test 4 and may look like another word.
        for (const m of s.matchAll(/⟦([^⟧]+)⟧(?!-)/g)) {
          const word = (m[1] as string).replace(/·/g, '')
          if (word.endsWith('-') || word.startsWith('-')) continue
          if (word.length < 4 || word === model || word === lex.compound?.modifier) continue
          const hits = grammar.analyze(word).filter((h) => h.form === word)
          if (hits.length === 0) continue
          expect(hits.some((h) => allowed.has(h.lexemeId)), `${e.form}: mentions ${word}`).toBe(true)
        }
      }
    }
  })
  it('has a word-specific template for every rule id the engine emits', () => {
    const missing = new Set<string>()
    for (const e of EVERY) for (const i of e.issues) if (i.startsWith('missing-template')) missing.add(i)
    expect([...missing]).toEqual([])
    for (const id of Object.keys(STEP_TEMPLATES)) expect(STEP_TEMPLATES[id]!.text).not.toMatch(/\{\w+\}-\s*→\s*\{mid\}/)
  })
})

describe('6. general rules and their examples', () => {
  it('rule notes cite only examples whose derivation shows the stated pattern', () => {
    for (const note of PLURAL_ENDING_NOTES) {
      for (const ex of note.examples) {
        const v = grammar.inflect(grammar.require(ex.lexemeId), ex.slot).variants[0]!
        const ids = v.steps.map((s) => s.ruleId)
        expect(ids, `${note.text} ${v.text}`).toContain(ex.rule)
        if (ex.glide !== undefined) expect(ids.includes('spelling.plural-glide'), `${note.text} ${v.text}`).toBe(ex.glide)
      }
    }
  })
  it('general rules do not cite example words of their own', () => {
    for (const [id, text] of Object.entries(GENERAL_RULES)) {
      for (const m of text.matchAll(/[a-zåäö]{4,}/g)) {
        const hits = grammar.analyze(m[0]).filter((h) => h.form === m[0] && h.slot !== 'sg.nominative')
        expect(hits, `${id}: ${m[0]}`).toEqual([])
      }
    }
  })
  it('same-pattern examples are derived with exactly the same steps', () => {
    for (const e of EVERY.filter((_, i) => i % 11 === 0)) {
      const own = grammar.inflect(grammar.require(e.lexemeId), e.slot).variants.find((v) => v.text === e.form)!
      for (const p of samePattern(e)) {
        const other = grammar.inflect(grammar.require(p.lexemeId), e.slot).variants.find((v) => v.text === p.form)!
        expect(signature(other), `${e.form} vs ${p.form}`).toBe(signature(own))
      }
    }
  })
})

describe('7. labels separate case endings from stem changes and number marking', () => {
  it('labels every piece by its role, with the case name on case endings', () => {
    for (const e of EVERY) {
      for (const p of visible(e)) {
        if (p.role === 'ending') expect(p.label, e.form).toMatch(/ ending( \(exception\))?$/)
        if (p.role === 'plural') expect(p.label, e.form).toMatch(/^plural/)
        if (p.role === 'stem') expect(p.label).toBe('stem change')
        if (p.role === 'grade') expect(p.label).toMatch(/^(weak|strong) grade$/)
      }
    }
  })
  it('never includes the plural marker in a case ending', () => {
    for (const e of EVERY.filter((x) => x.stemKind === 'plural' && x.coverage === 'complete')) {
      const ending = e.formula.parts.find((p) => p.role === 'ending')
      if (!ending) continue
      const pieces = visible(e)
      expect(pieces.some((p) => p.role === 'plural'), e.form).toBe(true)
      const endingPieces = pieces.filter((p) => p.role === 'ending').map((p) => p.text).join('')
      expect(ending.text.replace(/^-/, ''), e.form).toBe(endingPieces)
    }
  })
})

describe('8. recorded, rare and alternative forms', () => {
  it('meri → merta: a regular stem with a recorded ending, not a regular derivation', () => {
    const e = req('meri', 'sg.partitive')
    expect(e.coverage).toBe('recorded')
    expect(e.formula.parts.map((p) => [p.text, p.label])).toEqual([
      ['mer-', 'consonant stem'],
      ['-ta', 'partitive ending (exception)'],
    ])
    expect(e.formula.note).toContain('*mertä')
    expect(plain(e.summary.join(' '))).toContain('instead of the regular -tä')
  })
  it('vuosi → vuonna: learned as a whole word, with no invented derivation', () => {
    const e = req('vuosi', 'sg.essive', { variantText: 'vuonna' })
    expect(e.coverage).toBe('recorded')
    expect(e.pieces).toHaveLength(1)
    expect(e.chain.map((n) => n.text)).toEqual(['vuosi', 'vuonna'])
    expect(e.steps.map((s) => s.kind)).toEqual(['lemma', 'type', 'override', 'result'])
    expect(e.rough).toBeUndefined()
  })
  it('kotona (a lexicalised form in a sentence) is explained as recorded, not as koti\'s regular essive', () => {
    const e = req('koti', 'sg.essive', { variantText: 'kotona' })
    expect(e.coverage).toBe('recorded')
    expect(e.steps).toEqual([])
    expect(allText(e)).not.toContain('kotina')
    expect(plain(e.summary.join(' '))).toContain('learn as a word')
  })
  it('marks variants and rare plurals', () => {
    expect(req('ruoka', 'sg.genitive', { variantText: 'ruuan' }).register).toBe('variant')
    expect(req('ruoka', 'sg.genitive').alternatives.map((a) => a.text)).toContain('ruuan')
    const rare = req('maito', 'pl.partitive')
    expect(rare.status).toBe('rare')
    expect(rare.statusNote).toBeTruthy()
  })
})

describe('9. the explanation follows the selection', () => {
  it('changing word, case or number gives the explanation of exactly that form', () => {
    const picks: [string, SlotKey, string][] = [
      ['lääkäri', 'sg.translative', 'lääkäriksi'],
      ['lääkäri', 'pl.translative', 'lääkäreiksi'],
      ['lääkäri', 'sg.essive', 'lääkärinä'],
      ['opettaja', 'sg.translative', 'opettajaksi'],
      ['kauppa', 'sg.translative', 'kaupaksi'],
      ['lääkäri', 'sg.translative', 'lääkäriksi'],
    ]
    for (const [id, slot, form] of picks) {
      const e = req(id, slot)
      expect(e.form).toBe(form)
      expect(e.slot).toBe(slot)
      expect(e.lexemeId).toBe(id)
      expect(plain(e.summary[0] as string)).toContain(`${form} is the ${parseSlot(slot).kase}`)
    }
    expect(req('kauppa', 'sg.translative').gradation.applies).toBe(true)
    expect(req('lääkäri', 'sg.translative').gradation.applies).toBe(false)
  })
  it('a tapped sentence is the one explained', () => {
    const e = req('lääkäri', 'sg.ablative')
    expect(usageFor(e, { sentenceId: 'e.3' })?.sentenceId).toBe('e.3')
    expect(usageFor(e, { sentenceId: 'c.abl.5' })?.sentenceId).toBe('c.abl.5')
  })
  it('compares with forms of the same word only', () => {
    for (const c of compareForms(req('opettaja', 'pl.partitive'))) expect(grammar.analyze(c.form).some((h) => h.lexemeId === 'opettaja')).toBe(true)
  })
})

describe('sentence annotations ("why this case here")', () => {
  it('are valid: the reason fits the case and number, the trigger word is in the sentence', () => {
    for (const s of SENTENCES) {
      const a = SENTENCE_USAGE[s.id]
      if (!a) continue
      const view = renderSentenceById(s.id)!
      const token = view.parts.find((p) => p.token?.focus)!.token!
      const reason: UsageReason = USAGE_REASONS[a.reason]
      const { kase, number } = parseSlot(token.slot)
      expect(reason.cases, s.id).toContain(kase)
      if (reason.number) expect(number, s.id).toBe(reason.number)
      if (reason.needsCue) expect(a.cue, s.id).toBeTruthy()
      if (reason.needsNote) expect(a.note, s.id).toBeTruthy()
      if (a.cue) expect(view.text, s.id).toMatch(new RegExp(`(^|[^\\p{L}])${a.cue}([^\\p{L}]|$)`, 'u'))
      if (a.cue && reason.why.includes('{cueGloss}')) expect(CUE_GLOSS[a.cue.toLowerCase()], s.id).toBeTruthy()
      if (reason.outerPlace) expect(['outer', 'both'], s.id).toContain(grammar.require(token.lexemeIds.at(-1)!).locative)
      if (a.compare) expect(renderSentenceById(a.compare.sentenceId), s.id).toBeDefined()
    }
  })
  it('cover nearly every sentence (the audit lists the rest)', () => {
    const annotated = SENTENCES.filter((s) => SENTENCE_USAGE[s.id]).length
    expect(annotated / SENTENCES.length).toBeGreaterThan(0.99)
  })
})

describe('10. offline', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('needs no network: explanations work with fetch disabled', () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('network used')
    })
    const e = explainForm('vesi', 'sg.inessive', { variantText: 'vedessä' })
    expect(e?.form).toBe('vedessä')
    expect(usageFor(req('lääkäri', 'sg.translative'))).not.toBeNull()
  })
  it('the explanation code has no network calls', () => {
    const dirs = [join(__dirname, '../explain'), join(__dirname, '../../data/explanations')]
    for (const dir of dirs) {
      for (const f of readdirSync(dir)) {
        const src = readFileSync(join(dir, f), 'utf8')
        expect(src, f).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|https?:\/\//)
      }
    }
  })
})

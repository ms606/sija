import { describe, expect, it } from 'vitest'
import { ALL_SLOTS, createGrammar, parseTemplate, PERSONS } from '../../grammar'
import { CASES_INFO } from '../cases'
import { GRADATION_INFO } from '../gradation-patterns'
import { FAMILIES, I_GROUP_INFO, MINIMAL_PAIRS } from '../noun-families'
import { DECLENSION_TYPES } from '../../grammar'
import { DIAGNOSES } from '../explanations/diagnoses'
import { RULES } from '../explanations/rules'
import { LEXICON } from '../lexicon'
import { getSentence, SENTENCES } from '../sentences'

const G = createGrammar(LEXICON)

describe('sentences', () => {
  it('render through the engine without errors', () => {
    for (const s of SENTENCES) {
      expect(() => G.renderSentence(s.fi), s.id).not.toThrow()
    }
  })
  it('are complete: translation present, no meta commentary', () => {
    for (const s of SENTENCES) {
      expect(s.en.trim(), s.id).not.toBe('')
      expect(s.fi, s.id).not.toMatch(/\.\.\.|…/)
      expect(s.provenance.source).toBe('curated')
    }
  })
  it('start with a capital letter and end with punctuation', () => {
    for (const s of SENTENCES) {
      const text = G.renderSentence(s.fi).text
      expect(text, s.id).toMatch(/^[A-ZÅÄÖ0-9]/)
      expect(text, s.id).toMatch(/[.!?]$/)
    }
  })
})

describe('cases', () => {
  it('reference existing sentences and demo words', () => {
    for (const info of Object.values(CASES_INFO)) {
      expect(G.get(info.demoNounId), info.id).toBeDefined()
      for (const u of info.usages) for (const id of u.sentenceIds) expect(getSentence(id), `${info.id}: ${id}`).toBeDefined()
    }
  })
})

describe('reference content', () => {
  it('features words that really have the pattern they illustrate', () => {
    for (const p of GRADATION_INFO) {
      for (const id of p.featured) {
        const g = G.gradation(G.require(id))
        expect(g?.pattern === p.id || (p.id === 't-d' && g?.intrinsic), `${p.id}: ${id}`).toBe(true)
      }
      for (const id of p.inverse) expect(G.gradation(G.require(id)), `${p.id} inverse: ${id}`).toMatchObject({ pattern: p.id, direction: 'inverse' })
    }
  })
  it('features words of the right -i family', () => {
    for (const info of Object.values(I_GROUP_INFO)) {
      for (const id of info.featured) expect(G.type(G.require(id)).iGroup, `${info.id}: ${id}`).toBe(info.id)
    }
    for (const pair of MINIMAL_PAIRS) {
      expect(G.get(pair.a)).toBeDefined()
      expect(G.get(pair.b)).toBeDefined()
    }
  })
  it('lists every declension type in exactly one family', () => {
    const listed = FAMILIES.flatMap((f) => f.types)
    expect([...listed].sort()).toEqual(Object.keys(DECLENSION_TYPES).sort())
  })
})

describe('explanations', () => {
  it('cover every rule id the engine can emit', () => {
    const ids = new Set<string>()
    const collect = (v: { steps: { ruleId: string }[]; pieces: { ruleId?: string }[] }) => {
      v.steps.forEach((s) => ids.add(s.ruleId))
      v.pieces.forEach((p) => p.ruleId && ids.add(p.ruleId))
    }
    for (const lex of LEXICON) {
      for (const slot of ALL_SLOTS) {
        const f = G.inflect(lex, slot)
        if (f.statusRuleId) ids.add(f.statusRuleId)
        f.variants.forEach(collect)
        if (lex.pos === 'noun') for (const p of PERSONS) G.withPossessive(lex, slot, p).variants.forEach(collect)
      }
      lex.notes?.forEach((n) => ids.add(n))
      if (lex.noGradationNote) ids.add(lex.noGradationNote)
    }
    for (const w of ['kaali', 'nalle', 'pulkka', 'sisko', 'kirjasto', 'tukka', 'rauha', 'kokous', 'kaunis', 'puhelin', 'kevät', 'ohut', 'tie', 'pää', 'suo', 'mukava', 'televisio', 'xyz']) {
      const c = G.classify(w)
      c.candidates.forEach((x) => ids.add(x.ruleId))
      if (c.caveatRuleId) ids.add(c.caveatRuleId)
      if (c.gradationHint) ids.add(c.gradationHint)
    }
    const missing = [...ids].filter((id) => !RULES[id] && id !== 'grade.weak')
    expect(missing).toEqual([])
  })
  it('cover every diagnosis', () => {
    for (const id of ['missing-umlaut', 'wrong-number', 'wrong-case', 'rare-slot', 'wrong-igroup', 'no-gradation', 'wrong-grade', 'wrong-partitive-ending', 'wrong-illative', 'lemma-plus-ending', 'wrong-harmony', 'unknown'] as const) {
      expect(DIAGNOSES[id]).toBeDefined()
    }
  })
})

describe('coverage report', () => {
  it('lists sentence coverage per lexeme', () => {
    const count = new Map<string, number>()
    for (const s of SENTENCES) {
      const ids = new Set<string>()
      for (const part of parseTemplate(s.fi)) {
        if (part.kind !== 'token') continue
        for (const ref of part.token.refs) {
          const lex = G.resolve(ref)
          if (lex) ids.add(lex.id)
        }
      }
      ids.forEach((id) => count.set(id, (count.get(id) ?? 0) + 1))
    }
    const thin = LEXICON.filter((l) => (count.get(l.id) ?? 0) < (l.frequency === 'core' ? 5 : 2)).map(
      (l) => `${l.id}:${count.get(l.id) ?? 0}${l.frequency === 'core' ? '*' : ''}`,
    )
    console.log(`SENTENCES ${SENTENCES.length}; under target (${thin.length}): ${thin.join(' ')}`)
    expect(SENTENCES.length).toBeGreaterThan(400)
  })
})

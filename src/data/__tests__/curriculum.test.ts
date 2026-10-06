import { describe, expect, it } from 'vitest'
import { GRADATION_PATTERNS } from '../../grammar'
import { grammar } from '../../services/grammar'
import { buildSession } from '../../services/exercises/session'
import { CASES_INFO } from '../cases'
import { LESSONS, LEVELS } from '../curriculum'
import { GLOSSARY } from '../glossary'
import { getSentence } from '../sentences'

const glossaryTerms = new Set(GLOSSARY.flatMap((g) => g.fi.split(',').map((s) => s.trim())))

describe('curriculum', () => {
  it('has 8 levels and 54 lessons with unique, ordered ids', () => {
    expect(LEVELS).toHaveLength(8)
    expect(LESSONS).toHaveLength(54)
    const ids = LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of LESSONS) expect(l.id.startsWith(`${l.level}.`)).toBe(true)
  })

  it('prerequisites exist and come earlier', () => {
    const order = new Map(LESSONS.map((l, i) => [l.id, i]))
    for (const l of LESSONS) {
      for (const p of l.prerequisites) {
        expect(order.has(p), `${l.id} → ${p}`).toBe(true)
        expect(order.get(p)!, `${l.id} → ${p}`).toBeLessThan(order.get(l.id)!)
      }
    }
  })

  it('every block reference resolves', () => {
    for (const l of LESSONS) {
      for (const b of l.blocks) {
        const where = `${l.id} ${b.kind}`
        const noun = (id: string) => expect(grammar.get(id), `${where}: ${id}`).toBeDefined()
        switch (b.kind) {
          case 'pipeline':
          case 'builder':
          case 'paradigm':
          case 'grade-map':
          case 'possessives':
            noun(b.nounId)
            if ('slot' in b) expect(grammar.inflect(grammar.require(b.nounId), b.slot).status, where).not.toBe('not-used')
            break
          case 'compare':
            b.nounIds.forEach(noun)
            break
          case 'forms':
            for (const it of b.items) {
              noun(it.nounId)
              const lex = grammar.require(it.nounId)
              const f = it.person ? grammar.withPossessive(lex, it.slot, it.person) : grammar.inflect(lex, it.slot)
              expect(f.status, `${where}: ${it.nounId} ${it.slot}`).not.toBe('not-used')
            }
            break
          case 'endings':
            b.words.forEach(noun)
            break
          case 'case-cards':
            for (const c of b.caseIds) expect(CASES_INFO[c], where).toBeDefined()
            break
          case 'gradation':
            expect(GRADATION_PATTERNS[b.pattern], where).toBeDefined()
            if (b.nounId) noun(b.nounId)
            break
          case 'examples':
            for (const id of b.sentenceIds) expect(getSentence(id), `${where}: ${id}`).toBeDefined()
            break
          case 'glossary':
            for (const term of b.terms) expect(glossaryTerms.has(term), `${where}: ${term}`).toBe(true)
            break
          case 'quick-check':
            b.spec.words?.forEach(noun)
            break
        }
      }
      l.check.words?.forEach((id) => expect(grammar.get(id), `${l.id} check: ${id}`).toBeDefined())
    }
  })

  it('every lesson check can generate its exercises', () => {
    for (const l of LESSONS) {
      const c = l.check
      const session = buildSession({
        seed: 1,
        mode: 'beginner',
        audio: false,
        count: c.count ?? 6,
        ...(c.skill ? { skill: c.skill } : {}),
        ...(c.types ? { types: c.types } : {}),
        ...(c.words ? { words: c.words } : {}),
        ...(c.slots ? { slots: c.slots } : {}),
        ...(c.persons ? { persons: c.persons } : {}),
        ...(c.tags ? { tags: c.tags } : {}),
      })
      expect(session.length, `lesson ${l.id}`).toBeGreaterThanOrEqual(Math.min(5, c.count ?? 6))
    }
  })
})

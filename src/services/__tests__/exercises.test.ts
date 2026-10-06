import { describe, expect, it } from 'vitest'
import { grammar } from '../grammar'
import { GENERATORS, type GenContext } from '../exercises/generators'
import { buildSession, scopeFor } from '../exercises/session'
import { checkChoice, checkPieces, checkText } from '../exercises/check'
import { mastery } from '../learning/mastery'
import { schedule } from '../learning/srs'
import { nextStreak, liveStreak } from '../learning/xp'
import type { SlotKey } from '../../grammar'
import type { Exercise, ExerciseType } from '../../types/exercise'
import { seeded } from '../../utils/random'

const TYPES = Object.keys(GENERATORS) as ExerciseType[]

function ctxFor(seed: number): GenContext {
  const scope = scopeFor('mixed')
  return { rng: seeded(seed), mode: 'beginner', pool: scope.pool, slots: scope.slots, audio: true }
}

function engineForms(ex: Exercise): string[] {
  const t = ex.target!
  const lex = grammar.require(t.lexemeId)
  const f = t.person ? grammar.withPossessive(lex, t.slot, t.person) : grammar.inflect(lex, t.slot)
  return f.variants.map((v) => v.text)
}

describe('exercise generators', () => {
  for (const type of TYPES) {
    it(`${type}: produces well-formed exercises whose answers come from the engine`, () => {
      const ctx = ctxFor(42)
      let made = 0
      for (let i = 0; i < 40; i++) {
        const ex = GENERATORS[type](ctx)
        if (!ex) continue
        made++
        expect(ex.type).toBe(type)
        expect(ex.skills.length).toBeGreaterThan(0)
        expect(ex.target).toBeDefined()
        const a = ex.answer
        if (a.kind === 'text') {
          expect(a.accept.length).toBeGreaterThan(0)
          if (type !== 'fill-blank' && type !== 'error-correction') expect(engineForms(ex)).toEqual(expect.arrayContaining(a.accept))
          if (type === 'error-correction') {
            expect(a.accept).not.toContain(ex.prompt.error!.text)
            // The shown mistake is never a real word form (the sentence must really be wrong).
            expect(grammar.analyze(ex.prompt.error!.text)).toHaveLength(0)
          }
        } else if (a.kind === 'choice') {
          expect(a.options.length).toBeGreaterThanOrEqual(3)
          expect(new Set(a.options.map((o) => o.id)).size).toBe(a.options.length)
          expect(a.correct.length).toBeGreaterThan(0)
          for (const c of a.correct) expect(a.options.map((o) => o.id)).toContain(c)
          if (type === 'multiple-choice' || type === 'listening') {
            const forms = engineForms(ex)
            // Exactly the correct form is accepted; no distractor is another accepted spelling.
            for (const o of a.options) if (!a.correct.includes(o.id)) expect(forms).not.toContain(o.label)
          }
        } else if (a.kind === 'pieces') {
          expect(a.pieces.map((p) => p.text).join('')).toBe(ex.prompt.word)
          for (const i of a.correct) expect(a.pieces[i]?.role).toBe(a.role)
        } else if (a.kind === 'build') {
          const correct = a.accept[0]!
          // The correct word can be assembled from the tiles in some order.
          const tiles = a.tiles.map((t) => t.text)
          const canBuild = (rest: string, left: string[]): boolean =>
            rest === '' || left.some((t, i) => rest.startsWith(t) && canBuild(rest.slice(t.length), left.filter((_, j) => j !== i)))
          expect(canBuild(correct, tiles)).toBe(true)
        }
      }
      expect(made).toBeGreaterThan(type === 'production' ? 5 : 15)
    })
  }
})

describe('checking answers', () => {
  const transform = (lexemeId: string, slot: SlotKey) => GENERATORS.transform(ctxFor(1), { lexemeId, slot })!

  it('accepts every standard variant, case-insensitively', () => {
    const ex = transform('kieli', 'pl.genitive')
    expect(checkText(ex, 'kielten').verdict).toBe('correct')
    expect(checkText(ex, 'Kielien').verdict).toBe('correct')
  })
  it('explains a missing gradation', () => {
    const r = checkText(transform('kauppa', 'sg.genitive'), 'kauppan')
    expect(r).toMatchObject({ verdict: 'incorrect', diagnosisId: 'no-gradation', expected: 'kaupan' })
  })
  it('explains "uusin" as a pankki-type mistake and a real word', () => {
    const r = checkText(transform('uusi', 'sg.genitive'), 'uusin')
    expect(r.verdict).toBe('incorrect')
    expect(r.diagnosisId).toBe('wrong-igroup')
    expect(r.noteRuleId).toBe('note.uusin')
  })
  it('treats missing dots as "almost"', () => {
    expect(checkText(transform('päivä', 'sg.genitive'), 'paivan')).toMatchObject({ verdict: 'almost', diagnosisId: 'missing-umlaut' })
  })
  it('catches wrong vowel harmony', () => {
    expect(checkText(transform('talo', 'sg.inessive'), 'talossä').diagnosisId).toBe('wrong-harmony')
  })
  it('accepts rare forms but flags them', () => {
    const ex = transform('vieras', 'pl.genitive')
    const rare = ex.answer.kind === 'text' ? ex.answer.rare ?? [] : []
    if (rare[0]) expect(checkText(ex, rare[0])).toMatchObject({ verdict: 'correct', rare: true })
  })
  it('accepts any valid analysis in identification', () => {
    const ex = GENERATORS['identify-case'](ctxFor(3), { lexemeId: 'talo', slot: 'sg.inessive' })!
    expect(checkChoice(ex, 'inessive').verdict).toBe('correct')
    expect(checkChoice(ex, ex.answer.kind === 'choice' ? ex.answer.options.find((o) => o.id !== 'inessive')!.id : '').verdict).toBe('incorrect')
  })
  it('checks tapped pieces', () => {
    const ex = GENERATORS['identify-morphology'](ctxFor(5), { lexemeId: 'talo', slot: 'sg.inessive' })!
    if (ex.answer.kind !== 'pieces') throw new Error('expected pieces')
    expect(checkPieces(ex, ex.answer.correct[0]!).verdict).toBe('correct')
  })
})

describe('sessions', () => {
  it('builds a case session from the requested slots without immediate repeats', () => {
    const session = buildSession({ skill: 'case:inessive', count: 12, seed: 7, mode: 'beginner', audio: false })
    expect(session).toHaveLength(12)
    for (const ex of session) expect(['sg.inessive', 'pl.inessive']).toContain(ex.target!.slot)
    for (let i = 1; i < session.length; i++) {
      const a = session[i - 1]!.target!
      const b = session[i]!.target!
      expect(`${a.lexemeId}:${a.slot}`).not.toBe(`${b.lexemeId}:${b.slot}`)
    }
  })
  it('puts due reviews first', () => {
    const session = buildSession({ skill: 'mixed', count: 6, seed: 9, mode: 'beginner', audio: false, due: [{ target: { lexemeId: 'vesi', slot: 'sg.genitive' }, kind: 'form' }] })
    expect(session[0]!.target).toMatchObject({ lexemeId: 'vesi', slot: 'sg.genitive' })
  })
  it('possessive practice targets persons', () => {
    const session = buildSession({ skill: 'possessives', count: 8, seed: 11, mode: 'beginner', audio: false })
    expect(session.every((ex) => ex.target?.person)).toBe(true)
  })
})

describe('learning model', () => {
  it('spaced repetition: lapses return soon, successes stretch', () => {
    const now = 0
    const t = { lexemeId: 'talo', slot: 'sg.inessive' as const }
    const a = schedule(undefined, 'form:talo:sg.inessive', t, 5, 3000, now)
    expect(a.intervalDays).toBe(1)
    const b = schedule(a, a.key, t, 5, 3000, now)
    expect(b.intervalDays).toBe(3)
    const c = schedule(b, b.key, t, 1, 3000, now)
    expect(c.due - now).toBe(10 * 60 * 1000)
    expect(c.lapses).toBe(1)
  })
  it('mastery needs both accuracy and enough attempts', () => {
    const run = (n: number, ok: boolean) => ({ attempts: n, correct: ok ? n : 0, recent: Array.from({ length: n }, (_, i) => ({ at: i, ok })) })
    expect(mastery(run(8, true))).toBeCloseTo(1)
    expect(mastery(run(4, true))).toBeCloseTo(0.5)
    expect(mastery(run(8, false))).toBe(0)
  })
  it('streaks count consecutive goal days', () => {
    let s = { current: 0, best: 0, lastDay: null as string | null }
    s = nextStreak(s, '2026-10-01')
    s = nextStreak(s, '2026-10-02')
    expect(s.current).toBe(2)
    s = nextStreak(s, '2026-10-05')
    expect(s).toMatchObject({ current: 1, best: 2 })
    expect(liveStreak(s, '2026-10-06')).toBe(1)
    expect(liveStreak(s, '2026-10-08')).toBe(0)
  })
})

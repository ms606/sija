import { describe, expect, it } from 'vitest'
import { checkChoice, checkPieces, checkText } from '../exercises/check'
import { feedbackSubject } from '../exercises/feedback'
import { GENERATORS, type GenContext } from '../exercises/generators'
import { scopeFor } from '../exercises/session'
import { explainForm, plain } from '../explain'
import { grammar } from '../grammar'
import type { Exercise, ExerciseType } from '../../types/exercise'
import { seeded } from '../../utils/random'

const ctx = (seed: number): GenContext => {
  const scope = scopeFor('mixed')
  return { rng: seeded(seed), mode: 'beginner', pool: scope.pool, slots: scope.slots, audio: true }
}

/** The answer a learner gives when answering correctly. */
function correctResult(ex: Exercise) {
  const a = ex.answer
  if (a.kind === 'choice') return checkChoice(ex, a.correct[0]!)
  if (a.kind === 'pieces') return checkPieces(ex, a.correct[0]!)
  return checkText(ex, a.accept[0]!)
}

describe('metsä → metsänä in "Which form is this — number and case?"', () => {
  const ex = GENERATORS['identify-number-case'](ctx(1), { lexemeId: 'metsä', slot: 'sg.essive' })!
  const a = ex.answer.kind === 'choice' ? ex.answer : null

  it('asks about the form metsänä; the answer is the label essive singular', () => {
    expect(ex.prompt.word).toBe('metsänä')
    expect(ex.target).toMatchObject({ lexemeId: 'metsä', slot: 'sg.essive', form: 'metsänä' })
    expect(a?.options.find((o) => a.correct.includes(o.id))?.label).toBe('essive singular')
  })

  it('feedback keeps the surface form and the classification apart', () => {
    const result = correctResult(ex)
    expect(result).toMatchObject({ verdict: 'correct', expected: 'essive singular', answerKind: 'label', expectedFi: false })
    const subject = feedbackSubject(ex, 'beginner')!
    expect(subject.form).toBe('metsänä')
    expect(subject.classification).toBe('essive singular')
    expect(subject.explanation?.form).toBe('metsänä')
  })

  it('explains metsänä as a regular derivation: metsä- + -nä, front vowel harmony, no consonant gradation', () => {
    const e = feedbackSubject(ex, 'beginner')!.explanation!
    expect(e.coverage).toBe('complete')
    expect(e.recorded).toBeUndefined()
    expect(e.pieces.map((p) => [p.text, p.label])).toEqual([
      ['metsä', 'unchanged'],
      ['nä', 'essive ending'],
    ])
    expect(e.formula.parts.map((p) => p.text)).toEqual(['metsä-', '-nä'])
    expect(e.gradation.applies).toBe(false)
    const harmony = e.steps.find((s) => s.kind === 'harmony')
    expect(plain(harmony!.text)).toContain('front vowels')
    expect(plain(harmony!.text)).toContain('-nä')
    expect(e.steps.some((s) => s.kind === 'override')).toBe(false)
  })

  it('a label or a word part is never explained as a word', () => {
    expect(explainForm('metsä', 'sg.essive', { variantText: 'essive singular' })).toBeNull()
    expect(explainForm('metsä', 'sg.essive', { variantText: 'nä' })).toBeNull()
    // A lexicalised form recorded in the sentence data is still a recorded form.
    expect(explainForm('koti', 'sg.essive', { variantText: 'kotona' })?.coverage).toBe('recorded')
  })
})

describe('every exercise type: feedback is about the exercise\'s own form', () => {
  const types = Object.keys(GENERATORS) as ExerciseType[]
  for (const type of types) {
    it(type, () => {
      let made = 0
      for (let seed = 1; seed <= 60; seed++) {
        const ex = GENERATORS[type](ctx(seed))
        if (!ex?.target) continue
        made++
        const t = ex.target
        const lex = grammar.require(t.lexemeId)
        const form = t.person ? grammar.withPossessive(lex, t.slot, t.person) : grammar.inflect(lex, t.slot)
        // The subject is one of the engine's forms for this word and slot.
        expect(form.variants.map((v) => v.text), `${type} ${t.lexemeId} ${t.slot}`).toContain(t.form)
        const result = correctResult(ex)
        const subject = feedbackSubject(ex, 'beginner')!
        expect(subject.explanation?.form, `${type} ${t.form}`).toBe(t.form)
        expect(subject.explanation?.coverage, `${type} ${t.form}`).not.toBe('partial')
        // A regular form is never shown as a memorized one, whatever the answer looks like.
        const override = form.variants.find((v) => v.text === t.form)?.steps.some((s) => s.kind === 'override')
        if (!override) expect(subject.explanation?.coverage, `${type} ${t.form}`).toBe('complete')
        if (result.answerKind !== 'form') expect(subject.form).not.toBe(result.expected)
        if (result.answerKind === 'label') expect(result.expectedFi).toBe(false)
      }
      expect(made, type).toBeGreaterThan(0)
    })
  }
})

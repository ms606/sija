import { looseKey, normalizeForm } from '../../grammar'
import type { CheckResult, Exercise } from '../../types/exercise'
import { grammar } from '../grammar'

/** Normalises a typed answer: Unicode, case, apostrophes, spaces, trailing punctuation. */
export function cleanAnswer(input: string): string {
  return normalizeForm(input).replace(/[.!?,;:]+$/u, '').trim()
}

function diagnoseText(ex: Exercise, answer: string, expected: string, accepted: string[]): CheckResult {
  const result: CheckResult = { verdict: 'incorrect', expected, accepted }
  const a = cleanAnswer(answer)
  // Missing dots on ä/ö is a keyboard problem, not a grammar error.
  if (!/[äöå]/.test(a) && accepted.some((c) => /[äö]/.test(c) && looseKey(c) === looseKey(a))) {
    return { ...result, verdict: 'almost', diagnosisId: 'missing-umlaut', params: { correct: expected } }
  }
  const t = ex.target
  const lex = t && grammar.get(t.lexemeId)
  if (lex && t && !t.person) {
    const d = grammar.diagnose(lex, t.slot, a)
    if (d) {
      result.diagnosisId = d.diagnosisId
      result.params = { ...d.params, correct: expected, answer: a }
      if (d.realWord) result.realWord = d.realWord
      if (d.noteRuleId) result.noteRuleId = d.noteRuleId
    }
  }
  if (!result.diagnosisId) result.params = { correct: expected, answer: a }
  if (ex.prompt.error && a === cleanAnswer(ex.prompt.error.text)) {
    result.diagnosisId = ex.prompt.error.diagnosisId
    result.params = { ...ex.prompt.error.params, correct: expected, answer: a }
  }
  return result
}

/** Checks a text answer (fill-blank, transform, production, error correction, build). */
export function checkText(ex: Exercise, input: string): CheckResult {
  if (ex.answer.kind !== 'text' && ex.answer.kind !== 'build') throw new Error(`checkText on ${ex.answer.kind}`)
  const accepted = ex.answer.accept
  const rare = ex.answer.kind === 'text' ? (ex.answer.rare ?? []) : []
  const expected = accepted[0] ?? ''
  const a = cleanAnswer(input)
  if (!a) return { verdict: 'incorrect', expected, accepted }
  if (accepted.some((c) => cleanAnswer(c) === a)) return { verdict: 'correct', expected, accepted }
  if (rare.some((c) => cleanAnswer(c) === a)) return { verdict: 'correct', expected, accepted, rare: true }
  return diagnoseText(ex, input, expected, accepted)
}

/** Checks a choice answer (one option id). */
export function checkChoice(ex: Exercise, optionId: string): CheckResult {
  if (ex.answer.kind !== 'choice') throw new Error(`checkChoice on ${ex.answer.kind}`)
  const { options, correct } = ex.answer
  const expectedOption = options.find((o) => correct.includes(o.id))
  const expected = expectedOption?.label ?? correct[0] ?? ''
  const accepted = options.filter((o) => correct.includes(o.id)).map((o) => o.label)
  if (correct.includes(optionId)) return { verdict: 'correct', expected, accepted }
  const chosen = options.find((o) => o.id === optionId)
  return {
    verdict: 'incorrect',
    expected,
    accepted,
    ...(chosen?.diagnosisId ? { diagnosisId: chosen.diagnosisId, params: { ...chosen.params, correct: expected, answer: chosen.label } } : {}),
  }
}

/** Checks a tapped piece (identify the morphology). */
export function checkPieces(ex: Exercise, index: number): CheckResult {
  if (ex.answer.kind !== 'pieces') throw new Error(`checkPieces on ${ex.answer.kind}`)
  const { pieces, correct } = ex.answer
  const expected = correct.map((i) => pieces[i]?.text ?? '').join(' + ')
  return { verdict: correct.includes(index) ? 'correct' : 'incorrect', expected, accepted: [expected] }
}

/** Checks a word built from tiles. */
export function checkBuild(ex: Exercise, built: string): CheckResult {
  return checkText(ex, built)
}

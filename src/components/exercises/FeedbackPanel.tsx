import { Check, CircleAlert, X } from 'lucide-react'
import { RULES } from '../../data/explanations/rules'
import { diagnosisText, pickText, slotLabel } from '../../services/content/text'
import { samePattern } from '../../services/explain'
import { feedbackSubject } from '../../services/exercises/feedback'
import { useExplain } from '../../stores/explain'
import { useSettings } from '../../stores/settings'
import type { CheckResult, Exercise } from '../../types/exercise'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { MorphologyBreakdown } from '../grammar/MorphologyBreakdown'
import { RichText } from '../grammar/RichText'
import { Button } from '../ui/Button'
import { Fi } from '../ui/FiText'

const VERDICT = {
  correct: { text: 'Correct!', fi: 'Oikein!', Icon: Check, cls: 'border-success/50 bg-success-soft text-success' },
  almost: { text: 'Almost!', fi: 'Melkein!', Icon: CircleAlert, cls: 'border-warning/50 bg-warning-soft text-warning' },
  incorrect: { text: 'Not quite', fi: 'Ei aivan', Icon: X, cls: 'border-error/50 bg-error-soft text-error' },
} as const

/**
 * What went wrong and why: the diagnosis, the correct form broken into its
 * parts, accepted variants, and a link to the full derivation.
 */
export function FeedbackPanel({ exercise, result, response }: { exercise: Exercise; result: CheckResult; response: string }) {
  const mode = useSettings((s) => s.mode)
  const open = useExplain((s) => s.open)
  const v = VERDICT[result.verdict]
  const t = exercise.target
  // The form the exercise is about (metsänä) — not the expected answer, which may be a label ("essive singular").
  const subject = feedbackSubject(exercise, mode)
  const exp = subject?.explanation ?? null
  const Answer = result.expectedFi ? Fi : 'span'
  const diagnosis = result.verdict !== 'correct' && result.diagnosisId ? diagnosisText(result.diagnosisId, result.params ?? {}, mode) : null
  const note = result.noteRuleId && RULES[result.noteRuleId] ? pickText(RULES[result.noteRuleId]!, mode) : null
  const errorWhy =
    exercise.prompt.error && result.verdict === 'correct' ? diagnosisText(exercise.prompt.error.diagnosisId, { ...exercise.prompt.error.params, correct: result.expected }, mode) : null
  const others = result.accepted.filter((a) => a !== result.expected)
  // Another word whose form is derived with exactly the same steps — "see the pattern again".
  const example = result.verdict === 'incorrect' && exp ? samePattern(exp, 1)[0] : undefined

  return (
    <div className={cx('animate-rise-in space-y-3 rounded-2xl border-2 p-4', v.cls)} role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-lg font-bold">
        <v.Icon aria-hidden className="size-6" />
        {mode === 'beginner' ? v.text : <Fi>{v.fi}</Fi>}
      </p>
      <div className="space-y-2 text-text">
        {result.verdict !== 'correct' && (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm text-muted">Answer:</span>
            <Answer className="text-lg font-semibold">{result.expected}</Answer>
            {response && (
              <span className="text-sm text-muted">
                (you: <Fi className="line-through">{response}</Fi>)
              </span>
            )}
          </p>
        )}
        {result.rare && <p className="text-sm">This form is correct but rare — the usual one is <Fi className="font-semibold">{result.expected}</Fi>.</p>}
        {diagnosis && <p lang={diagnosis.lang}>{diagnosis.main}</p>}
        {errorWhy && <p className="text-sm text-muted">The mistake: {errorWhy.main}</p>}
        {note && (
          <p className="rounded-lg bg-surface p-2 text-sm" lang={note.lang}>
            💡 {note.main}
          </p>
        )}
        {subject && exp && (
          <div className="space-y-2 rounded-xl bg-surface p-3">
            <p className="text-sm">
              <Fi className="font-semibold">{subject.form}</Fi> <span className="text-muted">— {subject.classification}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <MorphologyBreakdown key={exp.key} explanation={exp} size="md" />
              <AudioButton text={exp.form} size="sm" />
            </div>
            {exp.summary.slice(1).map((s, i) => (
              <p key={i} className="text-sm leading-relaxed">
                <RichText text={s} />
              </p>
            ))}
          </div>
        )}
        {others.length > 0 && (
          <p className="text-sm">
            <span className="text-muted">Also accepted: </span>
            <Answer className="font-semibold">{others.join(', ')}</Answer>
          </p>
        )}
        {example && t && (
          <p className="text-sm">
            <span className="text-muted">Same pattern: </span>
            <Fi className="font-semibold">{example.lemma}</Fi> → <Fi className="font-semibold">{example.form}</Fi>{' '}
            <span className="text-muted">({slotLabel(t.slot, mode)}, built with the same steps)</span>
          </p>
        )}
        {t && (
          <Button size="sm" variant="ghost" onClick={() => open({ lexemeId: t.lexemeId, slot: t.slot, ...(t.person ? { person: t.person } : {}), variantText: t.form })}>
            Show me step by step
          </Button>
        )}
      </div>
    </div>
  )
}

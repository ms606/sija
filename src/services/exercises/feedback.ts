import type { LearnerMode } from '../../stores/settings'
import type { Exercise } from '../../types/exercise'
import { PERSON_LABEL, pickLabel, slotLabel } from '../content/text'
import { explainForm, type FormExplanation } from '../explain'

/**
 * What answer feedback shows about an exercise: the Finnish surface form it
 * is about (metsänä), its classification (essive singular) and the
 * explanation of that form. Taken from the exercise's subject, never from the
 * expected answer, which can be a label or a word part.
 */
export interface FeedbackSubject {
  form: string
  classification: string
  explanation: FormExplanation | null
}

export function feedbackSubject(exercise: Exercise, mode: LearnerMode): FeedbackSubject | null {
  const t = exercise.target
  if (!t) return null
  const label = slotLabel(t.slot, mode)
  return {
    form: t.form,
    classification: t.person ? `${label} + ${pickLabel(PERSON_LABEL[t.person], mode)}` : label,
    explanation: explainForm(t.lexemeId, t.slot, { ...(t.person ? { person: t.person } : {}), variantText: t.form }),
  }
}

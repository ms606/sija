import type { ExerciseType } from '../../types/exercise'

export const TYPE_LABEL: Record<ExerciseType, string> = {
  'multiple-choice': 'Multiple choice',
  'fill-blank': 'Fill in the blank',
  transform: 'Transform the word',
  'identify-case': 'Identify the case',
  'identify-number-case': 'Identify number and case',
  'identify-morphology': 'Find the part',
  'build-word': 'Build the word',
  listening: 'Listening',
  'error-correction': 'Correct the mistake',
  production: 'Write in Finnish',
}

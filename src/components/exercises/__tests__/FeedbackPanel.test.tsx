// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { checkChoice } from '../../../services/exercises/check'
import { GENERATORS } from '../../../services/exercises/generators'
import { scopeFor } from '../../../services/exercises/session'
import { useExplain } from '../../../stores/explain'
import { seeded } from '../../../utils/random'
import { ExplainSheet } from '../../grammar/ExplainSheet'
import { FeedbackPanel } from '../FeedbackPanel'

beforeAll(() => {
  // jsdom has no modal dialogs: open/close by attribute.
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal?: () => void }
  if (!proto.showModal) {
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
})
afterEach(() => {
  cleanup()
  useExplain.getState().close()
})

function metsanaExercise() {
  const scope = scopeFor('mixed')
  const ex = GENERATORS['identify-number-case']({ rng: seeded(1), mode: 'beginner', pool: scope.pool, slots: scope.slots, audio: true }, { lexemeId: 'metsä', slot: 'sg.essive' })!
  if (ex.answer.kind !== 'choice') throw new Error('expected a choice exercise')
  return { ex, answer: ex.answer }
}

describe('practice feedback for metsänä (identify number and case)', () => {
  it('a correct answer shows the form metsänä with its classification, built regularly from metsä', () => {
    const { ex, answer } = metsanaExercise()
    const result = checkChoice(ex, answer.correct[0]!)
    render(<FeedbackPanel exercise={ex} result={result} response="essive singular" />)
    const panel = screen.getByRole('status')
    expect(panel).toHaveTextContent('metsänä — essive singular')
    const word = within(panel).getByLabelText('metsänä', { selector: '.fi-form' })
    expect(within(word).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'metsä — unchanged, as in the base form',
      'nä — essive ending',
    ])
    expect(panel).toHaveTextContent('It is built from the stem metsä- (the same as the base form) + the essive ending -nä.')
    expect(panel).not.toHaveTextContent(/memorized|exception/i)
  })

  it('a wrong answer shows the label as the answer — in English, not as a Finnish word — and the form separately', () => {
    const { ex, answer } = metsanaExercise()
    const wrong = answer.options.find((o) => !answer.correct.includes(o.id))!
    const result = checkChoice(ex, wrong.id)
    render(<FeedbackPanel exercise={ex} result={result} response={wrong.label} />)
    const panel = screen.getByRole('status')
    const label = within(panel).getByText('essive singular', { selector: 'span.text-lg' })
    expect(label).not.toHaveAttribute('lang')
    expect(panel).toHaveTextContent('metsänä — essive singular')
  })

  it('"Show me step by step" opens the explanation of metsänä, not of the label', () => {
    const { ex, answer } = metsanaExercise()
    const result = checkChoice(ex, answer.correct[0]!)
    render(
      <MemoryRouter>
        <FeedbackPanel exercise={ex} result={result} response="essive singular" />
        <ExplainSheet />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show me step by step' }))
    expect(useExplain.getState().target).toMatchObject({ lexemeId: 'metsä', slot: 'sg.essive', variantText: 'metsänä' })
    const steps = screen.getByRole('list', { name: 'How the form is built' })
    expect(steps).toHaveTextContent('metsä- + -nä → metsänä')
    expect(steps).toHaveTextContent('Vowel harmony: metsä has the front vowels')
    expect(steps).toHaveTextContent('No consonant gradation')
    expect(screen.queryByText(/memorized/i)).toBeNull()
  })
})

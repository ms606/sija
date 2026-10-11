// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FormExplainer } from '../FormExplainer'

afterEach(cleanup)

describe('FormExplainer', () => {
  it('explains lääkäriksi, then updates to exactly the newly selected form', () => {
    const { rerender } = render(<FormExplainer lexemeId="lääkäri" slot="sg.translative" />)
    const steps = screen.getByRole('list', { name: 'How the form is built' })
    expect(steps).toHaveTextContent('lääkäri- + -ksi → lääkäriksi')
    expect(steps).toHaveTextContent('No consonant gradation')
    expect(screen.getByRole('region', { name: 'Why the translative here' })).toHaveTextContent('Hän opiskelee lääkäriksi')
    expect(document.body).not.toHaveTextContent('kaupaksi')

    rerender(<FormExplainer lexemeId="opettaja" slot="pl.partitive" />)
    const after = screen.getByRole('list', { name: 'How the form is built' })
    expect(after).toHaveTextContent('opettaja- → opettaj- + i → opettaji-')
    expect(after).toHaveTextContent('opettaji- + -a → opettajia')
    expect(document.body).not.toHaveTextContent('lääkäriksi')
    expect(screen.getByRole('region', { name: 'Why the partitive here' })).toHaveTextContent('Koulussa on paljon opettajia')

    rerender(<FormExplainer lexemeId="opettaja" slot="sg.partitive" />)
    expect(screen.getByRole('list', { name: 'From the base word to the form' })).toHaveTextContent('opettajaa')
    expect(document.body).not.toHaveTextContent('opettaji-')
  })

  it('shows coloured pieces that spell exactly the form, with their labels', () => {
    render(<FormExplainer lexemeId="opettaja" slot="pl.partitive" />)
    const word = screen.getByLabelText('opettajia', { selector: '.fi-form' })
    const pieces = within(word).getAllByRole('button')
    expect(pieces.map((b) => b.getAttribute('aria-label'))).toEqual(['opettaj — unchanged, as in the base form', 'i — plural marker', 'a — partitive ending'])
  })
})

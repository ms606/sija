import { expect, test } from '@playwright/test'
import { trackErrors, waitForApp } from './helpers'

test('translative page explains lääkäriksi itself, then follows the selected word and number', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/cases/translative')
  await waitForApp(page)
  const steps = page.getByRole('list', { name: 'How the form is built' })
  await expect(steps).toContainText('lääkäri- + -ksi → lääkäriksi')
  await expect(steps).toContainText('No consonant gradation: the consonant before the last vowel of the stem is r')
  await expect(page.getByRole('region', { name: 'Why the translative here' })).toContainText('Hän opiskelee lääkäriksi')
  await expect(page.getByRole('region', { name: 'Why the translative here' })).toContainText('Hän on lääkäri')

  // The plural: plural stem lääkärei- + the same ending -ksi.
  await page.getByRole('group', { name: 'Number' }).getByText('translative plural', { exact: true }).click()
  await expect(steps).toContainText('lääkäri- → lääkäre- + i → lääkärei-')
  await expect(steps).toContainText('lääkärei- + -ksi → lääkäreiksi')

  // Another word: the explanation is about kauppa now, with its own gradation.
  await page.getByRole('button', { name: 'kauppa', exact: true }).click()
  await expect(steps).toContainText('kauppa has consonant gradation (pp → p)')
  await expect(steps).not.toContainText('lääkäri')
  expect(errors).toEqual([])
})

test('opettajia: plural stem opettaji- + partitive -a, with its sentence', async ({ page }) => {
  await page.goto('/cases/partitive?w=opettaja&n=pl')
  await waitForApp(page)
  await expect(page.getByRole('list', { name: 'From the base word to the form' })).toContainText('opettaji-')
  await expect(page.getByRole('list', { name: 'How the form is built' })).toContainText('opettaja- → opettaj- + i → opettaji-')
  const why = page.getByRole('region', { name: 'Why the partitive here' })
  await expect(why).toContainText('Koulussa on paljon opettajia')
  await expect(why).toContainText('paljon ("a lot, many") expresses an amount')
})

test('a word tapped in a sentence is explained in that sentence', async ({ page }) => {
  await page.goto('/cases/ablative')
  await waitForApp(page)
  await page.getByRole('button', { name: 'lääkäriltä — show how this form is built' }).first().click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('region', { name: 'Why the ablative here' })).toContainText('Kysyn lääkäriltä')
  await expect(sheet.getByRole('list', { name: 'How the form is built' })).toContainText('lääkäri- + -ltä → lääkäriltä')
})

test('practice: "which form is this" feedback shows metsänä and its derivation, not the answer label', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/practice/session?skill=mixed&type=identify-number-case&words=metsä&slots=sg.essive&count=3')
  await expect(page.getByRole('heading', { level: 2, name: 'Which form is this — number and case?' })).toBeVisible()
  await expect(page.locator('#main').getByText('metsänä', { exact: true }).first()).toBeVisible()
  await page.getByRole('group', { name: 'Answer options' }).getByRole('button', { name: 'essive singular', exact: true }).click()
  const feedback = page.getByRole('status').filter({ hasText: 'Correct!' })
  await expect(feedback).toContainText('metsänä — essive singular')
  await expect(feedback).toContainText('It is built from the stem metsä- (the same as the base form) + the essive ending -nä.')
  await expect(feedback).not.toContainText(/memorized/i)
  await feedback.getByRole('button', { name: 'Show me step by step' }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('list', { name: 'How the form is built' })).toContainText('metsä- + -nä → metsänä')
  await expect(sheet).not.toContainText(/memorized/i)
  expect(errors).toEqual([])
})

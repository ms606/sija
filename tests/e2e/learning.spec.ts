import { expect, test } from '@playwright/test'
import { waitForApp } from './helpers'

test('lesson 1.1 can be completed and is remembered', async ({ page }) => {
  await page.goto('/learn/1.1')
  await waitForApp(page)
  await page.getByRole('button', { name: 'Start the check' }).click()
  // Every item asks for the case ending; for these regular singular forms it is the last part.
  for (;;) {
    const parts = page.getByRole('group', { name: 'Parts of the word' }).getByRole('button')
    await parts.last().click()
    const next = page.getByRole('button', { name: /Continue|See results/ })
    const label = await next.textContent()
    await next.click()
    if (/See results/.test(label ?? '')) break
  }
  await expect(page.getByText('Lesson complete')).toBeVisible()
  await page.reload()
  await waitForApp(page)
  await expect(page.getByText('completed', { exact: true })).toBeVisible()
})

test('word builder: kauppa → kaupan shows the steps', async ({ page }) => {
  await page.goto('/stem-lab?w=kauppa&slot=sg.genitive')
  await waitForApp(page)
  await page.getByRole('button', { name: 'Show all' }).click()
  const pipeline = page.getByRole('list', { name: 'How the form is built' })
  await expect(pipeline).toContainText('kauppa')
  await expect(pipeline).toContainText('pp → p')
  await expect(pipeline).toContainText('kaupan')
  // Highlight the grade: the other parts are dimmed, the grade part is not.
  await page.getByRole('button', { name: 'Strong / weak grade' }).click()
  const grade = page.getByRole('button', { name: /p, was pp/ }).first()
  await expect(grade).not.toHaveClass(/seg-dim/)
  await expect(page.getByRole('button', { name: /^n — / }).first()).toHaveClass(/seg-dim/)
})

test('search finds a lemma and any of its forms', async ({ page }) => {
  await page.goto('/reference?q=vesi')
  await page.getByRole('link', { name: /vesi/ }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'vesi' })).toBeVisible()
  await expect(page.getByRole('table').first()).toContainText('veden')
  await expect(page.getByRole('table').first()).toContainText('vettä')
  await page.goto('/reference?q=veden')
  await expect(page.getByRole('link', { name: /vesi/ }).first()).toContainText('genitive singular')
})

test('the -i noun lab compares the four families', async ({ page }) => {
  await page.goto('/noun-types/i-words')
  const table = page.getByRole('table').first()
  for (const form of ['pankkia', 'lehteä', 'kieltä', 'uutta']) await expect(table).toContainText(form)
})

test('practice explains a wrong answer (uusin)', async ({ page }) => {
  await page.goto('/practice/session?skill=mixed&type=transform&words=uusi&slots=sg.genitive,sg.partitive&count=4')
  const input = page.getByLabel('Your answer')
  const instruction = await page.getByRole('heading', { level: 2 }).filter({ hasText: 'Write the' }).first().textContent()
  if (instruction?.includes('genitive')) {
    await input.fill('uusin')
  } else {
    await input.fill('uutta')
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Your answer').fill('uusin')
  }
  await page.keyboard.press('Enter')
  const feedback = page.getByRole('status').filter({ hasText: 'Not quite' })
  await expect(feedback).toContainText('pankki-type')
  await expect(feedback).toContainText('newest')
  await expect(feedback).toContainText('uuden')
})

test('progress survives a reload (IndexedDB)', async ({ page }) => {
  await page.goto('/practice/session?skill=mixed&type=transform&words=talo&slots=sg.inessive&count=3')
  await page.getByLabel('Your answer').fill('talossa')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Correct!')).toBeVisible()
  await expect(page.getByRole('link', { name: /Progress: .* 10 XP/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: /Progress: .* 10 XP/ })).toBeVisible()
})

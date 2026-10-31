import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { trackErrors, waitForApp } from './helpers'

const counter = (page: Page) => page.locator('#main').getByText(/^\d+ \/ \d+$/)
/** The flashcard itself: the button that turns it. */
const card = (page: Page) => page.getByRole('button', { name: /Tap to (show|hide) the stems and key forms/ })
const strip = (page: Page) => page.getByRole('navigation', { name: 'Jump to a letter' })

/** Goes to a section through the app's own menu (on phones it is under "More"). */
async function openSection(page: Page, isMobile: boolean, name: string) {
  if (isMobile) {
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('dialog').getByRole('link', { name, exact: true }).click()
  } else {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true }).click()
  }
  await waitForApp(page)
}

test('flashcards: leaving through the menu and coming back resumes on the same card', async ({ page, isMobile }) => {
  const errors = trackErrors(page)
  await page.goto('/vocabulary')
  await waitForApp(page)
  await page.getByText('Flashcards', { exact: true }).click()
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /^Next/ }).click()
  await expect(counter(page)).toHaveText(/^5 \//)
  const name = (await card(page).getAttribute('aria-label'))!

  await openSection(page, isMobile, 'Cases')
  await openSection(page, isMobile, 'Vocabulary')
  await expect(page).toHaveURL(/view=cards/)
  await expect(counter(page)).toHaveText(/^5 \//)
  await expect(card(page)).toHaveAttribute('aria-label', name)
  expect(errors).toEqual([])
})

test('grid: the menu brings the grid back to the word in view, and the flashcards open on it', async ({ page, isMobile }) => {
  const errors = trackErrors(page)
  await page.goto('/vocabulary')
  await waitForApp(page)
  // Read down to the first L word: scroll it to just below the sticky view-and-letters bar.
  const target = await page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>('nav[aria-label="Jump to a letter"]')!.parentElement!
    const covered = parseFloat(getComputedStyle(bar).top) + bar.offsetHeight
    const first = document.querySelector<HTMLElement>('[data-letter="L"] [data-word]')!
    window.scrollTo(0, first.getBoundingClientRect().top + window.scrollY - covered - 8)
    return { id: first.dataset.word!, lemma: first.querySelector('h3')!.textContent! }
  })
  // Leave once the page has noted the word in view.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sija-vocabulary') ?? '{}').state?.wordId)).toBe(target.id)

  await openSection(page, isMobile, 'Cases')
  await openSection(page, isMobile, 'Vocabulary')
  const word = page.locator(`[data-word="${target.id}"]`)
  await expect(word).toBeInViewport()
  await expect(word.locator('article')).toHaveClass(/ring-2/)
  const [wordBox, stripBox] = [await word.boundingBox(), await strip(page).boundingBox()]
  expect(wordBox!.y).toBeGreaterThanOrEqual(stripBox!.y + stripBox!.height - 1)
  expect(wordBox!.y).toBeLessThan(stripBox!.y + stripBox!.height + 40)

  await page.getByText('Flashcards', { exact: true }).click()
  await expect(card(page)).toHaveAccessibleName(new RegExp(`^${target.lemma},`))
  expect(errors).toEqual([])
})

test('flashcards: a reload keeps the card', async ({ page }) => {
  await page.goto('/vocabulary?view=cards')
  await waitForApp(page)
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Next/ }).click()
  await expect(counter(page)).toHaveText(/^4 \//)
  await page.reload()
  await waitForApp(page)
  await expect(counter(page)).toHaveText(/^4 \//)
})

test('grid: Back from a word page returns to that word', async ({ page }) => {
  await page.goto('/vocabulary')
  await waitForApp(page)
  await strip(page).getByRole('button', { name: /^S,/ }).click()
  const first = page.locator('[data-letter="S"] [data-word]').first()
  const lemma = (await first.locator('h3').textContent())!
  await first.getByRole('link', { name: lemma }).click()
  await expect(page.getByRole('heading', { level: 1, name: lemma })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Vocabulary' })).toBeVisible()
  await expect(first).toBeInViewport()
})

test('the last word stays the place, though the grid cannot scroll it to the top', async ({ page }) => {
  await page.goto('/vocabulary?view=cards')
  await waitForApp(page)
  await card(page).press('End')
  const [, total] = (await counter(page).textContent())!.match(/\/ (\d+)/)!
  await expect(counter(page)).toHaveText(`${total} / ${total}`)
  const name = (await card(page).getAttribute('aria-label'))!
  await page.getByText('Cards', { exact: true }).click()
  const last = page.locator('[data-word]').last()
  await expect(last).toBeInViewport()
  // Let the grid note the word in view (it waits for scrolling to settle) before switching back.
  await page.waitForTimeout(400)
  await page.getByText('Flashcards', { exact: true }).click()
  await expect(card(page)).toHaveAttribute('aria-label', name)
})

test('the letter row fades only on a side with letters out of sight (phones)', async ({ page, isMobile }) => {
  await page.goto('/vocabulary')
  await waitForApp(page)
  const mask = () => strip(page).evaluate((nav) => nav.style.maskImage)
  if (!isMobile) {
    // Every letter fits on a desktop: no fade.
    await expect.poll(mask).not.toContain('transparent')
    return
  }
  await expect.poll(mask).toMatch(/^linear-gradient\(to right, black, .*transparent\)$/)
  await strip(page).getByRole('button', { name: /^P,/ }).click()
  await expect.poll(mask).toMatch(/^linear-gradient\(to right, transparent, .*transparent\)$/)
  await strip(page).getByRole('button', { name: /^Ä,/ }).click()
  await expect.poll(mask).toMatch(/^linear-gradient\(to right, transparent, .*black\)$/)
})

test('grid: a letter scrolls to its words and the strip marks where you are', async ({ page }) => {
  await page.goto('/vocabulary')
  await waitForApp(page)
  await strip(page).getByRole('button', { name: /^P,/ }).click()
  const heading = page.getByRole('heading', { level: 2, name: 'P', exact: true })
  await expect(heading).toBeInViewport()
  await expect(strip(page).getByRole('button', { name: /^P,/ })).toHaveAttribute('aria-current', 'true')
  // The strip stays on screen while the grid scrolls under it.
  await expect(strip(page)).toBeInViewport()
})

test('flashcards: a letter, the word list, and the stems and forms on the back', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/vocabulary?view=cards')
  await waitForApp(page)
  await strip(page).getByRole('button', { name: /^K,/ }).click()
  await expect(card(page)).toHaveAccessibleName(/^k/)
  await expect(counter(page)).not.toHaveText(/^1 \//)

  const scrollY = await page.evaluate(() => window.scrollY)
  await page.getByRole('button', { name: 'All words' }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('button', { name: /current card$/ })).toBeInViewport()
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY)
  await sheet.getByRole('searchbox', { name: 'Find a word' }).fill('vesi')
  await sheet.getByRole('button', { name: /^vesi water/ }).click()
  await expect(sheet).toBeHidden()
  await expect(card(page)).toHaveAccessibleName(/^vesi, water\./)

  await card(page).click()
  const back = page.locator('#main dl')
  await expect(back).toContainText('vete- · vede-')
  await expect(back).toContainText('vet-')
  await back.getByRole('button', { name: 'veden — show how it is built' }).click()
  await expect(page.getByRole('dialog').getByRole('list', { name: 'How the form is built' })).toContainText('veden')
  expect(errors).toEqual([])
})

test('flashcards: a swipe moves to the next card without turning it', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'drags with the mouse; touch swipes send the same pointer events')
  await page.goto('/vocabulary?view=cards')
  await waitForApp(page)
  const box = (await card(page).boundingBox())!
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2]
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 150, y, { steps: 6 })
  await page.mouse.up()
  await expect(counter(page)).toHaveText(/^2 \//)
  await expect(card(page)).toHaveAttribute('aria-expanded', 'false')
  // A plain tap still turns it.
  await card(page).click()
  await expect(card(page)).toHaveAttribute('aria-expanded', 'true')
})

test('vocabulary: no serious accessibility violations and no sideways scrolling in either view', async ({ page }) => {
  // Measure settled colours, not elements halfway through a fade-in.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const check = async (what: string) => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${what}: ${v.id} (${v.nodes.length})`)).toEqual([])
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(overflow, `${what} scrolls sideways`).toBe(false)
  }
  await page.goto('/vocabulary')
  await waitForApp(page)
  await check('grid')
  await page.goto('/vocabulary?view=cards&q=kauppa')
  await waitForApp(page)
  await card(page).click()
  await check('flashcard back')
  await page.getByRole('button', { name: 'All words' }).click()
  await check('word list')
})

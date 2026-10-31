import { expect, test, type Locator, type Page } from '@playwright/test'
import { trackErrors, waitForApp } from './helpers'

/** A lesson stop on the learning map (not the "Recommended first" links): its name ends with its status. */
const stop = (scope: Page | Locator, id: string) =>
  scope.getByRole('link', { name: new RegExp(`^${id.replace('.', '\\.')} .*, (not started|started|completed)`) })

const ROUTES = [
  '/',
  '/learn',
  '/learn/4.2',
  '/map',
  '/cases',
  '/cases/illative',
  '/cases/partitive/lab',
  '/cases/genitive/lab',
  '/noun-types',
  '/noun-types/i-words',
  '/noun-types/k26',
  '/stem-lab',
  '/stem-lab/harmony',
  '/stem-lab/possessives',
  '/gradation',
  '/gradation/t-d',
  '/plural',
  '/practice',
  '/listening',
  '/vocabulary',
  '/progress',
  '/reference',
  '/reference/vesi',
  '/yki',
  '/yki/shopping',
  '/settings',
  '/credits',
]

test('every route loads without errors or sideways scrolling', async ({ page }) => {
  const errors = trackErrors(page)
  for (const route of ROUTES) {
    await page.goto(route)
    await waitForApp(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(overflow, `${route} scrolls sideways`).toBe(false)
  }
  expect(errors).toEqual([])
})

test('unknown addresses show the not-found page', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('the learning map is reachable from the navigation and opens lessons', async ({ page, isMobile }) => {
  await page.goto('/')
  await waitForApp(page)
  if (isMobile) await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Learning map' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Learning map' })).toBeVisible()
  const first = stop(page, '1.1')
  await expect(first).toHaveAttribute('aria-current', 'step')
  await first.click()
  await expect(page).toHaveURL(/\/learn\/1\.1$/)
})

test('the learning map works with the keyboard', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'keyboard path is a desktop check')
  await page.goto('/map')
  await waitForApp(page)
  const level2 = page.getByRole('article', { name: /^Level 2:/ })
  await level2.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(stop(level2, '2.1')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(stop(level2, '2.1')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/learn\/2\.1$/)
})

test('the learning map shows lesson progress', async ({ page }) => {
  await page.goto('/learn/1.1')
  await waitForApp(page)
  await page.getByRole('button', { name: 'Start the check' }).click()
  for (;;) {
    await page.getByRole('group', { name: 'Parts of the word' }).getByRole('button').last().click()
    const next = page.getByRole('button', { name: /Continue|See results/ })
    const label = await next.textContent()
    await next.click()
    if (/See results/.test(label ?? '')) break
  }
  await expect(page.getByText('Lesson complete')).toBeVisible()
  await page.goto('/map')
  await waitForApp(page)
  await expect(stop(page, '1.1')).toHaveAccessibleName(/, completed/)
  await expect(stop(page, '1.2')).toHaveAttribute('aria-current', 'step')
  await expect(page.getByText('1 of 52 required lessons completed')).toBeVisible()
  await expect(page.getByRole('link', { name: /^Start 1\.2 / })).toHaveAttribute('href', '/learn/1.2')
})

test('"Builds on" jumps to the level heading below the sticky header', async ({ page }) => {
  await page.goto('/map')
  await waitForApp(page)
  await page.getByRole('article', { name: /^Level 2:/ }).getByRole('link', { name: 'Level 1' }).click()
  await expect(page).toHaveURL(/\/map#level-1$/)
  const heading = page.locator('#level-1')
  await expect(heading).toBeInViewport()
  const headerBottom = await page.locator('header.sticky').first().evaluate((e) => e.getBoundingClientRect().bottom)
  const headingTop = await heading.evaluate((e) => e.getBoundingClientRect().top)
  expect(headingTop).toBeGreaterThanOrEqual(headerBottom)
})

test('a lesson with an unmet prerequisite is an ordinary link without a dashed border', async ({ page }) => {
  await page.goto('/map')
  await waitForApp(page)
  const lesson = stop(page, '1.5')
  await expect(lesson).toHaveAccessibleName(/recommended after 1\.3/)
  expect(await lesson.evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('solid')
  await lesson.click()
  await expect(page).toHaveURL(/\/learn\/1\.5$/)
})

import { expect, test } from '@playwright/test'
import { trackErrors, waitForApp } from './helpers'

const ROUTES = [
  '/',
  '/learn',
  '/learn/4.2',
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

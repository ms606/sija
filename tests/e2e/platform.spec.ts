import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { stubSpeech, waitForApp } from './helpers'

test('audio speaks Finnish at normal and slow speed', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/reference/talo')
  await waitForApp(page)
  await page.getByRole('button', { name: 'Play: talo', exact: true }).first().click()
  await page.getByRole('button', { name: 'Play slowly: talo', exact: true }).first().click()
  const utterances = await page.evaluate(() => (window as unknown as { __utterances: { text: string; lang: string; rate: number }[] }).__utterances)
  expect(utterances).toEqual([
    { text: 'talo', lang: 'fi-FI', rate: 1 },
    { text: 'talo', lang: 'fi-FI', rate: 0.7 },
  ])
})

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/')
  await waitForApp(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // Make sure the service worker controls the page before going offline.
  await page.reload()
  await waitForApp(page)
  await context.setOffline(true)
  for (const route of ['/learn/5.5', '/reference/vesi', '/practice/session?skill=partitive&type=transform&count=3', '/cases/inessive']) {
    await page.goto(route)
    await waitForApp(page)
  }
  await expect(page.getByText('You are offline')).toBeVisible()
  await context.setOffline(false)
})

test('main pages have no serious accessibility violations', async ({ page }) => {
  // Measure settled colours, not elements halfway through a fade-in.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const route of ['/', '/learn/1.3', '/cases', '/cases/translative', '/reference/kauppa', '/practice', '/noun-types/i-words']) {
    await page.goto(route)
    await waitForApp(page)
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${route}: ${v.id} (${v.nodes.length})`)).toEqual([])
  }
})

test('keyboard: skip link and answering with number keys', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'keyboard path is a desktop check')
  await page.goto('/practice/session?skill=mixed&type=identify-case&words=talo&slots=sg.inessive&count=3')
  await waitForApp(page)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  const options = page.getByRole('group', { name: 'Answer options' }).getByRole('button')
  const labels = await options.allTextContents()
  const index = labels.findIndex((l) => l.includes('inessive'))
  await page.keyboard.press(String(index + 1))
  await expect(page.getByText('Correct!')).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue|See results/ })).toBeFocused()
})

test('reduced motion turns animations off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/gradation')
  await waitForApp(page)
  const duration = await page.evaluate(() => {
    const el = document.querySelector('.animate-rise-in')
    return el ? getComputedStyle(el).animationDuration : '0s'
  })
  expect(['0s', '0.001s', '1e-05s', '0.00001s']).toContain(duration)
})

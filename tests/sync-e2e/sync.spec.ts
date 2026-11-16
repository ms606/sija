import { expect, test, type Browser, type Page } from '@playwright/test'
import { E2E_PHRASE } from './server'

// Two browsers stand in for a phone and a laptop: separate cookies and storage,
// one sync server (wrangler dev with a fresh local D1).

test.describe.configure({ mode: 'serial' })

async function device(browser: Browser) {
  const context = await browser.newContext()
  const page = await context.newPage()
  const api: string[] = []
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) api.push(`${r.method()} ${new URL(r.url()).pathname}`)
  })
  return { context, page, api }
}

/** XP as the header shows it. */
async function xp(page: Page): Promise<number> {
  const label = await page.getByRole('link', { name: /^Progress: / }).getAttribute('aria-label')
  return Number(/(\d+) XP/.exec(label ?? '')?.[1])
}

/** talo in six cases: a session never repeats an exercise, so each item asks for another case. */
const TALO: Record<string, string> = { inessive: 'talossa', elative: 'talosta', illative: 'taloon', adessive: 'talolla', ablative: 'talolta', allative: 'talolle' }

/** Opens a practice session of `n` items (at most 6). */
async function openPractice(page: Page, n: number) {
  const slots = Object.keys(TALO).map((c) => `sg.${c}`)
  await page.goto(`/practice/session?skill=mixed&type=transform&words=talo&slots=${slots.join(',')}&count=${n}`)
  await expect(page.getByLabel('Your answer')).toBeVisible()
}

/** Answers the open session's `n` items correctly (10 XP each). */
async function answer(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const instruction = (await page.getByRole('heading', { level: 2 }).filter({ hasText: 'Write the' }).first().textContent()) ?? ''
    const form = Object.entries(TALO).find(([c]) => instruction.includes(c))?.[1]
    expect(form, `an answer for "${instruction}"`).toBeDefined()
    await page.getByLabel('Your answer').fill(form!)
    await page.keyboard.press('Enter')
    await expect(page.getByText('Correct!')).toBeVisible()
    if (i < n - 1) await page.getByRole('button', { name: 'Continue' }).click()
  }
}

async function practise(page: Page, n: number) {
  await openPractice(page, n)
  await answer(page, n)
}

const status = (page: Page) => page.getByTestId('sync-status')

async function connect(page: Page) {
  await page.goto('/settings#sync')
  await page.getByLabel('Sync passphrase').fill(`  ${E2E_PHRASE.toUpperCase()}\n`) // pasted untidily
  await page.getByRole('button', { name: 'Connect this device' }).click()
}

/** Runs a sync and waits until it has finished: its download answered, and the status settled with nothing left to upload. */
async function syncNow(page: Page) {
  if (!new URL(page.url()).pathname.startsWith('/settings')) await page.goto('/settings#sync')
  const pulled = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/sync' && r.request().method() === 'GET')
  await page.getByRole('button', { name: 'Sync now' }).click()
  await pulled
  await expect(status(page)).toHaveText(/^Synced just now\.$/)
}

test('a phone and a laptop keep the same progress through the server', async ({ browser }) => {
  const phone = await device(browser)
  const laptop = await device(browser)

  await test.step('as a guest, the phone practises without ever contacting the server', async () => {
    await practise(phone.page, 2)
    await expect.poll(() => xp(phone.page)).toBe(20)
    await phone.page.goto('/settings#sync')
    await expect(phone.page.getByLabel('Sync passphrase')).toBeVisible()
    await phone.page.locator('#sync').screenshot({ path: test.info().outputPath('1-connect.png') })
    expect(phone.api).toEqual([])
  })

  await test.step('a wrong passphrase is refused with a clear message', async () => {
    await phone.page.getByLabel('Sync passphrase').fill('not the phrase')
    await phone.page.getByRole('button', { name: 'Connect this device' }).click()
    await expect(phone.page.getByRole('alert')).toHaveText("That passphrase doesn't match.")
  })

  await test.step("the phone connects first, so its progress starts the synced progress", async () => {
    await connect(phone.page)
    await expect(status(phone.page)).toHaveText(/^Synced just now\.$/)
    await phone.page.locator('#sync').screenshot({ path: test.info().outputPath('3-connected.png') })
    await expect.poll(() => xp(phone.page)).toBe(20)
  })

  await test.step('the laptop has its own progress, is asked, and takes over the synced progress', async () => {
    await practise(laptop.page, 1)
    await expect.poll(() => xp(laptop.page)).toBe(10)
    await connect(laptop.page)
    const choice = laptop.page.getByRole('group', { name: 'Which progress to keep' })
    await expect(choice).toContainText('This device already has its own progress')
    await laptop.page.locator('#sync').screenshot({ path: test.info().outputPath('2-choice.png') })
    await choice.getByRole('button', { name: 'Use synced progress' }).click()
    await expect(status(laptop.page)).toHaveText(/^Synced just now\.$/)
    await expect.poll(() => xp(laptop.page)).toBe(20)
  })

  await test.step('both practise offline; once online again, both have everything', async () => {
    await openPractice(phone.page, 3)
    await openPractice(laptop.page, 2)
    await phone.context.setOffline(true)
    await laptop.context.setOffline(true)
    await answer(phone.page, 3)
    await answer(laptop.page, 2)
    await expect.poll(() => xp(phone.page)).toBe(50)
    await expect.poll(() => xp(laptop.page)).toBe(40)
    await phone.context.setOffline(false)
    await laptop.context.setOffline(false)
    await syncNow(phone.page)
    await syncNow(laptop.page)
    await syncNow(phone.page)
    await expect.poll(() => xp(phone.page)).toBe(70)
    await expect.poll(() => xp(laptop.page)).toBe(70)
  })

  await test.step('a save the server kept but whose reply was lost counts once', async () => {
    await phone.page.route('**/api/sync', async (route) => {
      if (route.request().method() !== 'PUT') return route.continue()
      await route.fetch() // the server saves it…
      await route.abort('failed') // …but the phone never hears back
    })
    await practise(phone.page, 1)
    await phone.page.goto('/settings#sync')
    await phone.page.getByRole('button', { name: 'Sync now' }).click()
    await expect(status(phone.page)).toHaveText("Not synced yet. Changes from this device upload when you're online.")
    await phone.page.unroute('**/api/sync')
    await syncNow(phone.page)
    await syncNow(laptop.page)
    await expect.poll(() => xp(phone.page)).toBe(80)
    await expect.poll(() => xp(laptop.page)).toBe(80)
  })

  await test.step('a synced setting follows; the theme stays on each device', async () => {
    await phone.page.goto('/settings')
    await phone.page.getByRole('group', { name: 'Exercises per day' }).getByText('30 exercises').click()
    await phone.page.getByRole('group', { name: 'Theme' }).getByText('Dark').click()
    await syncNow(phone.page)
    await syncNow(laptop.page)
    await laptop.page.goto('/settings')
    await expect(laptop.page.getByRole('group', { name: 'Exercises per day' }).getByRole('radio', { name: '30 exercises' })).toBeChecked()
    await expect(laptop.page.getByRole('group', { name: 'Theme' }).getByRole('radio', { name: 'System' })).toBeChecked()
  })

  await test.step('a reset on the phone starts every device over', async () => {
    await phone.page.goto('/progress')
    await phone.page.getByRole('button', { name: 'Reset progress' }).click()
    await expect(phone.page.getByText('Delete all progress on every connected device?')).toBeVisible()
    await phone.page.getByRole('button', { name: 'Delete' }).click()
    await expect.poll(() => xp(phone.page)).toBe(0)
    await syncNow(phone.page)
    await syncNow(laptop.page)
    await expect.poll(() => xp(laptop.page)).toBe(0)
    await expect.poll(() => xp(phone.page)).toBe(0)
  })

  await test.step('a disconnected laptop keeps its progress and stops syncing', async () => {
    await laptop.page.goto('/settings#sync')
    await laptop.page.getByRole('button', { name: 'Disconnect this device' }).click()
    await expect(laptop.page.getByLabel('Sync passphrase')).toBeVisible()
    const before = laptop.api.length
    await practise(laptop.page, 1)
    await expect.poll(() => xp(laptop.page)).toBe(10)
    await laptop.page.waitForTimeout(4_000) // longer than the engine's 3 s debounce
    expect(laptop.api.slice(before)).toEqual([])
  })
})

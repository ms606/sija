import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { E2E_PHRASE } from './server'

// Browsers stand in for a phone, a laptop and a tablet: separate cookies and
// storage, one sync server (wrangler dev with a fresh local D1).

test.describe.configure({ mode: 'serial' })

/** Console errors and uncaught exceptions, apart from the failed requests a test causes on purpose. */
function trackErrors(page: Page, into: string[]) {
  page.on('pageerror', (e) => into.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) into.push(m.text())
  })
}

async function device(browser: Browser, errors: string[]) {
  const context = await browser.newContext({ acceptDownloads: true })
  const page = await context.newPage()
  trackErrors(page, errors)
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

/** Answers the current item correctly (10 XP). */
async function answerOne(page: Page) {
  const instruction = (await page.getByRole('heading', { level: 2 }).filter({ hasText: 'Write the' }).first().textContent()) ?? ''
  const form = Object.entries(TALO).find(([c]) => instruction.includes(c))?.[1]
  expect(form, `an answer for "${instruction}"`).toBeDefined()
  await page.getByLabel('Your answer').fill(form!)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Correct!')).toBeVisible()
}

/** Answers `n` items of the open session. */
async function answer(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await answerOne(page)
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

/** No serious accessibility problems in the Sync section as it is now. */
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).include('#sync').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
}

/** A synced copy as the server would send it: base64 of gzip JSON. */
const served = (value: unknown) => gzipSync(JSON.stringify(value)).toString('base64')

test('a phone, a laptop and a tablet keep the same progress through the server', async ({ browser }) => {
  const errors: string[] = []
  const phone = await device(browser, errors)
  const laptop = await device(browser, errors)
  const tablet = await device(browser, errors)

  await test.step('as a guest, the phone practises without ever contacting the server', async () => {
    await practise(phone.page, 2)
    await expect.poll(() => xp(phone.page)).toBe(20)
    await phone.page.goto('/settings#sync')
    await expect(phone.page.getByLabel('Sync passphrase')).toBeVisible()
    await phone.page.locator('#sync').screenshot({ path: test.info().outputPath('1-connect.png') })
    await accessible(phone.page)
    expect(phone.api).toEqual([])
  })

  await test.step('a wrong passphrase is refused with a clear message', async () => {
    await phone.page.getByLabel('Sync passphrase').fill('not the phrase')
    await phone.page.getByRole('button', { name: 'Connect this device' }).click()
    await expect(phone.page.getByRole('alert')).toHaveText("That passphrase doesn't match.")
  })

  await test.step('the phone connects first, so its progress starts the synced progress', async () => {
    await connect(phone.page)
    await expect(status(phone.page)).toHaveText(/^Synced just now\.$/)
    await phone.page.locator('#sync').screenshot({ path: test.info().outputPath('3-connected.png') })
    await accessible(phone.page)
    await expect.poll(() => xp(phone.page)).toBe(20)
  })

  await test.step('the laptop has its own progress: it can save a backup, then takes over the synced progress', async () => {
    await practise(laptop.page, 1)
    await expect.poll(() => xp(laptop.page)).toBe(10)
    await connect(laptop.page)
    const choice = laptop.page.getByRole('group', { name: 'Which progress to keep' })
    await expect(choice).toContainText('This device already has its own progress')
    await laptop.page.locator('#sync').screenshot({ path: test.info().outputPath('2-choice.png') })
    await accessible(laptop.page)

    const [download] = await Promise.all([laptop.page.waitForEvent('download'), choice.getByRole('button', { name: "Download this device's progress first" }).click()])
    expect(download.suggestedFilename()).toMatch(/^sija-progress-\d{4}-\d{2}-\d{2}\.json$/)
    const backup = JSON.parse(readFileSync((await download.path())!, 'utf8')) as { format: string; data: Record<string, unknown> }
    expect(backup.format).toBe('sija-progress')
    expect(backup.data.xp).toBe(10)
    expect(backup.data).not.toHaveProperty('sync') // a backup never carries sync bookkeeping

    await choice.getByRole('button', { name: 'Use synced progress' }).click()
    await expect(status(laptop.page)).toHaveText(/^Synced just now\.$/)
    await expect.poll(() => xp(laptop.page)).toBe(20)
  })

  await test.step('a new device with no progress takes over the synced progress without being asked', async () => {
    await connect(tablet.page)
    await expect(status(tablet.page)).toHaveText(/^Synced just now\.$/)
    await expect(tablet.page.getByRole('group', { name: 'Which progress to keep' })).toHaveCount(0)
    await expect.poll(() => xp(tablet.page)).toBe(20)
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

  await test.step('another device saved first: the upload is refused, merged and saved again, keeping an answer given meanwhile', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    let held!: () => void
    const putHeld = new Promise<void>((r) => (held = r))
    let holding = true
    const puts: number[] = []
    laptop.page.on('response', (r) => {
      if (new URL(r.url()).pathname === '/api/sync' && r.request().method() === 'PUT') puts.push(r.status())
    })
    await laptop.page.route('**/api/sync', async (route) => {
      if (route.request().method() === 'PUT' && holding) {
        holding = false
        held()
        await gate
      }
      await route.continue()
    })
    await openPractice(laptop.page, 2)
    await answerOne(laptop.page) // +10; the engine uploads a few seconds later
    await putHeld // that upload is on its way, held back
    await practise(phone.page, 1) // meanwhile the phone saves first (+10)
    await syncNow(phone.page)
    await laptop.page.getByRole('button', { name: 'Continue' }).click()
    await answerOne(laptop.page) // an answer given while the laptop's upload is on its way (+10)
    release()
    await expect.poll(() => puts).toEqual([409, 200]) // refused as stale, merged, saved
    await expect.poll(() => xp(laptop.page)).toBe(110) // nothing lost here
    await laptop.page.unroute('**/api/sync')
    await syncNow(laptop.page) // uploads the answer given meanwhile
    await syncNow(phone.page)
    await expect.poll(() => xp(phone.page)).toBe(110)
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

  await test.step('two tabs on one device share its progress and its sync', async () => {
    const second = await phone.context.newPage()
    trackErrors(second, errors)
    await practise(second, 1) // +10 in the second tab
    await expect.poll(() => xp(phone.page)).toBe(120) // the first tab sees it at once
    await syncNow(phone.page)
    await syncNow(laptop.page)
    await expect.poll(() => xp(laptop.page)).toBe(120)
    await second.close()
  })

  await test.step('a synced copy from a newer app, or a damaged one, is refused and nothing changes here', async () => {
    await phone.page.goto('/settings#sync')
    const answerWith = (body: string) =>
      phone.page.route('**/api/sync', (route) =>
        route.request().method() === 'GET' ? route.fulfill({ status: 200, headers: { ETag: '"999"', 'Content-Type': 'text/plain' }, body }) : route.continue(),
      )
    await answerWith(served({ format: 'sija-sync', formatVersion: 2 }))
    await phone.page.getByRole('button', { name: 'Sync now' }).click()
    await expect(status(phone.page)).toHaveText('Update Sija to keep syncing. Your progress is safe on this device.')
    await phone.page.unroute('**/api/sync')
    await answerWith('this is not a synced copy')
    await phone.page.getByRole('button', { name: 'Sync now' }).click()
    await expect(status(phone.page)).toHaveText("The synced copy couldn't be read. This device kept its own progress.")
    await phone.page.unroute('**/api/sync')
    await expect.poll(() => xp(phone.page)).toBe(120)
    await syncNow(phone.page)
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
  })

  await test.step('an imported backup replaces the progress on every device', async () => {
    await laptop.page.goto('/progress')
    const file = { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'sija-progress', version: 1, data: { xp: 1234, skills: {}, lessons: {} } })) }
    await laptop.page.getByLabel('Choose a backup file').setInputFiles(file)
    await expect(laptop.page.getByText('Progress restored from the backup. It replaces the synced progress on every device.')).toBeVisible()
    await expect.poll(() => xp(laptop.page)).toBe(1234)
    await syncNow(laptop.page)
    await syncNow(phone.page)
    await expect.poll(() => xp(phone.page)).toBe(1234)
  })

  await test.step('a disconnected laptop keeps its progress and stops syncing', async () => {
    await laptop.page.goto('/settings#sync')
    await laptop.page.getByRole('button', { name: 'Disconnect this device' }).click()
    await expect(laptop.page.getByLabel('Sync passphrase')).toBeVisible()
    const before = laptop.api.length
    await practise(laptop.page, 1)
    await expect.poll(() => xp(laptop.page)).toBe(1244)
    await laptop.page.waitForTimeout(4_000) // longer than the engine's 3 s debounce
    expect(laptop.api.slice(before)).toEqual([])
  })

  await test.step('reconnecting asks again; "Not now" changes nothing, and "Use this device\'s progress" replaces it everywhere', async () => {
    await connect(laptop.page)
    const choice = laptop.page.getByRole('group', { name: 'Which progress to keep' })
    await choice.getByRole('button', { name: 'Not now' }).click()
    await expect(laptop.page.getByLabel('Sync passphrase')).toBeVisible()
    await expect.poll(() => xp(laptop.page)).toBe(1244)

    await connect(laptop.page)
    await choice.getByRole('button', { name: "Use this device's progress" }).click()
    await expect(status(laptop.page)).toHaveText(/^Synced just now\.$/)
    await syncNow(phone.page)
    await expect.poll(() => xp(phone.page)).toBe(1244)
  })

  await test.step('"Disconnect all devices" on the tablet signs the phone out; its progress stays', async () => {
    await syncNow(tablet.page)
    await expect.poll(() => xp(tablet.page)).toBe(1244)
    await tablet.page.getByRole('button', { name: 'Disconnect all devices' }).click()
    await tablet.page.getByRole('button', { name: 'Disconnect all', exact: true }).click()
    await expect(tablet.page.getByLabel('Sync passphrase')).toBeVisible()
    await phone.page.goto('/settings#sync')
    await phone.page.getByRole('button', { name: 'Sync now' }).click()
    await expect(phone.page.getByText('This device was disconnected from sync, so its progress now stays on this device. Connect again to sync it.')).toBeVisible()
    await expect(phone.page.getByLabel('Sync passphrase')).toBeVisible()
    await expect.poll(() => xp(phone.page)).toBe(1244)
  })

  expect(errors).toEqual([])
})

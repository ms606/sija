// Dev helper: screenshots pages at phone + desktop sizes and reports console errors.
// Usage: node tools/shot.mjs <outDir> <path> [path...]   (dev server on :5173)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { chromeLaunchOptions } from './chrome.mjs'

const [outDir, ...paths] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:5173'
const scheme = process.env.SCHEME ?? 'light'
const browser = await chromium.launch(chromeLaunchOptions())
const sizes = (process.env.SIZES ?? 'phone,desktop').split(',')
const VIEW = { phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, desktop: { width: 1280, height: 860 } }
for (const size of sizes) {
  const ctx = await browser.newContext({ viewport: { width: VIEW[size].width, height: VIEW[size].height }, isMobile: VIEW[size].isMobile, hasTouch: VIEW[size].hasTouch, deviceScaleFactor: VIEW[size].deviceScaleFactor ?? 1, colorScheme: scheme })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  for (const p of paths) {
    errors.length = 0
    await page.goto(base + p, { waitUntil: 'load' })
    try {
      await page.waitForSelector('#main', { timeout: 20000 })
    } catch {
      const diag = await page.evaluate(() => { const m = document.getElementById('main'); const r = m?.getBoundingClientRect(); const cs = m && getComputedStyle(m); return { mains: document.querySelectorAll('#main').length, rect: r && [r.x, r.y, r.width, r.height], vis: cs?.visibility, disp: cs?.display, op: cs?.opacity, bodyH: document.body.scrollHeight } })
      console.log(`${size} ${p} -> TIMEOUT`, JSON.stringify(diag), errors.join(' | '))
      continue
    }
    await page.waitForTimeout(500)
    const name = `${size}-${p.replace(/[^a-z0-9]+/gi, '_') || 'root'}.png`
    if (process.env.PARTS) {
      // Readable slices of a long page: PARTS=n takes n viewport-height slices from the top.
      const total = await page.evaluate(() => document.documentElement.scrollHeight)
      const h = VIEW[size].height
      for (let i = 0; i < Number(process.env.PARTS) && i * h < total; i++) {
        await page.screenshot({ path: `${outDir}/${name.replace('.png', `-${i + 1}.png`)}`, fullPage: true, clip: { x: 0, y: i * h, width: VIEW[size].width, height: Math.min(h, total - i * h) } })
      }
    } else {
      await page.screenshot({ path: `${outDir}/${name}`, fullPage: process.env.FULL === '1' })
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    console.log(`${size} ${p} -> ${name}${overflow ? '  ⚠ horizontal overflow' : ''}${errors.length ? '  ✗ ' + errors.join(' | ') : ''}`)
  }
  await ctx.close()
}
await browser.close()

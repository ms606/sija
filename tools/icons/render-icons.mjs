// Dev helper: renders the SVG app icons to PNG with Chrome (no image tooling needed).
// Usage: node tools/icons/render-icons.mjs
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { chromeLaunchOptions } from '../chrome.mjs'

const jobs = [
  ['tools/icons/icon.svg', 'public/icons/icon-192.png', 192],
  ['tools/icons/icon.svg', 'public/icons/icon-512.png', 512],
  ['tools/icons/icon.svg', 'public/icons/apple-touch-icon.png', 180],
  ['tools/icons/icon-maskable.svg', 'public/icons/icon-maskable-512.png', 512],
]
const browser = await chromium.launch(chromeLaunchOptions())
for (const [src, out, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  const svg = readFileSync(src, 'utf8')
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  await page.close()
  console.log('wrote', out)
}
await browser.close()

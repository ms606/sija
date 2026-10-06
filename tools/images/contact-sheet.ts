/**
 * Dev helper for the photo pipeline: searches Commons for each word and
 * renders one numbered contact sheet per word (with licence and author under
 * each preview) for visual review.
 * Usage: tsx tools/images/contact-sheet.ts <outDir> "<word>=<query>" ["<word>=<query>" …]
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromeLaunchOptions } from '../chrome.mjs'
import { metaValue, searchImages, UA } from './commons-api.ts'

const [outDir, ...jobs] = process.argv.slice(2)
if (!outDir || jobs.length === 0) throw new Error('usage: contact-sheet.ts <outDir> "<word>=<query>" …')
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch(chromeLaunchOptions())
for (const job of jobs) {
  const [word, query] = job.split('=') as [string, string]
  const results = (await searchImages(query, 9, 250)).filter((r) => /jpeg|png|webp/.test(r.mime))
  const cells: string[] = []
  const index: string[] = []
  for (const [i, r] of results.slice(0, 6).entries()) {
    const res = await fetch(r.thumbUrl, { headers: { 'User-Agent': UA } })
    if (!res.ok) continue
    const b64 = Buffer.from(await res.arrayBuffer()).toString('base64')
    const lic = metaValue(r.meta, 'LicenseShortName')
    const restr = metaValue(r.meta, 'Restrictions')
    cells.push(
      `<figure><img src="data:image/jpeg;base64,${b64}"><figcaption><b>${i + 1}</b> ${lic}${restr ? ` ⚠ ${restr}` : ''}<br>${metaValue(r.meta, 'Artist').slice(0, 40)}</figcaption></figure>`,
    )
    index.push(`${word} #${i + 1} ${r.title} | ${lic} | ${r.width}×${r.height}${restr ? ` | RESTRICTIONS: ${restr}` : ''}`)
  }
  const html = `<html><body style="margin:0;font:12px system-ui;background:#fff"><h3 style="margin:6px">${word} — ${query}</h3><div style="display:grid;grid-template-columns:repeat(3,250px);gap:6px;padding:6px">${cells.join('')}</div><style>figure{margin:0}img{width:250px;height:180px;object-fit:cover;display:block}figcaption{height:30px;overflow:hidden}</style></body></html>`
  const page = await browser.newPage({ viewport: { width: 780, height: 520 } })
  await page.setContent(html)
  await page.screenshot({ path: join(outDir, `${word}.png`), fullPage: true })
  await page.close()
  writeFileSync(join(outDir, `${word}.txt`), index.join('\n') + '\n')
  console.log(index.join('\n'))
}
await browser.close()

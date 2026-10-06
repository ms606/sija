/**
 * Dev helper: lists candidate Commons photos for a query with their licence
 * metadata, and saves small previews for visual review.
 * Usage: tsx tools/images/search-commons.ts "<query>" <outDir> [limit]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { metaValue, searchImages, UA } from './commons-api.ts'

const [query, outDir, limit = '10'] = process.argv.slice(2)
if (!query || !outDir) throw new Error('usage: search-commons.ts "<query>" <outDir> [limit]')
mkdirSync(outDir, { recursive: true })
const results = await searchImages(query, Number(limit), 330)
let i = 0
for (const r of results) {
  i++
  const m = r.meta
  const line = [
    `#${i} ${r.title}`,
    `   ${r.width}×${r.height} ${r.mime}`,
    `   licence: ${metaValue(m, 'LicenseShortName')} | url: ${metaValue(m, 'LicenseUrl') || '—'} | attribution required: ${metaValue(m, 'AttributionRequired') || '—'}`,
    `   artist: ${metaValue(m, 'Artist').slice(0, 80)} | restrictions: ${metaValue(m, 'Restrictions') || 'none'}`,
  ].join('\n')
  console.log(line)
  if (r.thumbUrl) {
    const res = await fetch(r.thumbUrl, { headers: { 'User-Agent': UA } })
    if (res.ok) writeFileSync(join(outDir, `${i}.jpg`), Buffer.from(await res.arrayBuffer()))
  }
}

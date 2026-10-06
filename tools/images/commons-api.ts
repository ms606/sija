/**
 * Minimal Wikimedia Commons API client for the dev-only photo pipeline.
 * Nothing here runs in the app: photos are downloaded once, reviewed, and
 * shipped as local files with their own metadata.
 */
export const UA = 'SijaFinnishNounLab/0.1 (development script; photo licence check)'
const API = 'https://commons.wikimedia.org/w/api.php'

export interface ExtMeta {
  [key: string]: { value: string; source?: string } | undefined
}

export interface CommonsImage {
  title: string
  pageUrl: string
  thumbUrl: string
  thumbWidth: number
  thumbHeight: number
  width: number
  height: number
  mime: string
  meta: ExtMeta
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** fetch with polite pacing and retries on 429/503 (honours Retry-After). */
export async function politeFetch(url: string, attempt = 0): Promise<Response> {
  await sleep(attempt === 0 ? 800 : 0)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if ((res.status === 429 || res.status === 503) && attempt < 6) {
    const wait = Number(res.headers.get('retry-after')) * 1000 || 5000 * 2 ** attempt
    console.log(`  (${res.status}, waiting ${Math.round(wait / 1000)} s)`)
    await sleep(wait)
    return politeFetch(url, attempt + 1)
  }
  return res
}

export async function api(params: Record<string, string>): Promise<unknown> {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`
  const res = await politeFetch(url)
  if (!res.ok) throw new Error(`Commons API ${res.status} for ${url}`)
  return res.json()
}

interface PageInfo {
  title: string
  imageinfo?: { url: string; descriptionurl: string; thumburl: string; thumbwidth: number; thumbheight: number; width: number; height: number; mime: string; extmetadata: ExtMeta }[]
}

function toImage(p: PageInfo): CommonsImage | null {
  const ii = p.imageinfo?.[0]
  if (!ii) return null
  return {
    title: p.title,
    pageUrl: ii.descriptionurl,
    thumbUrl: ii.thumburl,
    thumbWidth: ii.thumbwidth,
    thumbHeight: ii.thumbheight,
    width: ii.width,
    height: ii.height,
    mime: ii.mime,
    meta: ii.extmetadata,
  }
}

const IIPROP = 'url|size|mime|extmetadata'

export async function searchImages(query: string, limit = 12, thumbWidth = 330): Promise<CommonsImage[]> {
  const data = (await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: IIPROP,
    iiurlwidth: String(thumbWidth),
  })) as { query?: { pages?: PageInfo[] } }
  return (data.query?.pages ?? []).map(toImage).filter((x): x is CommonsImage => !!x)
}

export async function imageInfo(title: string, thumbWidth = 500): Promise<CommonsImage | null> {
  const data = (await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: IIPROP, iiurlwidth: String(thumbWidth) })) as { query?: { pages?: PageInfo[] } }
  const page = data.query?.pages?.[0]
  return page ? toImage(page) : null
}

/** Plain text from Commons' HTML metadata (author links, descriptions). */
export function plain(html: string | undefined): string {
  return (html ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const metaValue = (m: ExtMeta, key: string): string => plain(m[key]?.value)

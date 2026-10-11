/**
 * Finnish text inside an English explanation is wrapped in ⟦ ⟧ so the UI can
 * render it as Finnish (lang="fi", emphasised) and tests can strip it.
 */
const OPEN = '⟦'
const CLOSE = '⟧'

export const fi = (s: string): string => (s ? `${OPEN}${s}${CLOSE}` : s)

export function fill(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m)
}

/** The text without markup. */
export function plain(s: string): string {
  return s.replaceAll(OPEN, '').replaceAll(CLOSE, '')
}

export interface Segment {
  text: string
  fi: boolean
}

/** Splits marked-up text; a hyphen right after a Finnish part stays with it (opettaji-). */
export function segments(s: string): Segment[] {
  const out: Segment[] = []
  const re = /⟦([^⟧]*)⟧(-?)/g
  let last = 0
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), fi: false })
    out.push({ text: `${m[1]}${m[2]}`, fi: true })
    last = m.index + m[0].length
  }
  if (last < s.length) out.push({ text: s.slice(last), fi: false })
  return out
}

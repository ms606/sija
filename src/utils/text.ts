/** "inessiivi" → "Inessiivi". */
export function capitalize(s: string): string {
  return s ? s[0]!.toLocaleUpperCase('fi') + s.slice(1) : s
}

/** Joins words as "a, b and c". */
export function listJoin(items: string[], last = 'and'): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} ${last} ${items[items.length - 1]}`
}

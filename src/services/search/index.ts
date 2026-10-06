import { looseKey, normalizeForm, type AnalysisHit } from '../../grammar'
import type { Noun } from '../../types/content'
import { grammar } from '../grammar'

export interface SearchResult {
  noun: Noun
  /** How the query matched. */
  kind: 'lemma' | 'form' | 'loose-form' | 'prefix' | 'gloss'
  /** For form matches: every reading of the typed form for this noun. */
  analyses: AnalysisHit[]
  score: number
}

/**
 * Searches lemmas, every inflected form (veden → vesi, genitive singular),
 * umlaut-insensitive spellings (paiva → päivä), lemma prefixes and English glosses.
 */
export function search(query: string, limit = 24): SearchResult[] {
  const q = normalizeForm(query)
  if (!q) return []
  const results = new Map<string, SearchResult>()
  const add = (noun: Noun, kind: SearchResult['kind'], score: number, analyses: AnalysisHit[] = []) => {
    const prev = results.get(noun.id)
    if (!prev || prev.score < score) results.set(noun.id, { noun, kind, score, analyses: [...(prev?.analyses ?? []), ...analyses] })
    else prev.analyses.push(...analyses)
  }
  for (const n of grammar.lexicon) {
    if (n.lemma === q) add(n, 'lemma', 100)
  }
  const exact = grammar.analyze(q)
  for (const hit of exact) {
    const n = grammar.get(hit.lexemeId)
    if (n) add(n, n.lemma === q ? 'lemma' : 'form', n.lemma === q ? 100 : 90, [hit])
  }
  if (exact.length === 0) {
    for (const hit of grammar.analyzeLoose(q)) {
      const n = grammar.get(hit.lexemeId)
      if (n) add(n, 'loose-form', 70, [hit])
    }
  }
  const lq = looseKey(q)
  for (const n of grammar.lexicon) {
    if (n.lemma !== q && (n.lemma.startsWith(q) || looseKey(n.lemma).startsWith(lq))) add(n, 'prefix', 60 - (n.lemma.length - q.length))
    if (q.length >= 2 && new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(n.gloss.en)) add(n, 'gloss', 50)
  }
  for (const r of results.values()) {
    const seen = new Set<string>()
    r.analyses = r.analyses.filter((a) => {
      const k = `${a.slot}:${a.person ?? ''}:${a.form}`
      return seen.has(k) ? false : (seen.add(k), true)
    })
  }
  return [...results.values()].sort((a, b) => b.score - a.score || a.noun.lemma.localeCompare(b.noun.lemma, 'fi')).slice(0, limit)
}

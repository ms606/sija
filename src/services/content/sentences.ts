import { SENTENCES, getSentence } from '../../data/sentences'
import type { RenderedSentence, SlotKey } from '../../grammar'
import type { ExampleSentence } from '../../types/content'
import { grammar } from '../grammar'

export interface SentenceView extends RenderedSentence {
  sentence: ExampleSentence
}

const rendered = new Map<string, SentenceView>()

/** Renders a curated sentence with engine forms (cached). */
export function renderSentenceById(id: string): SentenceView | undefined {
  const cached = rendered.get(id)
  if (cached) return cached
  const sentence = getSentence(id)
  if (!sentence) return undefined
  const view = { ...grammar.renderSentence(sentence.fi), sentence }
  rendered.set(id, view)
  return view
}

interface IndexEntry {
  id: string
  slot: SlotKey
  focus: boolean
}

let index: Map<string, IndexEntry[]> | null = null

function buildIndex(): Map<string, IndexEntry[]> {
  const map = new Map<string, IndexEntry[]>()
  for (const s of SENTENCES) {
    const view = renderSentenceById(s.id)
    if (!view) continue
    for (const part of view.parts) {
      const t = part.token
      if (!t) continue
      for (const lexemeId of t.lexemeIds) {
        const list = map.get(lexemeId) ?? []
        list.push({ id: s.id, slot: t.slot, focus: t.focus })
        map.set(lexemeId, list)
      }
    }
  }
  return map
}

/** Sentences that use a lexeme, optionally in a given slot (focus uses first). */
export function sentencesFor(lexemeId: string, slot?: SlotKey, maxLevel = 8): SentenceView[] {
  index ??= buildIndex()
  const entries = (index.get(lexemeId) ?? []).filter((e) => !slot || e.slot === slot)
  const ordered = [...entries.filter((e) => e.focus), ...entries.filter((e) => !e.focus)]
  const seen = new Set<string>()
  const out: SentenceView[] = []
  for (const e of ordered) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    const v = renderSentenceById(e.id)
    if (v && v.sentence.level <= maxLevel) out.push(v)
  }
  return out
}

export function allSentenceViews(): SentenceView[] {
  return SENTENCES.map((s) => renderSentenceById(s.id)).filter((v): v is SentenceView => !!v)
}

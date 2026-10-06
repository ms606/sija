import type { ExampleSentence } from '../../types/content'
import { CURATED } from '../lexicon/build'

export interface SentenceOpts {
  tags?: string[]
  level?: number
  register?: ExampleSentence['register']
}

/** A curated example sentence. `fi` is a template whose noun forms come from the engine. */
export const s = (id: string, fi: string, en: string, o: SentenceOpts = {}): ExampleSentence => ({
  id,
  fi,
  en,
  register: o.register ?? 'standard',
  level: o.level ?? 1,
  tags: o.tags ?? [],
  provenance: CURATED,
})

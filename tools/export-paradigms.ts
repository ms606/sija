/**
 * Exports every engine-generated form of the curated lexicon to JSON, for
 * independent cross-checking by tools/morph-oracle/check.py.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEXICON } from '../src/data/lexicon/index.ts'
import { inflect } from '../src/grammar/inflect.ts'
import { ALL_SLOTS } from '../src/grammar/slots.ts'
import { createGrammar } from '../src/grammar/index.ts'
import { SENTENCES } from '../src/data/sentences/index.ts'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'morph-oracle', '.cache', 'paradigms.json')

const entries = LEXICON.map((n) => {
  const slots: Record<string, { forms: string[]; registers: string[]; status: string }> = {}
  for (const slot of ALL_SLOTS) {
    if (slot.endsWith('.accusative')) continue
    const f = inflect(n, slot)
    if (f.status === 'not-used') continue
    slots[slot] = {
      forms: f.variants.map((v) => v.text),
      registers: f.variants.map((v) => v.register),
      status: f.status,
    }
  }
  return {
    id: n.id,
    lemma: n.lemma,
    pos: n.pos,
    typeId: n.typeId,
    kotus: n.kotus,
    compound: n.compound ?? null,
    overrides: (n.overrides ?? []).map((o) => ({ slot: o.slot, forms: o.forms, mode: o.mode })),
    slots,
  }
})

const grammar = createGrammar(LEXICON)
const sentences = SENTENCES.map((s) => ({ id: s.id, register: s.register, text: grammar.renderSentence(s.fi).text }))

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), entries, sentences }, null, 1))
console.log(`Exported ${entries.length} lexemes and ${sentences.length} sentences to ${out}`)

import { describe, expect, it } from 'vitest'
import { GOLDEN } from '../../data/golden/principal-parts'
import { requireNoun } from '../../data/lexicon'
import { inflect } from '../inflect'
import type { SlotKey } from '../types'

const SG: SlotKey[] = ['sg.nominative', 'sg.genitive', 'sg.partitive', 'sg.illative', 'sg.essive', 'sg.inessive']
const PL: SlotKey[] = ['pl.nominative', 'pl.genitive', 'pl.partitive', 'pl.inessive', 'pl.illative']

function parse(line: string): Map<SlotKey, string[]> {
  const [sg = '', pl = ''] = line.split('|').map((s) => s.trim().split(/\s+/))
  const out = new Map<SlotKey, string[]>()
  SG.forEach((slot, i) => out.set(slot, (sg[i] ?? '').split('/')))
  PL.forEach((slot, i) => out.set(slot, (pl[i] ?? '').split('/')))
  return out
}

describe('golden principal parts (hand-written, independent of the engine)', () => {
  for (const [id, line] of Object.entries(GOLDEN)) {
    it(id, () => {
      const noun = requireNoun(id)
      for (const [slot, expected] of parse(line)) {
        const form = inflect(noun, slot)
        const taught = form.variants.filter((v) => v.register !== 'rare').map((v) => v.text)
        expect({ slot, forms: [...taught].sort() }).toEqual({ slot, forms: [...expected].sort() })
        expect({ slot, primary: form.variants[0]?.text }).toEqual({ slot, primary: expected[0] })
      }
    })
  }
})

import { describe, expect, it } from 'vitest'
import { grammar } from '../../services/grammar'
import { YKI_DOMAINS } from '../yki'

const words = (s: string) => s.toLowerCase().split(/[^a-zåäö’-]+/u).filter(Boolean)

describe('YKI domains', () => {
  it('has nine domains whose words exist', () => {
    expect(YKI_DOMAINS).toHaveLength(9)
    for (const d of YKI_DOMAINS) for (const w of d.words) expect(grammar.get(w), `${d.id}: ${w}`).toBeDefined()
  })
  it('every checklist form appears in its model answer exactly as the engine builds it', () => {
    for (const d of YKI_DOMAINS) {
      const text = words(d.writing.model)
      for (const c of d.writing.checklist) {
        const lex = grammar.require(c.lexemeId)
        const forms = (c.person ? grammar.withPossessive(lex, c.slot, c.person) : grammar.inflect(lex, c.slot)).variants.map((v) => v.text)
        expect(forms.some((f) => text.includes(f)), `${d.id}: ${c.lexemeId} ${c.slot} (${forms.join('/')})`).toBe(true)
      }
    }
  })
})

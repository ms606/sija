/**
 * Renders the explanations the app shows for given forms, so the native-review
 * packet (tools/audit/native-review.py) can quote them word for word.
 *
 *   tsx tools/audit/explain-forms.ts <in.json> <out.json>
 *
 * in:  [{ lexemeId, slot, person?, text }]  (a literal form: { lexemeId, literal: true, text })
 * out: [{ lexemeId, slot, person, text, steps: [{ kind, ruleId, label, en, fi }] }]
 * Read-only: it uses the engine and the app's own text functions.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { LEXICON } from '../../src/data/lexicon/index.ts'
import { createGrammar } from '../../src/grammar/index.ts'
import type { DerivationStep, PersonId, SlotKey } from '../../src/grammar/types.ts'
import { ruleText, stepText } from '../../src/services/content/text.ts'

interface Request {
  lexemeId: string
  slot?: SlotKey
  person?: PersonId | null
  text: string
  literal?: boolean
}

const grammar = createGrammar(LEXICON)
const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('usage: tsx tools/audit/explain-forms.ts <in.json> <out.json>')

const requests = JSON.parse(readFileSync(input, 'utf8')) as Request[]
const result = requests.map((r) => {
  const lex = grammar.require(r.lexemeId)
  if (r.literal) {
    // A lexicalised form has no derivation; the app explains it with the word's notes.
    const steps = (LEXICON.find((n) => n.id === r.lexemeId)?.notes ?? []).map((id) => ({
      kind: 'note',
      ruleId: id,
      label: 'lexical',
      en: ruleText(id, undefined, 'beginner').main,
      fi: ruleText(id, undefined, 'intermediate').main,
    }))
    return { ...r, steps }
  }
  const form = r.person ? grammar.withPossessive(lex, r.slot!, r.person) : grammar.inflect(lex, r.slot!)
  const variant = form.variants.find((v) => v.text === r.text)
  const steps = (variant?.steps ?? []).map((s: DerivationStep) => ({
    kind: s.kind,
    ruleId: s.ruleId,
    label: s.label,
    en: stepText(s, 'beginner').main,
    fi: stepText(s, 'intermediate').main,
  }))
  return { ...r, found: Boolean(variant), steps }
})
writeFileSync(output, JSON.stringify(result, null, 1))

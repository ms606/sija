/**
 * Renders the explanations the app shows for given forms, so the native-review
 * packet (tools/audit/native-review.py) can quote them word for word.
 *
 *   tsx tools/audit/explain-forms.ts <in.json> <out.json>
 *
 * in:  [{ lexemeId, slot, person?, text }]  (a literal form: { lexemeId, literal: true, text })
 * out: [{ lexemeId, slot, person, text, found, steps: [{ kind, ruleId, label, en, fi }] }]
 *
 * The text is the word-specific walkthrough ("Explain this form") that the app
 * shows in every learner mode; `fi` repeats it, since the walkthrough has no
 * separate Finnish version. Read-only: it uses the engine and the app's own
 * explanation service.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import type { PersonId, SlotKey } from '../../src/grammar/types.ts'
import { ruleText } from '../../src/services/content/text.ts'
import { explainForm, plain } from '../../src/services/explain/index.ts'
import { LEXICON } from '../../src/data/lexicon/index.ts'

interface Request {
  lexemeId: string
  slot?: SlotKey
  person?: PersonId | null
  text: string
  literal?: boolean
}

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('usage: tsx tools/audit/explain-forms.ts <in.json> <out.json>')

const requests = JSON.parse(readFileSync(input, 'utf8')) as Request[]
const result = requests.map((r) => {
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
  const exp = explainForm(r.lexemeId, r.slot!, { ...(r.person ? { person: r.person } : {}), variantText: r.text })
  const found = !!exp && exp.form === r.text
  const steps = (found && exp ? exp.steps : []).map((s) => {
    const en = plain(s.text)
    return { kind: s.kind, ruleId: s.ruleId, label: s.label, en, fi: en }
  })
  return { ...r, found, steps }
})
writeFileSync(output, JSON.stringify(result, null, 1))

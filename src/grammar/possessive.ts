import { Form } from './builder'
import { realize } from './harmony'
import { inflect } from './inflect'
import { isVowel } from './phonology'
import { parseSlot } from './slots'
import { getStems } from './stems'
import type { FormVariant, Harmony, Lexeme, NounForm, PersonId, SlotKey } from './types'

export const PX_SUFFIX: Readonly<Record<PersonId, string>> = {
  '1sg': 'ni',
  '2sg': 'si',
  '3': 'nsA',
  '1pl': 'mme',
  '2pl': 'nne',
}

/** Slots whose own ending (-n / -t / Ø) disappears before a possessive suffix: px goes on the vowel stem. */
const ON_VOWEL_STEM: ReadonlySet<SlotKey> = new Set([
  'sg.nominative',
  'sg.genitive',
  'sg.accusative',
  'pl.nominative',
  'pl.accusative',
])

/** Slots whose final -n is dropped before the suffix (talo|on → talooni, talo|jen → talojeni). */
const DROP_N: ReadonlySet<SlotKey> = new Set(['sg.illative', 'pl.genitive', 'pl.illative'])

/**
 * Slots where the 3rd person may also be -Vn (talossaan) besides -nsA (talossansa):
 * only after a short vowel, and never after the -n cases (genitive, illative):
 * taloonsa, taloihinsa, maahansa — not *taloihiin, *maahaan (Kielitoimiston ohjepankki).
 */
function allowsVn(slot: SlotKey, base: string): boolean {
  if (ON_VOWEL_STEM.has(slot) || DROP_N.has(slot)) return false
  const last = base[base.length - 1]
  return isVowel(last) && base[base.length - 2] !== last
}

/**
 * The suffix agrees with the case ending it follows. That is the word's own
 * harmony, except where a lexical ending has other vowels: veri → verta → vertansa.
 */
function suffixHarmony(base: Form, wordHarmony: Harmony): Harmony {
  const ending = base
    .pieces()
    .filter((p) => p.role === 'ending' || p.role === 'exception')
    .map((p) => p.text)
    .join('')
  if (/[aou]/.test(ending)) return 'back'
  if (/[äöy]/.test(ending)) return 'front'
  return wordHarmony
}

function fromVariant(v: FormVariant): Form {
  return new Form(
    v.pieces.map((p) => ({ ...p })),
    v.steps.filter((s) => s.kind !== 'result').map((s) => ({ ...s })),
  )
}

/**
 * Adds a possessive suffix (omistusliite) to a case form:
 *   kauppa + 1sg → kauppani (nom/gen: -n drops, strong grade returns)
 *   kaupassa + 1sg → kaupassani;  taloon + 1sg → talooni;  taloksi → talokseni
 *   3rd person: talossaan ~ talossansa, but only talonsa / taloonsa.
 */
export function withPossessive(lex: Lexeme, slot: SlotKey, person: PersonId): NounForm {
  let perLex = pxCache.get(lex)
  if (!perLex) {
    perLex = new Map()
    pxCache.set(lex, perLex)
  }
  const key = `${slot}:${person}`
  const cached = perLex.get(key)
  if (cached) return cached
  const result = computePossessive(lex, slot, person)
  perLex.set(key, result)
  return result
}

const pxCache = new WeakMap<Lexeme, Map<string, NounForm>>()

function computePossessive(lex: Lexeme, slot: SlotKey, person: PersonId): NounForm {
  const { kase } = parseSlot(slot)
  if (kase === 'instructive' || slot === 'sg.comitative') {
    return { lexemeId: lex.id, slot, person, variants: [], status: 'not-used', statusRuleId: 'px.not-used' }
  }
  const stems = getStems(lex)
  const harmony = stems.harmony.harmony
  const bases: { form: Form; register: FormVariant['register'] }[] = []

  if (ON_VOWEL_STEM.has(slot)) {
    const plain = inflect(lex, slot.startsWith('sg') ? 'sg.nominative' : 'pl.nominative')
    const f = stems.vowelStrong.clone()
    const before = plain.variants[0]?.text ?? lex.lemma
    f.steps = [...(plain.variants[0]?.steps.filter((s) => s.kind === 'lemma' || s.kind === 'type') ?? []), ...f.steps]
    const graded = stems.gradation && stems.gradation.direction === 'normal'
    f.step('possessive', graded ? 'px.base.strong-grade' : 'px.base.vowel-stem', before, 'rule', {
      slot,
      ending: slot === 'pl.nominative' || slot === 'pl.accusative' ? '-t' : slot === 'sg.genitive' ? '-n' : '',
    })
    bases.push({ form: f, register: 'standard' })
  } else if (slot === 'pl.comitative') {
    for (const v of inflect(lex, slot).variants) {
      const f = fromVariant(v)
      // Remove the 3rd-person suffix the comitative carries by default (…ine|en / …ine|nsä).
      const last = f.segs[f.segs.length - 1]
      if (last?.role === 'possessive') {
        f.replaceEnd(last.text, '', 'possessive')
        f.segs.pop()
        f.steps = f.steps.filter((s) => s.kind !== 'possessive')
      }
      if (!bases.some((b) => b.form.text === f.text)) bases.push({ form: f, register: 'standard' })
    }
  } else {
    // Rare case forms take suffixes too (hampaihin → hampaihini); the result stays rare.
    for (const v of inflect(lex, slot).variants) {
      const f = fromVariant(v)
      if (DROP_N.has(slot) && f.text.endsWith('n')) {
        const before = f.text
        f.replaceEnd('n', '', 'ending', 'px.drop-n')
        f.segs.pop()
        f.step('possessive', 'px.drop-n', before, 'rule')
      } else if (kase === 'translative') {
        const before = f.text
        f.replaceEnd('ksi', 'kse', 'ending', 'px.ksi-to-kse')
        f.step('possessive', 'px.ksi-to-kse', before, 'rule')
      }
      bases.push({ form: f, register: v.register })
    }
  }

  const variants: FormVariant[] = []
  for (const { form, register } of bases) {
    const suffixes: { text: string; ruleId: string }[] = []
    if (person === '3') {
      if (allowsVn(slot, form.text)) {
        suffixes.push({ text: `${form.text[form.text.length - 1]}n`, ruleId: 'px.3.vn' })
      }
      suffixes.push({ text: realize('nsA', suffixHarmony(form, harmony)), ruleId: 'px.3.nsa' })
    } else {
      suffixes.push({ text: PX_SUFFIX[person], ruleId: `px.${person}` })
    }
    suffixes.forEach((sfx, i) => {
      const f = form.clone()
      const before = f.text
      f.append(sfx.text, 'possessive', sfx.ruleId)
      f.step('possessive', sfx.ruleId, before, 'rule', { suffix: `-${sfx.text}`, person })
      f.step('result', 'step.result', f.text, 'rule')
      variants.push({
        text: f.text,
        pieces: f.pieces(),
        steps: f.steps,
        register: variants.length === 0 && i === 0 ? register : register === 'rare' ? 'rare' : 'variant',
      })
    })
  }
  const seen = new Set<string>()
  const unique = variants.filter((v) => (seen.has(v.text) ? false : (seen.add(v.text), true)))
  return { lexemeId: lex.id, slot, person, variants: unique, status: 'ok' }
}

import { describe, expect, it } from 'vitest'
import { DECLENSION_TYPES, type IGroup } from '../../grammar'
import { ALL_SLOTS } from '../../grammar/slots'
import type { Lexeme, SlotKey } from '../../grammar/types'
import { familyName, typeName } from '../../services/content/text'
import { CARD_SLOTS, typeCard, typesOfFamily } from '../../services/content/types'
import { grammar } from '../../services/grammar'
import { MODEL_WORDS } from '../lexicon/models'
import { FAMILIES, I_GROUP_INFO, I_GROUP_ORDER, I_TYPE_NOTES, LEARNING_FAMILY_NOTE } from '../noun-families'

const TYPES = Object.values(DECLENSION_TYPES)
const FAMILY_IDS = I_GROUP_ORDER

describe('declension type names', () => {
  it('covers all 35 Kotus types used by the app, each in exactly one overview group', () => {
    expect(TYPES).toHaveLength(35)
    expect(FAMILIES.flatMap((f) => f.types).sort()).toEqual(TYPES.map((t) => t.id).sort())
  })

  it("names every type after its own Kotus model word, never another type's", () => {
    for (const def of TYPES) {
      expect(typeName(def.id), def.id).toBe(`${def.modelWord}-type`)
      expect(typeName(def.id, { kotus: true }), def.id).toBe(`${def.modelWord}-type · Kotus ${def.kotus}`)
      // When the app has the model word, it really is a word of this type.
      const model = grammar.byLemma(def.modelWord)
      if (model.length)
        expect(
          model.some((l) => l.typeId === def.id),
          `${def.id}: model word ${def.modelWord}`,
        ).toBe(true)
    }
  })

  it('never shows a learning family as the name of a declension type', () => {
    const familyLabels = FAMILY_IDS.map((g) => `${g}-type`)
    for (const def of TYPES) {
      const name = typeName(def.id)
      // A family name may only appear if it is genuinely this type's own model word.
      if (familyLabels.includes(name)) expect(def.modelWord, def.id).toBe(name.replace('-type', ''))
      expect(name, def.id).not.toContain('family')
    }
    for (const g of FAMILY_IDS) expect(familyName(g)).toBe(`${g} family`)
  })

  it('gives distinct types distinct names', () => {
    const names = TYPES.map((d) => typeName(d.id))
    expect(new Set(names).size).toBe(names.length)
    const families = FAMILY_IDS.map((g) => familyName(g))
    for (const f of families) expect(names).not.toContain(f)
  })
})

describe('type cards', () => {
  it('show the type’s own Kotus model word, with its forms, word count and family — all about the same type', () => {
    for (const def of TYPES) {
      const card = typeCard(def.id)
      expect(card.name, def.id).toBe(typeName(def.id))
      expect(card.kotus, def.id).toBe(def.kotus)
      expect(card.modelWord, def.id).toBe(def.modelWord)
      // The representative word is the registry's model word, of this very type — never a word of another type.
      expect(card.example?.lemma, def.id).toBe(def.modelWord)
      expect(card.example?.typeId, def.id).toBe(def.id)
      expect(card.example?.kotus.replace(/\D.*$/, ''), def.id).toBe(String(def.kotus))
      expect(card.forms, def.id).toEqual(CARD_SLOTS.map((s) => grammar.inflect(card.example!, s).variants[0]!.text))
      expect(card.exampleInLexicon, def.id).toBe(!!grammar.get(card.example!.id))
      expect(card.count, def.id).toBe(grammar.lexicon.filter((l) => l.typeId === def.id).length)
      if (def.iGroup)
        expect(card.family, def.id).toEqual({
          id: def.iGroup,
          label: familyName(def.iGroup),
        })
      else expect(card.family, def.id).toBeUndefined()
    }
  })

  it('Kotus 5 (risti-type) shows risti and its own forms, although risti is not a learner word', () => {
    const card = typeCard('k5')
    expect(card).toMatchObject({
      name: 'risti-type',
      kotus: 5,
      modelWord: 'risti',
      exampleInLexicon: false,
      family: { id: 'pankki', label: 'pankki family' },
    })
    expect(card.example).toMatchObject({ lemma: 'risti', typeId: 'k5' })
    expect(card.forms).toEqual(['ristin', 'ristiä', 'ristejä'])
    // Not a form of pankki, paperi or any other word.
    expect(card.forms.join(' ')).not.toMatch(/pank|paper/)
  })

  it('Kotus 9 (kala-type) shows kala and its own forms', () => {
    const card = typeCard('k9')
    expect(card).toMatchObject({
      name: 'kala-type',
      kotus: 9,
      modelWord: 'kala',
      exampleInLexicon: true,
    })
    expect(card.example).toMatchObject({ lemma: 'kala', typeId: 'k9' })
    expect(card.forms).toEqual(['kalan', 'kalaa', 'kaloja'])
    expect(card.count).toBe(grammar.lexicon.filter((l) => l.typeId === 'k9').length)
    expect(card.family).toBeUndefined()
  })

  it('model words outside the lexicon are never learner words', () => {
    for (const m of MODEL_WORDS) {
      expect(grammar.get(m.id), m.lemma).toBeUndefined()
      expect(DECLENSION_TYPES[m.typeId]?.modelWord, m.lemma).toBe(m.lemma)
      expect(
        grammar.byLemma(m.lemma).some((l) => l.typeId === m.typeId),
        `${m.lemma} is already in the lexicon`,
      ).toBe(false)
    }
  })
})

const ALL_WORDS: readonly Lexeme[] = [...grammar.lexicon, ...MODEL_WORDS]

function stemsOf(lex: Lexeme): string[] {
  const s = grammar.stems(lex)
  return [s.vowelStrong.text, s.vowelWeak.text, ...(s.consonant ? [s.consonant.text] : []), ...s.plural.flatMap((p) => [p.strong, p.weak])]
}
function formsOf(lex: Lexeme): string[] {
  return [lex.lemma, ...ALL_SLOTS.flatMap((slot) => grammar.inflect(lex, slot).variants.map((v) => v.text))]
}

/**
 * The documented criterion of each -i learning family (I_GROUP_INFO.criterion),
 * computed from the word's own stems and forms.
 */
function familyOf(lex: Lexeme): IGroup | 'none' {
  const stems = grammar.stems(lex)
  const strong = stems.vowelStrong.text
  const weak = stems.vowelWeak.text
  const head = lex.compound ? lex.lemma.slice(lex.compound.modifier.length) : lex.lemma
  const partitive = grammar.inflect(lex, 'sg.partitive').variants[0]!
  const consonantPartitive = partitive.steps.some((s) => s.ruleId.startsWith('stem.consonant.'))
  if (!head.endsWith('i') || /[aeouyäö]i$/.test(head)) return 'none'
  // pankki: the singular vowel stem keeps the -i.
  if (strong.endsWith('i')) return 'pankki'
  if (!strong.endsWith('e')) return 'none'
  // lehti: -e- stem, partitive on that vowel stem, no consonant stem.
  if (!consonantPartitive && !stems.consonant) return partitive.text.startsWith(strong) ? 'lehti' : 'none'
  // uusi: -si word whose s becomes t in the strong vowel stem, changes again in the weak grade, and stays si in the plural.
  if (head.endsWith('si') && strong.endsWith('te')) {
    const plural = grammar.inflect(lex, 'pl.partitive').variants[0]!.text
    return weak !== strong && plural.includes('si') ? 'uusi' : 'none'
  }
  // kieli: -e- stem identical in every case, s stays s, partitive on a consonant stem.
  if (strong === weak && consonantPartitive && (!head.endsWith('si') || strong.endsWith('se'))) return 'kieli'
  return 'none'
}

describe('-i learning families', () => {
  it('read their member types from the registry: every -i type is in exactly one family', () => {
    const covered = FAMILY_IDS.flatMap((g) => typesOfFamily(g).map((d) => d.id))
    expect(new Set(covered).size).toBe(covered.length)
    expect(covered.sort()).toEqual(
      FAMILIES.find((f) => f.id === 'i')!
        .types.slice()
        .sort(),
    )
  })

  it("assign every word (lexicon and model words) by the family's written criterion, computed from its generated stems and forms", () => {
    const wrong: string[] = []
    for (const lex of ALL_WORDS) {
      const actual = grammar.type(lex).iGroup ?? 'none'
      const expected = familyOf(lex)
      if (actual !== expected) wrong.push(`${lex.lemma} (${lex.typeId}): family ${actual}, criterion says ${expected}`)
    }
    expect(wrong).toEqual([])
  })

  it('every word of a family type ends in -i, and the family model and featured words belong to it', () => {
    for (const g of FAMILY_IDS) {
      for (const def of typesOfFamily(g)) {
        for (const lex of grammar.lexicon.filter((l) => l.typeId === def.id)) expect(lex.lemma, def.id).toMatch(/i$/)
      }
      const info = I_GROUP_INFO[g]
      expect(grammar.type(grammar.require(info.model)).iGroup).toBe(g)
      for (const id of info.featured) expect(grammar.type(grammar.require(id)).iGroup, `${g}: ${id}`).toBe(g)
    }
  })

  it('every -i type has a note on what it shares with its family and what is its own; no other type has one', () => {
    for (const def of TYPES) expect(!!I_TYPE_NOTES[def.id], def.id).toBe(!!def.iGroup)
  })
})

/** ⟦form⟧ and ⟦stem⟧- tokens of a marked-up text. */
function cited(text: string): { text: string; stem: boolean }[] {
  return [...text.matchAll(/⟦([^⟧]+)⟧(-?)/g)].map((m) => ({
    text: m[1]!,
    stem: m[2] === '-',
  }))
}

/** Lemma → forms chains ("⟦lehti⟧ → ⟦lehden⟧, ⟦lehteä⟧") and stem + ending = form ("⟦kiel⟧- + -tä = ⟦kieltä⟧"). */
function chainErrors(text: string): string[] {
  const errors: string[] = []
  for (const m of text.matchAll(/⟦([^⟧]+)⟧(-?)(?: [“"][^”"]*[”"])? → /g)) {
    const [head, isStem] = [m[1]!, m[2] === '-']
    const rest = text.slice(m.index! + m[0].length)
    const targets: string[] = []
    // A token followed by its own arrow starts the next chain.
    for (const t of rest.matchAll(/⟦([^⟧]+)⟧(-?)(?!(?: [“"][^”"]*[”"])? → )(\s*\([^)]*\))?(, | ~ | or )?/gy)) {
      targets.push(t[1]! + t[2]!)
      if (!t[4]) break
    }
    for (const target of targets) {
      if (isStem) {
        if (!target.startsWith(head)) errors.push(`${head}- → ${target}: not built on that stem`)
        const words = ALL_WORDS.filter((w) => stemsOf(w).includes(head) && formsOf(w).includes(target.replace(/-$/, '')))
        if (!words.length) errors.push(`${head}- → ${target}: no word has both`)
      } else {
        const words = ALL_WORDS.filter((w) => w.lemma === head)
        if (!words.length) errors.push(`${head}: not a word of the app`)
        const ok = target.endsWith('-') ? words.some((w) => stemsOf(w).includes(target.slice(0, -1))) : words.some((w) => formsOf(w).includes(target))
        if (!ok) errors.push(`${head} → ${target}: not generated by the engine`)
      }
    }
  }
  for (const m of text.matchAll(/⟦([^⟧]+)⟧- \+ -(\S+) [=→] ⟦([^⟧]+)⟧/g)) {
    const [stem, ending, form] = [m[1]!, m[2]!, m[3]!]
    if (stem + ending !== form) errors.push(`${stem}- + -${ending} ≠ ${form}`)
    if (!ALL_WORDS.some((w) => stemsOf(w).includes(stem) && formsOf(w).includes(form)))
      errors.push(`${stem}- + -${ending} = ${form}: no word has that stem and form`)
  }
  return errors
}

/** Every cited form/stem must be generated for one of `words`. */
function membershipErrors(text: string, words: readonly Lexeme[], where: string): string[] {
  const forms = new Set(words.flatMap(formsOf))
  const stems = new Set(words.flatMap(stemsOf))
  return cited(text)
    .filter((c) => !(c.stem ? stems.has(c.text) : forms.has(c.text)))
    .map((c) => `${where}: ${c.text}${c.stem ? '-' : ''} is not a ${c.stem ? 'stem' : 'form'} of the words it describes`)
}

describe('family and type descriptions match the generated forms', () => {
  const familyWords = (g: IGroup) => ALL_WORDS.filter((w) => grammar.type(w).iGroup === g)

  it("every form and stem cited in a family's criterion and summary is generated for a word of that family", () => {
    const errors: string[] = []
    for (const g of FAMILY_IDS) {
      const info = I_GROUP_INFO[g]
      for (const [k, text] of [
        ['criterion', info.criterion.en],
        ['summary', info.summary.beginner.en],
      ] as const) {
        expect(cited(text).length, `${g}.${k} cites forms`).toBeGreaterThan(0)
        errors.push(...membershipErrors(text, familyWords(g), `${g}.${k}`), ...chainErrors(text))
      }
      // The recognition hints also name look-alikes from other families: each must still be a real word or form.
      errors.push(...membershipErrors(info.recognize.beginner.en, ALL_WORDS, `${g}.recognize`), ...chainErrors(info.recognize.beginner.en))
    }
    expect(errors).toEqual([])
  })

  it("every form and stem cited in a type's note belongs to a word of that type (except an explicit comparison)", () => {
    const errors: string[] = []
    for (const [typeId, note] of Object.entries(I_TYPE_NOTES)) {
      const words = ALL_WORDS.filter((w) => w.typeId === typeId)
      const own = note!.en.replace(/\(compare [^)]*\)/g, '')
      errors.push(...membershipErrors(own, words, typeId), ...membershipErrors(note!.en, ALL_WORDS, typeId), ...chainErrors(note!.en))
    }
    expect(errors).toEqual([])
  })

  it('the cross-checks catch a wrong form', () => {
    expect(chainErrors('⟦kaksi⟧ → ⟦kahtta⟧')).not.toEqual([])
    expect(chainErrors('⟦lehti⟧ → ⟦lehden⟧ (ht ~ hd), ⟦joki⟧ → ⟦joen⟧')).toEqual([])
    expect(chainErrors('⟦lehti⟧ → ⟦lehden⟧, ⟦joen⟧')).not.toEqual([])
    expect(chainErrors('⟦las⟧- + -ta = ⟦lasta⟧')).toEqual([])
    expect(chainErrors('⟦lap⟧- + -ta = ⟦lapta⟧')).not.toEqual([])
    expect(
      membershipErrors(
        '⟦kättä⟧',
        ALL_WORDS.filter((w) => w.typeId === 'k31'),
        'k31',
      ),
    ).not.toEqual([])
  })
})

describe('kaksi-type (Kotus 31): a distinct pattern in the uusi family', () => {
  const kaksi = grammar.require('kaksi')
  const kasi = grammar.require('käsi')
  const form = (lex: Lexeme, slot: SlotKey) => grammar.inflect(lex, slot).variants.map((v) => v.text)

  it('has the forms the description cites: kaksi, kahden, kahta, kahteen', () => {
    expect(form(kaksi, 'sg.nominative')).toEqual(['kaksi'])
    expect(form(kaksi, 'sg.genitive')).toEqual(['kahden'])
    expect(form(kaksi, 'sg.partitive')).toEqual(['kahta'])
    expect(form(kaksi, 'sg.illative')).toEqual(['kahteen'])
    expect(form(kaksi, 'pl.partitive')).toEqual(['kaksia'])
  })

  it('changes two sounds in the vowel stem (k → h and s → t), not just s → t', () => {
    const stems = grammar.stems(kaksi)
    expect(stems.vowelStrong.text).toBe('kahte')
    expect(stems.vowelWeak.text).toBe('kahde')
    expect(stems.consonant?.text).toBe('kah')
    // ka|k|s|i → ka|h|t|e: both consonants of ks change.
    expect([kaksi.lemma[2], kaksi.lemma[3]]).toEqual(['k', 's'])
    expect([stems.vowelStrong.text[2], stems.vowelStrong.text[3]]).toEqual(['h', 't'])
    // The käsi-type changes only the s: käsi → käte-.
    expect(grammar.stems(kasi).vowelStrong.text).toBe('käte')
  })

  it('differs from the käsi-type in the partitive: kah- + ta (one t) vs kät- + tä (double t)', () => {
    expect(grammar.stems(kasi).consonant?.text).toBe('kät')
    expect(form(kasi, 'sg.partitive')).toEqual(['kättä'])
    expect(form(kaksi, 'sg.partitive')[0]).not.toMatch(/tt/)
  })

  it('stays a separate Kotus type, taught in the uusi family', () => {
    expect(grammar.type(kaksi)).toMatchObject({
      id: 'k31',
      kotus: 31,
      iGroup: 'uusi',
    })
    expect(grammar.type(kasi).id).not.toBe('k31')
    expect(I_TYPE_NOTES.k31!.en).toMatch(/distinct pattern/)
    expect(I_TYPE_NOTES.k31!.en).not.toMatch(/ks → ht is|s → t change/)
  })
})

describe('lapsi, veitsi and kieli: shared stem behaviour, distinct partitives', () => {
  const words = {
    kieli: grammar.require('kieli'),
    lapsi: grammar.require('lapsi'),
    veitsi: grammar.require('veitsi'),
    toimi: grammar.require('toimi'),
  }

  it('share an -e- vowel stem without gradation, with s kept in -si words', () => {
    expect(grammar.stems(words.kieli).vowelStrong.text).toBe('kiele')
    expect(grammar.stems(words.lapsi).vowelStrong.text).toBe('lapse')
    expect(grammar.stems(words.veitsi).vowelStrong.text).toBe('veitse')
    for (const w of Object.values(words)) expect(grammar.stems(w).vowelWeak.text, w.lemma).toBe(grammar.stems(w).vowelStrong.text)
    for (const w of Object.values(words)) expect(grammar.type(w).iGroup, w.lemma).toBe('kieli')
  })

  it('make their consonant stems — and so their partitives — differently', () => {
    expect(Object.values(words).map((w) => grammar.stems(w).consonant?.text)).toEqual(['kiel', 'las', 'veis', 'toin'])
    expect(Object.values(words).map((w) => grammar.inflect(w, 'sg.partitive').variants[0]!.text)).toEqual(['kieltä', 'lasta', 'veistä', 'tointa'])
    expect(Object.values(words).map((w) => grammar.inflect(w, 'pl.genitive').variants.map((v) => v.text))).toEqual([
      ['kielten', 'kielien'],
      ['lasten', 'lapsien'],
      ['veisten', 'veitsien'],
      ['toimien', 'tointen'],
    ])
    // Different Kotus types: the family does not merge them.
    expect(new Set(Object.values(words).map((w) => w.typeId)).size).toBe(4)
  })

  it('the family description says they differ, and labels the family as a teaching group', () => {
    const summary = I_GROUP_INFO.kieli.summary.beginner.en
    expect(summary).toMatch(/Not shared/)
    for (const f of ['kieltä', 'lasta', 'veistä', 'tointa']) expect(summary).toContain(`⟦${f}⟧`)
    expect(LEARNING_FAMILY_NOTE.en).toMatch(/teaching group/)
    expect(LEARNING_FAMILY_NOTE.en).toMatch(/not an official class/)
  })

  it('the uni-type follows the same derivation steps as the tiili-type in every slot (as its note says)', () => {
    const steps = (lex: Lexeme, slot: SlotKey) =>
      grammar.inflect(lex, slot).variants.map((v) =>
        v.steps
          .filter((s) => !s.ruleId.startsWith('type.') && !s.ruleId.startsWith('harmony'))
          .map((s) => s.ruleId)
          .join(' '),
      )
    const tiili = grammar.require('tiili')
    const uni = grammar.require('uni')
    for (const slot of ALL_SLOTS) expect(steps(uni, slot), slot).toEqual(steps(tiili, slot))
  })
})

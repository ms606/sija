import { describe, expect, it } from 'vitest'
import { LEXICON, requireNoun } from '../../data/lexicon'
import { createGrammar } from '../index'
import { inflect } from '../inflect'
import { decideHarmony } from '../harmony'
import { gradationSite, isClosedSyllable, syllabify } from '../phonology'
import { ALL_SLOTS } from '../slots'
import type { Lexeme, SlotKey } from '../types'

const G = createGrammar(LEXICON, { knownWords: { uusin: 'note.uusin' } })
const form = (id: string, slot: SlotKey) => G.inflect(requireNoun(id), slot)
const text = (id: string, slot: SlotKey) => form(id, slot).variants[0]?.text

describe('phonology and harmony', () => {
  it('locates the gradation site before the last syllable nucleus', () => {
    expect(gradationSite('kauppa')?.cluster).toBe('pp')
    expect(gradationSite('lehte')?.cluster).toBe('ht')
    expect(gradationSite('kaupunki')?.cluster).toBe('nk')
    expect(gradationSite('koe')).toMatchObject({ cluster: '', start: 2, end: 2 })
    expect(gradationSite('rengas')?.cluster).toBe('ng')
  })
  it('splits words into syllables', () => {
    expect(syllabify('kauppa')).toEqual(['kaup', 'pa'])
    expect(syllabify('kaupan')).toEqual(['kau', 'pan'])
    expect(syllabify('kauppaan')).toEqual(['kaup', 'paan'])
    expect(syllabify('talossa')).toEqual(['ta', 'los', 'sa'])
    expect(syllabify('koe')).toEqual(['ko', 'e'])
    expect(syllabify('tie')).toEqual(['tie'])
    expect(syllabify('radio')).toEqual(['ra', 'di', 'o'])
    expect(syllabify('lääkärissä')).toEqual(['lää', 'kä', 'ris', 'sä'])
    expect(isClosedSyllable('pan')).toBe(true)
    expect(isClosedSyllable('pa')).toBe(false)
  })
  it('decides vowel harmony from the word or the compound head', () => {
    expect(decideHarmony('talo').harmony).toBe('back')
    expect(decideHarmony('pöytä').harmony).toBe('front')
    expect(decideHarmony('kivi')).toMatchObject({ harmony: 'front', ruleId: 'harmony.neutral-only' })
    expect(decideHarmony('sähköposti', 'posti')).toMatchObject({ harmony: 'back', ruleId: 'harmony.compound-head' })
    expect(text('sähköposti', 'sg.partitive')).toBe('sähköpostia')
  })
})

describe('the specification examples', () => {
  it('kauppa → kaupan: weak grade pp → p, ending -n', () => {
    const v = form('kauppa', 'sg.genitive').variants[0]!
    expect(v.text).toBe('kaupan')
    expect(v.pieces).toEqual([
      { text: 'kau', role: 'root' },
      { text: 'p', role: 'grade', grade: 'weak', was: 'pp' },
      { text: 'a', role: 'root' },
      { text: 'n', role: 'ending', ruleId: 'ending.genitive' },
    ])
    const grade = v.steps.find((s) => s.kind === 'gradation')
    expect(grade).toMatchObject({ ruleId: 'grade.weak.closed-syllable', before: 'kauppa', after: 'kaupa', label: 'rule' })
  })
  it.each([
    ['pankki', 'pankin', 'pankkia'],
    ['lehti', 'lehden', 'lehteä'],
    ['kieli', 'kielen', 'kieltä'],
    ['uusi', 'uuden', 'uutta'],
    ['käsi', 'käden', 'kättä'],
    ['vesi', 'veden', 'vettä'],
  ])('%s → %s, %s', (id, gen, par) => {
    expect(text(id, 'sg.genitive')).toBe(gen)
    expect(text(id, 'sg.partitive')).toBe(par)
  })
  it('explains vesi → veden as stem vete- (s → t, i → e) then t → d', () => {
    const steps = form('vesi', 'sg.genitive').variants[0]!.steps
    expect(steps.map((s) => s.ruleId)).toEqual([
      'step.lemma',
      'type.k27.membership',
      'stem.si-to-te',
      'grade.weak.closed-syllable',
      'ending.genitive',
      'step.result',
    ])
    expect(steps[1]?.label).toBe('lexical')
  })
  it('labels lexical exceptions: meri → merta', () => {
    const v = form('meri', 'sg.partitive').variants[0]!
    expect(v.text).toBe('merta')
    expect(G.headlineLabel(v)).toBe('exception')
    expect(v.steps.find((s) => s.kind === 'override')).toMatchObject({ before: 'mertä', after: 'merta' })
  })
  it('reports where gradation is strong and weak', () => {
    const g = G.gradation(requireNoun('kauppa'))!
    expect(g).toMatchObject({ pattern: 'pp-p', direction: 'normal', strong: 'pp', weak: 'p', kotusLetter: 'B' })
    expect(g.weakSlots).toEqual(expect.arrayContaining(['sg.genitive', 'sg.inessive', 'pl.nominative', 'pl.inessive']))
    expect(g.strongSlots).toEqual(expect.arrayContaining(['sg.nominative', 'sg.partitive', 'sg.illative', 'pl.genitive']))
    expect(G.gradation(requireNoun('sade'))).toMatchObject({ direction: 'inverse', strongStem: 'satee' })
    expect(G.gradation(requireNoun('talo'))).toBeNull()
  })
  it('handles lexical spelling: aika → ajan, ajoissa; poika → pojissa', () => {
    expect(text('aika', 'sg.genitive')).toBe('ajan')
    expect(text('aika', 'pl.inessive')).toBe('ajoissa')
    expect(text('poika', 'pl.inessive')).toBe('pojissa')
  })
  it('writes an apostrophe when k disappears between identical vowels', () => {
    const vaaka: Lexeme = { id: 'vaaka', lemma: 'vaaka', pos: 'noun', typeId: 'k9', kotus: '9*D', gradation: { pattern: 'k-0' } }
    expect(inflect(vaaka, 'sg.genitive').variants[0]?.text).toBe('vaa’an')
  })
  it('marks slots that are not used', () => {
    expect(form('talo', 'sg.comitative').status).toBe('not-used')
    expect(text('talo', 'pl.comitative')).toBe('taloineen')
  })
})

describe('variant stems', () => {
  it('ruoka → ruuissa: only the changed vowel is the variant; the plural i stays the plural marker', () => {
    const v = form('ruoka', 'pl.inessive').variants.find((x) => x.text === 'ruuissa')!
    expect(v.pieces.filter((p) => p.text !== '').map((p) => [p.text, p.role])).toEqual([
      ['ru', 'root'],
      ['u', 'stem'],
      ['i', 'plural'],
      ['ssa', 'ending'],
    ])
    expect(v.pieces.find((p) => p.role === 'stem')).toMatchObject({ text: 'u', was: 'o' })
    const g = form('ruoka', 'sg.genitive').variants.find((x) => x.text === 'ruuan')!
    expect(g.pieces.filter((p) => p.text !== '').map((p) => [p.text, p.role])).toEqual([
      ['ru', 'root'],
      ['u', 'stem'],
      ['a', 'root'],
      ['n', 'ending'],
    ])
  })
})

describe('possessive suffixes', () => {
  const px = (id: string, slot: SlotKey, p: '1sg' | '3') => G.withPossessive(requireNoun(id), slot, p).variants.map((v) => v.text)
  it('drops -n/-t and restores the strong grade', () => {
    expect(px('kauppa', 'sg.nominative', '1sg')).toEqual(['kauppani'])
    expect(px('kauppa', 'sg.genitive', '1sg')).toEqual(['kauppani'])
    expect(px('kauppa', 'pl.nominative', '1sg')).toEqual(['kauppani'])
  })
  it('attaches to case endings', () => {
    expect(px('kauppa', 'sg.inessive', '1sg')).toEqual(['kaupassani'])
    expect(px('talo', 'sg.illative', '1sg')).toEqual(['talooni'])
    expect(px('talo', 'sg.translative', '1sg')).toEqual(['talokseni'])
    expect(px('talo', 'pl.genitive', '1sg')).toEqual(['talojeni'])
    expect(px('talo', 'pl.comitative', '1sg')).toEqual(['taloineni'])
  })
  it('allows 3rd-person -Vn only after a short vowel', () => {
    expect(px('talo', 'sg.inessive', '3')).toEqual(['talossaan', 'talossansa'])
    expect(px('talo', 'sg.partitive', '3')).toEqual(['taloaan', 'taloansa'])
    expect(px('talo', 'sg.illative', '3')).toEqual(['taloonsa'])
    expect(px('talo', 'sg.nominative', '3')).toEqual(['talonsa'])
    expect(px('pöytä', 'sg.adessive', '3')).toEqual(['pöydällään', 'pöydällänsä'])
  })
  it('allows no -Vn after the -n cases (genitive, illative)', () => {
    expect(px('talo', 'pl.illative', '3')).toEqual(['taloihinsa'])
    expect(px('maa', 'sg.illative', '3')).toEqual(['maahansa'])
    expect(px('työ', 'sg.illative', '3')).toEqual(['työhönsä'])
    expect(px('talo', 'pl.genitive', '3')).toEqual(['talojensa'])
  })
  it('builds possessives on rare case forms too, and keeps them rare', () => {
    const f = G.withPossessive(requireNoun('hammas'), 'pl.illative', '1sg')
    expect(f.variants.map((v) => [v.text, v.register])).toEqual([
      ['hampaisiini', 'standard'],
      ['hampaihini', 'rare'],
    ])
  })
  it('makes the suffix agree with the case ending, not only the word', () => {
    expect(px('veri', 'sg.partitive', '3')).toEqual(['vertaan', 'vertansa'])
    expect(px('meri', 'sg.partitive', '3')).toEqual(['mertaan', 'mertansa'])
    expect(px('hetki', 'sg.illative', '3')).toEqual(['hetkeensä'])
  })
})

describe('agreement', () => {
  const phrase = (slot: SlotKey) => G.inflectPhrase([requireNoun('uusi'), requireNoun('auto')], slot)
  it('declines adjective and noun together', () => {
    expect(phrase('sg.genitive').text).toBe('uuden auton')
    expect(phrase('sg.inessive').text).toBe('uudessa autossa')
    expect(phrase('pl.partitive').text).toBe('uusia autoja')
    expect(phrase('sg.accusative').accepted).toEqual(['uuden auton', 'uusi auto'])
    expect(phrase('pl.comitative').accepted).toContain('uusine autoineen')
  })
})

describe('reverse analysis', () => {
  const hits = (w: string) => G.analyze(w).map((h) => `${h.lexemeId}:${h.slot}${h.person ? ':' + h.person : ''}`)
  it('finds every reading of a form', () => {
    expect(hits('veden')).toEqual(['vesi:sg.genitive'])
    expect(hits('kuusen')).toContain('kuusi-spruce:sg.genitive')
    expect(hits('kuuden')).toContain('kuusi-six:sg.genitive')
    expect(hits('uusin')).toContain('uusi:pl.instructive')
    expect(hits('kauppani')).toEqual(
      expect.arrayContaining(['kauppa:sg.nominative:1sg', 'kauppa:sg.genitive:1sg', 'kauppa:pl.nominative:1sg']),
    )
    expect(G.analyzeLoose('paivaa').map((h) => h.form)).toContain('päivää')
  })
})

describe('classification', () => {
  it('uses the lexicon when the word is known', () => {
    expect(G.classify('lasi')).toMatchObject({ source: 'lexicon', matches: [{ typeId: 'k5', iGroup: 'pankki' }] })
    expect(G.classify('käsi').matches[0]).toMatchObject({ typeId: 'k27', iGroup: 'uusi' })
    expect(G.classify('kuusi').matches.map((m) => m.lexemeId).sort()).toEqual(['kuusi-six', 'kuusi-spruce'])
  })
  it('is honest about unknown -i words', () => {
    const c = G.classify('kaali')
    expect(c.source).toBe('heuristic')
    expect(c.caveatRuleId).toBe('classify.i-cannot-know')
    expect(c.candidates.every((x) => x.confidence !== 'high')).toBe(true)
    expect(G.classify('pulkka').candidates[0]).toMatchObject({ typeId: 'k10', confidence: 'high' })
  })
})

describe('error diagnosis', () => {
  const d = (id: string, slot: SlotKey, answer: string) => G.diagnose(requireNoun(id), slot, answer)
  it('recognises correct answers', () => {
    expect(d('ruoka', 'sg.genitive', 'ruuan')).toBeNull()
    expect(d('kauppa', 'sg.genitive', ' Kaupan ')).toBeNull()
  })
  it('explains typical mistakes', () => {
    expect(d('uusi', 'sg.genitive', 'uusin')).toMatchObject({
      diagnosisId: 'wrong-igroup',
      params: { treatedAs: 'pankki', actual: 'uusi' },
      correct: 'uuden',
      noteRuleId: 'note.uusin',
    })
    expect(d('kauppa', 'sg.genitive', 'kauppan')).toMatchObject({ diagnosisId: 'no-gradation' })
    expect(d('kauppa', 'sg.partitive', 'kaupaa')).toMatchObject({ diagnosisId: 'wrong-grade' })
    expect(d('talo', 'sg.inessive', 'talossä')).toMatchObject({ diagnosisId: 'wrong-harmony' })
    expect(d('kieli', 'sg.partitive', 'kieliä')).toMatchObject({ diagnosisId: 'wrong-number', params: { slot: 'pl.partitive' } })
    expect(d('talo', 'sg.elative', 'talossa')).toMatchObject({ diagnosisId: 'wrong-case', params: { slot: 'sg.inessive' } })
    expect(d('päivä', 'sg.partitive', 'paivaa')).toMatchObject({ diagnosisId: 'missing-umlaut' })
    expect(d('perhe', 'sg.genitive', 'perhen')).toMatchObject({ diagnosisId: 'lemma-plus-ending' })
    expect(d('maa', 'sg.illative', 'maaan')).toMatchObject({ diagnosisId: 'wrong-illative' })
    expect(d('huone', 'sg.partitive', 'huonea')).toMatchObject({ diagnosisId: 'wrong-partitive-ending' })
  })
})

describe('sentence templates', () => {
  const r = (t: string) => G.renderSentence(t).text
  it('renders engine forms into sentences', () => {
    expect(r('Menen {*kauppa:ill}.')).toBe('Menen kauppaan.')
    expect(r('{kauppa:gen} ovi on kiinni.')).toBe('Kaupan ovi on kiinni.')
    expect(r('{uusi+auto:gen} ovi on auki.')).toBe('Uuden auton ovi on auki.')
    expect(r('{talo:ine:1sg} on sauna.')).toBe('Talossani on sauna.')
    expect(r('Missä on {ruoka:gen#1} hinta?')).toBe('Missä on ruuan hinta?')
    expect(r('Osta {maito:acc0}!')).toBe('Osta maito!')
    expect(r('Olen {=kotona|koti}. Ostan {omena:pl.par}.')).toBe('Olen kotona. Ostan omenia.')
  })
  it('rejects unknown references', () => {
    expect(() => r('{eiole:gen}')).toThrow()
    expect(() => r('{talo:xyz}')).toThrow()
  })
})

describe('whole lexicon', () => {
  it('generates every slot of every lexeme', () => {
    for (const lex of LEXICON) {
      for (const slot of ALL_SLOTS) {
        const f = G.inflect(lex, slot)
        if (f.status !== 'not-used') expect(f.variants.length, `${lex.id} ${slot}`).toBeGreaterThan(0)
      }
    }
  })
  it('round-trips through the analyzer', () => {
    for (const lex of LEXICON) {
      for (const slot of ALL_SLOTS) {
        if (slot.endsWith('.accusative')) continue
        for (const v of G.inflect(lex, slot).variants) {
          const ok = G.analyze(v.text).some((h) => h.lexemeId === lex.id && h.slot === slot)
          expect(ok, `${lex.id} ${slot} ${v.text}`).toBe(true)
        }
      }
    }
  })
  it('gives every lexeme provenance and a valid image policy', () => {
    for (const n of LEXICON) {
      expect(n.provenance.source).toBe('curated')
      if (n.image) expect(n.image.emoji || n.image.illustration || n.image.photo).toBeTruthy()
    }
  })
})

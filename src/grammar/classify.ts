import { getType } from './declension/registry'
import { isVowel, lastNucleus, syllableCount } from './phonology'
import type { IGroup, Lexeme, RuleId, TypeId } from './types'

export type Confidence = 'high' | 'medium' | 'low'

export interface TypeCandidate {
  typeId: TypeId
  confidence: Confidence
  /** Why this type is suggested (explanation key). */
  ruleId: RuleId
}

export interface Classification {
  word: string
  source: 'lexicon' | 'heuristic'
  /** Lexicon entries with this spelling (homonyms can differ: kuusi 'spruce' vs 'six'). */
  matches: { lexemeId: string; typeId: TypeId; kotus: string; iGroup?: IGroup }[]
  /** Spelling-based guesses for words not in the lexicon, most likely first. */
  candidates: TypeCandidate[]
  /** Honest caveat shown with heuristic results. */
  caveatRuleId?: RuleId
  /** Hint that the word may alternate (native words with p/t/k before the last vowel). */
  gradationHint?: RuleId
}

const GRADABLE = /(kk|pp|tt|nk|mp|lt|nt|rt|ht|[aeiouyäö][ptk]|[lr][kp])[aeiouyäö]+$/

/**
 * Answers "what noun type is this?". Words in the lexicon are classified from
 * the curated data (verified against Kotus). Other words get spelling-based
 * candidates with confidence levels — Finnish declension type cannot always
 * be read from spelling (lasi/käsi, tili/tiili, kuusi/kuusi).
 */
export function classify(word: string, lexicon: readonly Lexeme[]): Classification {
  const w = word.normalize('NFC').trim().toLowerCase()
  const hits = lexicon.filter((l) => l.lemma === w)
  if (hits.length > 0) {
    return {
      word: w,
      source: 'lexicon',
      matches: hits.map((l) => {
        const def = getType(l.typeId)
        const m: Classification['matches'][number] = { lexemeId: l.id, typeId: l.typeId, kotus: l.kotus }
        if (def.iGroup) m.iGroup = def.iGroup
        return m
      }),
      candidates: [],
    }
  }
  const out: Classification = { word: w, source: 'heuristic', matches: [], candidates: [], caveatRuleId: 'classify.verify' }
  const add = (typeId: TypeId, confidence: Confidence, ruleId: RuleId) => out.candidates.push({ typeId, confidence, ruleId })
  const syl = syllableCount(w)
  const last = w[w.length - 1] ?? ''
  const last2 = w.slice(-2)
  const nucleus = lastNucleus(w)

  if (w.endsWith('nen')) add('k38', 'high', 'classify.nen')
  else if (/[uy]s$/.test(w)) {
    add('k39', 'medium', 'classify.us-verbal')
    add('k40', 'medium', 'classify.us-adjectival')
  } else if (/[oö]s$/.test(w)) add('k39', 'medium', 'classify.os')
  else if (/[aäi]s$/.test(w)) add('k41', 'medium', 'classify.as')
  else if (w.endsWith('in') && syl >= 2) add('k33', 'medium', 'classify.in')
  else if (/[aä]t$/.test(w)) add('k44', 'low', 'classify.at')
  else if (/[uy]t$/.test(w)) add('k43', 'medium', 'classify.ut')
  else if (syl === 1 && nucleus && nucleus.nucleus.length === 2 && nucleus.end === w.length) {
    if (['ie', 'uo', 'yö'].includes(nucleus.nucleus)) add('k19', 'high', 'classify.monosyllable-diphthong')
    else add('k18', 'high', 'classify.monosyllable-long')
  } else if (last === 'e') add('k48', 'medium', 'classify.e')
  else if (last === 'i') {
    out.caveatRuleId = 'classify.i-cannot-know'
    if (w.endsWith('si')) {
      add('k27', 'low', 'classify.si')
      add('k5', 'low', 'classify.i-new-word')
      add('k7', 'low', 'classify.i-old-word')
    } else if (/[lnr]i$/.test(w) && syl === 2 && /([aeiouyäö])\1|ie|uo|yö|[aeiouyäö][iuy][lnr]i$/.test(w)) {
      add('k26', 'low', 'classify.li-ni-ri')
      add('k5', 'low', 'classify.i-new-word')
    } else if (syl >= 3) {
      add('k6', 'medium', 'classify.i-long-loan')
      add('k5', 'medium', 'classify.i-new-word')
    } else {
      add('k5', 'medium', 'classify.i-new-word')
      add('k7', 'low', 'classify.i-old-word')
    }
  } else if (last === 'a' || last === 'ä') {
    if (last2 === 'ea' || last2 === 'eä') add('k15', 'high', 'classify.ea')
    else if (syl === 2) {
      const firstVowel = [...w].find((c) => isVowel(c))
      if (last === 'ä') add('k10', 'high', 'classify.a-front')
      else if (firstVowel === 'o' || firstVowel === 'u') add('k10', 'high', 'classify.a-first-ou')
      else add('k9', 'high', 'classify.a-first-aei')
    } else {
      add('k12', 'medium', 'classify.a-three-syllables')
      add('k10', 'low', 'classify.a-drop')
    }
  } else if (/[ou]$|[yö]$/.test(w)) {
    if (/(io|iö|eo)$/.test(w)) add('k3', 'high', 'classify.io')
    else if (syl === 2) add('k1', 'high', 'classify.o-two-syllables')
    else {
      add('k2', 'medium', 'classify.o-three-syllables')
      add('k1', 'medium', 'classify.o-two-syllables')
    }
  } else if (/[lnr]$/.test(w)) {
    add('k32', 'low', 'classify.consonant')
    add('k33', 'low', 'classify.in')
  }
  if (out.candidates.length === 0) add('k5', 'low', 'classify.loanword-consonant')
  if (GRADABLE.test(w)) out.gradationHint = 'classify.may-gradate'
  return out
}

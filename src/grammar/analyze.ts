import { inflect } from './inflect'
import { withPossessive } from './possessive'
import { ALL_SLOTS } from './slots'
import { PERSONS, type Analysis, type Lexeme, type Register } from './types'

export interface AnalysisHit extends Analysis {
  form: string
  register: Register
}

/** Normalises user input for lookup: case, Unicode form, apostrophes, whitespace. */
export function normalizeForm(s: string): string {
  return s.normalize('NFC').trim().toLowerCase().replace(/['`´]/g, '’').replace(/\s+/g, ' ')
}

/** Umlaut-insensitive key (paiva ≈ päivä) for forgiving search. */
export function looseKey(s: string): string {
  return normalizeForm(s).replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/å/g, 'a')
}

/** Endings that suggest a possessive suffix (talossani, kotinsa, taloaan, kirjamme…); 3rd-person -Vn doubles the vowel. */
const PX_HINT = /(ni|si|nsa|nsä|mme|nne|aan|een|iin|oon|uun|yyn|ään|öön)$/

/**
 * Reverse index: word form → every (lexeme, slot, person) that produces it.
 * Built from the engine itself, so it can never disagree with it. Base forms
 * are indexed on first use; possessive forms (about five times as many) only
 * when a lookup actually needs them.
 */
export class Analyzer {
  private base = { exact: new Map<string, AnalysisHit[]>(), loose: new Map<string, AnalysisHit[]>() }
  private px = { exact: new Map<string, AnalysisHit[]>(), loose: new Map<string, AnalysisHit[]>() }
  private baseBuilt = false
  private pxBuilt = false
  private readonly lexemes: readonly Lexeme[]
  private readonly possessives: boolean

  constructor(lexemes: readonly Lexeme[], opts: { possessives?: boolean } = {}) {
    this.lexemes = lexemes
    this.possessives = opts.possessives ?? true
  }

  private static add(index: { exact: Map<string, AnalysisHit[]>; loose: Map<string, AnalysisHit[]> }, hit: AnalysisHit): void {
    const exactKey = normalizeForm(hit.form)
    const looseK = exactKey.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/å/g, 'a')
    for (const [map, key] of [
      [index.exact, exactKey],
      [index.loose, looseK],
    ] as const) {
      const list = map.get(key)
      if (list) list.push(hit)
      else map.set(key, [hit])
    }
  }

  private buildBase(): void {
    if (this.baseBuilt) return
    this.baseBuilt = true
    for (const lex of this.lexemes) {
      for (const slot of ALL_SLOTS) {
        if (slot.endsWith('.accusative')) continue
        inflect(lex, slot).variants.forEach((v, i) =>
          Analyzer.add(this.base, { lexemeId: lex.id, slot, variantIndex: i, form: v.text, register: v.register }),
        )
      }
    }
  }

  private buildPossessives(): void {
    if (this.pxBuilt || !this.possessives) return
    this.pxBuilt = true
    for (const lex of this.lexemes) {
      if (lex.pos !== 'noun') continue
      for (const slot of ALL_SLOTS) {
        if (slot.endsWith('.accusative') || inflect(lex, slot).status === 'not-used') continue
        for (const person of PERSONS) {
          withPossessive(lex, slot, person).variants.forEach((v, i) =>
            Analyzer.add(this.px, { lexemeId: lex.id, slot, person, variantIndex: i, form: v.text, register: v.register }),
          )
        }
      }
    }
  }

  private lookup(kind: 'exact' | 'loose', surface: string): AnalysisHit[] {
    this.buildBase()
    const key = kind === 'exact' ? normalizeForm(surface) : looseKey(surface)
    const base = this.base[kind].get(key) ?? []
    if (!this.possessives || !PX_HINT.test(key)) return base
    this.buildPossessives()
    return [...base, ...(this.px[kind].get(key) ?? [])]
  }

  /** Exact analyses of a word form (case-insensitive). */
  analyze(surface: string): AnalysisHit[] {
    return this.lookup('exact', surface)
  }

  /** Analyses ignoring ä/ö (for search with a keyboard that lacks them). */
  analyzeLoose(surface: string): AnalysisHit[] {
    return this.lookup('loose', surface)
  }

  /** Number of distinct forms indexed so far (for diagnostics). */
  size(): number {
    return this.base.exact.size + this.px.exact.size
  }
}

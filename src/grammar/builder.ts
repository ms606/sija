import { gradeStem } from './gradation'
import { isVowel } from './phonology'
import type { DerivationStep, Grade, GradationId, Piece, PieceRole, Predictability, RuleId, StepKind } from './types'

/** A mutable segment while a form is being built. */
export interface Seg {
  text: string
  role: PieceRole
  grade?: Grade
  /**
   * What the base form had here before the change ('' = this text was added;
   * an empty `text` with `was` = something was removed).
   */
  was?: string
  ruleId?: RuleId
}

/**
 * A word form under construction: typed segments plus the derivation steps
 * that produced them. Operations mutate in place; use `clone()` to branch.
 */
export class Form {
  segs: Seg[]
  steps: DerivationStep[]

  constructor(segs: Seg[], steps: DerivationStep[] = []) {
    this.segs = segs
    this.steps = steps
  }

  static of(text: string, role: PieceRole = 'root'): Form {
    return new Form([{ text, role }])
  }

  get text(): string {
    return this.segs.map((s) => s.text).join('')
  }

  clone(): Form {
    return new Form(
      this.segs.map((s) => ({ ...s })),
      this.steps.map((s) => (s.params ? { ...s, params: { ...s.params } } : { ...s })),
    )
  }

  /** Records a derivation step whose `after` is the current text. */
  step(kind: StepKind, ruleId: RuleId, before: string, label: Predictability, params?: Record<string, string>): this {
    const step: DerivationStep = { kind, ruleId, before, after: this.text, label }
    if (params) step.params = params
    this.steps.push(step)
    return this
  }

  /** Replaces `strip` at the end of the form with `add` as one segment of `role`. */
  replaceEnd(strip: string, add: string, role: PieceRole, ruleId?: RuleId): this {
    const text = this.text
    if (!text.endsWith(strip)) throw new Error(`Cannot strip "${strip}" from "${text}"`)
    let remaining = strip.length
    while (remaining > 0 && this.segs.length > 0) {
      const last = this.segs[this.segs.length - 1] as Seg
      if (last.text.length <= remaining) {
        remaining -= last.text.length
        this.segs.pop()
      } else {
        last.text = last.text.slice(0, last.text.length - remaining)
        if (last.was !== undefined && last.was.length > last.text.length) last.was = last.was.slice(0, last.text.length)
        remaining = 0
      }
    }
    if (strip === '' && add === '') return this
    const seg: Seg = { text: add, role, was: strip }
    if (ruleId) seg.ruleId = ruleId
    this.segs.push(seg)
    return this
  }

  append(text: string, role: PieceRole, ruleId?: RuleId): this {
    if (text === '') return this
    const seg: Seg = { text, role }
    if (ruleId) seg.ruleId = ruleId
    this.segs.push(seg)
    return this
  }

  /** Ensures a segment boundary at character index `at`. */
  private splitAt(at: number): void {
    let pos = 0
    for (let i = 0; i < this.segs.length; i++) {
      const seg = this.segs[i] as Seg
      const end = pos + seg.text.length
      if (at > pos && at < end) {
        const k = at - pos
        const left: Seg = { ...seg, text: seg.text.slice(0, k) }
        const right: Seg = { ...seg, text: seg.text.slice(k) }
        if (seg.was !== undefined && seg.was.length === seg.text.length) {
          left.was = seg.was.slice(0, k)
          right.was = seg.was.slice(k)
        } else if (seg.was !== undefined) {
          delete right.was
        }
        this.segs.splice(i, 1, left, right)
        return
      }
      pos = end
    }
  }

  /** Index of the segment that starts at character `at` (for insertions). */
  private indexAt(at: number): number {
    let pos = 0
    for (let i = 0; i < this.segs.length; i++) {
      if (pos === at) return i
      pos += (this.segs[i] as Seg).text.length
    }
    return this.segs.length
  }

  /**
   * Replaces the characters in [start, end) with one segment. When the
   * covered segments already record an earlier change, the new segment keeps
   * that base-form text in `was`, so `was` always refers to the base form.
   */
  private replaceRange(start: number, end: number, seg: Seg): void {
    this.splitAt(start)
    this.splitAt(end)
    if (start === end) {
      // Insertion point: drop empty grade markers already sitting there.
      let idx = this.indexAt(start)
      while (idx < this.segs.length && this.segs[idx]?.text === '' && this.segs[idx]?.role === 'grade') {
        this.segs.splice(idx, 1)
      }
      idx = this.indexAt(start)
      this.segs.splice(idx, 0, seg)
      return
    }
    let pos = 0
    let first = -1
    const covered: Seg[] = []
    for (let i = 0; i < this.segs.length; i++) {
      const s = this.segs[i] as Seg
      const sEnd = pos + s.text.length
      if (s.text.length > 0 && pos >= start && sEnd <= end) {
        if (first < 0) first = i
        covered.push(s)
      }
      pos = sEnd
    }
    if (first < 0) throw new Error(`Empty range ${start}-${end} in "${this.text}"`)
    if (covered.some((s) => s.was !== undefined)) {
      seg.was = covered.map((s) => s.was ?? s.text).join('')
    }
    this.segs.splice(first, covered.length, seg)
  }

  /** Marks the gradation site without changing it. Returns false when the site does not match the pattern. */
  markGrade(pattern: GradationId, grade: Grade): boolean {
    let res
    try {
      res = gradeStem(this.text, pattern, grade, grade)
    } catch {
      return false
    }
    this.replaceRange(res.gradeStart, res.gradeEnd, {
      text: this.text.slice(res.gradeStart, res.gradeEnd),
      role: 'grade',
      grade,
    })
    return true
  }

  /** Applies consonant gradation at the site and records the step. */
  grade(
    pattern: GradationId,
    from: Grade,
    to: Grade,
    ruleId: RuleId,
    label: Predictability,
    params: Record<string, string> = {},
  ): this {
    const before = this.text
    const res = gradeStem(before, pattern, from, to)
    const fromText = res.was ?? ''
    const toText = res.text.slice(res.gradeStart, res.gradeEnd)
    this.replaceRange(res.gradeStart, res.gradeStart + fromText.length, {
      text: toText,
      role: 'grade',
      grade: to,
      was: fromText,
    })
    if (this.text !== res.text) {
      throw new Error(`Gradation bookkeeping failed: "${this.text}" vs "${res.text}"`)
    }
    return this.step('gradation', ruleId, before, label, { pattern, from: fromText, to: toText, ...params })
  }

  /**
   * k ~ ∅ between identical vowels is written with an apostrophe (vaaka → vaa’an).
   * Call after `applyJGlide`, which takes precedence (poika → pojissa).
   */
  applyApostrophe(): boolean {
    let pos = 0
    for (const seg of this.segs) {
      if (seg.role === 'grade' && seg.text === '' && seg.was === 'k') {
        const text = this.text
        const prev = text[pos - 1]
        if (prev !== undefined && prev === text[pos] && isVowel(prev)) {
          const before = text
          seg.text = '\u2019'
          this.step('spelling', 'spelling.apostrophe', before, 'rule')
          return true
        }
      }
      pos += seg.text.length
    }
    return false
  }

  /**
   * aika → ajan, poika → pojan: after k disappears, an i between vowels is
   * written j. Lexical — taika → taian keeps the i.
   */
  applyJGlide(): boolean {
    let pos = 0
    for (const seg of this.segs) {
      if (seg.role === 'grade' && seg.text === '' && seg.was === 'k') {
        const text = this.text
        if (text[pos - 1] === 'i' && isVowel(text[pos - 2]) && isVowel(text[pos])) {
          const before = text
          this.replaceRange(pos - 1, pos, { text: 'j', role: 'exception', was: 'i', ruleId: 'spelling.j-glide' })
          this.step('spelling', 'spelling.j-glide', before, 'lexical')
          return true
        }
      }
      pos += seg.text.length
    }
    return false
  }

  /** The plural -i- between vowels is written j: talo + i + a → taloja. */
  applyPluralGlide(): boolean {
    let pos = 0
    for (const seg of this.segs) {
      if (seg.role === 'plural' && seg.text === 'i') {
        const text = this.text
        if (isVowel(text[pos - 1]) && isVowel(text[pos + 1])) {
          const before = text
          seg.text = 'j'
          seg.was = 'i'
          this.step('spelling', 'spelling.plural-glide', before, 'rule')
          return true
        }
      }
      pos += seg.text.length
    }
    return false
  }

  /** Typed pieces for display; adjacent unchanged root segments are merged. */
  pieces(): Piece[] {
    const out: Piece[] = []
    for (const s of this.segs) {
      if (s.text === '' && s.was === undefined) continue
      const prev = out[out.length - 1]
      if (prev && prev.role === 'root' && s.role === 'root' && prev.was === undefined && s.was === undefined) {
        prev.text += s.text
        continue
      }
      const piece: Piece = { text: s.text, role: s.role }
      if (s.grade) piece.grade = s.grade
      if (s.was !== undefined && s.was !== s.text) piece.was = s.was
      if (s.ruleId) piece.ruleId = s.ruleId
      out.push(piece)
    }
    return out
  }
}

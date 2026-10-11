import { CASES_INFO, CASE_ORDER } from '../../data/cases'
import type { CaseId, NumberId, PersonId, PieceRole, SlotKey } from '../../grammar/types'
import { parseSlot } from '../../grammar'
import { grammar } from '../../services/grammar'
import { caseName, PERSON_LABEL, ROLE_LABEL } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { Card } from '../ui/Card'
import { Fi } from '../ui/FiText'
import { Segmented } from '../ui/Segmented'
import { explainForm } from '../../services/explain'
import { FormExplainer } from './FormExplainer'
import { MorphologyBreakdown } from './MorphologyBreakdown'
import { WordPicker } from './WordPicker'

const BUILDER_WORDS = ['kauppa', 'vesi', 'kieli', 'pankki', 'lehti', 'uusi', 'perhe', 'nainen', 'sade', 'maa', 'käsi', 'talo']

const HIGHLIGHTS: PieceRole[] = ['grade', 'stem', 'plural', 'ending', 'possessive']
const PERSONS: (PersonId | 'none')[] = ['none', '1sg', '2sg', '3', '1pl', '2pl']

export interface BuilderState {
  word: string
  slot: SlotKey
  person: PersonId | null
  highlight: PieceRole[]
}

/**
 * Build any form step by step: choose a word, number, case and (optionally) a
 * possessive suffix. The engine derives the form; the builder only displays it.
 */
export function WordBuilder({
  state,
  onChange,
  words = BUILDER_WORDS,
  className,
}: {
  state: BuilderState
  onChange: (next: BuilderState) => void
  words?: readonly string[]
  className?: string
}) {
  const mode = useSettings((s) => s.mode)
  const lex = grammar.get(state.word) ?? grammar.require('kauppa')
  const { number, kase } = parseSlot(state.slot)
  const person = lex.pos === 'noun' ? state.person : null
  const form = person ? grammar.withPossessive(lex, state.slot, person) : grammar.inflect(lex, state.slot)
  const variant = form.variants[0]
  const exp = explainForm(lex.id, state.slot, person ? { person } : {})
  const set = (patch: Partial<BuilderState>) => onChange({ ...state, ...patch })
  const setSlot = (n: NumberId, c: CaseId) => set({ slot: `${n}.${c}` as SlotKey })
  const toggle = (r: PieceRole) =>
    set({ highlight: state.highlight.includes(r) ? state.highlight.filter((h) => h !== r) : [...state.highlight, r] })

  return (
    <div className={cx('grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]', className)}>
      <Card className="space-y-4 self-start">
        <div>
          <p className="mb-2 text-sm font-semibold">1. Word</p>
          <WordPicker value={lex.id} onChange={(id) => set({ word: id })} featured={words} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">2. Number</p>
          <Segmented
            label="Number"
            size="sm"
            value={number}
            options={[
              { value: 'sg', label: mode === 'beginner' ? 'Singular' : 'Yksikkö' },
              { value: 'pl', label: mode === 'beginner' ? 'Plural' : 'Monikko' },
            ]}
            onChange={(n) => setSlot(n, kase)}
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">3. Case</legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {CASE_ORDER.map((c) => {
              const active = c === kase
              const unused = grammar.inflect(lex, `${number}.${c}` as SlotKey).status === 'not-used'
              return (
                <label
                  key={c}
                  className={cx(
                    'flex min-h-11 cursor-pointer flex-col justify-center rounded-xl border px-2.5 py-1 leading-tight transition-colors',
                    active ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border bg-surface hover:bg-surface-2',
                    unused && !active && 'opacity-50',
                  )}
                >
                  <input type="radio" name="builder-case" className="sr-only" checked={active} onChange={() => setSlot(number, c)} />
                  <span className="text-sm font-semibold">{caseName(c, mode)}</span>
                  <Fi className="text-xs text-muted">{CASES_INFO[c].questions[0]?.fi}</Fi>
                </label>
              )
            })}
          </div>
        </fieldset>
        {lex.pos === 'noun' && (
          <div>
            <p className="mb-2 text-sm font-semibold">4. Possessive suffix (optional)</p>
            <Segmented
              label="Possessive suffix"
              size="sm"
              value={person ?? 'none'}
              options={PERSONS.map((p) => ({
                value: p,
                label: p === 'none' ? 'none' : p === '3' ? '3rd' : p,
                ...(p !== 'none' ? { hint: PERSON_LABEL[p].en } : {}),
              }))}
              onChange={(p) => set({ person: p === 'none' ? null : p })}
            />
          </div>
        )}
      </Card>

      <div className="min-w-0 space-y-4">
        <Card>
          {variant && exp && form.status !== 'not-used' ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <MorphologyBreakdown key={exp.key} explanation={exp} size="hero" highlight={state.highlight} />
                <AudioButton text={variant.text} />
              </div>
              {form.variants.length > 1 && (
                <p className="mt-2 text-sm">
                  <span className="text-muted">Also correct: </span>
                  <Fi className="font-semibold">{form.variants.slice(1).map((v) => v.text).join(', ')}</Fi>
                </p>
              )}
              <fieldset className="mt-4">
                <legend className="mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">Highlight</legend>
                <div className="flex flex-wrap gap-1.5">
                  {HIGHLIGHTS.map((r) => {
                    const on = state.highlight.includes(r)
                    const present = variant.pieces.some((p) => p.role === r)
                    return (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={on}
                        disabled={!present}
                        onClick={() => toggle(r)}
                        className={cx(
                          'min-h-9 rounded-lg border-2 px-2.5 text-sm font-semibold disabled:opacity-40',
                          on ? `swatch-${r}` : 'border-border bg-surface hover:bg-surface-2',
                        )}
                      >
                        {r === 'grade' ? 'Strong / weak grade' : r === 'stem' ? 'Stem change' : ROLE_LABEL[r].short}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </>
          ) : (
            <p className="text-muted">This form is not used for this word.</p>
          )}
        </Card>
        {variant && form.status !== 'not-used' && (
          <Card>
            <FormExplainer
              key={`${lex.id}:${state.slot}:${person ?? ''}`}
              lexemeId={lex.id}
              slot={state.slot}
              {...(person ? { person } : {})}
              stepMode
              showBreakdown={false}
            />
          </Card>
        )}
      </div>
    </div>
  )
}

import { useId, useRef, useState } from 'react'
import { decideHarmony, realize } from '../../grammar'
import { grammar } from '../../services/grammar'
import { ruleText } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'
import { UmlautKeys } from '../ui/UmlautKeys'
import { FormLine } from './FormLine'

const BACK = 'aou'
const FRONT = 'äöy'
const NEUTRAL = 'ei'
const ENDINGS = ['ssA', 'stA', 'llA', 'ltA', 'nA', 'ksi', 'tA']

function vowelClass(ch: string): string | undefined {
  const c = ch.toLowerCase()
  if (BACK.includes(c)) return 'bg-primary-soft text-primary-strong'
  if (FRONT.includes(c)) return 'bg-[var(--px-bg)] text-[var(--px-fg)]'
  if (NEUTRAL.includes(c)) return 'bg-surface-3 text-muted'
  return undefined
}

/** Type any word: its vowels are classified and the engine picks a- or ä-endings. */
export function VowelHarmonyMeter({ initial = 'pöytä', className }: { initial?: string; className?: string }) {
  const mode = useSettings((s) => s.mode)
  const [word, setWord] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const clean = word.trim().toLowerCase()
  const lex = clean ? grammar.byLemma(clean)[0] : undefined
  const decision = lex ? grammar.harmony(lex) : clean ? decideHarmony(clean) : null
  const explanation = decision
    ? ruleText(decision.ruleId, { vowels: decision.vowels.join(', '), part: decision.decidingPart, ending: realize('-ssA', decision.harmony) }, mode)
    : null

  return (
    <div className={cx('space-y-4', className)}>
      <div className="space-y-2">
        <label htmlFor={id} className="text-sm font-semibold">
          Type a Finnish word
        </label>
        <input
          id={id}
          ref={inputRef}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          lang="fi"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-12 w-full max-w-sm rounded-xl border border-border-strong bg-surface px-3 text-lg"
        />
        <UmlautKeys inputRef={inputRef} onInsert={setWord} />
      </div>

      {clean && decision && (
        <div className="space-y-3" aria-live="polite">
          <p className="text-3xl font-bold tracking-wide">
            <Fi>
              {[...clean].map((ch, i) => {
                const cls = vowelClass(ch)
                const inDecidingPart = i >= clean.length - decision.decidingPart.length
                return (
                  <span key={i} className={cx(cls && 'rounded px-0.5', cls, !inDecidingPart && 'opacity-50')}>
                    {ch}
                  </span>
                )
              })}
            </Fi>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                'rounded-lg px-2 py-1 text-sm font-bold uppercase',
                decision.harmony === 'back' ? 'bg-primary-soft text-primary-strong' : 'bg-[var(--px-bg)] text-[var(--px-fg)]',
              )}
            >
              {decision.harmony === 'back' ? 'back vowel word → a, o, u' : 'front vowel word → ä, ö, y'}
            </span>
          </p>
          {explanation && <p lang={explanation.lang}>{explanation.main}</p>}
          <ul className="flex flex-wrap gap-2" aria-label="Endings for this word">
            {ENDINGS.map((e) => (
              <li key={e}>
                <Fi className="rounded-lg border border-[var(--ending-bd)] bg-[var(--ending-bg)] px-2 py-1 font-semibold text-[var(--ending-fg)]">
                  -{realize(e, decision.harmony)}
                </Fi>
              </li>
            ))}
          </ul>
          {lex ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-muted">In the app:</span>
              <FormLine lexeme={lex} slot="sg.inessive" size="sm" />
              <FormLine lexeme={lex} slot="sg.partitive" size="sm" />
            </p>
          ) : (
            <p className="text-sm text-muted">
              Not in the app's word list. If it is a compound, only its last part decides (<Fi>sähköposti</Fi> → <Fi>postia</Fi>-endings).
            </p>
          )}
        </div>
      )}
    </div>
  )
}

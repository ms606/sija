import { Check, Headphones, Play, Shuffle, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { AudioButton } from '../../components/audio/AudioButton'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { UmlautKeys } from '../../components/ui/UmlautKeys'
import { LISTENING_PAIRS } from '../../data/themes'
import { useAudio } from '../../hooks/useAudio'
import { looseKey, normalizeForm } from '../../grammar'
import { grammar } from '../../services/grammar'
import { slotLabel } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'

const formOf = (t: { lexemeId: string; slot: Parameters<typeof grammar.primary>[1] }) => grammar.primary(grammar.require(t.lexemeId), t.slot) ?? ''

/** Hear one of two similar forms and pick the one you heard. */
function PairDrill() {
  const { speak } = useAudio()
  const mode = useSettings((s) => s.mode)
  const [state, setState] = useState(() => ({ pair: Math.floor(Math.random() * LISTENING_PAIRS.length), side: Math.random() < 0.5 ? 0 : 1 }))
  const [answer, setAnswer] = useState<number | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const pair = LISTENING_PAIRS[state.pair]!
  const texts = pair.map(formOf)
  const target = texts[state.side]!
  const choose = (i: number) => {
    if (answer !== null) return
    setAnswer(i)
    setScore((s) => ({ right: s.right + (i === state.side ? 1 : 0), total: s.total + 1 }))
  }
  const next = () => {
    const pairIdx = Math.floor(Math.random() * LISTENING_PAIRS.length)
    const side = Math.random() < 0.5 ? 0 : 1
    setState({ pair: pairIdx, side })
    setAnswer(null)
    void speak(formOf(LISTENING_PAIRS[pairIdx]![side]!), 'normal')
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => void speak(target, 'normal')} icon={<Play aria-hidden className="size-4" />}>
          Play
        </Button>
        <Button onClick={() => void speak(target, 'slow')}>Slowly</Button>
        <span className="ml-auto text-sm text-muted tabular-nums" aria-live="polite">
          {score.right} / {score.total} right
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Which one did you hear?">
        {texts.map((t, i) => {
          const correct = answer !== null && i === state.side
          const wrong = answer === i && i !== state.side
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answer !== null}
              className={cx(
                'flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-3 text-2xl font-bold',
                answer === null && 'border-border bg-surface hover:border-primary/60',
                correct && 'border-success bg-success-soft',
                wrong && 'border-error bg-error-soft',
                answer !== null && !correct && !wrong && 'border-border opacity-60',
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {correct && <Check aria-hidden className="size-5 text-success" />}
                {wrong && <X aria-hidden className="size-5 text-error" />}
                <Fi>{t}</Fi>
              </span>
              {answer !== null && (
                <span className="text-xs font-normal text-muted">
                  {grammar.require(pair[i]!.lexemeId).lemma}, {slotLabel(pair[i]!.slot, mode)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {answer !== null && (
        <div className="flex flex-wrap items-center gap-2">
          {texts.map((t) => (
            <AudioButton key={t} text={t} size="sm" label={`Play ${t}`} />
          ))}
          <Button variant="primary" onClick={next} icon={<Shuffle aria-hidden className="size-4" />} className="ml-auto">
            Next pair
          </Button>
        </div>
      )}
    </div>
  )
}

const DICTATION_WORDS = ['talo', 'kauppa', 'päivä', 'kieli', 'vesi', 'pöytä', 'lehti', 'perhe', 'nainen', 'koulu', 'kirja', 'maa', 'työ', 'lapsi']
const DICTATION_SLOTS = ['sg.genitive', 'sg.partitive', 'sg.inessive', 'sg.elative', 'sg.illative', 'sg.adessive', 'pl.nominative', 'pl.partitive'] as const

function pickDictation() {
  const w = DICTATION_WORDS[Math.floor(Math.random() * DICTATION_WORDS.length)]!
  const s = DICTATION_SLOTS[Math.floor(Math.random() * DICTATION_SLOTS.length)]!
  return { lexemeId: w, slot: s }
}

/** Hear a form, type it. Missing dots count as "almost". */
function Dictation() {
  const { speak } = useAudio()
  const mode = useSettings((s) => s.mode)
  const [target, setTarget] = useState(pickDictation)
  const [value, setValue] = useState('')
  const [result, setResult] = useState<'right' | 'almost' | 'wrong' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const text = formOf(target)
  const check = () => {
    const a = normalizeForm(value)
    setResult(a === text ? 'right' : looseKey(a) === looseKey(text) ? 'almost' : 'wrong')
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void speak(text, 'normal')} icon={<Play aria-hidden className="size-4" />}>
          Play
        </Button>
        <Button onClick={() => void speak(text, 'slow')}>Slowly</Button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim() && !result) check()
        }}
        className="space-y-2"
      >
        <label htmlFor="dictation" className="sr-only">
          What did you hear?
        </label>
        <input
          id="dictation"
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!!result}
          lang="fi"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Type what you hear…"
          className="h-12 w-full max-w-sm rounded-xl border-2 border-border-strong bg-surface px-3 text-lg"
        />
        <div className="flex flex-wrap items-center gap-2">
          <UmlautKeys inputRef={inputRef} onInsert={setValue} />
          {!result && (
            <Button type="submit" variant="primary" disabled={!value.trim()}>
              Check
            </Button>
          )}
        </div>
      </form>
      {result && (
        <div role="status" className={cx('rounded-xl p-3', result === 'right' ? 'bg-success-soft' : result === 'almost' ? 'bg-warning-soft' : 'bg-error-soft')}>
          <p className="font-semibold">
            {result === 'right' ? 'Correct!' : result === 'almost' ? 'Almost — check the dots (ä, ö).' : 'Not quite.'} <Fi>{text}</Fi>
          </p>
          <p className="text-sm text-muted">
            {grammar.require(target.lexemeId).lemma}, {slotLabel(target.slot, mode)}
          </p>
          <Button
            className="mt-2"
            variant="primary"
            onClick={() => {
              const next = pickDictation()
              setTarget(next)
              setValue('')
              setResult(null)
              void speak(formOf(next), 'normal')
            }}
          >
            Next word
          </Button>
        </div>
      )}
    </div>
  )
}

export default function ListeningPage() {
  const { supported, ready, voices } = useAudio()
  const noVoice = !supported || (ready && voices.length === 0)
  return (
    <div className="space-y-5">
      <PageHeader
        title="Listening"
        fi="Kuuntelu"
        why="Case endings are short and often unstressed. Training your ear on them — kaupassa or kaupasta? kuusen or kuuden? — makes spoken Finnish much easier to follow."
      />
      {noVoice && (
        <p className="rounded-xl bg-warning-soft p-3 text-sm">
          {supported ? 'No Finnish voice is installed on this device.' : 'This browser cannot speak text aloud.'}{' '}
          <Link to="/settings" className="font-semibold text-primary hover:underline">
            See how to add one in Settings
          </Link>
          .
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle sub="Two forms that sound alike. Listen and choose.">Which one do you hear?</CardTitle>
          <PairDrill />
        </Card>
        <Card>
          <CardTitle sub="Listen and write the form.">Dictation</CardTitle>
          <Dictation />
        </Card>
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <Headphones aria-hidden className="size-5 text-primary" />
          <span>Longer listening practice: hear a form and choose it among four.</span>
        </p>
        <ButtonLink to="/practice/session?skill=listening&count=10" variant="primary">
          Start listening practice
        </ButtonLink>
      </Card>
    </div>
  )
}

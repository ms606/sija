import { ArrowRight, Delete, Eraser, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { audioService } from '../../services/audio/AudioService'
import { checkBuild, checkChoice, checkPieces, checkText } from '../../services/exercises/check'
import { useSettings } from '../../stores/settings'
import type { CheckResult, Exercise } from '../../types/exercise'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { Button } from '../ui/Button'
import { Fi } from '../ui/FiText'
import { UmlautKeys } from '../ui/UmlautKeys'
import { FeedbackPanel } from './FeedbackPanel'

type Submit = (result: CheckResult, response: string) => void

/* ---------------- answer UIs ---------------- */

function TextAnswer({ exercise, done, onSubmit }: { exercise: Exercise; done: boolean; onSubmit: Submit }) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (done || !value.trim()) return
        onSubmit(checkText(exercise, value), value.trim())
      }}
    >
      <label htmlFor={`answer-${exercise.id}`} className="sr-only">
        Your answer
      </label>
      <input
        id={`answer-${exercise.id}`}
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={done}
        autoFocus
        lang="fi"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-14 w-full rounded-xl border-2 border-border-strong bg-surface px-4 text-xl font-semibold focus:border-primary disabled:opacity-70"
        placeholder="Type the form…"
      />
      {!done && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <UmlautKeys inputRef={inputRef} onInsert={setValue} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onSubmit(checkText(exercise, ''), '')}>
              Show answer
            </Button>
            <Button type="submit" variant="primary" disabled={!value.trim()}>
              Check
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

function ChoiceAnswer({ exercise, done, chosen, onSubmit }: { exercise: Exercise; done: boolean; chosen: string | null; onSubmit: Submit }) {
  const a = exercise.answer
  const options = a.kind === 'choice' ? a.options : []
  const correct = a.kind === 'choice' ? a.correct : []
  // Number keys 1–4 choose an option. The listener reads the latest props through a ref.
  const latest = useRef({ options, exercise, done, onSubmit })
  useEffect(() => {
    latest.current = { options, exercise, done, onSubmit }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = latest.current
      if (cur.done || e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      const o = cur.options[Number(e.key) - 1]
      if (o) cur.onSubmit(checkChoice(cur.exercise, o.id), o.label)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Answer options">
      {options.map((o, i) => {
        const isCorrect = done && correct.includes(o.id)
        const isWrong = done && chosen === o.id && !correct.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            disabled={done}
            onClick={() => onSubmit(checkChoice(exercise, o.id), o.label)}
            className={cx(
              'flex min-h-14 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left text-[1.05rem] font-semibold transition-colors',
              !done && 'border-border bg-surface hover:border-primary/60 hover:bg-surface-2',
              isCorrect && 'border-success bg-success-soft',
              isWrong && 'border-error bg-error-soft',
              done && !isCorrect && !isWrong && 'border-border opacity-60',
            )}
          >
            <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-xs text-muted">
              {i + 1}
            </span>
            {o.fi ? <Fi>{o.label}</Fi> : <span>{o.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

function PiecesAnswer({ exercise, done, chosen, onSubmit }: { exercise: Exercise; done: boolean; chosen: number | null; onSubmit: Submit }) {
  const a = exercise.answer
  if (a.kind !== 'pieces') return null
  return (
    <div className="flex flex-wrap items-end gap-1" role="group" aria-label="Parts of the word">
      {a.pieces.map((p, i) => {
        const isCorrect = done && a.correct.includes(i)
        const isWrong = done && chosen === i && !a.correct.includes(i)
        return (
          <button
            key={i}
            type="button"
            disabled={done}
            onClick={() => onSubmit(checkPieces(exercise, i), p.text)}
            className={cx(
              'min-h-16 min-w-12 rounded-xl border-2 px-2 text-4xl font-bold transition-colors',
              !done && 'border-dashed border-border-strong bg-surface hover:border-primary hover:bg-primary-soft',
              isCorrect && `seg-${p.role} border-solid`,
              isWrong && 'border-error bg-error-soft text-error',
              done && !isCorrect && !isWrong && 'border-transparent opacity-60',
            )}
            aria-label={`Part ${i + 1}: ${p.text}`}
          >
            <Fi>{p.text}</Fi>
          </button>
        )
      })}
    </div>
  )
}

function BuildAnswer({ exercise, done, onSubmit }: { exercise: Exercise; done: boolean; onSubmit: Submit }) {
  const a = exercise.answer
  const [placed, setPlaced] = useState<string[]>([])
  if (a.kind !== 'build') return null
  const tiles = a.tiles
  const built = placed.map((id) => tiles.find((t) => t.id === id)?.text ?? '').join('')
  return (
    <div className="space-y-3">
      <div
        className="flex min-h-16 flex-wrap items-center gap-1 rounded-xl border-2 border-dashed border-border-strong bg-surface-2 p-2"
        aria-label={built ? `Your word: ${built}` : 'Your word is empty'}
        aria-live="polite"
      >
        {placed.length === 0 && <span className="px-2 text-muted">Tap the pieces in order…</span>}
        {placed.map((id) => {
          const tile = tiles.find((t) => t.id === id)!
          return (
            <button
              key={id}
              type="button"
              disabled={done}
              onClick={() => setPlaced((p) => p.filter((x) => x !== id))}
              className="min-h-11 rounded-lg border border-primary bg-primary-soft px-3 text-2xl font-bold text-primary-strong"
              aria-label={`Remove ${tile.text}`}
            >
              <Fi>{tile.text}</Fi>
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pieces">
        {tiles.map((t) => {
          const used = placed.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              disabled={done || used}
              onClick={() => setPlaced((p) => [...p, t.id])}
              className={cx('min-h-12 rounded-lg border-2 border-border-strong bg-surface px-3 text-2xl font-bold hover:border-primary', used && 'opacity-30')}
              aria-label={`Add ${t.text}`}
            >
              <Fi>{t.text}</Fi>
            </button>
          )
        })}
      </div>
      {!done && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setPlaced((p) => p.slice(0, -1))} disabled={!placed.length} icon={<Delete aria-hidden className="size-4" />}>
            Undo
          </Button>
          <Button variant="ghost" onClick={() => setPlaced([])} disabled={!placed.length} icon={<Eraser aria-hidden className="size-4" />}>
            Clear
          </Button>
          <Button variant="primary" disabled={!placed.length} onClick={() => onSubmit(checkBuild(exercise, built), built)}>
            Check
          </Button>
        </div>
      )}
    </div>
  )
}

/* ---------------- prompt ---------------- */

function Prompt({ exercise }: { exercise: Exercise }) {
  const showTranslations = useSettings((s) => s.showTranslations)
  const p = exercise.prompt
  const played = useRef(false)
  useEffect(() => {
    if (p.audio && !played.current) {
      played.current = true
      void audioService.speak(p.audio, 'normal')
    }
  }, [p.audio])
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{p.instruction}</h2>
      {p.audio && (
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Volume2 className="size-6" />
          </span>
          <AudioButton text={p.audio} size="lg" label="Play the word again" />
        </div>
      )}
      {p.word && (
        <p className="flex flex-wrap items-center gap-3">
          <Fi className="text-3xl font-bold sm:text-4xl">{p.word}</Fi>
          {exercise.type !== 'production' && <AudioButton text={p.word} size="sm" slow={false} />}
        </p>
      )}
      {p.detail && <p className="text-muted">{p.detail}</p>}
      {p.sentence && (
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xl leading-relaxed">
            <Fi>
              {p.sentence.view.parts.map((part, i) =>
                i === p.sentence!.blank ? (
                  p.sentence!.marked ? (
                    <span key={i} className="font-semibold text-error underline decoration-wavy decoration-2 underline-offset-4">
                      {part.text}
                    </span>
                  ) : (
                    <span key={i} className="mx-1 inline-block min-w-20 border-b-2 border-primary text-center text-muted" aria-label="blank">
                      ＿
                    </span>
                  )
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </Fi>
          </p>
          {p.sentence.hint && (
            <p className="mt-1 text-sm font-semibold text-primary-strong">
              (<Fi>{p.sentence.hint}</Fi>)
            </p>
          )}
          {showTranslations && p.sentence.translation && <p className="mt-1 text-sm text-muted">{p.sentence.translation}</p>}
        </div>
      )}
    </div>
  )
}

/* ---------------- card ---------------- */

/**
 * One exercise: prompt, answer input of the right kind, then feedback.
 * The parent gives each exercise its own `key`, which resets the state.
 */
export function ExerciseCard({
  exercise,
  onAnswered,
  onContinue,
  continueLabel = 'Continue',
}: {
  exercise: Exercise
  onAnswered: (result: CheckResult, ms: number) => void
  onContinue: () => void
  continueLabel?: string
}) {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [response, setResponse] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)
  const startedAt = useRef(0)
  const continueRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])
  useEffect(() => {
    if (result) continueRef.current?.focus()
  }, [result])
  const done = result !== null
  const submit: Submit = (r, text) => {
    if (result) return
    setResult(r)
    setResponse(text)
    setChosen(text)
    onAnswered(r, Date.now() - startedAt.current)
  }
  const a = exercise.answer
  return (
    <div className="space-y-5">
      <Prompt exercise={exercise} />
      {a.kind === 'text' && <TextAnswer exercise={exercise} done={done} onSubmit={submit} />}
      {a.kind === 'choice' && (
        <ChoiceAnswer exercise={exercise} done={done} chosen={a.options.find((o) => o.label === chosen)?.id ?? null} onSubmit={submit} />
      )}
      {a.kind === 'pieces' && (
        <PiecesAnswer exercise={exercise} done={done} chosen={chosen !== null ? a.pieces.findIndex((p) => p.text === chosen) : null} onSubmit={submit} />
      )}
      {a.kind === 'build' && <BuildAnswer exercise={exercise} done={done} onSubmit={submit} />}
      {result && (
        <>
          <FeedbackPanel exercise={exercise} result={result} response={a.kind === 'text' || a.kind === 'build' ? response : ''} />
          <div className="flex justify-end">
            <Button ref={continueRef} variant="primary" size="lg" onClick={onContinue}>
              {continueLabel}
              <ArrowRight aria-hidden className="size-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

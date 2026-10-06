import { Award, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ACHIEVEMENTS } from '../../services/learning/achievements'
import { grammar } from '../../services/grammar'
import { slotLabel } from '../../services/content/text'
import { useExplain } from '../../stores/explain'
import { useProgress } from '../../stores/progress'
import { useSettings } from '../../stores/settings'
import type { CheckResult, Exercise } from '../../types/exercise'
import { Button, ButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'
import { Fi } from '../ui/FiText'
import { ProgressBar } from '../ui/ProgressBar'
import { ExerciseCard } from './ExerciseCard'

interface LogEntry {
  exercise: Exercise
  result: CheckResult
  xp: number
}

const achievementTitle = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)?.title ?? id

function SessionSummary({ log, notices, onRestart, exitTo }: { log: LogEntry[]; notices: string[]; onRestart?: () => void; exitTo: string }) {
  const mode = useSettings((s) => s.mode)
  const open = useExplain((s) => s.open)
  const correct = log.filter((l) => l.result.verdict !== 'incorrect').length
  const xp = log.reduce((s, l) => s + l.xp, 0)
  const mistakes = log.filter((l) => l.result.verdict === 'incorrect')
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Session complete</h2>
        <p className="text-muted">
          {correct} of {log.length} right · +{xp} XP
        </p>
      </div>
      <ProgressBar value={log.length ? correct / log.length : 0} label="Accuracy" tone={correct === log.length ? 'success' : 'primary'} />
      {notices.length > 0 && (
        <ul className="space-y-1">
          {notices.map((n, i) => (
            <li key={i} className="flex items-center gap-2 text-sm font-semibold">
              <Award aria-hidden className="size-4 text-warning" /> {n}
            </li>
          ))}
        </ul>
      )}
      {mistakes.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">To look at again</h3>
          <ul className="space-y-1.5">
            {mistakes.map((m, i) => {
              const t = m.exercise.target
              const lex = t && grammar.get(t.lexemeId)
              return (
                <li key={i} className="flex flex-wrap items-center gap-x-2 text-[0.97rem]">
                  {lex && t ? (
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => open({ lexemeId: t.lexemeId, slot: t.slot, ...(t.person ? { person: t.person } : {}) })}
                    >
                      <Fi>{lex.lemma}</Fi> → <Fi>{m.result.expected}</Fi>
                    </button>
                  ) : (
                    <Fi className="font-semibold">{m.result.expected}</Fi>
                  )}
                  {t && <span className="text-sm text-muted">{slotLabel(t.slot, mode)}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {onRestart && (
          <Button variant="primary" onClick={onRestart} icon={<RotateCcw aria-hidden className="size-4" />}>
            New set
          </Button>
        )}
        <ButtonLink to={exitTo}>Done</ButtonLink>
      </div>
    </Card>
  )
}

/**
 * Runs a list of exercises: records every attempt (skills, SRS, XP, streak),
 * shows quiet notices for goals and achievements, and ends with a summary.
 */
export function ExerciseRunner({
  exercises,
  onRestart,
  onComplete,
  exitTo = '/practice',
  summary = true,
}: {
  exercises: Exercise[]
  onRestart?: () => void
  onComplete?: (score: { correct: number; total: number }) => void
  exitTo?: string
  summary?: boolean
}) {
  const [index, setIndex] = useState(0)
  const [log, setLog] = useState<LogEntry[]>([])
  const [notices, setNotices] = useState<string[]>([])
  const [finished, setFinished] = useState(false)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const finishSession = useProgress((s) => s.finishSession)
  const dailyGoal = useSettings((s) => s.dailyGoal)
  const current = exercises[index]

  if (!current && !finished) {
    return <p className="text-muted">No exercises could be made for this selection. Try another topic.</p>
  }
  if (finished) {
    return summary ? <SessionSummary log={log} notices={notices} exitTo={exitTo} {...(onRestart ? { onRestart } : {})} /> : null
  }

  const onAnswered = (result: CheckResult, ms: number) => {
    const outcome = recordAttempt({ exercise: current!, verdict: result.verdict, ms, dailyGoal })
    setLog((l) => [...l, { exercise: current!, result, xp: outcome.xp }])
    const msgs = [...(outcome.goalReached ? ['Daily goal reached (+25 XP)'] : []), ...outcome.unlocked.map((id) => `Achievement: ${achievementTitle(id)}`)]
    if (msgs.length) setNotices((n) => [...n, ...msgs])
  }
  const onContinue = () => {
    if (index + 1 < exercises.length) {
      setIndex(index + 1)
      return
    }
    const correct = log.filter((l) => l.result.verdict !== 'incorrect').length
    const unlocked = finishSession({ correct, total: log.length })
    if (unlocked.length) setNotices((n) => [...n, ...unlocked.map((id) => `Achievement: ${achievementTitle(id)}`)])
    setFinished(true)
    onComplete?.({ correct, total: log.length })
  }
  const last = index + 1 === exercises.length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ProgressBar value={index / exercises.length} label={`Exercise ${index + 1} of ${exercises.length}`} showValue={false} size="sm" className="flex-1" />
        <Link to={exitTo} aria-label="End session" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-surface-2">
          <X aria-hidden className="size-5" />
        </Link>
      </div>
      {notices.length > 0 && (
        <p className="animate-rise-in flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm font-semibold text-warning" role="status">
          <Award aria-hidden className="size-4" /> {notices[notices.length - 1]}
        </p>
      )}
      <Card>
        <ExerciseCard key={current!.id} exercise={current!} onAnswered={onAnswered} onContinue={onContinue} continueLabel={last ? 'See results' : 'Continue'} />
      </Card>
    </div>
  )
}

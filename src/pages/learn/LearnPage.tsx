import { ArrowRight, CircleCheck, CircleDashed, CirclePlay, GraduationCap } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { LESSONS, LEVELS } from '../../data/curriculum'
import { pickLabel, pickText } from '../../services/content/text'
import { lessonStatus, recommendedLesson } from '../../services/learning/curriculum'
import { useProgress } from '../../stores/progress'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'

const STATUS_ICON = { done: CircleCheck, started: CirclePlay, new: CircleDashed } as const
const STATUS_TEXT = { done: 'Completed', started: 'Started', new: 'Not started' } as const

export default function LearnPage() {
  const mode = useSettings((s) => s.mode)
  const lessons = useProgress((s) => s.lessons)
  const next = recommendedLesson(lessons)
  const done = LESSONS.filter((l) => lessons[l.id]?.status === 'done').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learn"
        fi="Opi"
        why="Eight levels, from what a case is to real-life usage. The order is a recommendation: every lesson is open, and each ends with a short check."
      />

      <Card className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <ProgressBar value={done / LESSONS.length} label={`${done} of ${LESSONS.length} lessons completed`} />
        </div>
        {next && (
          <ButtonLink to={`/learn/${next.id}`} variant="primary" icon={<CirclePlay aria-hidden className="size-4" />}>
            {done === 0 ? 'Start with' : 'Continue:'} {next.id} {pickLabel(next.title, mode)}
          </ButtonLink>
        )}
      </Card>

      {LEVELS.map((level) => {
        const items = LESSONS.filter((l) => l.level === level.id)
        const levelDone = items.filter((l) => lessons[l.id]?.status === 'done').length
        const summary = pickText(level.summary, mode)
        return (
          <section key={level.id} aria-labelledby={`level-${level.id}`} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id={`level-${level.id}`} className="text-lg font-semibold">
                  Level {level.id}: {pickLabel(level.title, mode)}
                </h2>
                <p className="text-sm text-muted" lang={summary.lang}>
                  {summary.main}
                </p>
              </div>
              <span className="text-sm text-muted tabular-nums">
                {levelDone}/{items.length}
              </span>
            </div>
            <ol className="grid gap-2 sm:grid-cols-2">
              {items.map((l) => {
                const status = lessonStatus(lessons, l.id)
                const Icon = STATUS_ICON[status]
                const isNext = next?.id === l.id
                return (
                  <li key={l.id}>
                    <Link
                      to={`/learn/${l.id}`}
                      className={cx(
                        'group flex h-full items-center gap-3 rounded-2xl border bg-surface p-3 shadow-card transition-colors hover:border-primary/60',
                        isNext ? 'border-primary/70 ring-2 ring-primary/20' : 'border-border',
                      )}
                    >
                      <Icon aria-label={STATUS_TEXT[status]} className={cx('size-6 shrink-0', status === 'done' ? 'text-success' : status === 'started' ? 'text-primary' : 'text-muted')} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug">
                          <span className="text-muted tabular-nums">{l.id}</span> {pickLabel(l.title, mode)}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-muted">
                          {l.minutes} min
                          {l.advanced && (
                            <span className="inline-flex items-center gap-0.5">
                              <GraduationCap aria-hidden className="size-3.5" /> advanced
                            </span>
                          )}
                          {isNext && <span className="font-semibold text-primary">recommended next</span>}
                        </span>
                      </span>
                      <ArrowRight aria-hidden className="size-4 shrink-0 text-muted group-hover:text-primary" />
                    </Link>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

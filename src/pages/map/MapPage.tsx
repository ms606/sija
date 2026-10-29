import { ArrowRight, Check, CircleCheck, CircleDashed, CirclePlay, GraduationCap, Layers, MapPin, MessagesSquare, Sprout, Trophy, Waves, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Disclosure } from '../../components/ui/Disclosure'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { pickLabel, pickText } from '../../services/content/text'
import { buildLearningMap, type MapLesson, type MapLevel, type MapWorld, type WorldTone } from '../../services/learning/map'
import { TIER_LABEL } from '../../services/learning/mastery'
import { useProgress } from '../../stores/progress'
import { useSettings, type LearnerMode } from '../../stores/settings'
import { cx } from '../../utils/cx'

/** World colours reuse the grammar-role palette, which has light and dark variants. Colour is never the only cue. */
const TONE: Record<WorldTone, { banner: string; border: string; icon: LucideIcon }> = {
  root: { banner: 'bg-[var(--root-bg)] text-[var(--root-fg)]', border: 'border-[var(--root-bd)]', icon: Sprout },
  grade: { banner: 'bg-[var(--grade-bg)] text-[var(--grade-fg)]', border: 'border-[var(--grade-bd)]', icon: Waves },
  stem: { banner: 'bg-[var(--stem-bg)] text-[var(--stem-fg)]', border: 'border-[var(--stem-bd)]', icon: Layers },
  ending: { banner: 'bg-[var(--ending-bg)] text-[var(--ending-fg)]', border: 'border-[var(--ending-bd)]', icon: MessagesSquare },
}

const LEVEL_STATE = {
  completed: { text: 'Completed', tone: 'success', Icon: CircleCheck },
  current: { text: 'You are here', tone: 'primary', Icon: MapPin },
  upcoming: { text: 'Upcoming', tone: 'neutral', Icon: CircleDashed },
} as const

const LESSON_STATUS = { done: 'completed', started: 'started', new: 'not started' } as const

export default function MapPage() {
  const mode = useSettings((s) => s.mode)
  const lessons = useProgress((s) => s.lessons)
  const skills = useProgress((s) => s.skills)
  const map = useMemo(() => buildLearningMap({ lessons, skills }), [lessons, skills])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning map"
        fi="Oppimispolku"
        why="Your route through Sija's eight levels, grouped into four worlds. Every lesson stays open: a dashed lesson has another lesson recommended first, but you can always go straight in."
        actions={
          map.next ? (
            <ButtonLink to={`/learn/${map.next.id}`} variant="primary" icon={<CirclePlay aria-hidden className="size-4" />}>
              {map.done === 0 ? 'Start with' : 'Continue:'} {map.next.id} {pickLabel(map.next.title, mode)}
            </ButtonLink>
          ) : undefined
        }
      />

      <Card className="space-y-4">
        <ProgressBar value={map.done / map.total} label={`${map.done} of ${map.total} lessons completed`} tone={map.next ? 'primary' : 'success'} />
        <Legend />
      </Card>

      {map.worlds.map((w, i) => (
        <WorldSection key={w.world.id} world={w} index={i} mode={mode} />
      ))}

      <FinishNode allDone={!map.next} total={map.total} />
    </div>
  )
}

function Legend() {
  return (
    <ul aria-label="Map legend" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
      <li className="inline-flex items-center gap-1.5">
        <CircleCheck aria-hidden className="size-4 text-success" /> Completed
      </li>
      <li className="inline-flex items-center gap-1.5">
        <MapPin aria-hidden className="size-4 text-primary" /> You are here
      </li>
      <li className="inline-flex items-center gap-1.5">
        <CircleDashed aria-hidden className="size-4" /> Upcoming
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-4 w-6 rounded border-2 border-dashed border-border-strong" /> Another lesson recommended first (still open)
      </li>
    </ul>
  )
}

function WorldSection({ world, index, mode }: { world: MapWorld; index: number; mode: LearnerMode }) {
  const tone = TONE[world.world.tone]
  const Icon = tone.icon
  const headingId = `world-${world.world.id}`
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <header className={cx('flex flex-wrap items-center gap-3 rounded-2xl border-2 px-4 py-3', tone.banner, tone.border)}>
        <Icon aria-hidden className="size-7 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wider uppercase">World {index + 1}</p>
          <h2 id={headingId} className="text-xl font-bold leading-tight">
            {pickLabel(world.world.title, mode)}
          </h2>
          {mode === 'beginner' && world.world.title.fi && (
            <p lang="fi" className="text-sm font-medium">
              {world.world.title.fi}
            </p>
          )}
        </div>
        <p className="text-sm font-semibold tabular-nums">
          {world.done}/{world.total} lessons
        </p>
      </header>

      <ol className="space-y-0">
        {world.levels.map((level, i) => (
          <li key={level.level.id}>
            {i > 0 && <Connector toRight={i % 2 === 1} solid={world.levels[i - 1]!.state === 'completed'} />}
            <div className={cx('sm:w-[88%] lg:w-[78%]', i % 2 === 1 ? 'sm:ml-auto' : 'sm:mr-auto')}>
              <LevelNode level={level} mode={mode} borderTone={tone.border} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The winding path between two level nodes (decorative). */
function Connector({ toRight, solid }: { toRight: boolean; solid: boolean }) {
  const d = toRight ? 'M 22 0 C 22 30, 78 18, 78 48' : 'M 78 0 C 78 30, 22 18, 22 48'
  return (
    <div aria-hidden>
      <div className={cx('mx-auto h-6 w-0 border-l-2 sm:hidden', solid ? 'border-success' : 'border-dashed border-border-strong')} />
      <svg viewBox="0 0 100 48" preserveAspectRatio="none" className={cx('hidden h-12 w-full sm:block', solid ? 'text-success' : 'text-border-strong')}>
        <path d={d} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeDasharray={solid ? undefined : '6 7'} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

function Medallion({ level }: { level: MapLevel }) {
  const base = 'flex size-12 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold tabular-nums'
  if (level.state === 'completed') {
    return (
      <span aria-hidden className={cx(base, 'border-success bg-success-soft text-success')}>
        <Check className="size-6" />
      </span>
    )
  }
  if (level.state === 'current') {
    return (
      <span aria-hidden className={cx(base, 'border-primary bg-primary text-on-primary ring-4 ring-primary/20')}>
        <MapPin className="size-6" />
      </span>
    )
  }
  return (
    <span aria-hidden className={cx(base, 'border-border-strong bg-surface-2 text-muted')}>
      {level.level.id}
    </span>
  )
}

function LevelNode({ level, mode, borderTone }: { level: MapLevel; mode: LearnerMode; borderTone: string }) {
  const st = LEVEL_STATE[level.state]
  const summary = pickText(level.level.summary, mode)
  const headingId = `level-${level.level.id}`
  return (
    <article
      aria-labelledby={headingId}
      className={cx(
        'rounded-2xl border-2 bg-surface p-4 shadow-card sm:p-5',
        level.state === 'current' ? 'border-primary' : level.state === 'completed' ? 'border-success/60' : borderTone,
      )}
    >
      <div className="flex items-start gap-3">
        <Medallion level={level} />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 id={headingId} className="text-lg font-semibold leading-snug">
            Level {level.level.id}: {pickLabel(level.level.title, mode)}
          </h3>
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone={st.tone}>
              <st.Icon aria-hidden className="size-3.5" /> {st.text}
            </Badge>
            <span className="text-sm text-muted">
              Mastery: {TIER_LABEL[level.mastery.tier]}
            </span>
          </p>
          <p className="text-sm text-muted" lang={summary.lang}>
            {summary.main}
          </p>
        </div>
      </div>

      <ProgressBar
        className="mt-3"
        size="sm"
        value={level.done / level.total}
        label={`${level.done} of ${level.total} lessons`}
        tone={level.state === 'completed' ? 'success' : 'primary'}
      />

      {level.buildsOn.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          Builds on{' '}
          {level.buildsOn.map((n, i) => (
            <span key={n}>
              {i > 0 && ', '}
              <a href={`#level-${n}`} className="font-semibold text-primary hover:underline">
                Level {n}
              </a>
            </span>
          ))}
        </p>
      )}

      <Disclosure className="mt-3" defaultOpen={level.state === 'current'} summary={`Lessons (${level.total})`}>
        <ol className="space-y-2">
          {level.lessons.map((l) => (
            <LessonStop key={l.lesson.id} item={l} mode={mode} />
          ))}
        </ol>
      </Disclosure>
    </article>
  )
}

function LessonStop({ item, mode }: { item: MapLesson; mode: LearnerMode }) {
  const { lesson, status, isNext, missing, score } = item
  const Icon = status === 'done' ? CircleCheck : status === 'started' ? CirclePlay : CircleDashed
  const waiting = status !== 'done' && missing.length > 0
  return (
    <li>
      <Link
        to={`/learn/${lesson.id}`}
        aria-current={isNext ? 'step' : undefined}
        className={cx(
          'group flex min-h-11 items-center gap-3 rounded-xl border-2 bg-surface px-3 py-2 transition-colors hover:border-primary/60',
          isNext ? 'border-primary ring-2 ring-primary/20' : waiting ? 'border-dashed border-border-strong' : status === 'done' ? 'border-success/50' : 'border-border',
        )}
      >
        <Icon aria-hidden className={cx('size-5 shrink-0', status === 'done' ? 'text-success' : status === 'started' ? 'text-primary' : 'text-muted')} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug">
            <span className="text-muted tabular-nums">{lesson.id}</span> {pickLabel(lesson.title, mode)}
            <span className="sr-only">, {LESSON_STATUS[status]}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            {lesson.minutes} min
            {status === 'done' && score !== undefined && <span>best score {score}%</span>}
            {lesson.advanced && (
              <span className="inline-flex items-center gap-0.5">
                <GraduationCap aria-hidden className="size-3.5" /> advanced
              </span>
            )}
            {isNext && <span className="font-semibold text-primary">recommended next</span>}
            {waiting && <span>recommended after {missing.map((m) => m.id).join(', ')}</span>}
          </span>
        </span>
        <ArrowRight aria-hidden className="size-4 shrink-0 text-muted group-hover:text-primary" />
      </Link>
    </li>
  )
}

function FinishNode({ allDone, total }: { allDone: boolean; total: number }) {
  return (
    <Card className="flex items-center gap-3">
      <Trophy aria-hidden className={cx('size-8 shrink-0', allDone ? 'text-warning' : 'text-muted')} />
      <p className="font-semibold">
        {allDone ? 'Every lesson is complete. Keep your forms fresh with daily practice.' : `The end of the path: all ${total} lessons complete.`}
      </p>
    </Card>
  )
}

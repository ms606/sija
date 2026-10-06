import { ArrowLeft, ArrowRight, CircleCheck, Clock, GraduationCap, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ExerciseRunner } from '../../components/exercises/ExerciseRunner'
import { LessonBlockView } from '../../components/lesson/LessonBlocks'
import { Badge } from '../../components/ui/Badge'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LESSONS, LEVELS, getLesson, nextLesson } from '../../data/curriculum'
import { audioService } from '../../services/audio/AudioService'
import { pickLabel, pickText } from '../../services/content/text'
import { buildSession } from '../../services/exercises/session'
import { missingPrerequisites, PASS_MARK } from '../../services/learning/curriculum'
import { useProgress } from '../../stores/progress'
import { useSettings } from '../../stores/settings'
import type { Lesson } from '../../types/curriculum'
import { randomSeed } from '../../utils/random'
import NotFoundPage from '../NotFoundPage'

function makeCheck(lesson: Lesson, mode: ReturnType<typeof useSettings.getState>['mode']) {
  const c = lesson.check
  return buildSession({
    seed: randomSeed(),
    mode,
    audio: audioService.getState().voices.length > 0,
    count: c.count ?? 6,
    ...(c.skill ? { skill: c.skill } : {}),
    ...(c.types ? { types: c.types } : {}),
    ...(c.words ? { words: c.words } : {}),
    ...(c.slots ? { slots: c.slots } : {}),
    ...(c.persons ? { persons: c.persons } : {}),
    ...(c.tags ? { tags: c.tags } : {}),
    ...(c.lemmaHintOnly ? { lemmaHintOnly: true } : {}),
  })
}

function LessonCheck({ lesson }: { lesson: Lesson }) {
  const mode = useSettings((s) => s.mode)
  const completeLesson = useProgress((s) => s.completeLesson)
  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>('intro')
  const [exercises, setExercises] = useState(() => makeCheck(lesson, mode))
  const [round, setRound] = useState(0)
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null)
  const [xp, setXp] = useState(0)
  const next = nextLesson(lesson.id)
  const passed = score ? score.correct / Math.max(1, score.total) >= PASS_MARK : false

  if (phase === 'intro') {
    return (
      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">Check your understanding</h2>
        <p className="text-muted">
          {exercises.length} short exercises. Get {Math.ceil(PASS_MARK * exercises.length)} right to complete the lesson.
        </p>
        <Button variant="primary" size="lg" onClick={() => setPhase('running')}>
          Start the check
        </Button>
      </Card>
    )
  }
  if (phase === 'running') {
    return (
      <ExerciseRunner
        key={round}
        exercises={exercises}
        exitTo={`/learn/${lesson.id}`}
        summary={false}
        onComplete={(s) => {
          setScore(s)
          if (s.correct / Math.max(1, s.total) >= PASS_MARK) setXp(completeLesson(lesson.id, Math.round((100 * s.correct) / Math.max(1, s.total))).xp)
          setPhase('done')
        }}
      />
    )
  }
  return (
    <Card className="space-y-3" role="status">
      {passed ? (
        <>
          <p className="flex items-center gap-2 text-xl font-semibold text-success">
            <CircleCheck aria-hidden className="size-6" /> Lesson complete
          </p>
          <p className="text-muted">
            {score?.correct} of {score?.total} right{xp > 0 ? ` · +${xp} XP` : ''}
          </p>
        </>
      ) : (
        <>
          <p className="text-xl font-semibold">Almost there</p>
          <p className="text-muted">
            {score?.correct} of {score?.total} right. Look at the examples again and try a new set — it only takes a minute.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {passed && next && (
          <ButtonLink to={`/learn/${next.id}`} variant="primary">
            Next: {next.id} {pickLabel(next.title, mode)}
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        )}
        <Button
          variant={passed ? 'secondary' : 'primary'}
          icon={<RotateCcw aria-hidden className="size-4" />}
          onClick={() => {
            setExercises(makeCheck(lesson, mode))
            setRound((r) => r + 1)
            setScore(null)
            setPhase('running')
          }}
        >
          {passed ? 'Practise again' : 'Try a new set'}
        </Button>
        <ButtonLink to="/learn">All lessons</ButtonLink>
      </div>
    </Card>
  )
}

export default function LessonPage() {
  const { lessonId = '' } = useParams()
  const mode = useSettings((s) => s.mode)
  const lessons = useProgress((s) => s.lessons)
  const startLesson = useProgress((s) => s.startLesson)
  const hydrated = useProgress((s) => s.hydrated)
  const lesson = getLesson(lessonId)
  useEffect(() => {
    if (lesson && hydrated) startLesson(lesson.id)
  }, [lesson, hydrated, startLesson])
  if (!lesson) return <NotFoundPage />
  const level = LEVELS.find((l) => l.id === lesson.level)
  const goal = pickText(lesson.goal, mode)
  const why = pickText(lesson.why, mode)
  const missing = missingPrerequisites(lessons, lesson)
  const idx = LESSONS.findIndex((l) => l.id === lesson.id)
  const prev = LESSONS[idx - 1]
  const next = LESSONS[idx + 1]

  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/learn" className="font-semibold text-primary hover:underline">
          Learn
        </Link>
        <span className="text-muted">
          {' '}
          / Level {lesson.level}
          {level ? `: ${pickLabel(level.title, mode)}` : ''}
        </span>
      </nav>
      <header className="space-y-2">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-semibold tabular-nums">Lesson {lesson.id}</span>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-4" /> {lesson.minutes} min
          </span>
          {lesson.advanced && (
            <Badge>
              <GraduationCap aria-hidden className="size-3.5" /> advanced
            </Badge>
          )}
          {lessons[lesson.id]?.status === 'done' && (
            <Badge tone="success">
              <CircleCheck aria-hidden className="size-3.5" /> completed
            </Badge>
          )}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{pickLabel(lesson.title, mode)}</h1>
        {mode === 'beginner' && lesson.title.fi && <p className="text-muted" lang="fi">{lesson.title.fi}</p>}
        <p className="text-[1.05rem]">
          <strong>Goal:</strong> <span lang={goal.lang}>{goal.main}</span>
        </p>
        <p className="text-muted">
          <strong className="text-text">Why it matters:</strong> <span lang={why.lang}>{why.main}</span>
        </p>
        {missing.length > 0 && (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">
            Recommended first:{' '}
            {missing.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ', '}
                <Link to={`/learn/${m.id}`} className="font-semibold text-primary hover:underline">
                  {m.id} {pickLabel(m.title, mode)}
                </Link>
              </span>
            ))}
            . You can also continue here.
          </p>
        )}
      </header>

      <div className="space-y-4">
        {lesson.blocks.map((b, i) => (
          <LessonBlockView key={i} block={b} />
        ))}
      </div>

      <LessonCheck key={lesson.id} lesson={lesson} />

      <nav aria-label="Lessons" className="flex flex-wrap justify-between gap-2 pt-2">
        {prev ? (
          <ButtonLink to={`/learn/${prev.id}`} variant="ghost" icon={<ArrowLeft aria-hidden className="size-4" />}>
            {prev.id}
          </ButtonLink>
        ) : (
          <span />
        )}
        {next && (
          <ButtonLink to={`/learn/${next.id}`} variant="ghost">
            {next.id} <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        )}
      </nav>
    </article>
  )
}

import { ArrowRight, CalendarCheck, Repeat, Target } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { CASES_INFO } from '../../data/cases'
import { GRADATION_INFO } from '../../data/gradation-patterns'
import { I_GROUP_INFO, I_GROUP_ORDER } from '../../data/noun-families'
import { caseName } from '../../services/content/text'
import { PRACTICE_CASES } from '../../services/exercises/session'
import { CATEGORY_INFO, CATEGORY_ORDER } from '../../services/exercises/skills'
import { categoryMastery, weakAreas } from '../../services/learning/mastery'
import { dueItems } from '../../services/learning/srs'
import { dayKey } from '../../services/learning/xp'
import { useNow } from '../../hooks/useNow'
import { useProgress } from '../../stores/progress'
import { useSettings } from '../../stores/settings'
import type { ExerciseType } from '../../types/exercise'
import { TYPE_LABEL } from '../../services/exercises/labels'

const TYPES: ExerciseType[] = ['transform', 'multiple-choice', 'fill-blank', 'build-word', 'identify-case', 'identify-number-case', 'identify-morphology', 'error-correction', 'production', 'listening']

function Chip({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-3 text-[0.95rem] font-semibold hover:border-primary/60 hover:bg-surface-2">
      {children}
    </Link>
  )
}

export default function PracticePage() {
  const mode = useSettings((s) => s.mode)
  const dailyGoal = useSettings((s) => s.dailyGoal)
  const reviews = useProgress((s) => s.reviews)
  const skills = useProgress((s) => s.skills)
  const daily = useProgress((s) => s.daily)
  const now = useNow()
  const today = daily[dayKey(new Date(now))] ?? { items: 0, correct: 0, xp: 0 }
  const due = dueItems(reviews, now).length
  const weak = weakAreas(skills)
  const cats = categoryMastery(skills)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice"
        fi="Harjoittele"
        why="Short, mixed sessions work best. Every answer is checked by the grammar engine, and mistakes come with an explanation of what went wrong."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardTitle sub="A mix of what is due for review, your weak spots and new forms.">
            <span className="flex items-center gap-2">
              <CalendarCheck aria-hidden className="size-5 text-primary" /> Daily practice
            </span>
          </CardTitle>
          <ProgressBar value={Math.min(1, today.items / dailyGoal)} label={`Today: ${today.items} / ${dailyGoal} exercises`} showValue={false} tone={today.items >= dailyGoal ? 'success' : 'primary'} />
          <ButtonLink to="/practice/session?skill=mixed&daily=1&count=15" variant="primary" size="lg" className="mt-auto">
            Start daily practice
          </ButtonLink>
        </Card>
        <Card className="flex flex-col gap-3">
          <CardTitle sub="Spaced repetition brings back each form just before you would forget it.">
            <span className="flex items-center gap-2">
              <Repeat aria-hidden className="size-5 text-primary" /> Review
            </span>
          </CardTitle>
          <p className="text-[0.97rem]">{due > 0 ? `${due} item${due === 1 ? '' : 's'} due now.` : 'Nothing due right now — new items appear as you practise.'}</p>
          <ButtonLink to="/practice/session?review=1" variant={due > 0 ? 'primary' : 'secondary'} size="lg" className="mt-auto" aria-disabled={due === 0}>
            Review due items
          </ButtonLink>
        </Card>
      </div>

      {weak.length > 0 && (
        <Card>
          <CardTitle sub="Skills with at least five attempts and the lowest scores.">
            <span className="flex items-center gap-2">
              <Target aria-hidden className="size-5 text-warning" /> Weak areas
            </span>
          </CardTitle>
          <ul className="space-y-2">
            {weak.map((w) => (
              <li key={w.skill} className="flex flex-wrap items-center justify-between gap-2">
                <ProgressBar value={w.value} label={w.label} size="sm" tone="warning" className="max-w-sm flex-1" />
                <ButtonLink to={`/practice/session?skill=${encodeURIComponent(w.skill)}&count=10`} size="sm">
                  Practise 10
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section aria-labelledby="by-topic" className="space-y-3">
        <h2 id="by-topic" className="text-lg font-semibold">
          By topic
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORY_ORDER.filter((c) => c !== 'listening' && c !== 'vocabulary').map((c) => {
            const m = cats.find((x) => x.id === c)!
            return (
              <li key={c}>
                <Link
                  to={`/practice/session?skill=${c}`}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-card hover:border-primary/60"
                >
                  <span className="flex items-center justify-between gap-2 font-semibold">
                    {CATEGORY_INFO[c].label}
                    <ArrowRight aria-hidden className="size-4 text-muted group-hover:text-primary" />
                  </span>
                  <ProgressBar value={m.value} label={m.attempts ? 'Mastery' : 'Not started'} showValue={m.attempts > 0} size="sm" />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <Card>
        <CardTitle sub="One case at a time.">Cases</CardTitle>
        <div className="flex flex-wrap gap-2">
          {PRACTICE_CASES.map((c) => (
            <Chip key={c} to={`/practice/session?skill=case:${c}`}>
              {mode === 'beginner' ? CASES_INFO[c].en : <Fi>{caseName(c, mode)}</Fi>}
            </Chip>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Gradation patterns</CardTitle>
          <div className="flex flex-wrap gap-2">
            {GRADATION_INFO.map((g) => (
              <Chip key={g.id} to={`/practice/session?skill=grad:${g.id}`}>
                <Fi>{g.title}</Fi>
              </Chip>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>-i word families</CardTitle>
          <div className="flex flex-wrap gap-2">
            {I_GROUP_ORDER.map((g) => (
              <Chip key={g} to={`/practice/session?skill=itype:${g}&count=10`}>
                <Fi>{I_GROUP_INFO[g].model}</Fi>-type
              </Chip>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle sub="Pick the kind of exercise you want.">By exercise type</CardTitle>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip key={t} to={`/practice/session?skill=mixed&type=${t}`}>
              {TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </Card>
    </div>
  )
}

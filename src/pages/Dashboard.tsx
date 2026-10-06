import { ArrowRight, BookOpen, CalendarCheck, Flame, Repeat, Sparkles, Target } from 'lucide-react'
import { Link } from 'react-router'
import { AudioButton } from '../components/audio/AudioButton'
import { NounImage } from '../components/media/NounImage'
import { ButtonLink } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { Fi } from '../components/ui/FiText'
import { ProgressBar } from '../components/ui/ProgressBar'
import { LESSONS, LEVELS } from '../data/curriculum'
import { useNow } from '../hooks/useNow'
import { grammar } from '../services/grammar'
import { pickLabel, pickText } from '../services/content/text'
import { recommendedLesson } from '../services/learning/curriculum'
import { categoryMastery, overallMastery, tier, TIER_LABEL, weakAreas } from '../services/learning/mastery'
import { dueItems } from '../services/learning/srs'
import { dayKey, liveStreak } from '../services/learning/xp'
import { useProgress } from '../stores/progress'
import { useSettings } from '../stores/settings'

const LABS = [
  { to: '/cases', title: 'Cases', sub: 'All 15 cases and the place-case map' },
  { to: '/noun-types/i-words', title: '-i Noun Lab', sub: 'pankki, lehti, kieli, uusi side by side' },
  { to: '/gradation', title: 'Consonant gradation', sub: 'kauppa → kaupan, and why' },
  { to: '/stem-lab', title: 'Stem Lab', sub: 'Build any form step by step' },
]

/** A word of the day from the core vocabulary, the same for everyone on a given date. */
function wordOfTheDay(day: string) {
  const core = grammar.lexicon.filter((l) => l.frequency === 'core' && l.pos === 'noun')
  const n = [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  return core[n % core.length]!
}

export default function Dashboard() {
  const mode = useSettings((s) => s.mode)
  const dailyGoal = useSettings((s) => s.dailyGoal)
  const p = useProgress()
  const now = useNow()
  const today = dayKey(new Date(now))
  const todayStat = p.daily[today] ?? { items: 0, correct: 0, xp: 0 }
  const next = recommendedLesson(p.lessons)
  const level = LEVELS.find((l) => l.id === (next?.level ?? 8))
  const done = LESSONS.filter((l) => p.lessons[l.id]?.status === 'done').length
  const overall = overallMastery(p.skills)
  const cats = categoryMastery(p.skills).filter((c) => c.attempts > 0)
  const weak = weakAreas(p.skills, 3)
  const due = dueItems(p.reviews, now).length
  const streak = liveStreak(p.streak, today)
  const word = wordOfTheDay(today)
  const recent = p.recentNouns.map((r) => grammar.get(r.id)).filter((n): n is NonNullable<typeof n> => !!n).slice(0, 8)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{mode === 'beginner' ? 'Welcome to Sija' : <Fi>Tervetuloa!</Fi>}</h1>
        <p className="mt-1 max-w-[72ch] text-muted">
          A lab for Finnish nouns: cases, stems, consonant gradation and the -i words — always with the reason behind each form.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-3 lg:col-span-2">
          <CardTitle sub={level ? `Level ${level.id} of 8: ${pickLabel(level.title, mode)} · ${done} of ${LESSONS.length} lessons done` : undefined}>
            <span className="flex items-center gap-2">
              <BookOpen aria-hidden className="size-5 text-primary" /> {done === 0 ? 'Start learning' : 'Continue learning'}
            </span>
          </CardTitle>
          {next ? (
            <>
              <p className="text-lg font-semibold">
                <span className="text-muted tabular-nums">{next.id}</span> {pickLabel(next.title, mode)}
              </p>
              <p className="text-muted" lang={pickText(next.goal, mode).lang}>
                {pickText(next.goal, mode).main}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <ButtonLink to={`/learn/${next.id}`} variant="primary" size="lg">
                  {p.lessons[next.id] ? 'Continue lesson' : 'Start lesson'}
                  <ArrowRight aria-hidden className="size-5" />
                </ButtonLink>
                <ButtonLink to="/learn" variant="ghost" size="lg">
                  All lessons
                </ButtonLink>
              </div>
            </>
          ) : (
            <p>Every lesson is complete. Keep your forms fresh with daily practice.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>
            <span className="flex items-center gap-2">
              <CalendarCheck aria-hidden className="size-5 text-primary" /> Today
            </span>
          </CardTitle>
          <ProgressBar
            value={Math.min(1, todayStat.items / dailyGoal)}
            label={`${todayStat.items} / ${dailyGoal} exercises`}
            showValue={false}
            tone={todayStat.items >= dailyGoal ? 'success' : 'primary'}
          />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1">
              <Flame aria-hidden className={streak ? 'size-4 text-warning' : 'size-4 text-muted'} /> {streak}-day streak
            </span>
            <span className="inline-flex items-center gap-1">
              <Repeat aria-hidden className="size-4 text-muted" /> {due} due for review
            </span>
          </p>
          <ButtonLink to="/practice/session?skill=mixed&daily=1&count=15" variant={next ? 'secondary' : 'primary'} className="mt-auto">
            Daily practice
          </ButtonLink>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle sub={`${Math.round(overall * 100)}% overall · ${p.xp} XP`}>Mastery</CardTitle>
          {cats.length === 0 ? (
            <p className="text-muted">Your skills appear here as you practise. Each exercise trains several skills at once.</p>
          ) : (
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {cats.map((c) => (
                <li key={c.id}>
                  <ProgressBar value={c.value} label={`${c.label} · ${TIER_LABEL[tier(c.value, c.attempts)]}`} size="sm" />
                </li>
              ))}
            </ul>
          )}
          <Link to="/progress" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            All progress <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Card>

        <Card className="flex flex-col gap-2">
          <CardTitle>
            <span className="flex items-center gap-2">
              <Sparkles aria-hidden className="size-5 text-primary" /> Word of the day
            </span>
          </CardTitle>
          <div className="flex items-center gap-3">
            <NounImage noun={word} context="chip" size="sm" />
            <Fi className="text-2xl font-bold">{word.lemma}</Fi>
            <AudioButton text={word.lemma} size="sm" />
          </div>
          <p className="text-muted">{word.gloss.en}</p>
          <p className="text-[0.97rem]">
            <Fi>
              {[grammar.primary(word, 'sg.genitive'), grammar.primary(word, 'sg.partitive'), grammar.primary(word, 'pl.partitive')].filter(Boolean).join(' · ')}
            </Fi>
          </p>
          <Link to={`/reference/${encodeURIComponent(word.id)}`} className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            How it inflects <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Card>
      </div>

      {weak.length > 0 && (
        <Card>
          <CardTitle sub="Where a little practice helps most.">
            <span className="flex items-center gap-2">
              <Target aria-hidden className="size-5 text-warning" /> Weak areas
            </span>
          </CardTitle>
          <ul className="space-y-2">
            {weak.map((w) => (
              <li key={w.skill} className="flex flex-wrap items-center justify-between gap-2">
                <ProgressBar value={w.value} label={w.label} size="sm" tone="warning" className="max-w-sm flex-1" />
                <ButtonLink to={`/practice/session?skill=${encodeURIComponent(w.skill)}&count=10`} size="sm">
                  {w.suggestion}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="recent" className="space-y-2">
          <h2 id="recent" className="text-lg font-semibold">
            Recent words
          </h2>
          <ul className="flex flex-wrap gap-2">
            {recent.map((n) => (
              <li key={n.id}>
                <Link to={`/reference/${encodeURIComponent(n.id)}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 hover:bg-surface-2">
                  <Fi className="font-semibold">{n.lemma}</Fi>
                  <span className="text-xs text-muted">{grammar.primary(n, 'sg.genitive')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="explore" className="space-y-3">
        <h2 id="explore" className="text-lg font-semibold">
          Explore
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {LABS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="group flex h-full flex-col gap-1 rounded-2xl border border-border bg-surface p-4 shadow-card hover:border-primary/60">
                <span className="flex items-center justify-between font-semibold">
                  {l.title} <ArrowRight aria-hidden className="size-4 text-muted group-hover:text-primary" />
                </span>
                <span className="text-sm text-muted">{l.sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

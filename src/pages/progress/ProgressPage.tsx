import { Award, Download, Lock, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { ActivityChart } from '../../components/progress/ActivityChart'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { LESSONS } from '../../data/curriculum'
import { useNow } from '../../hooks/useNow'
import { ACHIEVEMENTS } from '../../services/learning/achievements'
import { categoryMastery, overallMastery, tier, TIER_LABEL, weakAreas } from '../../services/learning/mastery'
import { dayKey, liveStreak } from '../../services/learning/xp'
import { exportProgress, parseBackup } from '../../services/storage/backup'
import { useProgress, type ProgressData } from '../../stores/progress'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'

function snapshot(s: ProgressData): ProgressData {
  const { schemaVersion, xp, streak, lessons, skills, achievements, recentNouns, daily, reviews, sessions, perfectSessions, totalAttempts } = s
  return { schemaVersion, xp, streak, lessons, skills, achievements, recentNouns, daily, reviews, sessions, perfectSessions, totalAttempts }
}

function DataControls() {
  const importData = useProgress((s) => s.importData)
  const reset = useProgress((s) => s.reset)
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const download = () => {
    const blob = new Blob([exportProgress(snapshot(useProgress.getState()))], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sija-progress-${dayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ tone: 'ok', text: 'Backup downloaded.' })
  }
  const onFile = async (file: File) => {
    try {
      importData(parseBackup(await file.text()))
      setMessage({ tone: 'ok', text: 'Progress restored from the backup.' })
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not read the file.' })
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Your progress is stored only in this browser. Export a backup to move it to another device.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={download} icon={<Download aria-hidden className="size-4" />}>
          Export backup
        </Button>
        <Button onClick={() => fileRef.current?.click()} icon={<Upload aria-hidden className="size-4" />}>
          Import backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Choose a backup file"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
            e.target.value = ''
          }}
        />
        {!confirmReset ? (
          <Button variant="ghost" onClick={() => setConfirmReset(true)} icon={<RotateCcw aria-hidden className="size-4" />}>
            Reset progress
          </Button>
        ) : (
          <span className="flex flex-wrap items-center gap-2 rounded-xl bg-error-soft px-3 py-1.5 text-sm">
            Delete all progress on this device?
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                reset()
                setConfirmReset(false)
                setMessage({ tone: 'ok', text: 'Progress reset.' })
              }}
            >
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </span>
        )}
      </div>
      {message && (
        <p role="status" className={cx('text-sm font-semibold', message.tone === 'ok' ? 'text-success' : 'text-error')}>
          {message.text}
        </p>
      )}
    </div>
  )
}

export default function ProgressPage() {
  const p = useProgress()
  const dailyGoal = useSettings((s) => s.dailyGoal)
  const now = useNow()
  const cats = categoryMastery(p.skills)
  const weak = weakAreas(p.skills, 5)
  const lessonsDone = LESSONS.filter((l) => p.lessons[l.id]?.status === 'done').length
  const accuracy = (() => {
    const all = Object.values(p.daily)
    const items = all.reduce((s, d) => s + d.items, 0)
    return items ? all.reduce((s, d) => s + d.correct, 0) / items : 0
  })()
  const stats = [
    { label: 'Experience', value: `${p.xp} XP` },
    { label: 'Streak', value: `${liveStreak(p.streak, dayKey(new Date(now)))} days (best ${p.streak.best})` },
    { label: 'Lessons', value: `${lessonsDone} / ${LESSONS.length}` },
    { label: 'Exercises', value: `${p.totalAttempts} · ${Math.round(accuracy * 100)}% right` },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Progress" fi="Edistyminen" why="Mastery grows with accurate, recent practice. Weak areas show where a few minutes help most." />

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">{s.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{s.value}</p>
          </li>
        ))}
      </ul>

      <Card>
        <CardTitle sub={`Overall ${Math.round(overallMastery(p.skills) * 100)}% — tiers: Learning, Familiar, Confident, Mastered.`}>Mastery by category</CardTitle>
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <li key={c.id}>
              <ProgressBar value={c.value} label={`${c.label} · ${TIER_LABEL[tier(c.value, c.attempts)]}`} size="sm" showValue={c.attempts > 0} />
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle sub="Last 14 days. Solid: correct answers.">Activity</CardTitle>
          <ActivityChart daily={p.daily} goal={dailyGoal} now={now} />
        </Card>
        <Card>
          <CardTitle sub="At least five attempts, lowest mastery first.">Weak areas</CardTitle>
          {weak.length === 0 ? (
            <p className="text-muted">Nothing stands out yet. Keep practising and this list will guide you.</p>
          ) : (
            <ul className="space-y-2">
              {weak.map((w) => (
                <li key={w.skill} className="flex flex-wrap items-center justify-between gap-2">
                  <ProgressBar value={w.value} label={w.label} size="sm" tone="warning" className="max-w-xs flex-1" />
                  <ButtonLink to={`/practice/session?skill=${encodeURIComponent(w.skill)}&count=10`} size="sm">
                    Practise
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle sub={`${Object.keys(p.achievements).length} of ${ACHIEVEMENTS.length}`}>Achievements</CardTitle>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const at = p.achievements[a.id]
            return (
              <li key={a.id} className={cx('flex items-start gap-3 rounded-xl border p-3', at ? 'border-warning/40 bg-warning-soft/50' : 'border-border opacity-70')}>
                {at ? <Award aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" /> : <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />}
                <span>
                  <span className="block font-semibold">{a.title}</span>
                  <span className="block text-sm text-muted">{a.description}</span>
                  {at && <span className="block text-xs text-muted">{new Date(at).toLocaleDateString()}</span>}
                  <span className="sr-only">{at ? 'Unlocked' : 'Locked'}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle>Your data</CardTitle>
        <DataControls />
      </Card>
    </div>
  )
}

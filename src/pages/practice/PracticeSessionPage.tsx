import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ExerciseRunner } from '../../components/exercises/ExerciseRunner'
import { PageHeader } from '../../components/ui/PageHeader'
import { ALL_SLOTS, type SlotKey } from '../../grammar'
import { audioService } from '../../services/audio/AudioService'
import { buildSession, type SessionSpec } from '../../services/exercises/session'
import { skillLabel } from '../../services/exercises/skills'
import { dueItems } from '../../services/learning/srs'
import { useProgress } from '../../stores/progress'
import { useSettings } from '../../stores/settings'
import type { ExerciseType, SkillId } from '../../types/exercise'
import { TYPE_LABEL } from '../../services/exercises/labels'
import { randomSeed } from '../../utils/random'


export default function PracticeSessionPage() {
  const [params] = useSearchParams()
  const mode = useSettings((s) => s.mode)
  const skill = (params.get('skill') ?? 'mixed') as SkillId | 'mixed'
  const type = params.get('type') as ExerciseType | null
  const review = params.get('review') === '1'
  const count = Math.min(30, Math.max(3, Number(params.get('count') ?? (review ? 15 : 12)) || 12))
  const words = params.get('words')?.split(',').filter(Boolean)
  const slots = params.get('slots')?.split(',').filter((s): s is SlotKey => ALL_SLOTS.includes(s as SlotKey))
  const tags = params.get('tags')?.split(',').filter(Boolean)

  const make = () => {
    const now = Date.now()
    const due = dueItems(useProgress.getState().reviews, now).map((r) => ({ target: r.target, kind: r.kind }))
    const spec: SessionSpec = {
      skill,
      count,
      seed: randomSeed(),
      mode,
      audio: audioService.getState().voices.length > 0,
      ...(type ? { types: [type] } : {}),
      ...(words?.length ? { words } : {}),
      ...(slots?.length ? { slots } : {}),
      ...(tags?.length ? { tags } : {}),
      ...(review || params.get('daily') === '1' ? { due: review ? due : due.slice(0, Math.ceil(count / 2)) } : {}),
    }
    return buildSession(spec)
  }
  const [round, setRound] = useState(0)
  const [exercises, setExercises] = useState(make)
  const title = review ? 'Review' : type ? TYPE_LABEL[type] : skill === 'mixed' ? 'Mixed practice' : skillLabel(skill)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={title.charAt(0).toUpperCase() + title.slice(1)} fi="Harjoitus" />
      {exercises.length === 0 ? (
        <p className="text-muted">
          {review ? 'Nothing is due for review right now.' : 'No exercises could be made for this selection.'}{' '}
          <Link to="/practice" className="font-semibold text-primary hover:underline">
            Back to practice
          </Link>
        </p>
      ) : (
        <ExerciseRunner
          key={round}
          exercises={exercises}
          onRestart={() => {
            setExercises(make())
            setRound((r) => r + 1)
          }}
        />
      )}
    </div>
  )
}

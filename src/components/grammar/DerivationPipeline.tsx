import { ArrowDown, ChevronRight, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { grammar } from '../../services/grammar'
import { buildStages, type Stage } from '../../services/content/pipeline'
import { sentencesFor } from '../../services/content/sentences'
import { patternLabel, pickLabel, slotLabel, stepText, typeName } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import type { GradationId, PersonId, SlotKey } from '../../grammar/types'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { NounImage } from '../media/NounImage'
import { Button } from '../ui/Button'
import { Fi } from '../ui/FiText'
import { StatusLabel } from '../ui/StatusLabel'
import { MorphologyBreakdown } from './MorphologyBreakdown'
import { SentenceLine } from './SentenceLine'

function StageBody({ stage, lexemeId }: { stage: Stage; lexemeId: string }) {
  const mode = useSettings((s) => s.mode)
  const noun = grammar.require(lexemeId)
  if (stage.id === 'base') {
    return (
      <div className="flex items-center gap-3">
        <NounImage noun={noun} context="chip" size="sm" />
        <Fi className="text-2xl font-semibold">{noun.lemma}</Fi>
        <AudioButton text={noun.lemma} size="sm" />
        <span className="text-sm text-muted">{noun.gloss.en}</span>
      </div>
    )
  }
  const visible = stage.steps
  return (
    <div className="space-y-2">
      {stage.id === 'type' && (
        <p className="font-semibold">
          {typeName(noun.typeId, { kotus: mode !== 'beginner' })}
        </p>
      )}
      {stage.id !== 'type' && stage.steps.some((s) => s.before !== s.after) && (
        <p className="fi-form text-xl font-semibold">
          <Fi>{stage.result}</Fi>
        </p>
      )}
      <ul className="space-y-1.5">
        {visible.map((s, i) => {
          const t = stepText(s, mode)
          const change = s.kind === 'gradation' && s.params?.from !== undefined && s.params.to !== undefined && s.params.from !== s.params.to
          return (
            <li key={i} className="flex flex-wrap items-start gap-x-2 gap-y-1 text-[0.95rem]">
              <StatusLabel label={s.label} className="mt-0.5" />
              {change && s.params?.pattern && (
                <Fi className="seg seg-grade text-sm font-bold">{patternLabel(s.params.pattern as GradationId)}</Fi>
              )}
              <span className="min-w-0 flex-1">
                <span lang={t.lang}>{t.main}</span>
                {t.gloss && <span className="block text-xs text-muted">{t.gloss}</span>}
              </span>
            </li>
          )
        })}
        {stage.steps.length === 0 && stage.id === 'change' && (
          <li className="text-sm text-muted">No change — this form uses the stem as it is.</li>
        )}
      </ul>
    </div>
  )
}

/**
 * The central teaching view: BASE WORD → TYPE → STEM → STEM CHANGE →
 * NUMBER & CASE → FINAL FORM → REAL SENTENCE. `stepMode` reveals one
 * stage at a time (used by the Word Builder).
 */
export function DerivationPipeline({
  lexemeId,
  slot,
  person,
  variantText,
  stepMode = false,
  showSentence = true,
  className,
}: {
  lexemeId: string
  slot: SlotKey
  person?: PersonId
  variantText?: string
  stepMode?: boolean
  showSentence?: boolean
  className?: string
}) {
  const mode = useSettings((s) => s.mode)
  const noun = grammar.require(lexemeId)
  const form = person ? grammar.withPossessive(noun, slot, person) : grammar.inflect(noun, slot)
  const variant = form.variants.find((v) => v.text === variantText) ?? form.variants[0]
  const stages = variant ? buildStages(variant).filter((s) => s.id !== 'form') : []
  const sentence = showSentence && !person ? sentencesFor(lexemeId, slot)[0] : undefined
  const total = stages.length + 1 + (sentence ? 1 : 0)
  const [shown, setShown] = useState(stepMode ? 1 : total)
  const visibleCount = stepMode ? shown : total

  if (form.status === 'not-used' || !variant) {
    return <p className="text-muted">This form is not used.</p>
  }
  const others = form.variants.filter((v) => v.text !== variant.text)

  const items: { key: string; title: string; label?: Stage['label']; body: ReactNode }[] = [
    ...stages.map((st) => ({
      key: st.id,
      title: pickLabel(st.title, mode),
      label: st.label,
      body: <StageBody stage={st} lexemeId={lexemeId} />,
    })),
    {
      key: 'form',
      title: pickLabel({ en: 'Final form', fi: 'Valmis muoto' }, mode),
      body: (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <MorphologyBreakdown variant={variant} size="lg" />
            <AudioButton text={variant.text} />
          </div>
          <p className="text-sm text-muted">
            <Fi>{noun.lemma}</Fi> → <Fi className="font-semibold text-text">{variant.text}</Fi> · {slotLabel(slot, mode)}
          </p>
          {others.length > 0 && (
            <p className="text-sm">
              <span className="text-muted">Also correct: </span>
              {others.map((o, i) => (
                <Fi key={o.text} className="font-semibold">
                  {i > 0 && ', '}
                  {o.text}
                  {o.register === 'rare' && <span className="font-normal text-muted"> (rare)</span>}
                </Fi>
              ))}
            </p>
          )}
        </div>
      ),
    },
    ...(sentence
      ? [
          {
            key: 'sentence',
            title: pickLabel({ en: 'In a sentence', fi: 'Lauseessa' }, mode),
            body: <SentenceLine view={sentence} translation={sentence.sentence.en} />,
          },
        ]
      : []),
  ]

  return (
    <div className={className}>
      <ol className="relative space-y-1" aria-label="How the form is built">
        {items.slice(0, visibleCount).map((item, i) => (
          <li key={item.key} className="animate-rise-in">
            <div className={cx('rounded-xl border border-border bg-surface p-3 sm:p-4', item.key === 'form' && 'border-primary/40 bg-primary-soft/40')}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold tracking-wider text-muted uppercase">
                  {i + 1}. {item.title}
                </h3>
                {item.label && item.label !== 'rule' && <StatusLabel label={item.label} />}
              </div>
              {item.body}
            </div>
            {i < visibleCount - 1 && (
              <div className="flex justify-center py-0.5" aria-hidden>
                <ArrowDown className="size-4 text-muted" />
              </div>
            )}
          </li>
        ))}
      </ol>
      {stepMode && (
        <div className="mt-3 flex flex-wrap gap-2">
          {shown < total ? (
            <>
              <Button variant="primary" onClick={() => setShown((n) => n + 1)} icon={<ChevronRight aria-hidden className="size-4" />}>
                Next step
              </Button>
              <Button variant="ghost" onClick={() => setShown(total)}>
                Show all
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setShown(1)} icon={<RotateCcw aria-hidden className="size-4" />}>
              Start again
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

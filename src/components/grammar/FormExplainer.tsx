import { ArrowRight, ChevronRight, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CASES_INFO } from '../../data/cases'
import type { PersonId, SlotKey } from '../../grammar/types'
import { pickText, slotLabel } from '../../services/content/text'
import { grammar } from '../../services/grammar'
import {
  compareForms,
  explainForm,
  generalRules,
  samePattern,
  usageFor,
  type ExplainedStep,
  type FormExplanation,
  type FormulaPart,
} from '../../services/explain'
import { useExplain } from '../../stores/explain'
import { useSettings, type LearnerMode } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Disclosure } from '../ui/Disclosure'
import { Fi } from '../ui/FiText'
import { StatusLabel } from '../ui/StatusLabel'
import { MorphologyBreakdown } from './MorphologyBreakdown'
import { RichText } from './RichText'
import { SentenceLine } from './SentenceLine'

/** Finnish grammar term for each kind of step, shown next to the title outside beginner mode. */
const STEP_FI: Partial<Record<ExplainedStep['kind'], string>> = {
  lemma: 'perusmuoto',
  type: 'taivutustyyppi',
  stem: 'vartalo',
  gradation: 'astevaihtelu',
  plural: 'monikkovartalo',
  ending: 'sijapääte',
  harmony: 'vokaalisointu',
  possessive: 'omistusliite',
  override: 'poikkeus',
}

const PART_CLASS: Record<FormulaPart['role'], string> = {
  stem: 'seg-root',
  ending: 'seg-ending',
  plural: 'seg-plural',
  possessive: 'seg-possessive',
  whole: 'seg-exception',
}

function Header({ exp, mode }: { exp: FormExplanation; mode: LearnerMode }) {
  return (
    <div className="space-y-2">
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs font-bold tracking-wide text-muted uppercase">Base word</dt>
          <dd className="flex flex-wrap items-center gap-x-2">
            <Fi className="text-xl font-semibold">{exp.lemma}</Fi>
            <AudioButton text={exp.lemma} size="sm" slow={false} />
            <span className="text-muted">"{exp.gloss}"</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-bold tracking-wide text-muted uppercase">Form</dt>
          <dd className="flex flex-wrap items-center gap-x-2">
            <Fi className="text-xl font-semibold text-primary-strong">{exp.form}</Fi>
            <AudioButton text={exp.form} size="sm" slow={false} />
            <span>{exp.formLabel}</span>
            {mode !== 'beginner' && (
              <Fi className="text-sm text-muted">({exp.formLabelFi})</Fi>
            )}
          </dd>
        </div>
      </dl>
      {exp.rough && (
        <p className="text-sm">
          <span className="text-muted">Roughly: </span>"{exp.rough}"
          <span className="text-muted"> — the exact meaning depends on the sentence.</span>
        </p>
      )}
      {(exp.register !== 'standard' || exp.status === 'rare' || exp.coverage === 'recorded') && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          {exp.register === 'variant' && <Badge>also correct (variant)</Badge>}
          {exp.register === 'rare' && <Badge tone="warning">rare form</Badge>}
          {exp.status === 'rare' && <Badge tone="warning">rarely used in the plural</Badge>}
          {exp.coverage === 'recorded' && <Badge tone="warning">memorized form</Badge>}
          {exp.statusNote && <span className="text-muted">{exp.statusNote}</span>}
        </p>
      )}
    </div>
  )
}

function Chain({ exp }: { exp: FormExplanation }) {
  return (
    <ol className="flex flex-wrap items-start gap-x-1.5 gap-y-2" aria-label="From the base word to the form">
      {exp.chain.map((n, i) => (
        <li key={i} className="flex items-start gap-1.5">
          {i > 0 && <ArrowRight aria-hidden className="mt-1.5 size-4 shrink-0 text-muted" />}
          <span className="flex flex-col">
            <Fi className={cx('text-lg font-semibold leading-tight', i === exp.chain.length - 1 && 'text-primary-strong')}>{n.text}</Fi>
            <span className="text-xs text-muted">{n.label}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function Formula({ exp }: { exp: FormExplanation }) {
  const { parts, result, note } = exp.formula
  return (
    <div>
      <p className="flex flex-wrap items-start gap-x-1.5 gap-y-1" aria-label={`${parts.map((p) => p.text).join(' + ')} = ${result}`}>
        {parts.map((p, i) => (
          <span key={i} className="flex items-start gap-1.5">
            {i > 0 && (
              <span aria-hidden className="pt-1 text-lg text-muted">
                +
              </span>
            )}
            <span className={cx('seg', PART_CLASS[p.role])}>
              <Fi className="seg-text text-lg font-semibold">{p.text}</Fi>
              <span className="seg-label">{p.label}</span>
            </span>
          </span>
        ))}
        {!(parts.length === 1 && parts[0]?.text === result) && (
          <>
            <span aria-hidden className="pt-1 text-lg text-muted">
              =
            </span>
            <Fi className="pt-0.5 text-xl font-bold text-primary-strong">{result}</Fi>
          </>
        )}
      </p>
      {note && <p className="mt-1 text-sm text-muted">({note})</p>}
    </div>
  )
}

function Step({ step, index, mode }: { step: ExplainedStep; index: number; mode: LearnerMode }) {
  const fiTerm = mode !== 'beginner' ? STEP_FI[step.kind] : undefined
  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-bold">
          {index + 1}. {step.title}
          {fiTerm && <Fi className="font-normal text-muted"> · {fiTerm}</Fi>}
        </h4>
        {step.label !== 'rule' && <StatusLabel label={step.label} />}
      </div>
      <p className="text-[0.97rem] leading-relaxed">
        <RichText text={step.text} />
      </p>
      {step.terms.length > 0 && (
        <dl className="mt-2 space-y-0.5 text-sm text-muted">
          {step.terms.map((t) => (
            <div key={t.id}>
              <dt className="inline font-semibold text-text">
                {t.term} <Fi className="text-xs font-normal text-muted">({t.fi})</Fi>:
              </dt>{' '}
              <dd className="inline">{t.definition}</dd>
            </div>
          ))}
        </dl>
      )}
      {step.detail &&
        (mode === 'advanced' ? (
          <p className="mt-2 text-sm text-muted">{step.detail}</p>
        ) : (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-semibold text-primary">More detail</summary>
            <p className="mt-1 text-muted">{step.detail}</p>
          </details>
        ))}
    </li>
  )
}

function Steps({ exp, mode, stepMode }: { exp: FormExplanation; mode: LearnerMode; stepMode: boolean }) {
  const total = exp.steps.length
  const [shown, setShown] = useState(stepMode ? 1 : total)
  const visible = stepMode ? exp.steps.slice(0, shown) : exp.steps
  return (
    <div>
      <ol className="space-y-2" aria-label="How the form is built">
        {visible.map((s, i) => (
          <Step key={s.key} step={s} index={i} mode={mode} />
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

function Usage({ exp, sentenceId, mode }: { exp: FormExplanation; sentenceId?: string; mode: LearnerMode }) {
  const usage = useMemo(() => usageFor(exp, sentenceId ? { sentenceId } : {}), [exp, sentenceId])
  const info = CASES_INFO[exp.caseId]
  const general = pickText(info.meaning, mode)
  return (
    <section aria-label={`Why the ${info.en} here`} className="space-y-2">
      <h3 className="font-semibold">
        Why the {info.en} here?
      </h3>
      {usage ? (
        <>
          <div className="rounded-xl bg-surface-2 p-3">
            <SentenceLine view={usage.view} translation={usage.view.sentence.en} showTranslation sentenceId={usage.sentenceId} />
          </div>
          {usage.annotated ? (
            <div className="space-y-1.5">
              {usage.title && <p className="text-xs font-bold tracking-wide text-muted uppercase">{usage.title}</p>}
              {usage.why.map((w, i) => (
                <p key={i} className="leading-relaxed">
                  <RichText text={w} />
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              This sentence does not have a note for <Fi className="font-semibold text-text">{exp.form}</Fi> yet.
            </p>
          )}
          {usage.compare && (
            <div className="rounded-xl border border-border p-3">
              <p className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">Compare</p>
              <SentenceLine view={usage.compare.view} translation={usage.compare.view.sentence.en} showTranslation sentenceId={usage.compare.view.sentence.id} />
              <p className="mt-2 text-sm leading-relaxed">
                <RichText text={usage.compare.note} />
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">
          There is no example sentence with <Fi className="font-semibold text-text">{exp.form}</Fi> in the app yet.
        </p>
      )}
      {(!usage || !usage.annotated) && (
        <p className="rounded-xl border border-dashed border-border p-3 text-sm">
          <span className="font-semibold">General meaning of the {info.en}: </span>
          <span lang={general.lang}>{general.main}</span>
        </p>
      )}
    </section>
  )
}

function Related({ exp }: { exp: FormExplanation }) {
  const open = useExplain((s) => s.open)
  const forms = useMemo(() => compareForms(exp), [exp])
  if (forms.length === 0) return null
  return (
    <section aria-label="Related forms of this word" className="space-y-1.5">
      <h3 className="font-semibold">
        Other forms of <Fi>{exp.lemma}</Fi>
      </h3>
      <ul className="space-y-1 text-sm">
        {forms.map((f) => (
          <li key={f.slot} className="flex flex-wrap items-baseline gap-x-2">
            <button
              type="button"
              onClick={() => open({ lexemeId: exp.lexemeId, slot: f.slot, ...(f.person ? { person: f.person } : {}) })}
              className="rounded-md px-1 font-semibold text-primary-strong hover:bg-surface-2"
              aria-label={`${f.form} — explain this form`}
            >
              <Fi>{f.form}</Fi>
            </button>
            <span>{f.label}</span>
            <span className="text-muted">— {f.note}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function General({ exp }: { exp: FormExplanation }) {
  const open = useExplain((s) => s.open)
  const rules = useMemo(() => generalRules(exp), [exp])
  const examples = useMemo(() => samePattern(exp), [exp])
  if (rules.length === 0 && examples.length === 0) return null
  return (
    <Disclosure summary={<span>General rule <span className="font-normal text-muted">— the pattern behind this form, for other words too</span></span>}>
      <ul className="list-disc space-y-1 pl-5 text-[0.95rem]">
        {rules.map((r) => (
          <li key={r.ruleId}>{r.text}</li>
        ))}
      </ul>
      {examples.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold">Other words built exactly the same way:</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {examples.map((e) => (
              <li key={e.lexemeId} className="text-[0.95rem]">
                <Fi>{e.lemma}</Fi> <span className="text-muted">→</span>{' '}
                <button
                  type="button"
                  onClick={() => open({ lexemeId: e.lexemeId, slot: exp.slot, ...(exp.person ? { person: exp.person } : {}) })}
                  className="rounded-md px-1 font-semibold text-primary-strong hover:bg-surface-2"
                  aria-label={`${e.form} (${e.lemma}, "${e.gloss}") — explain this form`}
                >
                  <Fi>{e.form}</Fi>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Disclosure>
  )
}

/**
 * "Explain this form": a word-specific explanation of one noun form, built
 * from the engine's derivation of that form. Simple explanation first, the
 * full step-by-step underneath, then why the case is used in a real sentence,
 * related forms and — separately — the general rule.
 */
export function FormExplainer({
  lexemeId,
  slot,
  person,
  variantText,
  sentenceId,
  stepMode = false,
  stepsOpen = true,
  showSentence = true,
  showGeneral = true,
  showHeader = true,
  showBreakdown = true,
  className,
}: {
  lexemeId: string
  slot: SlotKey
  person?: PersonId
  variantText?: string
  /** The sentence the learner tapped the form in: "why this case here" uses it. */
  sentenceId?: string
  /** Reveal the steps one at a time (Word Builder). */
  stepMode?: boolean
  stepsOpen?: boolean
  showSentence?: boolean
  showGeneral?: boolean
  showHeader?: boolean
  /** Hide the coloured pieces when the page already shows them (Word Builder). */
  showBreakdown?: boolean
  className?: string
}) {
  const mode = useSettings((s) => s.mode)
  const exp = explainForm(lexemeId, slot, { ...(person ? { person } : {}), ...(variantText ? { variantText } : {}) })
  if (!exp) {
    const lex = grammar.get(lexemeId)
    return variantText && lex ? (
      <p className="text-muted">
        <Fi className="font-semibold text-text">{variantText}</Fi> is not a form of <Fi>{lex.lemma}</Fi> ({slotLabel(slot, mode)}), so there is nothing to explain.
      </p>
    ) : (
      <p className="text-muted">This form is not used.</p>
    )
  }
  const others = exp.alternatives.filter((a) => a.register !== 'rare')
  const rare = exp.alternatives.filter((a) => a.register === 'rare')

  return (
    <div className={cx('space-y-4', className)}>
      {showHeader && <Header exp={exp} mode={mode} />}

      <div className="space-y-3 rounded-xl border border-primary/30 bg-primary-soft/30 p-3 sm:p-4">
        {showBreakdown && <MorphologyBreakdown key={`${exp.key}:pieces`} explanation={exp} size="fit" />}
        <Chain exp={exp} />
        <Formula exp={exp} />
      </div>

      <section aria-label="Simple explanation" className="space-y-1.5">
        <h3 className="font-semibold">In short</h3>
        {exp.summary.map((s, i) => (
          <p key={i} className="leading-relaxed">
            <RichText text={s} />
          </p>
        ))}
        {(others.length > 0 || rare.length > 0) && (
          <p className="text-sm">
            {others.length > 0 && (
              <>
                <span className="text-muted">Also correct: </span>
                <Fi className="font-semibold">{others.map((o) => o.text).join(', ')}</Fi>
              </>
            )}
            {rare.length > 0 && (
              <>
                <span className="text-muted">{others.length > 0 ? ' · ' : ''}Rare: </span>
                <Fi>{rare.map((o) => o.text).join(', ')}</Fi>
              </>
            )}
          </p>
        )}
      </section>

      {exp.steps.length > 0 &&
        (stepMode ? (
          <section aria-label="Step by step" className="space-y-2">
            <h3 className="font-semibold">Step by step</h3>
            <Steps key={`${exp.key}:steps`} exp={exp} mode={mode} stepMode />
          </section>
        ) : (
          <Disclosure key={`${exp.key}:steps`} defaultOpen={stepsOpen} summary="Show me step by step">
            <Steps exp={exp} mode={mode} stepMode={false} />
          </Disclosure>
        ))}

      {showSentence && <Usage key={`${exp.key}:${sentenceId ?? ''}`} exp={exp} mode={mode} {...(sentenceId ? { sentenceId } : {})} />}

      <Related exp={exp} />

      {showGeneral && <General key={`${exp.key}:general`} exp={exp} />}
    </div>
  )
}

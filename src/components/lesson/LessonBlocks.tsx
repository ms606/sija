import { Lightbulb } from 'lucide-react'
import { CaseCard } from '../grammar/CaseCard'
import { CompareTable } from '../grammar/CompareTable'
import { DeclensionTable } from '../grammar/DeclensionTable'
import { DerivationPipeline } from '../grammar/DerivationPipeline'
import { EndingExplainer } from '../grammar/EndingExplainer'
import { FormLine } from '../grammar/FormLine'
import { GradationVisualizer } from '../grammar/GradationVisualizer'
import { GradeMap } from '../grammar/GradeMap'
import { ITypeComparison } from '../grammar/ITypeComparison'
import { MinimalPairs } from '../grammar/MinimalPairs'
import { PluralStemExplainer } from '../grammar/PluralStemExplainer'
import { SentenceLine } from '../grammar/SentenceLine'
import { SpatialCaseDiagram } from '../grammar/SpatialCaseDiagram'
import { VowelHarmonyMeter } from '../grammar/VowelHarmonyMeter'
import { Card } from '../ui/Card'
import { Fi } from '../ui/FiText'
import { StatusLabel } from '../ui/StatusLabel'
import { GLOSSARY } from '../../data/glossary'
import { PERSONS } from '../../grammar'
import { grammar } from '../../services/grammar'
import { PERSON_LABEL, pickLabel, pickText, slotLabel } from '../../services/content/text'
import { renderSentenceById } from '../../services/content/sentences'
import { useSettings } from '../../stores/settings'
import type { LessonBlock } from '../../types/curriculum'
import { cx } from '../../utils/cx'

function BlockTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">{children}</h3>
}

/** Renders one lesson block. Every form shown comes from the grammar engine. */
export function LessonBlockView({ block }: { block: LessonBlock }) {
  const mode = useSettings((s) => s.mode)
  switch (block.kind) {
    case 'text': {
      const r = pickText(block.body, mode)
      return (
        <div className="max-w-[72ch] text-[1.02rem] leading-relaxed">
          {block.label && <StatusLabel label={block.label} className="mr-2 align-middle" />}
          <span lang={r.lang}>{r.main}</span>
          {r.gloss && <span className="mt-1 block text-sm text-muted">{r.gloss}</span>}
        </div>
      )
    }
    case 'key-idea': {
      const r = pickText(block.body, mode)
      return (
        <div className="flex gap-3 rounded-2xl border-l-4 border-primary bg-primary-soft/60 p-4">
          <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            {block.label && <StatusLabel label={block.label} className="mb-1" />}
            <p className="text-[1.02rem] leading-relaxed" lang={r.lang}>
              {r.main}
            </p>
            {r.gloss && <p className="mt-1 text-sm text-muted">{r.gloss}</p>}
          </div>
        </div>
      )
    }
    case 'pipeline':
      return (
        <Card>
          <BlockTitle>
            How <Fi className="normal-case">{grammar.primary(grammar.require(block.nounId), block.slot)}</Fi> is built
          </BlockTitle>
          <DerivationPipeline lexemeId={block.nounId} slot={block.slot} {...(block.person ? { person: block.person } : {})} />
        </Card>
      )
    case 'builder':
      return (
        <Card>
          <DerivationPipeline lexemeId={block.nounId} slot={block.slot} stepMode />
        </Card>
      )
    case 'paradigm':
      return (
        <Card>
          <BlockTitle>
            All forms of <Fi className="normal-case">{grammar.require(block.nounId).lemma}</Fi>
          </BlockTitle>
          <DeclensionTable lexeme={grammar.require(block.nounId)} {...(block.cases ? { cases: block.cases } : {})} />
        </Card>
      )
    case 'compare':
      return (
        <Card>
          {block.title && <BlockTitle>{pickLabel(block.title, mode)}</BlockTitle>}
          <CompareTable nounIds={block.nounIds} slots={block.slots} />
        </Card>
      )
    case 'case-cards':
      return (
        <ul className={cx('grid gap-3', block.caseIds.length > 1 && 'sm:grid-cols-2 xl:grid-cols-3')}>
          {block.caseIds.map((c) => (
            <li key={c}>
              <CaseCard caseId={c} />
            </li>
          ))}
        </ul>
      )
    case 'spatial':
      return <SpatialCaseDiagram {...(block.highlight ? { highlight: block.highlight } : {})} />
    case 'gradation': {
      const lex = block.nounId ? grammar.get(block.nounId) : undefined
      return (
        <Card className="flex justify-center">
          <GradationVisualizer pattern={block.pattern} {...(lex ? { strong: lex.lemma, weak: grammar.primary(lex, 'sg.genitive') ?? '' } : {})} />
        </Card>
      )
    }
    case 'grade-map':
      return (
        <Card>
          <BlockTitle>
            Strong and weak forms of <Fi className="normal-case">{grammar.require(block.nounId).lemma}</Fi>
          </BlockTitle>
          <GradeMap lexeme={grammar.require(block.nounId)} />
        </Card>
      )
    case 'harmony':
      return (
        <Card>
          <VowelHarmonyMeter {...(block.initial ? { initial: block.initial } : {})} />
        </Card>
      )
    case 'examples':
      return (
        <Card>
          <BlockTitle>{block.title ? pickLabel(block.title, mode) : 'Examples'}</BlockTitle>
          <ul className="space-y-3">
            {block.sentenceIds.map((id) => {
              const v = renderSentenceById(id)
              return v ? (
                <li key={id}>
                  <SentenceLine view={v} translation={v.sentence.en} />
                </li>
              ) : null
            })}
          </ul>
        </Card>
      )
    case 'minimal-pairs':
      return <MinimalPairs />
    case 'i-compare':
      return (
        <Card>
          <ITypeComparison />
        </Card>
      )
    case 'plural-stems':
      return (
        <Card>
          <PluralStemExplainer {...(block.words ? { words: block.words } : {})} />
        </Card>
      )
    case 'endings':
      return (
        <Card>
          {block.title && <BlockTitle>{pickLabel(block.title, mode)}</BlockTitle>}
          <EndingExplainer slot={block.slot} words={block.words} />
        </Card>
      )
    case 'possessives': {
      const lex = grammar.require(block.nounId)
      return (
        <Card>
          <BlockTitle>
            <Fi className="normal-case">{lex.lemma}</Fi> · {slotLabel(block.slot, mode)}
          </BlockTitle>
          <ul className="divide-y divide-border">
            {PERSONS.map((p) => (
              <li key={p} className="flex flex-wrap items-center gap-x-3 py-1.5">
                <span className="w-32 shrink-0 text-sm">
                  <Fi className="font-semibold">{PERSON_LABEL[p].fi}</Fi> <span className="block text-xs text-muted">{PERSON_LABEL[p].en}</span>
                </span>
                <FormLine lexeme={lex} slot={block.slot} person={p} />
              </li>
            ))}
          </ul>
        </Card>
      )
    }
    case 'forms':
      return (
        <Card>
          {block.title && <BlockTitle>{pickLabel(block.title, mode)}</BlockTitle>}
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {block.items.map((it, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2">
                <FormLine lexeme={grammar.require(it.nounId)} slot={it.slot} {...(it.person ? { person: it.person } : {})} showVariants={false} />
                {it.en && <span className="text-sm text-muted">{it.en}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )
    case 'glossary': {
      const entries = block.terms.map((term) => GLOSSARY.find((g) => g.fi.split(',').map((s) => s.trim()).includes(term))).filter((g): g is (typeof GLOSSARY)[number] => !!g)
      return (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <BlockTitle>Words for grammar</BlockTitle>
          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
            {entries.map((g) => (
              <div key={g.fi} className="contents">
                <dt className="font-semibold">
                  <Fi>{g.fi}</Fi>
                </dt>
                <dd className="text-muted max-sm:mb-1">
                  {g.en}
                  {g.note && <span className="text-sm"> — {g.note}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )
    }
    case 'quick-check':
      return null
  }
}

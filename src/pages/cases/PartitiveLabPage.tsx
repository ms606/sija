import { ArrowRight, Dumbbell, X } from 'lucide-react'
import { Link } from 'react-router'
import { EndingExplainer } from '../../components/grammar/EndingExplainer'
import { SentenceLine } from '../../components/grammar/SentenceLine'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { CASES_INFO } from '../../data/cases'
import { pickLabel, pickText } from '../../services/content/text'
import { renderSentenceById } from '../../services/content/sentences'
import { useSettings } from '../../stores/settings'

const SG_WORDS = ['talo', 'kauppa', 'pankki', 'lehti', 'päivä', 'maa', 'tie', 'työ', 'radio', 'kieli', 'uusi', 'nainen', 'vieras', 'lapsi', 'perhe', 'huone']
const PL_WORDS = ['talo', 'kauppa', 'koira', 'pankki', 'kieli', 'päivä', 'maa', 'perhe', 'nainen', 'vieras']

/** Whole (accusative) vs part (partitive): the same verb, different objects. */
const CONTRASTS: { label: string; ids: string[] }[] = [
  { label: 'Buying', ids: ['c.acc.1', 'c.par.13', 'c.par.14'] },
  { label: 'Reading', ids: ['c.acc.5', 'c.par.6'] },
]

function Sentences({ ids }: { ids: string[] }) {
  return (
    <ul className="space-y-3">
      {ids.map((id) => {
        const v = renderSentenceById(id)
        return v ? (
          <li key={id}>
            <SentenceLine view={v} translation={v.sentence.en} />
          </li>
        ) : null
      })}
    </ul>
  )
}

export default function PartitiveLabPage() {
  const mode = useSettings((s) => s.mode)
  const info = CASES_INFO.partitive
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/cases" className="font-semibold text-primary hover:underline">
          Cases
        </Link>
        <span className="text-muted"> / </span>
        <Link to="/cases/partitive" className="font-semibold text-primary hover:underline">
          partitive
        </Link>
        <span className="text-muted"> / lab</span>
      </nav>
      <PageHeader
        title="Partitive Lab"
        fi="Partitiivi"
        why="The partitive is the most frequent case after the nominative — and the one learners hesitate over most. It has two questions: how to build it (-a, -ta or -tta?) and when to use it (some, not, after numbers, not finished)."
        next={{ to: '/cases/genitive/lab', label: 'Genitive Lab' }}
      />

      <Card>
        <CardTitle sub="The ending depends on what the stem ends in. Tap a form to see the whole derivation.">Building the singular partitive</CardTitle>
        <EndingExplainer slot="sg.partitive" words={SG_WORDS} />
      </Card>

      <Card>
        <CardTitle sub="Plural stem + -a/-ä (the plural i is written j after a vowel) — or, in some word types, + -ta/-tä.">Building the plural partitive</CardTitle>
        <EndingExplainer slot="pl.partitive" words={PL_WORDS} />
      </Card>

      <section aria-labelledby="when" className="space-y-3">
        <h2 id="when" className="text-lg font-semibold">
          When to use the partitive
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {info.usages.map((u, i) => (
            <Card key={i} as="article">
              <h3 className="mb-2 font-semibold">{pickLabel(u.title, mode)}</h3>
              <Sentences ids={u.sentenceIds} />
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardTitle sub="The same verb takes a different object depending on whether the action covers the whole thing and is finished.">Whole or part?</CardTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {CONTRASTS.map((c) => (
            <div key={c.label} className="rounded-xl bg-surface-2 p-3">
              <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">{c.label}</p>
              <Sentences ids={c.ids} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          Whole and finished → the object takes <Fi>-n</Fi> (or <Fi>-t</Fi> in the plural). Some, not yet finished, or negated → partitive.{' '}
          <Link to="/cases/accusative" className="font-semibold text-primary hover:underline">
            More on the object (accusative)
          </Link>
        </p>
      </Card>

      <Card>
        <CardTitle>Common mistakes</CardTitle>
        <ul className="space-y-3">
          {info.mistakes.map((mk, i) => (
            <li key={i} className="rounded-xl border border-border p-3">
              <p className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-error">
                  <X aria-hidden className="size-4" />
                  <Fi className="line-through decoration-2">{mk.wrong}</Fi>
                </span>
                <ArrowRight aria-hidden className="size-4 text-muted" />
                <Fi className="font-semibold text-success">{mk.right}</Fi>
              </p>
              <p className="mt-1 text-sm text-muted">{pickText(mk.why, mode).main}</p>
            </li>
          ))}
        </ul>
      </Card>

      <ButtonLink to="/practice/session?skill=partitive" variant="primary" icon={<Dumbbell aria-hidden className="size-4" />}>
        Practise the partitive
      </ButtonLink>
    </div>
  )
}

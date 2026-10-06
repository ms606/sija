import { Dumbbell, Eye, EyeOff, Mic } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AudioButton } from '../../components/audio/AudioButton'
import { FormLine } from '../../components/grammar/FormLine'
import { SentenceLine } from '../../components/grammar/SentenceLine'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { getYkiDomain } from '../../data/yki'
import { grammar } from '../../services/grammar'
import { pickLabel, slotLabel } from '../../services/content/text'
import { allSentenceViews } from '../../services/content/sentences'
import { useSettings } from '../../stores/settings'
import NotFoundPage from '../NotFoundPage'

export default function YkiTaskPage() {
  const { taskId = '' } = useParams()
  const mode = useSettings((s) => s.mode)
  const [showModel, setShowModel] = useState(false)
  const [draft, setDraft] = useState('')
  const d = getYkiDomain(taskId)
  if (!d) return <NotFoundPage />
  const reading = allSentenceViews()
    .filter((v) => v.sentence.tags.includes('yki') && v.sentence.tags.some((t) => d.tags.includes(t)))
    .slice(0, 8)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/yki" className="font-semibold text-primary hover:underline">
          YKI practice
        </Link>
        <span className="text-muted"> / {pickLabel(d.title, mode)}</span>
      </nav>
      <PageHeader title={pickLabel(d.title, mode)} {...(mode === 'beginner' && d.title.fi ? { fi: d.title.fi } : {})} why={d.situation} />

      <Card>
        <CardTitle sub="Tap a form to see how it is built.">Key words</CardTitle>
        <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {d.words.map((id) => {
            const lex = grammar.require(id)
            return (
              <li key={id} className="flex flex-wrap items-center gap-x-2">
                <Fi className="w-28 shrink-0 font-semibold">{lex.lemma}</Fi>
                <span className="text-sm text-muted">{lex.gloss.en.split(/[;,]/)[0]}</span>
                <Fi className="text-sm">
                  {grammar.primary(lex, 'sg.genitive')}, {grammar.primary(lex, 'sg.partitive')}
                </Fi>
              </li>
            )
          })}
        </ul>
      </Card>

      {reading.length > 0 && (
        <Card>
          <CardTitle sub="Read and listen. Tap a highlighted word to see its form.">Reading</CardTitle>
          <ul className="space-y-3">
            {reading.map((v) => (
              <li key={v.sentence.id}>
                <SentenceLine view={v} translation={v.sentence.en} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-3">
        <CardTitle sub={d.writing.task.fi ? <Fi>{d.writing.task.fi}</Fi> : undefined}>Writing: {d.writing.task.en}</CardTitle>
        <label htmlFor="draft" className="sr-only">
          Your text
        </label>
        <textarea
          id="draft"
          lang="fi"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder="Kirjoita tähän…"
          className="w-full rounded-xl border border-border-strong bg-surface p-3 text-[1.02rem]"
        />
        <Button variant="secondary" onClick={() => setShowModel((v) => !v)} icon={showModel ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}>
          {showModel ? 'Hide the model answer' : 'Show a model answer'}
        </Button>
        {showModel && (
          <div className="space-y-3 rounded-xl bg-surface-2 p-3">
            <p className="flex items-start gap-2">
              <AudioButton text={d.writing.model} size="sm" />
              <Fi className="text-[1.02rem]">{d.writing.model}</Fi>
            </p>
            <div>
              <p className="mb-1 text-sm font-semibold">Noun forms in the model answer</p>
              <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {d.writing.checklist.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-2 text-sm">
                    <FormLine lexeme={grammar.require(c.lexemeId)} slot={c.slot} {...(c.person ? { person: c.person } : {})} size="sm" audio={false} showVariants={false} />
                    <span className="text-muted">
                      {grammar.require(c.lexemeId).lemma}, {slotLabel(c.slot, mode)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle sub="Answer aloud in two or three sentences. Listen to the question first.">
          <span className="flex items-center gap-2">
            <Mic aria-hidden className="size-5 text-primary" /> Speaking
          </span>
        </CardTitle>
        <ul className="space-y-2">
          {d.speaking.map((q) => (
            <li key={q} className="flex items-center gap-2">
              <AudioButton text={q} size="sm" />
              <Fi className="text-[1.02rem]">{q}</Fi>
            </li>
          ))}
        </ul>
      </Card>

      <ButtonLink to={`/practice/session?skill=mixed&type=fill-blank&tags=${d.tags.join(',')}&count=10`} variant="primary" icon={<Dumbbell aria-hidden className="size-4" />}>
        Fill-in practice for this domain
      </ButtonLink>
    </div>
  )
}

import { ArrowLeft, ArrowRight, Dumbbell, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { AudioButton } from '../../components/audio/AudioButton'
import { DerivationPipeline } from '../../components/grammar/DerivationPipeline'
import { FormLine } from '../../components/grammar/FormLine'
import { SentenceLine } from '../../components/grammar/SentenceLine'
import { SpatialCaseDiagram } from '../../components/grammar/SpatialCaseDiagram'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { CASES_INFO, CASE_ORDER } from '../../data/cases'
import { SLOT_GRADE, type CaseId, type SlotKey } from '../../grammar'
import { grammar } from '../../services/grammar'
import { pickLabel, pickText } from '../../services/content/text'
import { renderSentenceById } from '../../services/content/sentences'
import { useSettings } from '../../stores/settings'
import { capitalize } from '../../utils/text'
import NotFoundPage from '../NotFoundPage'

/** Words of different types, to show how one ending meets different stems. */
const EXAMPLE_WORDS = ['talo', 'kauppa', 'pankki', 'kieli', 'vesi', 'perhe', 'nainen', 'maa']

function gradeNote(caseId: CaseId): string | null {
  const sg = SLOT_GRADE[`sg.${caseId}` as SlotKey]
  const pl = SLOT_GRADE[`pl.${caseId}` as SlotKey]
  if (!sg && !pl) return null
  const word = (g: typeof sg) => (g === 'weak' ? 'weak grade (kaupa-)' : 'strong grade (kauppa-)')
  if (sg === pl && sg) return `Words with consonant gradation take the ${word(sg)} in both singular and plural.`
  return [sg && `Singular: ${word(sg)}.`, pl && `Plural: ${word(pl)}.`].filter(Boolean).join(' ')
}

export default function CaseDetailPage() {
  const { caseId = '' } = useParams()
  const mode = useSettings((s) => s.mode)
  if (!(caseId in CASES_INFO)) return <NotFoundPage />
  const id = caseId as CaseId
  const info = CASES_INFO[id]
  const meaning = pickText(info.meaning, mode)
  const idx = CASE_ORDER.indexOf(id)
  const prev = idx > 0 ? CASE_ORDER[idx - 1] : undefined
  const next = idx < CASE_ORDER.length - 1 ? CASE_ORDER[idx + 1] : undefined
  const grade = gradeNote(id)
  const singularUsed = id !== 'comitative' && id !== 'instructive'
  const numbers = singularUsed ? (['sg', 'pl'] as const) : (['pl'] as const)
  const title = mode === 'beginner' ? capitalize(info.en) : capitalize(info.fi)

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/cases" className="font-semibold text-primary hover:underline">
          Cases
        </Link>
        <span className="text-muted"> / {info.en}</span>
      </nav>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{mode === 'beginner' ? title : <Fi>{title}</Fi>}</h1>
          <AudioButton text={info.fi} size="sm" />
          {info.frequency === 'rare' && <Badge tone="warning">rare in speech</Badge>}
          {info.frequency === 'core' && <Badge tone="success">core case</Badge>}
        </div>
        <p className="text-muted">
          {mode === 'beginner' ? <Fi>{info.fi}</Fi> : info.en} ·{' '}
          {info.questions.map((q, i) => (
            <Fi key={i} className="font-semibold text-text">
              {i > 0 && ' · '}
              {q.fi ?? q.en}
            </Fi>
          ))}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-5">
          <Card>
            <CardTitle>What it means</CardTitle>
            <p className="text-[1.02rem]" lang={meaning.lang}>
              {meaning.main}
            </p>
            {meaning.gloss && <p className="mt-1 text-sm text-muted">{meaning.gloss}</p>}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs font-bold tracking-wide text-muted uppercase">Singular</dt>
                <dd className="mt-1 font-semibold">
                  <Fi>{info.endings.sg.join(', ')}</Fi>
                </dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs font-bold tracking-wide text-muted uppercase">Plural</dt>
                <dd className="mt-1 font-semibold">
                  <Fi>{info.endings.pl.join(', ')}</Fi>
                </dd>
              </div>
            </dl>
            {grade && <p className="mt-3 text-sm text-muted">{grade}</p>}
          </Card>

          {info.spatial && (
            <Card>
              <CardTitle sub="Where this case sits among the six place cases.">Place cases</CardTitle>
              <SpatialCaseDiagram highlight={id} />
            </Card>
          )}
        </div>

        <Card>
          <CardTitle sub="Follow one example from the base word to a sentence.">
            Why <Fi>{grammar.primary(grammar.require(info.demoNounId), info.demoSlot)}</Fi>?
          </CardTitle>
          <DerivationPipeline lexemeId={info.demoNounId} slot={info.demoSlot} />
        </Card>
      </div>

      <Card>
        <CardTitle sub="The same ending meets different stems. Tap a form to see each step.">Across word types</CardTitle>
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead className="max-sm:sr-only">
            <tr className="text-xs font-bold tracking-wide text-muted uppercase">
              <th scope="col" className="border-b border-border py-2 pr-3">
                Word
              </th>
              {numbers.map((n) => (
                <th key={n} scope="col" className="border-b border-border px-2 py-2">
                  {n === 'sg' ? 'Singular' : 'Plural'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXAMPLE_WORDS.map((w) => {
              const lex = grammar.require(w)
              return (
                <tr key={w} className="max-sm:mb-2 max-sm:grid max-sm:grid-cols-2 max-sm:rounded-xl max-sm:border max-sm:border-border max-sm:p-2">
                  <th scope="row" className="border-border py-2 pr-3 align-top font-normal max-sm:col-span-2 max-sm:py-0 sm:border-b">
                    <Fi className="font-semibold">{lex.lemma}</Fi>
                    <span className="text-xs text-muted max-sm:ml-2 sm:block">{lex.gloss.en}</span>
                  </th>
                  {numbers.map((n) => (
                    <td key={n} className="border-border px-1 py-2 align-top sm:border-b">
                      <span className="block px-1 text-[0.65rem] font-bold tracking-wide text-muted uppercase sm:hidden">{n === 'sg' ? 'Singular' : 'Plural'}</span>
                      <FormLine lexeme={lex} slot={`${n}.${id}` as SlotKey} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {info.usages.length > 0 && (
        <section aria-labelledby="usage" className="space-y-3">
          <h2 id="usage" className="text-lg font-semibold">
            How it is used
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {info.usages.map((u, i) => {
              const body = u.body ? pickText(u.body, mode) : null
              return (
                <Card key={i} as="article">
                  <h3 className="mb-2 font-semibold">{pickLabel(u.title, mode)}</h3>
                  {body && (
                    <p className="mb-2 text-sm text-muted" lang={body.lang}>
                      {body.main}
                    </p>
                  )}
                  <ul className="space-y-3">
                    {u.sentenceIds.map((sid) => {
                      const v = renderSentenceById(sid)
                      return v ? (
                        <li key={sid}>
                          <SentenceLine view={v} translation={v.sentence.en} />
                        </li>
                      ) : null
                    })}
                  </ul>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {info.mistakes.length > 0 && (
        <Card>
          <CardTitle>Common mistakes</CardTitle>
          <ul className="space-y-3">
            {info.mistakes.map((mk, i) => {
              const why = pickText(mk.why, mode)
              return (
                <li key={i} className="rounded-xl border border-border p-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-error">
                      <X aria-hidden className="size-4" />
                      <Fi className="line-through decoration-2">{mk.wrong}</Fi>
                    </span>
                    <ArrowRight aria-hidden className="size-4 text-muted" />
                    <Fi className="font-semibold text-success">{mk.right}</Fi>
                  </p>
                  <p className="mt-1 text-sm text-muted" lang={why.lang}>
                    {why.main}
                  </p>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonLink to={`/practice/session?skill=case:${id}`} variant="primary" icon={<Dumbbell aria-hidden className="size-4" />}>
          Practise the {info.en}
        </ButtonLink>
        <div className="flex gap-2">
          {prev && (
            <ButtonLink to={`/cases/${prev}`} variant="ghost" icon={<ArrowLeft aria-hidden className="size-4" />}>
              {capitalize(CASES_INFO[prev].en)}
            </ButtonLink>
          )}
          {next && (
            <ButtonLink to={`/cases/${next}`} variant="ghost">
              {capitalize(CASES_INFO[next].en)}
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  )
}

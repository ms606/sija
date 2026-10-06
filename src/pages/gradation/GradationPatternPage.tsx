import { ArrowLeft, ArrowRight, Dumbbell } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { FormLine } from '../../components/grammar/FormLine'
import { GradationVisualizer } from '../../components/grammar/GradationVisualizer'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { GRADATION_INFO } from '../../data/gradation-patterns'
import type { Lexeme, SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { pickLabel, pickText, slotLabel, slotShort } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import NotFoundPage from '../NotFoundPage'

const COLUMNS: SlotKey[] = ['sg.nominative', 'sg.genitive', 'sg.partitive', 'sg.illative', 'pl.nominative', 'pl.partitive']

function WordTable({ words, caption }: { words: Lexeme[]; caption: string }) {
  const mode = useSettings((s) => s.mode)
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[40rem] text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-xs font-bold tracking-wide text-muted uppercase">
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className="border-b border-border px-1 py-2">
                <span className="sm:hidden">{slotShort(c)}</span>
                <span className="max-sm:hidden">{slotLabel(c, mode)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {words.map((w) => (
            <tr key={w.id}>
              {COLUMNS.map((c) => (
                <td key={c} className="border-b border-border px-0 py-1.5 align-top">
                  <FormLine lexeme={w} slot={c} size="sm" audio={c === 'sg.nominative'} showVariants={false} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function GradationPatternPage() {
  const { patternId = '' } = useParams()
  const mode = useSettings((s) => s.mode)
  const idx = GRADATION_INFO.findIndex((p) => p.id === patternId)
  const info = GRADATION_INFO[idx]
  if (!info) return <NotFoundPage />
  const prev = GRADATION_INFO[idx - 1]
  const next = GRADATION_INFO[idx + 1]
  const featured = info.featured.map((id) => grammar.get(id)).filter((l): l is NonNullable<typeof l> => !!l)
  const others = grammar.lexicon.filter((l) => {
    const g = grammar.gradation(l)
    return g?.pattern === info.id && g.direction === 'normal' && !info.featured.includes(l.id)
  })
  const inverse = [
    ...info.inverse.map((id) => grammar.get(id)).filter((l): l is NonNullable<typeof l> => !!l),
    ...grammar.lexicon.filter((l) => {
      const g = grammar.gradation(l)
      return g?.pattern === info.id && g.direction === 'inverse' && !info.inverse.includes(l.id)
    }),
  ]
  const ex = featured[0]
  const explanation = pickText(info.explanation, mode)

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/gradation" className="font-semibold text-primary hover:underline">
          Consonant gradation
        </Link>
        <span className="text-muted"> / {info.title}</span>
      </nav>
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <Fi>{info.title}</Fi>
        </h1>
        <p className="text-muted">{pickLabel(info.kindLabel, mode)}</p>
      </header>

      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <GradationVisualizer
            pattern={info.id}
            size="lg"
            {...(ex ? { strong: ex.lemma, weak: grammar.primary(ex, 'sg.genitive') ?? '' } : {})}
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[1.02rem]" lang={explanation.lang}>
              {explanation.main}
            </p>
            {info.notes.map((n, i) => {
              const r = pickText(n, mode)
              return (
                <p key={i} className="mt-2 text-sm text-muted" lang={r.lang}>
                  {r.main}
                </p>
              )
            })}
          </div>
        </div>
      </Card>

      {featured.length > 0 && (
        <Card>
          <CardTitle sub="Strong grade in the base form, partitive and illative; weak where the ending closes the syllable.">Words with this pattern</CardTitle>
          <WordTable words={featured} caption={`Words with ${info.title}`} />
          {others.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              <span className="text-muted">Also:</span>
              {others.map((o) => (
                <Link key={o.id} to={`/reference/${encodeURIComponent(o.id)}`} className="hover:underline">
                  <Fi className="font-semibold">{o.lemma}</Fi> <span className="text-muted">→ {grammar.primary(o, 'sg.genitive')}</span>
                </Link>
              ))}
            </p>
          )}
        </Card>
      )}

      {inverse.length > 0 && (
        <Card>
          <CardTitle sub="The base form has the weak grade; the vowel stem has the strong one.">The other direction (inverse)</CardTitle>
          <WordTable words={inverse} caption={`Inverse gradation: ${info.title}`} />
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonLink to={`/practice/session?skill=grad:${info.id}`} variant="primary" icon={<Dumbbell aria-hidden className="size-4" />}>
          Practise {info.title}
        </ButtonLink>
        <div className="flex gap-2">
          {prev && (
            <ButtonLink to={`/gradation/${prev.id}`} variant="ghost" icon={<ArrowLeft aria-hidden className="size-4" />}>
              <Fi>{prev.title}</Fi>
            </ButtonLink>
          )}
          {next && (
            <ButtonLink to={`/gradation/${next.id}`} variant="ghost">
              <Fi>{next.title}</Fi>
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  )
}

import { ExternalLink, Search as SearchIcon } from 'lucide-react'
import { useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { RULES } from '../../data/explanations/rules'
import { NounImage } from '../../components/media/NounImage'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { UmlautKeys } from '../../components/ui/UmlautKeys'
import { grammar } from '../../services/grammar'
import { pickText, PERSON_LABEL, slotLabel, typeName } from '../../services/content/text'
import type { PersonId, SlotKey } from '../../grammar/types'
import { explainForm } from '../../services/explain'
import { search } from '../../services/search'
import { useSettings } from '../../stores/settings'

const TRY = ['vesi', 'kaupan', 'lehteä', 'kuusi', 'uusin', 'talossani', 'paiva', 'water']

function UnknownWord({ word }: { word: string }) {
  const mode = useSettings((s) => s.mode)
  const c = grammar.classify(word)
  const caveat = c.caveatRuleId ? RULES[c.caveatRuleId] : undefined
  return (
    <Card>
      <h2 className="text-lg font-semibold">
        <Fi>{word}</Fi> is not in the app's word list yet
      </h2>
      {c.candidates.length > 0 && (
        <>
          <p className="mt-2 text-sm text-muted">From the spelling alone, it could belong to:</p>
          <ul className="mt-2 space-y-2">
            {c.candidates.map((cand) => (
              <li key={cand.typeId} className="flex flex-wrap items-center gap-2">
                <Link to={`/noun-types/${cand.typeId}`} className="font-semibold text-primary hover:underline">
                  {typeName(cand.typeId, { kotus: true })}
                </Link>
                <Badge tone={cand.confidence === 'high' ? 'success' : cand.confidence === 'medium' ? 'warning' : 'neutral'}>
                  {cand.confidence} confidence
                </Badge>
                <span className="text-sm text-muted">{RULES[cand.ruleId] ? pickText(RULES[cand.ruleId]!, mode).main : ''}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {caveat && <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning">{pickText(caveat, mode).main}</p>}
      <a
        href={`https://www.kielitoimistonsanakirja.fi/#/${encodeURIComponent(word)}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        Look it up in Kielitoimiston sanakirja <ExternalLink aria-hidden className="size-4" />
      </a>
    </Card>
  )
}

/** How the found form is built, in one line: kaupan = kaupa- + -n. */
function FormulaLine({ lexemeId, analysis }: { lexemeId: string; analysis: { slot: SlotKey; person?: PersonId; form: string } }) {
  const exp = explainForm(lexemeId, analysis.slot, { ...(analysis.person ? { person: analysis.person } : {}), variantText: analysis.form })
  if (!exp || exp.formula.parts.length < 2) return null
  return (
    <p className="text-sm text-muted">
      <Fi className="font-semibold text-text">{exp.form}</Fi> = <Fi>{exp.formula.parts.map((p) => p.text).join(' + ')}</Fi>
      <span> ({exp.formula.parts.map((p) => p.label).join(' + ')})</span>
    </p>
  )
}

export default function ReferencePage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const inputRef = useRef<HTMLInputElement>(null)
  const mode = useSettings((s) => s.mode)
  const results = search(q)
  const setQ = (v: string) => setParams(v ? { q: v } : {}, { replace: true })

  return (
    <div>
      <PageHeader
        title="Reference"
        fi="Hakemisto"
        why="Search for a noun — or for any form of it (veden, kaupassa, taloni) — to see what it is and how it is built."
      />
      <div className="mb-5 space-y-2">
        <label htmlFor="search" className="sr-only">
          Search for a Finnish word or form, or an English meaning
        </label>
        <div className="relative">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <input
            id="search"
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="fi"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="vesi, kaupan, lehteä, water…"
            className="h-14 w-full rounded-2xl border border-border-strong bg-surface pr-4 pl-12 text-lg shadow-card placeholder:text-muted"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UmlautKeys inputRef={inputRef} onInsert={setQ} />
          {!q && (
            <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
              Try:
              {TRY.map((t) => (
                <button key={t} type="button" onClick={() => setQ(t)} className="rounded-full border border-border bg-surface px-3 py-1 font-medium text-text hover:bg-surface-2">
                  <Fi>{t}</Fi>
                </button>
              ))}
            </span>
          )}
        </div>
      </div>

      {q && results.length === 0 && <UnknownWord word={q.trim().toLowerCase()} />}

      <ul className="space-y-2" aria-live="polite">
        {results.map((r) => (
          <li key={r.noun.id}>
            <Link
              to={`/reference/${encodeURIComponent(r.noun.id)}${r.analyses[0] ? `?slot=${r.analyses[0].slot}` : ''}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card transition-colors hover:border-primary/60"
            >
              <NounImage noun={r.noun} context="chip" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <Fi className="text-lg font-semibold">{r.noun.lemma}</Fi>
                  <span className="text-sm text-muted">{r.noun.gloss.en}</span>
                </p>
                {r.analyses.length > 0 && (
                  <p className="text-sm">
                    <Fi className="font-semibold text-primary-strong">{r.analyses[0]!.form}</Fi>
                    {' = '}
                    {r.analyses
                      .slice(0, 4)
                      .map((a) => `${slotLabel(a.slot, mode)}${a.person ? ` + ${PERSON_LABEL[a.person].en}` : ''}`)
                      .join(' · ')}
                    {r.kind === 'loose-form' && <span className="text-muted"> (check the dots: ä / ö)</span>}
                  </p>
                )}
                {r.analyses[0] && <FormulaLine lexemeId={r.noun.id} analysis={r.analyses[0]} />}
              </div>
              <Badge className="hidden sm:inline-flex">{typeName(r.noun.typeId)}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { CaseCard } from '../../components/grammar/CaseCard'
import { FormLine } from '../../components/grammar/FormLine'
import { SpatialCaseDiagram } from '../../components/grammar/SpatialCaseDiagram'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { CASE_GROUPS } from '../../data/cases'
import type { SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { pickLabel } from '../../services/content/text'
import { useSettings } from '../../stores/settings'

const INTRO: { slot: SlotKey; en: string }[] = [
  { slot: 'sg.nominative', en: 'a house (base form)' },
  { slot: 'sg.genitive', en: "the house's, of the house" },
  { slot: 'sg.partitive', en: 'house — after numbers, "some", "not"' },
  { slot: 'sg.inessive', en: 'in the house' },
  { slot: 'sg.elative', en: 'out of the house, from the house' },
  { slot: 'sg.illative', en: 'into the house' },
]

export default function CasesPage() {
  const mode = useSettings((s) => s.mode)
  const talo = grammar.require('talo')
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        fi="Sijamuodot"
        why="Finnish shows a noun's role with an ending, where English uses a preposition or word order: talo → talossa 'in the house'. There are 15 cases, but you meet six or seven of them every day."
        next={{ to: '/cases/partitive/lab', label: 'Partitive Lab' }}
      />

      <Card>
        <CardTitle sub="Each ending answers a question: where? from where? of what? how much?">One noun, many endings</CardTitle>
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {INTRO.map((row) => (
            <li key={row.slot} className="flex flex-wrap items-center gap-x-2">
              <FormLine lexeme={talo} slot={row.slot} showVariants={false} />
              <span className="text-sm text-muted">{row.en}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          The coloured part is the case ending. Tap a form to see how it is built.
        </p>
      </Card>

      <Card>
        <CardTitle sub="Three questions — where, from where, to where — for inside spaces and for surfaces or open places.">
          The six place cases
        </CardTitle>
        <SpatialCaseDiagram />
        <p className="mt-3 text-sm text-muted">
          Inside cases (<Fi>-ssa, -sta, -Vn</Fi>) are used for buildings, rooms and towns; on/at cases (<Fi>-lla, -lta, -lle</Fi>) for surfaces, open
          places and many fixed expressions (<Fi>torilla</Fi>, <Fi>kassalla</Fi>). Which one a place takes is partly convention.
        </p>
      </Card>

      {CASE_GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`group-${g.id}`}>
          <h2 id={`group-${g.id}`} className="mb-3 text-lg font-semibold">
            {pickLabel(g.title, mode)}
            {mode !== 'beginner' && <span className="ml-2 text-sm font-normal text-muted">{g.title.en}</span>}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.cases.map((c) => (
              <li key={c}>
                <CaseCard caseId={c} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { to: '/cases/partitive/lab', title: 'Partitive Lab', sub: 'How to build -a / -ta / -tta, and when to use the partitive' },
          { to: '/cases/genitive/lab', title: 'Genitive Lab', sub: 'Singular -n with the weak grade, and the many plural genitives' },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card hover:border-primary/60">
            <span>
              <span className="block font-semibold">{l.title}</span>
              <span className="block text-sm text-muted">{l.sub}</span>
            </span>
            <ArrowRight aria-hidden className="size-5 shrink-0 text-muted group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  )
}

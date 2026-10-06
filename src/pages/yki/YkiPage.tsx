import { ArrowRight, Info } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { YKI_DOMAINS } from '../../data/yki'
import { pickLabel } from '../../services/content/text'
import { useSettings } from '../../stores/settings'

export default function YkiPage() {
  const mode = useSettings((s) => s.mode)
  return (
    <div className="space-y-6">
      <PageHeader
        title="YKI practice"
        fi="YKI-harjoitus"
        why="The general language proficiency test (Yleiset kielitutkinnot, YKI) uses everyday situations. Here you practise the noun forms those situations need: reading, writing, speaking and fill-in tasks for nine domains."
      />
      <p className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          This is unofficial practice focused on nouns. The YKI test is organised by the Finnish National Agency for Education (Opetushallitus); check its
          website for the current format and levels.
        </span>
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {YKI_DOMAINS.map((d) => (
          <li key={d.id}>
            <Link to={`/yki/${d.id}`} className="group flex h-full flex-col gap-1 rounded-2xl border border-border bg-surface p-4 shadow-card hover:border-primary/60">
              <span className="flex items-center justify-between gap-2 font-semibold">
                {pickLabel(d.title, mode)}
                <ArrowRight aria-hidden className="size-4 text-muted group-hover:text-primary" />
              </span>
              {mode === 'beginner' && d.title.fi && <Fi className="text-sm text-muted">{d.title.fi}</Fi>}
              <span className="text-sm text-muted">{d.situation}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Card>
        <p className="text-sm text-muted">
          Tip: in every writing task, check three things for each noun — the case the verb or place needs, singular or plural, and the stem (the genitive form
          shows it).
        </p>
      </Card>
    </div>
  )
}

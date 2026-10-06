import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusLabel } from '../../components/ui/StatusLabel'
import { FAMILIES } from '../../data/noun-families'
import { getType } from '../../grammar'
import { grammar } from '../../services/grammar'
import { pickLabel, pickText, typeName } from '../../services/content/text'
import { exampleWord, wordsOfType } from '../../services/content/types'
import { useSettings } from '../../stores/settings'

export default function NounTypesPage() {
  const mode = useSettings((s) => s.mode)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Noun types"
        fi="Taivutustyypit"
        why="Every noun belongs to a declension type. The type tells you the word's stems — and once you know the stems, every form follows. The numbers are the official ones from Kotus, the Institute for the Languages of Finland."
        next={{ to: '/noun-types/i-words', label: '-i Noun Lab' }}
      />

      <Card>
        <CardTitle>Can you tell the type from the word?</CardTitle>
        <ul className="space-y-2 text-[0.97rem]">
          <li className="flex flex-wrap items-baseline gap-2">
            <StatusLabel label="pattern" />
            <span>
              Often, from the ending: <Fi className="font-semibold">-nen</Fi> → <Fi>naise-</Fi>, <Fi className="font-semibold">-e</Fi> →{' '}
              <Fi>perhee-</Fi>, one-syllable <Fi className="font-semibold">maa</Fi>, <Fi className="font-semibold">työ</Fi>.
            </span>
          </li>
          <li className="flex flex-wrap items-baseline gap-2">
            <StatusLabel label="lexical" />
            <span>
              Not always: words in <Fi className="font-semibold">-i</Fi> split into four families, and <Fi>-us</Fi> words into two (
              <Fi>vastauksen</Fi> / <Fi>terveyden</Fi>).
            </span>
          </li>
          <li className="flex flex-wrap items-baseline gap-2">
            <StatusLabel label="rule" />
            <span>
              Learn each new word with its <strong>genitive</strong> and <strong>partitive</strong> (and plural partitive): <Fi>kieli – kielen – kieltä – kieliä</Fi>.
              Those forms reveal the stems.
            </span>
          </li>
        </ul>
      </Card>

      <Link
        to="/noun-types/i-words"
        className="group flex items-center justify-between gap-3 rounded-2xl border-2 border-primary/40 bg-primary-soft/50 p-4 hover:border-primary"
      >
        <span>
          <span className="block text-lg font-bold">-i Noun Lab</span>
          <span className="block text-sm text-muted">
            <Fi>pankki, lehti, kieli, uusi</Fi> — four families that look alike. Compare them side by side.
          </span>
        </span>
        <ArrowRight aria-hidden className="size-5 shrink-0 text-muted group-hover:text-primary" />
      </Link>

      {FAMILIES.map((f) => {
        const summary = pickText(f.summary, mode)
        return (
          <section key={f.id} aria-labelledby={`fam-${f.id}`} className="space-y-3">
            <div>
              <h2 id={`fam-${f.id}`} className="text-lg font-semibold">
                {pickLabel(f.title, mode)}
              </h2>
              <p className="text-sm text-muted" lang={summary.lang}>
                {summary.main}
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {f.types.map((typeId) => {
                const def = getType(typeId)
                const ex = exampleWord(typeId)
                const count = wordsOfType(typeId).length
                return (
                  <li key={typeId}>
                    <Link
                      to={`/noun-types/${typeId}`}
                      className="group flex h-full flex-col gap-1 rounded-2xl border border-border bg-surface p-4 shadow-card hover:border-primary/60"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-bold">{typeName(typeId)}</span>
                        <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-muted">Kotus {def.kotus}</span>
                      </span>
                      {ex && (
                        <Fi className="text-[1.02rem]">
                          <span className="font-semibold">{ex.lemma}</span>
                          <span className="text-muted">
                            {' '}
                            – {grammar.primary(ex, 'sg.genitive')} – {grammar.primary(ex, 'sg.partitive')} – {grammar.primary(ex, 'pl.partitive')}
                          </span>
                        </Fi>
                      )}
                      <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted">
                        <span>
                          {count} word{count === 1 ? '' : 's'} in the app
                        </span>
                        <ArrowRight aria-hidden className="size-4 group-hover:text-primary" />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

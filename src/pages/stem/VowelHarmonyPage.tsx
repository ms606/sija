import { Link } from 'react-router'
import { FormLine } from '../../components/grammar/FormLine'
import { VowelHarmonyMeter } from '../../components/grammar/VowelHarmonyMeter'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusLabel } from '../../components/ui/StatusLabel'
import { grammar } from '../../services/grammar'

const EXAMPLES = ['talo', 'kauppa', 'pöytä', 'kylä', 'tyttö', 'kivi', 'meri', 'hotelli', 'sähköposti', 'pankkikortti']

export default function VowelHarmonyPage() {
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/stem-lab" className="font-semibold text-primary hover:underline">
          Stem Lab
        </Link>
        <span className="text-muted"> / vowel harmony</span>
      </nav>
      <PageHeader
        title="Vowel harmony"
        fi="Vokaalisointu"
        why="Most endings have two versions: -ssa/-ssä, -sta/-stä, -lla/-llä. The vowels of the word choose: back vowels (a, o, u) take the a-version; front vowels (ä, ö, y) — or only e and i — take the ä-version."
        next={{ to: '/stem-lab/possessives', label: 'Possessive suffixes' }}
      />

      <Card>
        <CardTitle>
          Three groups of vowels <StatusLabel label="rule" className="ml-1 align-middle" />
        </CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-primary-soft p-3">
            <p className="text-xs font-bold tracking-wide text-primary-strong uppercase">Back</p>
            <Fi className="text-3xl font-bold text-primary-strong">a o u</Fi>
            <p className="mt-1 text-sm">Any of these → a-endings</p>
          </div>
          <div className="rounded-xl bg-[var(--px-bg)] p-3">
            <p className="text-xs font-bold tracking-wide text-[var(--px-fg)] uppercase">Front</p>
            <Fi className="text-3xl font-bold text-[var(--px-fg)]">ä ö y</Fi>
            <p className="mt-1 text-sm">→ ä-endings</p>
          </div>
          <div className="rounded-xl bg-surface-3 p-3">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Neutral</p>
            <Fi className="text-3xl font-bold text-muted">e i</Fi>
            <p className="mt-1 text-sm">Go with both. A word with only e and i takes ä-endings (<Fi>kivessä</Fi>).</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle sub="The vowels light up; the engine chooses the endings.">Try any word</CardTitle>
        <VowelHarmonyMeter />
      </Card>

      <Card>
        <CardTitle sub="In compounds, the last part decides.">Examples</CardTitle>
        <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {EXAMPLES.map((id) => {
            const lex = grammar.require(id)
            return (
              <li key={id} className="flex flex-wrap items-center gap-x-2">
                <Fi className="w-28 shrink-0 font-semibold">{lex.lemma}</Fi>
                <FormLine lexeme={lex} slot="sg.inessive" size="sm" audio={false} />
                <FormLine lexeme={lex} slot="sg.partitive" size="sm" audio={false} />
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

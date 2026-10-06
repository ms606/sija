import { Link, useSearchParams } from 'react-router'
import { FormLine } from '../../components/grammar/FormLine'
import { PossessiveBuilder } from '../../components/grammar/PossessiveBuilder'
import { SentenceLine } from '../../components/grammar/SentenceLine'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusLabel } from '../../components/ui/StatusLabel'
import { ALL_SLOTS, type PersonId, type Predictability, type SlotKey } from '../../grammar'
import { grammar } from '../../services/grammar'
import { allSentenceViews } from '../../services/content/sentences'

const RULES: { title: string; label: Predictability; body: string; examples: { word: string; slot: SlotKey; person?: PersonId }[] }[] = [
  {
    title: 'The ending -n or -t drops — and the strong grade comes back',
    label: 'rule',
    body: 'The suffix goes on the vowel stem, so kaupan, kaupat and kauppa all become kauppani. Context tells you which one is meant.',
    examples: [
      { word: 'kauppa', slot: 'sg.genitive' },
      { word: 'kauppa', slot: 'sg.genitive', person: '1sg' },
      { word: 'kauppa', slot: 'pl.nominative', person: '1sg' },
    ],
  },
  {
    title: 'Other cases simply add the suffix',
    label: 'rule',
    body: 'The case ending stays, with its usual grade: kaupassa → kaupassani.',
    examples: [
      { word: 'kauppa', slot: 'sg.inessive', person: '1sg' },
      { word: 'kauppa', slot: 'pl.adessive', person: '2sg' },
    ],
  },
  {
    title: 'The illative loses its -n; -ksi becomes -kse-',
    label: 'rule',
    body: 'kauppaan → kauppaani, kaupaksi → kaupakseni.',
    examples: [
      { word: 'kauppa', slot: 'sg.illative', person: '1sg' },
      { word: 'kauppa', slot: 'sg.translative', person: '1sg' },
    ],
  },
  {
    title: 'Third person: -nsa/-nsä, or a long vowel + n',
    label: 'variant',
    body: 'After a short vowel ending both are correct: kaupassaan ~ kaupassansa. The -Vn form is more common. In the nominative only -nsa: kauppansa.',
    examples: [
      { word: 'kauppa', slot: 'sg.inessive', person: '3' },
      { word: 'kauppa', slot: 'sg.nominative', person: '3' },
    ],
  },
]

export default function PossessiveLabPage() {
  const [params, setParams] = useSearchParams()
  const w = params.get('w') ?? 'talo'
  const s = params.get('slot') as SlotKey | null
  const lex = grammar.get(w)
  const word = lex && lex.pos === 'noun' ? w : 'talo'
  const slot = s && ALL_SLOTS.includes(s) ? s : 'sg.inessive'
  const sentences = allSentenceViews()
    .filter((v) => v.parts.some((p) => p.token?.person))
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/stem-lab" className="font-semibold text-primary hover:underline">
          Stem Lab
        </Link>
        <span className="text-muted"> / possessives</span>
      </nav>
      <PageHeader
        title="Possessive suffixes"
        fi="Omistusliitteet"
        why="Written Finnish marks 'my, your, his/her, our' with a suffix on the noun: taloni 'my house', talossani 'in my house'. The pronoun (minun) is optional before it. Spoken Finnish usually drops the suffix instead: mun talo."
        next={{ to: '/practice', label: 'Practice' }}
      />

      <Card>
        <CardTitle sub="Pick a word and a case; every person is built by the engine.">Build it</CardTitle>
        <PossessiveBuilder word={word} slot={slot} onChange={(nw, ns) => setParams({ w: nw, slot: ns }, { replace: true, preventScrollReset: true })} />
      </Card>

      <section aria-labelledby="px-rules" className="space-y-3">
        <h2 id="px-rules" className="text-lg font-semibold">
          What happens to the word
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {RULES.map((r) => (
            <Card key={r.title} as="article">
              <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                <StatusLabel label={r.label} /> {r.title}
              </h3>
              <p className="mt-1 text-sm text-muted">{r.body}</p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {r.examples.map((ex, i) => (
                  <li key={i}>
                    <FormLine lexeme={grammar.require(ex.word)} slot={ex.slot} {...(ex.person ? { person: ex.person } : {})} size="sm" />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardTitle sub="Spoken Finnish: mun koti, sun nimi. Written and formal Finnish: kotini, nimesi.">In sentences</CardTitle>
        <ul className="space-y-3">
          {sentences.map((v) => (
            <li key={v.sentence.id}>
              <SentenceLine view={v} translation={v.sentence.en} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          <Fi>minun, sinun, hänen, meidän, teidän, heidän</Fi> + noun with the suffix. With 1st and 2nd person the pronoun is often left out:{' '}
          <Fi>Mikä nimesi on?</Fi>
        </p>
      </Card>
    </div>
  )
}

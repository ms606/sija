import { Dumbbell } from 'lucide-react'
import { Link } from 'react-router'
import { EndingExplainer } from '../../components/grammar/EndingExplainer'
import { FormLine } from '../../components/grammar/FormLine'
import { SentenceLine } from '../../components/grammar/SentenceLine'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusLabel } from '../../components/ui/StatusLabel'
import { CASES_INFO } from '../../data/cases'
import { grammar } from '../../services/grammar'
import { pickLabel } from '../../services/content/text'
import { renderSentenceById } from '../../services/content/sentences'
import { useSettings } from '../../stores/settings'

const SG_WORDS = ['talo', 'kauppa', 'pöytä', 'katu', 'pankki', 'lehti', 'kieli', 'vesi', 'perhe', 'sade', 'nainen', 'vieras', 'rengas', 'mies']
const PL_WORDS = ['talo', 'kauppa', 'koira', 'pankki', 'kieli', 'nainen', 'maa', 'perhe', 'vieras', 'uusi', 'lapsi', 'kysymys']

export default function GenitiveLabPage() {
  const mode = useSettings((s) => s.mode)
  const info = CASES_INFO.genitive
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/cases" className="font-semibold text-primary hover:underline">
          Cases
        </Link>
        <span className="text-muted"> / </span>
        <Link to="/cases/genitive" className="font-semibold text-primary hover:underline">
          genitive
        </Link>
        <span className="text-muted"> / lab</span>
      </nav>
      <PageHeader
        title="Genitive Lab"
        fi="Genetiivi"
        why="The singular genitive is the most useful form to learn with every word: its -n closes the syllable, so it shows you the weak vowel stem that most other endings use (kaupan → kaupassa, kaupalla)."
        next={{ to: '/gradation', label: 'Consonant gradation' }}
      />

      <Card>
        <CardTitle sub="Vowel stem + -n. The stem is in the weak grade — except in inverse words like sade, where the stem is strong.">
          The singular genitive <StatusLabel label="rule" className="ml-1 align-middle" />
        </CardTitle>
        <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {SG_WORDS.map((id) => {
            const lex = grammar.require(id)
            return (
              <li key={id} className="flex flex-wrap items-center gap-x-2">
                <Fi className="w-20 shrink-0 text-muted">{lex.lemma}</Fi>
                <span aria-hidden className="text-muted">
                  →
                </span>
                <FormLine lexeme={lex} slot="sg.genitive" size="sm" />
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Tip: drop the <Fi>-n</Fi> and you have the stem for <Fi>-ssa, -sta, -lla, -lta, -lle, -ksi</Fi>: <Fi>kaupan → kaupa- → kaupassa</Fi>.
        </p>
      </Card>

      <Card>
        <CardTitle sub="The plural genitive has several endings, and many words accept two. Tap a form to see which stem it uses.">
          The plural genitive
        </CardTitle>
        <EndingExplainer slot="pl.genitive" words={PL_WORDS} />
      </Card>

      <section aria-labelledby="use" className="space-y-3">
        <h2 id="use" className="text-lg font-semibold">
          When to use the genitive
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {info.usages.map((u, i) => (
            <Card key={i} as="article">
              <h3 className="mb-2 font-semibold">{pickLabel(u.title, mode)}</h3>
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
          ))}
        </div>
      </section>

      <Card>
        <CardTitle>The genitive as an object</CardTitle>
        <p className="text-[0.97rem]">
          A whole, finished object looks like the genitive: <Fi className="font-semibold">Ostan auton</Fi> "I'll buy the car". Grammars call this the
          accusative; for nouns it has the same <Fi>-n</Fi> form.{' '}
          <Link to="/cases/accusative" className="font-semibold text-primary hover:underline">
            See the accusative
          </Link>
        </p>
      </Card>

      <ButtonLink to="/practice/session?skill=genitive" variant="primary" icon={<Dumbbell aria-hidden className="size-4" />}>
        Practise the genitive
      </ButtonLink>
    </div>
  )
}

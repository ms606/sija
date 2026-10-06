import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { GradationVisualizer } from '../../components/grammar/GradationVisualizer'
import { GradeMap } from '../../components/grammar/GradeMap'
import { FormLine } from '../../components/grammar/FormLine'
import { SyllableView } from '../../components/grammar/SyllableView'
import { WordPicker } from '../../components/grammar/WordPicker'
import { Badge } from '../../components/ui/Badge'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusLabel } from '../../components/ui/StatusLabel'
import { GRADATION_INFO, NO_GRADATION_NOTES } from '../../data/gradation-patterns'
import { grammar } from '../../services/grammar'
import { pickLabel, pickText } from '../../services/content/text'
import { useSettings } from '../../stores/settings'

const MAP_WORDS = ['kauppa', 'pankki', 'pöytä', 'katu', 'ruoka', 'kaupunki', 'lehti', 'sade', 'rengas']

export default function GradationPage() {
  const mode = useSettings((s) => s.mode)
  const [word, setWord] = useState('kauppa')
  const lex = grammar.require(word)
  const info = grammar.gradation(lex)
  const kauppa = grammar.require('kauppa')
  const sade = grammar.require('sade')
  const strong = grammar.primary(kauppa, 'sg.nominative') ?? ''
  const weak = grammar.primary(kauppa, 'sg.genitive') ?? ''
  const illative = grammar.primary(kauppa, 'sg.illative') ?? ''

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consonant gradation"
        fi="Astevaihtelu"
        why="Many native words change a consonant in the middle when an ending is added: kauppa → kaupan, pöytä → pöydän. Knowing when it happens — and when it does not — is the key to building forms correctly."
        next={{ to: '/gradation/kk-k', label: 'kk → k' }}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle sub="The consonants before the last vowel have two grades.">
            Strong and weak <StatusLabel label="rule" className="ml-1 align-middle" />
          </CardTitle>
          <GradationVisualizer pattern="pp-p" strong={strong} weak={weak} size="lg" />
          <p className="mt-4 text-[0.98rem]">
            The base form has the <strong>strong grade</strong> (<Fi>pp</Fi>). When an ending <strong>closes</strong> the last syllable — adds a consonant
            right after its vowel — the <strong>weak grade</strong> appears (<Fi>p</Fi>).
          </p>
          <div className="mt-4 flex flex-wrap gap-6">
            <SyllableView word={strong} grade="strong" />
            <SyllableView word={weak} grade="weak" />
          </div>
        </Card>

        <Card>
          <CardTitle sub="Learn these as a pair: they are why kauppaan and kauppoja look 'irregular'.">Two things to watch</CardTitle>
          <ul className="space-y-4">
            <li>
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                The illative stays strong <StatusLabel label="exception" />
              </p>
              <p className="mt-1 text-[0.95rem] text-muted">
                <Fi className="font-semibold text-text">{illative}</Fi> ends in a consonant, but keeps <Fi>pp</Fi>: the illative ending was once{' '}
                <Fi>-hVn</Fi>, and the old open syllable still decides the grade.
              </p>
              <SyllableView word={illative} className="mt-2" />
            </li>
            <li>
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                Inverse gradation <StatusLabel label="pattern" />
              </p>
              <p className="mt-1 text-[0.95rem] text-muted">
                Words like <Fi className="font-semibold text-text">{sade.lemma}</Fi>, <Fi>liike</Fi> and <Fi>rengas</Fi> — mostly words in <Fi>-e</Fi>{' '}
                and <Fi>-as/-äs</Fi> — have the <em>weak</em> grade in the base form and the strong grade in the stem:
              </p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <FormLine lexeme={sade} slot="sg.nominative" />
                <FormLine lexeme={sade} slot="sg.genitive" />
                <FormLine lexeme={sade} slot="sg.partitive" />
              </p>
            </li>
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle sub="Every form, marked strong or weak. Pick another word to compare.">Which forms are weak?</CardTitle>
        <WordPicker value={word} onChange={setWord} featured={MAP_WORDS} filter={(l) => !!grammar.gradation(l)} className="mb-4" />
        {info && (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <Fi className="seg seg-grade font-bold">
              {info.strong} → {info.weak || '∅'}
            </Fi>
            {info.direction === 'inverse' && <Badge tone="warning">inverse: weak base form</Badge>}
            {info.intrinsic && <Badge>part of the word type</Badge>}
            <span className="text-muted">
              strong stem <Fi className="font-semibold text-text">{info.strongStem}-</Fi> · weak stem{' '}
              <Fi className="font-semibold text-text">{info.weakStem}-</Fi>
            </span>
          </p>
        )}
        <GradeMap lexeme={lex} />
      </Card>

      <section aria-labelledby="patterns" className="space-y-3">
        <h2 id="patterns" className="text-lg font-semibold">
          The patterns
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GRADATION_INFO.map((p) => {
            const ex = grammar.get(p.featured[0] ?? '')
            return (
              <li key={p.id}>
                <Link
                  to={`/gradation/${p.id}`}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-card hover:border-primary/60"
                >
                  <span className="flex items-center justify-between gap-2">
                    <Fi className="seg seg-grade text-xl font-bold">{p.title}</Fi>
                    <ArrowRight aria-hidden className="size-4 text-muted group-hover:text-primary" />
                  </span>
                  <span className="text-sm text-muted">{pickLabel(p.kindLabel, mode)}</span>
                  {ex && (
                    <span className="mt-auto text-[1.02rem]">
                      <Fi className="font-semibold">{ex.lemma}</Fi> → <Fi className="font-semibold">{grammar.primary(ex, 'sg.genitive')}</Fi>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <Card>
        <CardTitle sub="Gradation is common, but not universal.">When there is no gradation</CardTitle>
        <ul className="list-disc space-y-1.5 pl-5">
          {NO_GRADATION_NOTES.map((n, i) => {
            const r = pickText(n, mode)
            return (
              <li key={i} lang={r.lang}>
                {r.main}
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

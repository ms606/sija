import { useState } from 'react'
import { DeclensionTable } from '../../components/grammar/DeclensionTable'
import { FormLine } from '../../components/grammar/FormLine'
import { PluralStemExplainer } from '../../components/grammar/PluralStemExplainer'
import { WordPicker } from '../../components/grammar/WordPicker'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusLabel } from '../../components/ui/StatusLabel'
import type { SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { slotLabel } from '../../services/content/text'
import { useSettings } from '../../stores/settings'

const ENDING_WORDS = ['talo', 'kauppa', 'koira', 'pankki', 'kieli', 'maa', 'perhe', 'nainen', 'vieras', 'uusi']
const GRADE_SLOTS: SlotKey[] = ['pl.nominative', 'pl.inessive', 'pl.adessive', 'pl.partitive', 'pl.genitive', 'pl.illative', 'pl.essive']

export default function PluralLabPage() {
  const mode = useSettings((s) => s.mode)
  const [word, setWord] = useState('kauppa')
  const talo = grammar.require('talo')
  const kauppa = grammar.require('kauppa')
  const grades = grammar.gradation(kauppa)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plural Lab"
        fi="Monikko"
        why="The plural has two markers: -t in the nominative (talot) and -i- in every other case (taloissa, taloja). The -i- changes the end of the stem in a handful of regular ways — learn those and the plural opens up."
        next={{ to: '/stem-lab/possessives', label: 'Possessive suffixes' }}
      />

      <Card>
        <CardTitle sub="Tap a form to see each step.">Two plural markers</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="font-semibold">
              <Fi className="seg seg-plural px-1">-t</Fi> — nominative plural
            </p>
            <p className="mt-1 text-sm text-muted">The subject and the "whole" plural object. It closes the syllable, so the grade is weak.</p>
            <div className="mt-2 flex flex-wrap gap-x-4">
              <FormLine lexeme={talo} slot="pl.nominative" />
              <FormLine lexeme={kauppa} slot="pl.nominative" />
            </div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="font-semibold">
              <Fi className="seg seg-plural px-1">-i-</Fi> — every other case
            </p>
            <p className="mt-1 text-sm text-muted">
              The case ending comes after it. Between two vowels the <Fi>i</Fi> is written <Fi>j</Fi>: <Fi>talo + i + a = taloja</Fi>.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4">
              <FormLine lexeme={talo} slot="pl.inessive" />
              <FormLine lexeme={talo} slot="pl.partitive" />
              <FormLine lexeme={talo} slot="pl.genitive" />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle sub="Before the plural -i-, the last vowel of the stem changes in one of these ways.">How the -i- changes the stem</CardTitle>
        <PluralStemExplainer />
      </Card>

      <Card>
        <CardTitle sub="These two cases have the most variety. Many words accept more than one plural genitive.">Plural partitive and genitive</CardTitle>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[26rem] text-left">
            <thead>
              <tr className="text-xs font-bold tracking-wide text-muted uppercase">
                <th scope="col" className="border-b border-border py-2 pr-2">
                  Word
                </th>
                <th scope="col" className="border-b border-border px-1 py-2">
                  {slotLabel('pl.partitive', mode)}
                </th>
                <th scope="col" className="border-b border-border px-1 py-2">
                  {slotLabel('pl.genitive', mode)}
                </th>
              </tr>
            </thead>
            <tbody>
              {ENDING_WORDS.map((id) => {
                const lex = grammar.require(id)
                return (
                  <tr key={id}>
                    <th scope="row" className="border-b border-border py-1.5 pr-2 align-top font-semibold">
                      <Fi>{lex.lemma}</Fi>
                    </th>
                    <td className="border-b border-border py-1.5 align-top">
                      <FormLine lexeme={lex} slot="pl.partitive" size="sm" />
                    </td>
                    <td className="border-b border-border py-1.5 align-top">
                      <FormLine lexeme={lex} slot="pl.genitive" size="sm" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>
            Partitive: <Fi>-ja/-jä</Fi> after a vowel + <Fi>i</Fi> (<Fi>taloja</Fi>), <Fi>-a/-ä</Fi> after a consonant + <Fi>i</Fi> (<Fi>kieliä</Fi>),{' '}
            <Fi>-ita/-itä</Fi> after a long vowel (<Fi>maita</Fi>, <Fi>perheitä</Fi>).
          </li>
          <li>
            Genitive: <Fi>-jen</Fi>, <Fi>-ien</Fi>, <Fi>-iden/-itten</Fi> or <Fi>-ten</Fi> (<Fi>kielten</Fi>, <Fi>naisten</Fi>). When two forms are given, both are
            correct.
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle sub="The same strong/weak rule works in the plural: -t and most endings close the syllable; the partitive, genitive, illative and essive plural keep the strong grade.">
          Gradation in the plural <StatusLabel label="rule" className="ml-1 align-middle" />
        </CardTitle>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GRADE_SLOTS.map((slot) => {
            const grade = grades?.weakSlots.includes(slot) ? 'weak' : grades?.strongSlots.includes(slot) ? 'strong' : null
            return (
              <li key={slot} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2">
                <span className="min-w-0">
                  <span className="block text-xs text-muted">{slotLabel(slot, mode)}</span>
                  <FormLine lexeme={kauppa} slot={slot} size="sm" showVariants={false} />
                </span>
                {grade && <span className="text-xs font-bold tracking-wide text-[var(--grade-fg)] uppercase">{grade} grade</span>}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle sub="Every case side by side. Pick another word.">Singular and plural</CardTitle>
        <WordPicker value={word} onChange={setWord} featured={['kauppa', 'kieli', 'vesi', 'perhe', 'nainen', 'maa', 'työ', 'lapsi']} className="mb-4" />
        <DeclensionTable lexeme={grammar.require(word)} />
      </Card>
    </div>
  )
}

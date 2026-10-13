import { ArrowRight, Check, Shuffle, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { AudioButton } from '../../components/audio/AudioButton'
import { ITypeComparison } from '../../components/grammar/ITypeComparison'
import { MinimalPairs } from '../../components/grammar/MinimalPairs'
import { RichText } from '../../components/grammar/RichText'
import { NounImage } from '../../components/media/NounImage'
import { Button } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusLabel } from '../../components/ui/StatusLabel'
import { I_GROUP_INFO, I_GROUP_ORDER, I_TYPE_NOTES, LEARNING_FAMILY_NOTE } from '../../data/noun-families'
import type { IGroup, SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { familyName, pickLabel, pickText, typeName } from '../../services/content/text'
import { modelLexeme, typesOfFamily, wordsOfType } from '../../services/content/types'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'

const SORTABLE = grammar.lexicon.filter((l) => l.pos === 'noun' && grammar.type(l).iGroup && !l.compound)

function randomWord(not?: string): string {
  const pool = SORTABLE.filter((l) => l.id !== not)
  return pool[Math.floor(Math.random() * pool.length)]!.id
}

const TYPE_SLOTS: readonly { slot: SlotKey; label: string }[] = [
  { slot: 'sg.genitive', label: 'Genitive' },
  { slot: 'sg.partitive', label: 'Partitive' },
  { slot: 'sg.illative', label: 'Illative' },
  { slot: 'pl.genitive', label: 'Plural genitive' },
  { slot: 'pl.partitive', label: 'Plural partitive' },
]

/**
 * The declension types of one learning family, each with its own Kotus model
 * word: stems and key forms straight from the engine, and what the type does
 * differently from the rest of the family.
 */
function FamilyTypes({ group }: { group: IGroup }) {
  const types = typesOfFamily(group)
  return (
    <div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[44rem] text-left text-sm" aria-label={`Types in the ${familyName(group)}, with their model words’ stems and forms`}>
          <thead>
            <tr className="text-xs font-bold tracking-wide text-muted uppercase">
              <th scope="col" className="border-b border-border px-1 py-2">
                Type
              </th>
              <th scope="col" className="border-b border-border px-1 py-2">
                Stems
              </th>
              {TYPE_SLOTS.map((s) => (
                <th key={s.slot} scope="col" className="border-b border-border px-1 py-2">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((d) => {
              const model = modelLexeme(d.id)!
              const stems = grammar.stems(model)
              const vowel =
                stems.vowelStrong.text === stems.vowelWeak.text ? `${stems.vowelStrong.text}-` : `${stems.vowelStrong.text}- / ${stems.vowelWeak.text}-`
              return (
                <tr key={d.id} className="align-top">
                  <th scope="row" className="border-b border-border px-1 py-1.5 font-normal">
                    <Link to={`/noun-types/${d.id}`} className="font-semibold text-primary hover:underline">
                      {typeName(d.id)}
                    </Link>
                    <span className="block text-xs text-muted">
                      Kotus {d.kotus} · <Fi>{model.lemma}</Fi>
                    </span>
                  </th>
                  <td className="border-b border-border px-1 py-1.5">
                    <Fi className="block">{vowel}</Fi>
                    {stems.consonant && (
                      <Fi className="block text-[var(--stem-fg)]" aria-label={`consonant stem ${stems.consonant.text}-`}>
                        {stems.consonant.text}-
                      </Fi>
                    )}
                  </td>
                  {TYPE_SLOTS.map((s) => (
                    <td key={s.slot} className="border-b border-border px-1 py-1.5">
                      <Fi>
                        {grammar
                          .inflect(model, s.slot)
                          .variants.map((v) => v.text)
                          .join(' ~ ')}
                      </Fi>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 space-y-2 text-sm" aria-label={`What each type in the ${familyName(group)} does`}>
        {types.map((d) => (
          <li key={d.id}>
            <span className="font-semibold">{typeName(d.id)}:</span> <RichText text={I_TYPE_NOTES[d.id]?.en ?? ''} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** "Which family?" — guess, then see the key forms that decide it. */
function FamilySorter() {
  const [wordId, setWordId] = useState(() => randomWord())
  const [guess, setGuess] = useState<IGroup | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const lex = grammar.require(wordId)
  const actual = grammar.type(lex).iGroup!
  const answered = guess !== null
  const choose = (g: IGroup) => {
    if (answered) return
    setGuess(g)
    setScore((s) => ({ right: s.right + (g === actual ? 1 : 0), total: s.total + 1 }))
  }
  const next = () => {
    setWordId(randomWord(wordId))
    setGuess(null)
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <NounImage noun={lex} context="chip" size="sm" />
        <Fi className="text-3xl font-bold">{lex.lemma}</Fi>
        <AudioButton text={lex.lemma} size="sm" />
        <span className="text-muted">{lex.gloss.en.split(';')[0]}</span>
        <span className="ml-auto text-sm text-muted tabular-nums" aria-live="polite">
          {score.right} / {score.total} right
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold">Which family does it belong to?</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Families">
        {I_GROUP_ORDER.map((g) => {
          const isActual = answered && g === actual
          const isWrong = answered && g === guess && g !== actual
          return (
            <button
              key={g}
              type="button"
              disabled={answered && !isActual && !isWrong}
              onClick={() => choose(g)}
              className={cx(
                'flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-3 font-semibold transition-colors',
                isActual && 'border-success bg-success-soft text-success',
                isWrong && 'border-error bg-error-soft text-error',
                !answered && 'border-border bg-surface hover:border-primary/60',
                answered && !isActual && !isWrong && 'border-border opacity-50',
              )}
            >
              {isActual && <Check aria-hidden className="size-4" />}
              {isWrong && <X aria-hidden className="size-4" />}
              <Fi>{I_GROUP_INFO[g].model}</Fi>&nbsp;family
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="animate-rise-in mt-3 rounded-xl border border-border bg-surface-2 p-3" role="status">
          <p className="font-semibold">
            {guess === actual ? 'Right!' : 'Not quite.'} <Fi>{lex.lemma}</Fi> is in the {familyName(actual)}: <Fi>{grammar.primary(lex, 'sg.genitive')}</Fi>,{' '}
            <Fi>{grammar.primary(lex, 'sg.partitive')}</Fi>, <Fi>{grammar.primary(lex, 'pl.partitive')}</Fi>
          </p>
          <p className="mt-1 text-sm text-muted">
            Key change: {I_GROUP_INFO[actual].keyChange.en}. Its declension type is {typeName(lex.typeId)} (Kotus {grammar.type(lex).kotus}).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={next} icon={<Shuffle aria-hidden className="size-4" />}>
              Next word
            </Button>
            <Link to={`/reference/${encodeURIComponent(lex.id)}`} className="inline-flex min-h-11 items-center gap-1 px-2 font-semibold text-primary hover:underline">
              All forms <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function INounLabPage() {
  const mode = useSettings((s) => s.mode)
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/noun-types" className="font-semibold text-primary hover:underline">
          Noun types
        </Link>
        <span className="text-muted"> / -i words</span>
      </nav>
      <PageHeader
        title="-i Noun Lab"
        fi="I-loppuiset sanat"
        why="Words ending in -i look alike but inflect in different ways. For learning, their twelve declension types are grouped into four learning families. The genitive and the partitive tell you which: pankin/pankkia, lehden/lehteä, kielen/kieltä, uuden/uutta."
        next={{ to: '/noun-types/k27', label: 'The käsi type (Kotus 27)' }}
      />

      <p className="rounded-2xl border border-border bg-surface p-4 text-[0.95rem]" data-testid="learning-family-note">
        <span className="font-semibold">Learning families, not official classes. </span>
        {LEARNING_FAMILY_NOTE.en}
      </p>

      <div className="rounded-2xl border border-warning/40 bg-warning-soft p-4">
        <p className="flex flex-wrap items-center gap-2 font-semibold text-warning">
          <StatusLabel label="lexical" /> You cannot always tell the family from the spelling
        </p>
        <p className="mt-1 text-[0.95rem]">
          <Fi>tili</Fi> and <Fi>tiili</Fi>, <Fi>lasi</Fi> and <Fi>käsi</Fi> look alike but inflect differently. There are good hints (new loanwords are in the
          pankki family; old words like <Fi>vesi</Fi>, <Fi>käsi</Fi> are not), but the safe way is to learn each -i word with its genitive and partitive.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {I_GROUP_ORDER.map((g) => {
          const info = I_GROUP_INFO[g]
          const model = grammar.require(info.model)
          const summary = pickText(info.summary, mode)
          const recognize = pickText(info.recognize, mode)
          return (
            <li key={g}>
              <Card as="article" className="flex h-full flex-col">
                <h2 className="text-lg font-bold">{pickLabel(info.title, mode)}</h2>
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">Learning family</p>
                <p className="text-sm font-semibold text-[var(--stem-fg)]">{info.keyChange.en}</p>
                <p className="mt-2 text-[1.05rem]">
                  <Fi className="font-semibold">{model.lemma}</Fi> → <Fi className="font-semibold">{grammar.primary(model, 'sg.genitive')}</Fi>,{' '}
                  <Fi className="font-semibold">{grammar.primary(model, 'sg.partitive')}</Fi>
                </p>
                <p className="mt-2 text-sm" lang={summary.lang}>
                  <RichText text={summary.main} />
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-semibold">What its types share: </span>
                  <RichText text={info.criterion.en} />
                </p>
                <p className="mt-2 text-sm text-muted" lang={recognize.lang}>
                  <RichText text={recognize.main} />
                </p>
                {/* The declension types this family groups, read from the registry, each with its own name. */}
                <ul className="mt-auto space-y-0.5 pt-3 text-xs text-muted" aria-label={`Declension types in the ${familyName(g)}`}>
                  {typesOfFamily(g).map((d) => (
                    <li key={d.id}>
                      <Link to={`/noun-types/${d.id}`} className="font-semibold text-primary hover:underline">
                        {typeName(d.id)}
                      </Link>{' '}
                      · Kotus {d.kotus} · {wordsOfType(d.id).length} word
                      {wordsOfType(d.id).length === 1 ? '' : 's'}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          )
        })}
      </ul>

      <section aria-labelledby="inside" className="space-y-3">
        <h2 id="inside" className="text-lg font-semibold">
          Inside each family: the types and their own forms
        </h2>
        <p className="text-sm text-muted">
          Each row is one Kotus declension type, shown with its own model word. All stems and forms come from the grammar engine. The types of a family share
          the pattern named in its card; the notes say what each type does differently.
        </p>
        {I_GROUP_ORDER.map((g) => (
          <Card key={g} as="article" aria-labelledby={`inside-${g}`}>
            <h3 id={`inside-${g}`} className="text-lg font-semibold leading-snug">
              {pickLabel(I_GROUP_INFO[g].title, mode)}: {typesOfFamily(g).length === 1 ? 'one type' : `${typesOfFamily(g).length} types`}
            </h3>
            <p className="mt-0.5 mb-3 text-sm text-muted">
              <span className="font-semibold">Shared: </span>
              <RichText text={I_GROUP_INFO[g].criterion.en} />
            </p>
            <FamilyTypes group={g} />
          </Card>
        ))}
      </section>

      <Card>
        <CardTitle sub="The highlighted rows are the forms to learn with every -i word. Tap any form to see how it is built.">Side by side</CardTitle>
        <ITypeComparison />
      </Card>

      <Card>
        <CardTitle sub="Guess first — then check the key forms.">Which family?</CardTitle>
        <FamilySorter />
      </Card>

      <section aria-labelledby="pairs" className="space-y-3">
        <h2 id="pairs" className="text-lg font-semibold">
          Look-alikes
        </h2>
        <MinimalPairs />
      </section>

      <Card>
        <CardTitle>More words in each family</CardTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {I_GROUP_ORDER.map((g) => {
            const words = I_GROUP_INFO[g].featured.map((id) => grammar.get(id)).filter((w): w is NonNullable<typeof w> => !!w)
            return (
              <div key={g}>
                <h3 className="mb-1.5 font-semibold">{pickLabel(I_GROUP_INFO[g].title, mode)}</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {words.map((w) => (
                    <li key={w.id}>
                      <Link
                        to={`/reference/${encodeURIComponent(w.id)}`}
                        className="inline-flex flex-col rounded-xl border border-border bg-surface px-2.5 py-1 leading-tight hover:bg-surface-2"
                      >
                        <Fi className="font-semibold">{w.lemma}</Fi>
                        <Fi className="text-xs text-muted">
                          {grammar.primary(w, 'sg.genitive')}, {grammar.primary(w, 'sg.partitive')}
                        </Fi>
                        <span className="text-[0.7rem] text-muted">{typeName(w.typeId, { kotus: true })}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

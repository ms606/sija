import { ArrowLeft, ArrowRight, Dumbbell } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { DeclensionTable } from '../../components/grammar/DeclensionTable'
import { FormLine } from '../../components/grammar/FormLine'
import { RichText } from '../../components/grammar/RichText'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { StatusLabel } from '../../components/ui/StatusLabel'
import { RULES } from '../../data/explanations/rules'
import { I_TYPE_NOTES } from '../../data/noun-families'
import { DECLENSION_TYPES } from '../../grammar'
import type { SlotKey, TypeId } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { familyName, patternLabel, ruleText, slotLabel, slotShort, typeName } from '../../services/content/text'
import { exampleWord, modelLexeme, typeDefs, typesOfFamily, wordsOfType } from '../../services/content/types'
import { useSettings } from '../../stores/settings'
import NotFoundPage from '../NotFoundPage'

const KEY_SLOTS: SlotKey[] = ['sg.nominative', 'sg.genitive', 'sg.partitive', 'sg.illative', 'pl.genitive', 'pl.partitive']

/** How this type relates to the -i learning family it is taught in. */
function FamilyNote({ typeId }: { typeId: TypeId }) {
  const def = DECLENSION_TYPES[typeId]!
  const group = def.iGroup!
  const others = typesOfFamily(group).filter((d) => d.id !== typeId)
  const note = I_TYPE_NOTES[typeId]
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-3 text-sm" data-testid="family-note">
      <p>
        <span className="font-semibold">{typeName(typeId)}</span> (Kotus {def.kotus}) is a declension type of its own, and its Kotus type decides its forms. For
        learning, the app teaches it in the{' '}
        <Link to="/noun-types/i-words" className="font-semibold text-primary hover:underline">
          {familyName(group)}
        </Link>
        , a teaching group of -i types that share one stem pattern (not an official class)
        {others.length === 0 ? (
          <>, which has no other type.</>
        ) : (
          <>
            {' '}
            together with{' '}
            {others.map((d, i) => (
              <span key={d.id}>
                {i > 0 && (i === others.length - 1 ? ' and ' : ', ')}
                <Link to={`/noun-types/${d.id}`} className="font-semibold text-primary hover:underline">
                  {typeName(d.id)}
                </Link>{' '}
                (Kotus {d.kotus})
              </span>
            ))}
            .
          </>
        )}
      </p>
      {note && (
        <p>
          <span className="font-semibold">Within the family: </span>
          <RichText text={note.en} />
        </p>
      )}
    </div>
  )
}

export default function NounTypeDetailPage() {
  const { typeId = '' } = useParams()
  const mode = useSettings((s) => s.mode)
  const def = DECLENSION_TYPES[typeId]
  if (!def) return <NotFoundPage />
  const id = typeId as TypeId
  const all = typeDefs()
  const idx = all.findIndex((d) => d.id === id)
  const prev = all[idx - 1]
  const next = all[idx + 1]
  /** The type's own model word (for stems and key forms) and a learner word of the type (for the tappable full table). */
  const model = modelLexeme(id)
  const ex = exampleWord(id)
  const words = wordsOfType(id)
  const membership = RULES[def.membershipRuleId]
    ? ruleText(def.membershipRuleId, { kotus: String(def.kotus), model: def.modelWord, ...(def.iGroup ? { group: def.iGroup } : {}) }, mode)
    : null
  const stems = model ? grammar.stems(model) : null
  const grad = model ? grammar.gradation(model) : null
  const gradWords = words.filter((w) => grammar.gradation(w))

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/noun-types" className="font-semibold text-primary hover:underline">
          Noun types
        </Link>
        <span className="text-muted"> / {typeName(id)}</span>
      </nav>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{typeName(id)}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">Kotus {def.kotus}</Badge>
          <span className="text-sm text-muted">
            model word <Fi className="font-semibold text-text">{def.modelWord}</Fi>
          </span>
          {def.iGroup && (
            <Link to="/noun-types/i-words">
              <Badge tone="warning">Learning family: {familyName(def.iGroup)}</Badge>
            </Link>
          )}
          {def.gradation === 'inverse' && (
            <Badge tone="warning">{gradWords.length === words.length ? 'inverse gradation' : 'inverse gradation in some words'}</Badge>
          )}
          {def.gradation === 'intrinsic' && <Badge>built-in t ~ d</Badge>}
        </div>
      </header>

      {def.iGroup && <FamilyNote typeId={id} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>Who belongs here?</CardTitle>
          <p className="flex flex-wrap items-baseline gap-2">
            <StatusLabel label={def.membership} />
            {membership && <span lang={membership.lang}>{membership.main}</span>}
          </p>
          {def.notes?.map((n) =>
            RULES[n] ? (
              <p key={n} className="mt-2 text-sm text-muted">
                {ruleText(n, { kotus: String(def.kotus), model: def.modelWord }, mode).main}
              </p>
            ) : null,
          )}
        </Card>

        {model && stems && (
          <Card>
            <CardTitle sub={`The stems of the model word ${model.lemma} — every form is built on one of them.`}>Stems</CardTitle>
            <dl className="divide-y divide-border">
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-sm text-muted">Base form</dt>
                <dd className="font-semibold">
                  <Fi>{stems.lemma}</Fi>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-sm text-muted">Vowel stem</dt>
                <dd className="font-semibold">
                  <Fi>
                    {stems.vowelStrong.text}-{stems.vowelWeak.text !== stems.vowelStrong.text && ` / ${stems.vowelWeak.text}-`}
                  </Fi>
                </dd>
              </div>
              {stems.consonant && stems.consonant.text !== stems.lemma && (
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  <dt className="text-sm text-muted">Consonant stem</dt>
                  <dd className="font-semibold">
                    <Fi>{stems.consonant.text}-</Fi>
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-sm text-muted">Plural stem</dt>
                <dd className="font-semibold">
                  <Fi>{stems.plural.map((p) => (p.strong === p.weak ? `${p.strong}-` : `${p.strong}- / ${p.weak}-`)).join(' · ')}</Fi>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-sm text-muted">Key forms</dt>
                <dd className="text-right font-semibold" data-testid="model-forms">
                  <Fi>
                    {KEY_SLOTS.map((s) =>
                      grammar
                        .inflect(model, s)
                        .variants.map((v) => v.text)
                        .join(' ~ '),
                    ).join(' – ')}
                  </Fi>
                </dd>
              </div>
              {grad && (
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  <dt className="text-sm text-muted">Gradation</dt>
                  <dd>
                    <Link to={`/gradation/${grad.pattern}`} className="seg seg-grade font-semibold">
                      <Fi>{patternLabel(grad.pattern)}</Fi>
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        )}
      </div>

      {words.length > 0 && (
        <Card>
          <CardTitle sub="Principal parts of every word of this type in the app. Tap a form to see how it is built.">
            Words of this type ({words.length})
          </CardTitle>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[40rem] text-left">
              <thead>
                <tr className="text-xs font-bold tracking-wide text-muted uppercase">
                  {KEY_SLOTS.map((s) => (
                    <th key={s} scope="col" className="border-b border-border px-1 py-2">
                      <span className="sm:hidden">{slotShort(s)}</span>
                      <span className="max-sm:hidden">{slotLabel(s, mode)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {words.map((w) => (
                  <tr key={w.id}>
                    {KEY_SLOTS.map((s) => (
                      <td key={s} className="border-b border-border py-1.5 align-top">
                        {s === 'sg.nominative' ? (
                          <Link to={`/reference/${encodeURIComponent(w.id)}`} className="block px-1 hover:underline">
                            <Fi className="font-semibold">{w.lemma}</Fi>
                            <span className="block text-xs text-muted">{w.gloss.en.split(';')[0]}</span>
                          </Link>
                        ) : (
                          <FormLine lexeme={w} slot={s} size="sm" audio={false} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {def.gradation !== 'none' && gradWords.length < words.length && gradWords.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Only some words of this type have consonant gradation ({gradWords.map((w) => w.lemma).join(', ')}). Whether a word alternates is part of the word.
            </p>
          )}
        </Card>
      )}

      {ex && (
        <Card>
          <CardTitle
            sub={
              ex.lemma === def.modelWord ? (
                'Every case, singular and plural.'
              ) : (
                <>
                  Every case, singular and plural. <Fi>{ex.lemma}</Fi> is a {typeName(id)} word (Kotus {def.kotus}) taught in the app; the model word{' '}
                  <Fi>{def.modelWord}</Fi> is not one of the learner words.
                </>
              )
            }
          >
            All forms of <Fi>{ex.lemma}</Fi>
          </CardTitle>
          <DeclensionTable lexeme={ex} />
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonLink to={`/practice/session?skill=type:${id}`} variant="primary" icon={<Dumbbell aria-hidden className="size-4" />}>
          Practise this type
        </ButtonLink>
        <div className="flex gap-2">
          {prev && (
            <ButtonLink to={`/noun-types/${prev.id}`} variant="ghost" icon={<ArrowLeft aria-hidden className="size-4" />}>
              Kotus {prev.kotus}
            </ButtonLink>
          )}
          {next && (
            <ButtonLink to={`/noun-types/${next.id}`} variant="ghost">
              Kotus {next.kotus}
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  )
}

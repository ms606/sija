import { Link, useParams, useSearchParams } from 'react-router'
import { CASES_INFO } from '../../data/cases'
import { RULES } from '../../data/explanations/rules'
import { AudioButton } from '../../components/audio/AudioButton'
import { DeclensionTable } from '../../components/grammar/DeclensionTable'
import { DerivationPipeline } from '../../components/grammar/DerivationPipeline'
import { SentenceLine } from '../../components/grammar/SentenceLine'
import { NounImage } from '../../components/media/NounImage'
import { Badge } from '../../components/ui/Badge'
import { Card, CardTitle } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { Segmented } from '../../components/ui/Segmented'
import { StatusLabel } from '../../components/ui/StatusLabel'
import { ALL_SLOTS, parseSlot, type SlotKey } from '../../grammar'
import { grammar } from '../../services/grammar'
import { I_GROUP_LABEL, patternLabel, pickText, slotLabel, typeName } from '../../services/content/text'
import { sentencesFor } from '../../services/content/sentences'
import { useSettings } from '../../stores/settings'

const KEY_SLOTS: SlotKey[] = ['sg.genitive', 'sg.partitive', 'sg.illative', 'sg.inessive', 'pl.nominative', 'pl.genitive', 'pl.partitive']

function shortSlot(slot: SlotKey): string {
  const { number, kase } = parseSlot(slot)
  return `${CASES_INFO[kase].en.slice(0, 3)}. ${number}`
}

export default function NounDetailPage() {
  const { nounId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const mode = useSettings((s) => s.mode)
  const noun = grammar.get(decodeURIComponent(nounId))
  if (!noun) {
    return (
      <p>
        No word "{nounId}". <Link to="/reference" className="font-semibold text-primary">Search again</Link>
      </p>
    )
  }
  const requested = params.get('slot') as SlotKey | null
  const slot: SlotKey = requested && ALL_SLOTS.includes(requested) ? requested : 'sg.genitive'
  const stems = grammar.stems(noun)
  const grad = grammar.gradation(noun)
  const def = grammar.type(noun)
  const sentences = sentencesFor(noun.id).slice(0, 8)
  const related = grammar.lexicon.filter((n) => n.typeId === noun.typeId && n.id !== noun.id).slice(0, 14)
  const slotOptions = (KEY_SLOTS.includes(slot) ? KEY_SLOTS : [...KEY_SLOTS, slot]).map((s) => ({ value: s, label: shortSlot(s) }))

  const stemRows: { label: string; text: string; note?: string }[] = [{ label: 'Base form', text: noun.lemma }]
  if (stems.vowelStrong.text !== stems.vowelWeak.text) {
    stemRows.push({ label: 'Vowel stem — strong grade', text: `${stems.vowelStrong.text}-` })
    stemRows.push({ label: 'Vowel stem — weak grade', text: `${stems.vowelWeak.text}-` })
  } else {
    stemRows.push({ label: 'Vowel stem', text: `${stems.vowelStrong.text}-` })
  }
  if (stems.consonant && stems.consonant.text !== noun.lemma) stemRows.push({ label: 'Consonant stem', text: `${stems.consonant.text}-`, note: 'for -ta/-tä and -ten' })
  stems.plural.forEach((p, i) =>
    stemRows.push({ label: stems.plural.length > 1 ? `Plural stem ${i + 1}` : 'Plural stem', text: p.strong === p.weak ? `${p.strong}-` : `${p.strong}- / ${p.weak}-` }),
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <NounImage noun={noun} context="card" size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">
              <Fi>{noun.lemma}</Fi>
            </h1>
            <AudioButton text={noun.lemma} size="lg" />
          </div>
          <p className="mt-1 text-lg text-muted">{noun.gloss.en}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {noun.pos !== 'noun' && <Badge>{noun.pos}</Badge>}
            <Link to={`/noun-types/${noun.typeId}`}>
              <Badge tone="primary">{typeName(noun.typeId, { kotus: mode !== 'beginner' })}</Badge>
            </Link>
            {mode === 'beginner' && <Badge>Kotus {noun.kotus || `${def.kotus} (compound)`}</Badge>}
            {def.iGroup && (
              <Link to="/noun-types/i-words">
                <Badge tone="warning">-i word: {I_GROUP_LABEL[def.iGroup]}</Badge>
              </Link>
            )}
            {noun.compound && (
              <Badge>
                compound: <Fi>{noun.compound.modifier}</Fi> + <Fi>{noun.lemma.slice(noun.compound.modifier.length)}</Fi>
              </Badge>
            )}
          </div>
        </div>
      </header>

      {(noun.homonyms?.length || noun.notes?.length) && (
        <div className="space-y-2">
          {noun.homonyms?.map((h) => {
            const other = grammar.get(h)
            return other ? (
              <p key={h} className="rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm">
                <strong>Same spelling, different word:</strong> <Fi>{other.lemma}</Fi> "{other.gloss.en}" declines differently (
                <Fi>{grammar.primary(other, 'sg.genitive')}</Fi>, <Fi>{grammar.primary(other, 'sg.partitive')}</Fi>).{' '}
                <Link to={`/reference/${encodeURIComponent(other.id)}`} className="font-semibold text-primary hover:underline">
                  Compare →
                </Link>
              </p>
            ) : null
          })}
          {noun.notes?.map((n) =>
            RULES[n] ? (
              <p key={n} className="rounded-xl border border-border bg-surface p-3 text-sm">
                💡 {pickText(RULES[n]!, mode).main}
              </p>
            ) : null,
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardTitle sub="What the engine works with when it builds forms.">How this word works</CardTitle>
          <dl className="divide-y divide-border">
            {stemRows.map((r) => (
              <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <dt className="text-sm text-muted">
                  {r.label}
                  {r.note && <span className="block text-xs">{r.note}</span>}
                </dt>
                <dd className="text-lg font-semibold">
                  <Fi>{r.text}</Fi>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
            {grad ? (
              <>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  Consonant gradation:
                  <Fi className="seg seg-grade">{patternLabel(grad.pattern)}</Fi>
                  {grad.direction === 'inverse' && <Badge tone="warning">inverse</Badge>}
                  {grad.intrinsic && <StatusLabel label="pattern" />}
                </p>
                <p className="mt-1 text-muted">
                  {grad.direction === 'inverse'
                    ? `The base form has the weak grade (${grad.weak || '∅'}); the stem forms have the strong grade (${grad.strong}).`
                    : `Strong grade (${grad.strong}) in the base form; weak grade (${grad.weak || '∅'}) where the ending closes the syllable.`}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Weak:</span>{' '}
                  {grad.weakSlots
                    .filter((s) => s.startsWith('sg'))
                    .map((s) => CASES_INFO[parseSlot(s).kase].en)
                    .join(', ')}{' '}
                  (singular)
                </p>
              </>
            ) : (
              <p>
                No consonant gradation — the stem consonants stay the same in every form.
                {noun.noGradationNote && RULES[noun.noGradationNote] && <span className="block text-muted">{pickText(RULES[noun.noGradationNote]!, mode).main}</span>}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle sub="Pick a form and follow it from the base word to a real sentence.">How a form is built</CardTitle>
          <Segmented label="Form to explain" size="sm" value={slot} options={slotOptions} onChange={(v) => setParams({ slot: v }, { replace: true, preventScrollReset: true })} className="mb-4" />
          <p className="mb-3 text-sm text-muted">{slotLabel(slot, mode)}</p>
          <DerivationPipeline key={slot} lexemeId={noun.id} slot={slot} />
        </Card>
      </div>

      <Card>
        <CardTitle sub="Tap any form to see how it is built.">All forms</CardTitle>
        <DeclensionTable lexeme={noun} highlight={slot} />
      </Card>

      {sentences.length > 0 && (
        <Card>
          <CardTitle>In sentences</CardTitle>
          <ul className="space-y-3">
            {sentences.map((s) => (
              <li key={s.sentence.id}>
                <SentenceLine view={s} translation={s.sentence.en} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {related.length > 0 && (
        <Card>
          <CardTitle sub="These words inflect the same way.">Same type: {typeName(noun.typeId)}</CardTitle>
          <ul className="flex flex-wrap gap-2">
            {related.map((n) => (
              <li key={n.id}>
                <Link to={`/reference/${encodeURIComponent(n.id)}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 hover:bg-surface-2">
                  <Fi className="font-semibold">{n.lemma}</Fi>
                  <span className="text-xs text-muted">{grammar.primary(n, 'sg.genitive')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

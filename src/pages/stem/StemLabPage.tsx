import { ArrowRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { WordBuilder, type BuilderState } from '../../components/grammar/WordBuilder'
import { RoleLegend } from '../../components/grammar/MorphologyBreakdown'
import { PageHeader } from '../../components/ui/PageHeader'
import { ALL_SLOTS, PERSONS } from '../../grammar'
import type { PersonId, PieceRole, SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'

const ROLES: PieceRole[] = ['root', 'grade', 'stem', 'plural', 'ending', 'possessive', 'exception']

export default function StemLabPage() {
  const [params, setParams] = useSearchParams()
  const w = params.get('w') ?? 'kauppa'
  const slotParam = params.get('slot') as SlotKey | null
  const px = params.get('px') as PersonId | null
  const state: BuilderState = {
    word: grammar.get(w) ? w : 'kauppa',
    slot: slotParam && ALL_SLOTS.includes(slotParam) ? slotParam : 'sg.genitive',
    person: px && PERSONS.includes(px) ? px : null,
    highlight: (params.get('hl') ?? '').split(',').filter((r): r is PieceRole => ROLES.includes(r as PieceRole)),
  }
  const onChange = (next: BuilderState) => {
    const p: Record<string, string> = { w: next.word, slot: next.slot }
    if (next.person) p.px = next.person
    if (next.highlight.length) p.hl = next.highlight.join(',')
    setParams(p, { replace: true, preventScrollReset: true })
  }
  return (
    <div className="space-y-5">
      <PageHeader
        title="Stem Lab"
        fi="Vartalolaboratorio"
        why="Build any form step by step: base word → word type → stem → stem change → ending → final form. Change one choice at a time and watch what moves."
        actions={
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link to="/stem-lab/harmony" className="inline-flex items-center gap-1 text-primary hover:underline">
              Vowel harmony <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link to="/stem-lab/possessives" className="inline-flex items-center gap-1 text-primary hover:underline">
              Possessives <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        }
      />
      <RoleLegend />
      <WordBuilder state={state} onChange={onChange} />
    </div>
  )
}

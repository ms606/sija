import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AudioButton } from '../../components/audio/AudioButton'
import { NounImage } from '../../components/media/NounImage'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { Segmented } from '../../components/ui/Segmented'
import { THEME_LABEL } from '../../data/themes'
import { looseKey } from '../../grammar'
import { grammar } from '../../services/grammar'
import { pickLabel, typeName } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import type { Noun, ThemeId } from '../../types/content'
import { cx } from '../../utils/cx'

const KEY = ['sg.genitive', 'sg.partitive', 'pl.partitive'] as const

function keyForms(n: Noun): string {
  return KEY.map((s) => grammar.primary(n, s))
    .filter(Boolean)
    .join(' · ')
}

function Flashcards({ words }: { words: Noun[] }) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const startX = useRef<number | null>(null)
  const swiped = useRef(false)
  const n = words[i % Math.max(1, words.length)]
  if (!n) return <p className="text-muted">No words match the filters.</p>
  const go = (d: number) => {
    setFlipped(false)
    setI((x) => (x + d + words.length) % words.length)
  }
  return (
    <div
      className="mx-auto max-w-md space-y-3"
      // Swipe left/right on touch screens; arrow keys on a keyboard.
      onPointerDown={(e) => {
        startX.current = e.clientX
      }}
      onPointerUp={(e) => {
        const dx = startX.current === null ? 0 : e.clientX - startX.current
        startX.current = null
        if (Math.abs(dx) > 60) {
          swiped.current = true
          go(dx < 0 ? 1 : -1)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
    >
      <p className="text-center text-sm text-muted tabular-nums">
        {(i % words.length) + 1} / {words.length}
      </p>
      <button
        type="button"
        onClick={() => {
          // A swipe also ends in a click on the card; do not flip it then.
          if (swiped.current) {
            swiped.current = false
            return
          }
          setFlipped((f) => !f)
        }}
        className="flex min-h-72 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-border bg-surface p-6 text-center shadow-card hover:border-primary/60"
        aria-label={flipped ? `${n.lemma}: ${keyForms(n)}. Tap to hide` : `${n.lemma}. Tap to show the key forms. Swipe or use the arrow keys for the next card`}
      >
        <NounImage noun={n} context="card" size="lg" />
        <Fi className="text-4xl font-bold">{n.lemma}</Fi>
        <span className="text-muted">{n.gloss.en}</span>
        {flipped ? (
          <span className="animate-rise-in space-y-1">
            <Fi className="block text-xl font-semibold text-primary-strong">{keyForms(n)}</Fi>
            <span className="block text-xs text-muted">genitive · partitive · plural partitive — {typeName(n.typeId)}</span>
          </span>
        ) : (
          <span className="text-sm font-semibold text-primary">What are its key forms? Tap to check.</span>
        )}
      </button>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => go(-1)} icon={<ArrowLeft aria-hidden className="size-4" />}>
          Previous
        </Button>
        <AudioButton text={flipped ? `${n.lemma}, ${keyForms(n).replaceAll(' · ', ', ')}` : n.lemma} />
        <Button variant="primary" onClick={() => go(1)}>
          Next <ArrowRight aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export default function VocabularyPage() {
  const mode = useSettings((s) => s.mode)
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'cards' ? 'cards' : 'grid'
  const theme = (params.get('theme') ?? '') as ThemeId | ''
  const q = params.get('q') ?? ''
  const level = Number(params.get('level') ?? 0)
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }
  const themes = (Object.keys(THEME_LABEL) as ThemeId[]).filter((t) => grammar.lexicon.some((l) => l.themes.includes(t)))
  const lq = looseKey(q)
  const words = grammar.lexicon
    .filter((l) => (!theme || l.themes.includes(theme)) && (!level || l.level <= level))
    .filter((l) => !q || looseKey(l.lemma).includes(lq) || l.gloss.en.toLowerCase().includes(q.toLowerCase()))
    .slice()
    .sort((a, b) => a.lemma.localeCompare(b.lemma, 'fi'))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vocabulary"
        fi="Sanasto"
        why="Every word in the app, with the three forms that unlock all the others: genitive, partitive and plural partitive."
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Search
          <input
            type="search"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="talo, house…"
            className="min-h-11 w-48 rounded-lg border border-border-strong bg-surface px-3 font-normal"
            lang="fi"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Topic
          <select value={theme} onChange={(e) => update({ theme: e.target.value })} className="min-h-11 rounded-lg border border-border-strong bg-surface px-2 font-normal">
            <option value="">All topics</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {pickLabel(THEME_LABEL[t], mode)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Up to level
          <select value={level || ''} onChange={(e) => update({ level: e.target.value })} className="min-h-11 rounded-lg border border-border-strong bg-surface px-2 font-normal">
            <option value="">All levels</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((l) => (
              <option key={l} value={l}>
                Level {l}
              </option>
            ))}
          </select>
        </label>
        <Segmented
          label="View"
          size="sm"
          value={view}
          options={[
            { value: 'grid', label: 'Cards' },
            { value: 'cards', label: 'Flashcards' },
          ]}
          onChange={(v) => update({ view: v === 'cards' ? 'cards' : '' })}
          className="ml-auto"
        />
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {words.length} words
        {(q || theme || level > 0) && (
          <button type="button" onClick={() => setParams({}, { replace: true })} className="ml-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            <RotateCcw aria-hidden className="size-3.5" /> clear filters
          </button>
        )}
      </p>
      {view === 'cards' ? (
        <Flashcards words={words} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {words.map((n) => (
            <li key={n.id}>
              <Card as="article" className={cx('relative flex h-full flex-col gap-2 p-3 transition-colors hover:border-primary/60 sm:p-4')}>
                <div className="flex items-center gap-3">
                  <NounImage noun={n} context="chip" size="md" />
                  <div className="min-w-0">
                    <h2 className="text-lg leading-tight font-bold">
                      <Link to={`/reference/${encodeURIComponent(n.id)}`} className="after:absolute after:inset-0 after:rounded-2xl after:content-['']">
                        <Fi>{n.lemma}</Fi>
                      </Link>
                    </h2>
                    <p className="truncate text-sm text-muted">{n.gloss.en}</p>
                  </div>
                  <AudioButton text={n.lemma} size="sm" slow={false} className="relative z-10 ml-auto" />
                </div>
                <Fi className="text-[0.95rem]">{keyForms(n)}</Fi>
                <span className="mt-auto text-xs text-muted">{typeName(n.typeId)}</span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

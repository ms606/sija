import { ArrowLeft, ArrowRight, List, RotateCcw } from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AudioButton } from '../../components/audio/AudioButton'
import { ColoredForm } from '../../components/grammar/ColoredForm'
import { FormLine } from '../../components/grammar/FormLine'
import { NounImage } from '../../components/media/NounImage'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Fi } from '../../components/ui/FiText'
import { PageHeader } from '../../components/ui/PageHeader'
import { Segmented } from '../../components/ui/Segmented'
import { Sheet } from '../../components/ui/Sheet'
import { THEME_LABEL } from '../../data/themes'
import { grammar } from '../../services/grammar'
import { CONSONANT_STEM_USE, wordStems, type StemForm } from '../../services/content/stems'
import { pickLabel, slotLabel, typeName } from '../../services/content/text'
import { deckIndex, letterGroups, letterJump, letterOf, vocabularyWords, wordMatcher } from '../../services/content/vocabulary'
import { useSettings } from '../../stores/settings'
import { useVocabularyPlace } from '../../stores/vocabulary'
import type { Noun, ThemeId } from '../../types/content'
import { cx } from '../../utils/cx'

const KEY = ['sg.genitive', 'sg.partitive', 'pl.partitive'] as const

function keyForms(n: Noun): string {
  return KEY.map((s) => grammar.primary(n, s))
    .filter(Boolean)
    .join(' · ')
}

/** How much of the top of the window the sticky header and the view-and-letters bar cover. */
function coveredTop(bar: HTMLElement | null): number {
  return bar ? (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight : 0
}

/** Scrolls so that `el` sits just below the covered top. */
function scrollBelow(el: Element, covered: number) {
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - covered - 8 })
}

/**
 * The word the learner is looking at in the grid: the current word while its
 * card is still wholly on screen, otherwise the first card wholly below the
 * covered top.
 */
function wordInView(list: HTMLElement, covered: number, current: string | null): string | null {
  const cards = [...list.querySelectorAll<HTMLElement>('[data-word]')]
  const card = current ? cards.find((c) => c.dataset.word === current) : undefined
  if (card) {
    const r = card.getBoundingClientRect()
    if (r.top >= covered - 1 && r.bottom <= window.innerHeight + 1) return current
  }
  // Card tops only grow down the list, so the first one below the line can be found by halving.
  let lo = 0
  let hi = cards.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cards[mid]!.getBoundingClientRect().top >= covered - 1) hi = mid
    else lo = mid + 1
  }
  return cards[lo]?.dataset.word ?? null
}

/** A–Ö: one button per letter the words start with, in one row that scrolls sideways when it does not fit. */
function LetterStrip({ words, current, onJump }: { words: Noun[]; current: string | undefined; onJump: (letter: string, index: number) => void }) {
  const ref = useRef<HTMLElement>(null)
  // Which ends of the row have letters scrolled out of sight: those ends fade out.
  const [hidden, setHidden] = useState({ left: false, right: false })
  useEffect(() => {
    const nav = ref.current
    if (!nav || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const left = nav.scrollLeft > 1
      const right = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1
      setHidden((h) => (h.left === left && h.right === right ? h : { left, right }))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    nav.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      nav.removeEventListener('scroll', measure)
    }
  }, [words.length])
  // Keep the current letter in sight within the row.
  useEffect(() => {
    const nav = ref.current
    const button = nav?.querySelector('[aria-current="true"]')
    if (!nav || !button) return
    const [b, n] = [button.getBoundingClientRect(), nav.getBoundingClientRect()]
    if (b.left < n.left || b.right > n.right) nav.scrollLeft += b.left - n.left - (n.width - b.width) / 2
  }, [current])
  const groups = letterGroups(words)
  if (groups.length === 0) return null
  return (
    <nav
      ref={ref}
      aria-label="Jump to a letter"
      className="flex min-w-0 flex-1 gap-1 overflow-x-auto p-1.5 [scrollbar-width:thin]"
      style={{ maskImage: `linear-gradient(to right, ${hidden.left ? 'transparent, black 2rem' : 'black'}, ${hidden.right ? 'black calc(100% - 2rem), transparent' : 'black'})` }}
    >
      {groups.map((g) => (
        <button
          key={g.letter}
          type="button"
          onClick={() => onJump(g.letter, g.index)}
          aria-label={`${g.letter}, ${g.words.length} ${g.words.length === 1 ? 'word' : 'words'}`}
          aria-current={g.letter === current ? 'true' : undefined}
          className={cx(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold',
            g.letter === current ? 'border-transparent bg-primary text-on-primary' : 'border-border bg-surface hover:bg-surface-2',
          )}
        >
          {g.letter}
        </button>
      ))}
    </nav>
  )
}

/** A stem in the form colours, with its hyphen. */
function StemText({ stem }: { stem: StemForm }) {
  return (
    <span className="whitespace-nowrap">
      <ColoredForm variant={stem} />-
    </span>
  )
}

/** One line per row where it fits: the label and its note, then the stem or form. */
function CardRow({ label, sub, children }: { label: string; sub?: string | undefined; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
      <dt className="text-sm text-muted">
        {label}
        {sub && <span className="text-xs">, {sub}</span>}
      </dt>
      <dd className="ml-auto text-right text-[1.05rem] font-semibold">{children}</dd>
    </div>
  )
}

/** The back of a flashcard: the stems in the form colours, then the key forms, each tappable to see how it is built. */
function CardBack({ id, noun: n, hidden }: { id: string; noun: Noun; hidden: boolean }) {
  const mode = useSettings((s) => s.mode)
  const stems = wordStems(n)
  return (
    <div id={id} hidden={hidden} className="animate-rise-in border-t border-border px-4 sm:px-5">
      <dl className="divide-y divide-border">
        <CardRow label="Vowel stem" sub={stems.vowel.length > 1 ? 'strong · weak' : undefined}>
          {stems.vowel.map((s, i) => (
            <Fragment key={s.text}>
              {i > 0 && ' · '}
              <StemText stem={s} />
            </Fragment>
          ))}
          {stems.vowelAlt.length > 0 && (
            <span className="block text-xs font-normal text-muted">
              also <Fi>{stems.vowelAlt.map((a) => `${a}-`).join(', ')}</Fi>
            </span>
          )}
        </CardRow>
        {stems.consonant && (
          <CardRow label="Consonant stem" sub={CONSONANT_STEM_USE}>
            <StemText stem={stems.consonant} />
          </CardRow>
        )}
        {KEY.map((slot) => (
          <CardRow key={slot} label={slotLabel(slot, mode)}>
            <FormLine lexeme={n} slot={slot} audio={false} />
          </CardRow>
        ))}
      </dl>
    </div>
  )
}

/** Every word of the deck, by letter, to go straight to one. */
function WordListSheet({
  open,
  onClose,
  words,
  current,
  onPick,
}: {
  open: boolean
  onClose: () => void
  words: Noun[]
  current: string
  onPick: (index: number) => void
}) {
  const [q, setQ] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const findId = useId()
  useEffect(() => {
    if (open) listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' })
  }, [open])
  const close = () => {
    setQ('')
    onClose()
  }
  // The list is only built while the sheet is open.
  const groups = open ? letterGroups(words.filter(wordMatcher(q))) : []
  return (
    <Sheet open={open} onClose={close} title={`All words (${words.length})`}>
      {/* The search stays at the top while the list scrolls; the letter headings stick just below it. */}
      <div className="sticky top-0 z-10 bg-surface pb-3">
        <label htmlFor={findId} className="sr-only">
          Find a word
        </label>
        <input
          id={findId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a word…"
          autoComplete="off"
          lang="fi"
          className="min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3"
        />
      </div>
      <div ref={listRef}>
        {open && groups.length === 0 && <p className="text-sm text-muted">No word matches.</p>}
        {groups.map((g) => (
          <section key={g.letter}>
            <h3 className="sticky top-14 bg-surface py-1 text-xs font-bold tracking-wider text-muted">{g.letter}</h3>
            <ul>
              {g.words.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQ('')
                      onPick(words.indexOf(w))
                    }}
                    aria-current={w.id === current ? 'true' : undefined}
                    className={cx('flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-surface-2', w.id === current && 'bg-primary-soft')}
                  >
                    <Fi className="font-semibold">{w.lemma}</Fi>
                    <span className="min-w-0 truncate text-sm text-muted">{w.gloss.en}</span>
                    {w.id === current && <span className="ml-auto shrink-0 text-xs font-semibold text-primary-strong">current card</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  )
}

function Flashcards({
  words,
  index,
  onIndex,
  faceUp,
  onFlip,
}: {
  words: Noun[]
  index: number
  onIndex: (i: number) => void
  faceUp: boolean
  onFlip: () => void
}) {
  const [listOpen, setListOpen] = useState(false)
  const startX = useRef<number | null>(null)
  const swiped = useRef(false)
  const backId = useId()
  const n = words[index]
  if (!n) return <p className="text-muted">No words match the filters.</p>
  const go = (d: number) => onIndex((index + d + words.length) % words.length)
  return (
    <>
      <div
        className="mx-auto max-w-md space-y-3"
        // Swipe left/right on touch screens; arrow keys, Home/End and letter keys on a keyboard.
        onPointerDown={(e) => {
          startX.current = e.clientX
          swiped.current = false
        }}
        onPointerUp={(e) => {
          const dx = startX.current === null ? 0 : e.clientX - startX.current
          startX.current = null
          if (Math.abs(dx) > 60) {
            swiped.current = true
            go(dx < 0 ? 1 : -1)
          }
        }}
        onClickCapture={(e) => {
          // A swipe also ends in a click; it must not flip the card or press anything.
          if (swiped.current) {
            swiped.current = false
            e.stopPropagation()
          }
        }}
        onKeyDown={(e) => {
          if (e.altKey || e.ctrlKey || e.metaKey) return
          let to: number | null
          if (e.key === 'ArrowRight') to = (index + 1) % words.length
          else if (e.key === 'ArrowLeft') to = (index - 1 + words.length) % words.length
          else if (e.key === 'Home') to = 0
          else if (e.key === 'End') to = words.length - 1
          else if (/^\p{L}$/u.test(e.key)) to = letterJump(words, index, e.key)
          else return
          e.preventDefault()
          if (to !== null) onIndex(to)
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm text-muted tabular-nums">
            {index + 1} / {words.length}
          </p>
          <Button variant="ghost" size="sm" aria-haspopup="dialog" onClick={() => setListOpen(true)} icon={<List aria-hidden className="size-4" />}>
            All words
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          <Fi>{n.lemma}</Fi>, {index + 1} of {words.length}
        </p>
        <div className="overflow-hidden rounded-3xl border-2 border-border bg-surface shadow-card">
          {/*
            The whole front turns the card; the photo credit button sits above it. Face
            down, the picture is the memory cue; face up, the front shrinks to one row
            (small picture beside the word) so the stems and forms fit on a phone screen.
          */}
          <div
            className={cx(
              'relative flex hover:bg-surface-2/60',
              faceUp ? 'items-center gap-3 px-4 py-3 text-left' : 'flex-col items-center gap-2 p-4 text-center',
            )}
          >
            <NounImage noun={n} context="card" size={faceUp ? 'md' : 'lg'} />
            <div className={cx('min-w-0', !faceUp && 'contents')}>
              <button
                type="button"
                onClick={onFlip}
                aria-expanded={faceUp}
                aria-controls={backId}
                aria-label={
                  faceUp
                    ? `${n.lemma}, ${n.gloss.en}. Tap to hide the stems and key forms`
                    : `${n.lemma}, ${n.gloss.en}. Tap to show the stems and key forms. Swipe or use the arrow keys for the next card`
                }
                className={cx("font-bold after:absolute after:inset-0 after:content-['']", faceUp ? 'text-3xl' : 'text-4xl')}
              >
                <Fi>{n.lemma}</Fi>
              </button>
              {faceUp ? (
                <span className="block text-sm text-muted">
                  {n.gloss.en} · {typeName(n.typeId)}
                </span>
              ) : (
                <span className="text-muted">{n.gloss.en}</span>
              )}
            </div>
            {!faceUp && <span className="text-sm font-semibold text-primary">What are its stems and key forms? Tap to check.</span>}
          </div>
          <CardBack id={backId} noun={n} hidden={!faceUp} />
        </div>
        {/* Pinned above the phone's tab bar (at the bottom on desktop), so Next never needs a scroll. */}
        <div className="sticky bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-2 bg-bg/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-bg/80 lg:bottom-0">
          <Button variant="ghost" onClick={() => go(-1)} icon={<ArrowLeft aria-hidden className="size-4" />}>
            Previous
          </Button>
          <AudioButton text={faceUp ? `${n.lemma}, ${keyForms(n).replaceAll(' · ', ', ')}` : n.lemma} />
          <Button variant="primary" onClick={() => go(1)}>
            Next <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      <WordListSheet
        open={listOpen}
        onClose={() => setListOpen(false)}
        words={words}
        current={n.id}
        onPick={(i) => {
          setListOpen(false)
          onIndex(i)
        }}
      />
    </>
  )
}

/** The card grid, by letter. It comes back to the remembered word and keeps the word in view as the place to return to. */
function WordGrid({
  words,
  wordId,
  filterKey,
  listRef,
  barRef,
}: {
  words: Noun[]
  wordId: string | null
  filterKey: string
  listRef: RefObject<HTMLDivElement | null>
  barRef: RefObject<HTMLElement | null>
}) {
  const setPlace = useVocabularyPlace((s) => s.set)
  // The word to come back to, unless it is the first one (that is the top of the page).
  const [arrived] = useState(() => {
    const i = deckIndex(words, wordId)
    return i > 0 ? (words[i]?.id ?? null) : null
  })
  useEffect(() => {
    const card = arrived ? listRef.current?.querySelector(`[data-word="${arrived}"]`) : null
    if (card) scrollBelow(card, coveredTop(barRef.current))
  }, [arrived, listRef, barRef])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    let frame = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let seen: string | null = null
    const save = () => {
      timer = undefined
      if (seen && seen !== useVocabularyPlace.getState().wordId) setPlace({ wordId: seen })
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        seen = wordInView(list, coveredTop(barRef.current), useVocabularyPlace.getState().wordId)
        clearTimeout(timer)
        timer = setTimeout(save, 250)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      if (timer !== undefined) {
        clearTimeout(timer)
        save()
      }
    }
  }, [listRef, barRef, setPlace])

  // New filters: the word in view now is the one to return to.
  const shownFor = useRef(filterKey)
  useEffect(() => {
    if (shownFor.current === filterKey) return
    shownFor.current = filterKey
    const list = listRef.current
    const seen = list ? wordInView(list, coveredTop(barRef.current), useVocabularyPlace.getState().wordId) : null
    if (seen) setPlace({ wordId: seen })
  }, [filterKey, listRef, barRef, setPlace])

  return (
    <div ref={listRef} className="space-y-5">
      {letterGroups(words).map((g) => (
        <section key={g.letter} data-letter={g.letter}>
          <h2 className="mb-2 text-sm font-bold tracking-wider text-muted">{g.letter}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.words.map((n) => (
              <li key={n.id} data-word={n.id}>
                <Card
                  as="article"
                  className={cx('relative flex h-full flex-col gap-2 p-3 transition-colors hover:border-primary/60 sm:p-4', n.id === arrived && 'ring-2 ring-primary')}
                >
                  <div className="flex items-center gap-3">
                    <NounImage noun={n} context="chip" size="md" />
                    <div className="min-w-0">
                      <h3 className="text-lg leading-tight font-bold">
                        <Link to={`/reference/${encodeURIComponent(n.id)}`} className="after:absolute after:inset-0 after:rounded-2xl after:content-['']">
                          <Fi>{n.lemma}</Fi>
                        </Link>
                      </h3>
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
        </section>
      ))}
    </div>
  )
}

export default function VocabularyPage() {
  const mode = useSettings((s) => s.mode)
  const [params, setParams] = useSearchParams()
  const savedSearch = useVocabularyPlace((s) => s.search)
  const wordId = useVocabularyPlace((s) => s.wordId)
  const setPlace = useVocabularyPlace((s) => s.set)
  const [faceUp, setFaceUp] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // A bare /vocabulary (the menu link) returns to the filters and view the learner left.
  const restoring = params.toString() === '' && savedSearch !== ''
  const current = restoring ? new URLSearchParams(savedSearch) : params
  useEffect(() => {
    if (restoring) setParams(new URLSearchParams(savedSearch), { replace: true, preventScrollReset: true })
  }, [restoring, savedSearch, setParams])
  // Arriving by a link that has filters (or reloading one) makes those the ones to return to.
  const arrived = useRef(false)
  useEffect(() => {
    if (arrived.current) return
    arrived.current = true
    if (!restoring && params.toString() !== savedSearch) setPlace({ search: params.toString() })
  }, [restoring, params, savedSearch, setPlace])

  const view = current.get('view') === 'cards' ? 'cards' : 'grid'
  const theme = (current.get('theme') ?? '') as ThemeId | ''
  const q = current.get('q') ?? ''
  const level = Number(current.get('level') ?? 0)
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(current)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setPlace({ search: next.toString() })
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const themes = (Object.keys(THEME_LABEL) as ThemeId[]).filter((t) => grammar.lexicon.some((l) => l.themes.includes(t)))
  const words = vocabularyWords({ theme, level, q })
  const index = deckIndex(words, wordId)
  const word = words[index]
  // Every move lands on a card face down.
  const goTo = (i: number) => {
    const w = words[i]
    if (!w) return
    setFaceUp(null)
    setPlace({ wordId: w.id })
  }
  const jump = (letter: string, i: number) => {
    goTo(i)
    if (view !== 'grid') return
    const section = listRef.current?.querySelector(`[data-letter="${letter}"]`)
    if (section) scrollBelow(section, coveredTop(barRef.current))
  }

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
            onChange={(e) => {
              const next = e.target.value
              // A new search starts at its first match; clearing it stays on the word.
              const first = next ? vocabularyWords({ theme, level, q: next })[0] : undefined
              if (first) {
                setFaceUp(null)
                setPlace({ wordId: first.id })
              }
              update({ q: next })
            }}
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
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {words.length} words
        {(q || theme || level > 0) && (
          <button type="button" onClick={() => update({ q: '', theme: '', level: '' })} className="ml-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            <RotateCcw aria-hidden className="size-3.5" /> clear filters
          </button>
        )}
      </p>
      {/* The view switch and the letters stay at hand while the grid scrolls under them. */}
      <div ref={barRef} className={cx('flex items-center gap-2', view === 'grid' && 'sticky top-16 z-20 bg-bg/95 py-1 backdrop-blur supports-[backdrop-filter]:bg-bg/80')}>
        <Segmented
          label="View"
          size="sm"
          value={view}
          options={[
            { value: 'grid', label: 'Cards' },
            { value: 'cards', label: 'Flashcards' },
          ]}
          onChange={(v) => {
            // The flashcards open on the word the learner was looking at in the grid.
            const list = listRef.current
            const seen = view === 'grid' && list ? wordInView(list, coveredTop(barRef.current), wordId) : null
            if (seen) setPlace({ wordId: seen })
            setFaceUp(null)
            update({ view: v === 'cards' ? 'cards' : '' })
          }}
          className="shrink-0"
        />
        <LetterStrip words={words} current={word && letterOf(word)} onJump={jump} />
      </div>
      {view === 'cards' ? (
        <Flashcards
          words={words}
          index={index}
          onIndex={goTo}
          faceUp={!!word && faceUp === word.id}
          onFlip={() => setFaceUp(word && faceUp !== word.id ? word.id : null)}
        />
      ) : (
        <WordGrid words={words} wordId={wordId} filterKey={`${theme}|${level}|${q}`} listRef={listRef} barRef={barRef} />
      )}
    </div>
  )
}

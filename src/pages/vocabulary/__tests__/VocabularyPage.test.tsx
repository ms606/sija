// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { letterOf, vocabularyWords } from '../../../services/content/vocabulary'
import { useExplain } from '../../../stores/explain'
import { useSettings } from '../../../stores/settings'
import { useVocabularyPlace } from '../../../stores/vocabulary'
import VocabularyPage from '../VocabularyPage'

const all = vocabularyWords({ theme: '', level: 0, q: '' })

beforeAll(() => {
  // jsdom has no modal dialogs (open/close by attribute) and does no layout or scrolling.
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal?: () => void }
  if (!proto.showModal) {
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => {
  useSettings.setState({ mode: 'beginner' })
  useVocabularyPlace.setState({ search: '', wordId: null })
  window.scrollTo = vi.fn() as typeof window.scrollTo
})
afterEach(() => {
  cleanup()
  useExplain.getState().close()
  localStorage.clear()
})

/**
 * The page at `url` with menu links like the app's nav: to another page and
 * back to a bare /vocabulary. In StrictMode, as the app runs it.
 */
function renderAt(url: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/vocabulary"
            element={
              <>
                <Link to="/cases">Cases</Link>
                <Link to="/vocabulary">Vocabulary</Link>
                <VocabularyPage />
              </>
            }
          />
          <Route path="/cases" element={<Link to="/vocabulary">Vocabulary</Link>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
}
const leaveAndComeBack = () => {
  fireEvent.click(screen.getByRole('link', { name: 'Cases' }))
  fireEvent.click(screen.getByRole('link', { name: 'Vocabulary' }))
}

/** The flashcard itself: the button that turns it. */
const card = () => screen.getByRole('button', { name: /Tap to (show|hide) the stems and key forms/ })
const counter = () => screen.getByText(/^\d+ \/ \d+$/)
const letter = (l: string) => within(screen.getByRole('navigation', { name: 'Jump to a letter' })).getByRole('button', { name: new RegExp(`^${l},`) })

describe('Vocabulary flashcards: the back of the card', () => {
  it('shows the stems in the form colours and the key forms only once the card is turned', () => {
    renderAt('/vocabulary?view=cards&q=kauppa')
    expect(card()).toHaveAccessibleName(/^kauppa, shop/)
    expect(card()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Vowel stem')).not.toBeVisible()

    fireEvent.click(card())
    expect(card()).toHaveAttribute('aria-expanded', 'true')
    const back = document.getElementById(card().getAttribute('aria-controls')!)!
    expect(back).toBeVisible()
    const vowel = within(back).getByText('Vowel stem').closest('div')!
    expect(vowel).toHaveTextContent('strong · weak')
    expect(vowel.querySelector('dd')).toHaveTextContent('kauppa- · kaupa-')
    // The gradation letters are coloured pieces of the stem.
    expect([...vowel.querySelectorAll('dd [class*="grade"]')].map((p) => p.textContent)).toEqual(['pp', 'p'])
    expect(within(back).queryByText('Consonant stem')).toBeNull()
    for (const form of ['kaupan', 'kauppaa', 'kauppoja']) {
      expect(within(back).getByRole('button', { name: `${form} — show how it is built` })).toBeInTheDocument()
    }
  })

  it('a key form opens "how is this built?" for that form, and the card stays turned', () => {
    renderAt('/vocabulary?view=cards&q=kauppa')
    fireEvent.click(card())
    fireEvent.click(screen.getByRole('button', { name: 'kaupan — show how it is built' }))
    expect(useExplain.getState().target).toEqual({ lexemeId: 'kauppa', slot: 'sg.genitive' })
    expect(card()).toHaveAttribute('aria-expanded', 'true')
  })

  it('vesi shows its consonant stem and what it is for', () => {
    renderAt('/vocabulary?view=cards&q=vesi')
    fireEvent.click(card())
    const row = screen.getByText('Consonant stem').closest('div')!
    expect(row).toHaveTextContent('for -ta/-tä and -ten')
    expect(row.querySelector('dd')).toHaveTextContent('vet-')
  })

  it('ruoka shows the variant weak stem', () => {
    renderAt('/vocabulary?view=cards&q=ruoka')
    fireEvent.click(card())
    expect(screen.getByText('Vowel stem').closest('div')).toHaveTextContent('also ruua-')
  })

  it('every move lands on a card face down', () => {
    renderAt('/vocabulary?view=cards')
    fireEvent.click(card())
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    expect(card()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(card()).toHaveAccessibleName(new RegExp(`^${all[0]!.lemma},`))
    expect(card()).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Vocabulary flashcards: going straight to a word', () => {
  const firstK = all.findIndex((w) => letterOf(w) === 'K')

  it('a letter goes to its first word', () => {
    renderAt('/vocabulary?view=cards')
    fireEvent.click(letter('K'))
    expect(counter()).toHaveTextContent(`${firstK + 1} / ${all.length}`)
    expect(card()).toHaveAccessibleName(new RegExp(`^${all[firstK]!.lemma},`))
    expect(letter('K')).toHaveAttribute('aria-current', 'true')
  })

  it('keyboard: a letter key goes through the words with that letter; Home and End go to the ends', () => {
    renderAt('/vocabulary?view=cards')
    fireEvent.keyDown(card(), { key: 'k' })
    expect(counter()).toHaveTextContent(`${firstK + 1} /`)
    fireEvent.keyDown(card(), { key: 'k' })
    expect(counter()).toHaveTextContent(`${firstK + 2} /`)
    fireEvent.keyDown(card(), { key: 'End' })
    expect(counter()).toHaveTextContent(`${all.length} / ${all.length}`)
    fireEvent.keyDown(card(), { key: 'Home' })
    expect(counter()).toHaveTextContent(`1 / ${all.length}`)
  })

  it('"All words" lists the deck by letter, marks the current card and goes to the word picked', () => {
    renderAt('/vocabulary?view=cards')
    fireEvent.click(screen.getByRole('button', { name: 'All words' }))
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('button', { current: true })).toHaveTextContent(all[0]!.lemma)
    fireEvent.change(within(sheet).getByRole('searchbox', { name: 'Find a word' }), { target: { value: 'vesi' } })
    fireEvent.click(within(sheet).getAllByRole('button').find((b) => b.textContent?.startsWith('vesi'))!)
    expect(card()).toHaveAccessibleName(/^vesi, water\./)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Vocabulary: the place is kept', () => {
  it('leaving through the menu and coming back resumes on the same card and filters', () => {
    renderAt('/vocabulary?view=cards&theme=food')
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    const name = card().getAttribute('aria-label')
    leaveAndComeBack()
    expect(counter()).toHaveTextContent(/^4 \//)
    expect(card()).toHaveAttribute('aria-label', name)
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('food')
  })

  it('the grid and the flashcards share the word', () => {
    const food = vocabularyWords({ theme: 'food', level: 0, q: '' })
    const k = food.find((w) => letterOf(w) === 'K')!
    renderAt('/vocabulary?view=cards&theme=food')
    fireEvent.click(letter('K'))
    fireEvent.click(screen.getByRole('radio', { name: 'Cards' }))
    // The grid comes back to the word, scrolled into view and marked.
    expect(window.scrollTo).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: k.lemma }).closest('article')).toHaveClass('ring-2')
    fireEvent.click(screen.getByRole('radio', { name: 'Flashcards' }))
    expect(card()).toHaveAccessibleName(new RegExp(`^${k.lemma},`))
  })

  it('clearing the filters keeps the view and the word', () => {
    renderAt('/vocabulary?view=cards&theme=food')
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    const name = card().getAttribute('aria-label')
    fireEvent.click(screen.getByRole('button', { name: 'clear filters' }))
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('')
    expect(card()).toHaveAttribute('aria-label', name)
  })

  it('a new search starts at its first match; a topic that leaves the word out goes to the next word after it', () => {
    renderAt('/vocabulary?view=cards')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: 'talo' } })
    expect(card()).toHaveAccessibleName(/^talo, house\./)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: '' } })
    expect(card()).toHaveAccessibleName(/^talo, house\./)
    fireEvent.change(screen.getByRole('combobox', { name: 'Topic' }), { target: { value: 'food' } })
    const food = vocabularyWords({ theme: 'food', level: 0, q: '' })
    const next = food.find((w) => w.lemma.localeCompare('talo', 'fi') >= 0) ?? food.at(-1)!
    expect(card()).toHaveAccessibleName(new RegExp(`^${next.lemma},`))
  })

  it('a search with no matches, once cleared, is back on the word it left', () => {
    renderAt('/vocabulary?view=cards')
    fireEvent.click(letter('K'))
    const search = screen.getByRole('searchbox', { name: 'Search' })
    fireEvent.change(search, { target: { value: 'zzzz' } })
    expect(screen.getByText('No words match the filters.')).toBeInTheDocument()
    fireEvent.change(search, { target: { value: '' } })
    expect(counter()).toHaveTextContent(`${all.findIndex((w) => letterOf(w) === 'K') + 1} /`)
  })

  it('in the grid, a new topic makes the word now in view the place to return to', () => {
    const talo = all.find((w) => w.id === 'talo')!
    const other = vocabularyWords({ theme: 'food', level: 0, q: '' })
    expect(other.some((w) => w.id === 'talo')).toBe(false)
    useVocabularyPlace.setState({ wordId: 'talo' })
    renderAt(`/vocabulary?theme=${talo.themes[0]}`)
    fireEvent.change(screen.getByRole('combobox', { name: 'Topic' }), { target: { value: 'food' } })
    // jsdom has no layout, so the word "in view" is the first card of the new list.
    expect(useVocabularyPlace.getState().wordId).toBe(other[0]!.id)
    vi.mocked(window.scrollTo).mockClear()
    leaveAndComeBack()
    // Back at the first card: the top of the page, so nothing scrolls.
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})

describe('Vocabulary: arriving', () => {
  it('a first visit opens the card grid at the top: nothing restored, scrolled or marked', () => {
    const { container } = renderAt('/vocabulary')
    expect(screen.getByRole('radio', { name: 'Cards' })).toBeChecked()
    expect(screen.getByText(`${all.length} words`)).toBeInTheDocument()
    expect(window.scrollTo).not.toHaveBeenCalled()
    expect(container.querySelector('article.ring-2')).toBeNull()
  }, 15_000)

  it('the bare menu address returns to the saved view, filters and word', () => {
    const food = vocabularyWords({ theme: 'food', level: 0, q: '' })
    useVocabularyPlace.setState({ search: 'view=cards&theme=food', wordId: food[5]!.id })
    renderAt('/vocabulary')
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('food')
    expect(counter()).toHaveTextContent(`6 / ${food.length}`)
  })

  it('a link with its own filters wins over the saved ones, and becomes the place to return to', () => {
    useVocabularyPlace.setState({ search: 'view=cards&theme=food' })
    renderAt('/vocabulary?view=cards&theme=home')
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('home')
    expect(useVocabularyPlace.getState().search).toBe('view=cards&theme=home')
    leaveAndComeBack()
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('home')
  })

  it('the Vocabulary menu link while already on the page keeps the card and filters', () => {
    renderAt('/vocabulary?view=cards&theme=food')
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Vocabulary' }))
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('food')
    expect(counter()).toHaveTextContent(/^2 \//)
  })

  it('clearing the filters in the grid leaves no filters, now and after coming back', () => {
    renderAt('/vocabulary?theme=food')
    fireEvent.click(screen.getByRole('button', { name: 'clear filters' }))
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('')
    expect(screen.getByText(`${all.length} words`)).toBeInTheDocument()
    leaveAndComeBack()
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('')
  }, 15_000)

  it('a saved word that is no longer in the app opens the deck at its start', () => {
    useVocabularyPlace.setState({ search: 'view=cards', wordId: 'no-such-word' })
    renderAt('/vocabulary')
    expect(counter()).toHaveTextContent(`1 / ${all.length}`)
  })

  it('unreadable saved data is ignored and the page starts fresh', async () => {
    localStorage.setItem('sija-vocabulary', '{not json')
    vi.resetModules()
    const { useVocabularyPlace: fresh } = await import('../../../stores/vocabulary')
    expect(fresh.getState()).toMatchObject({ search: '', wordId: null })
  })
})

describe('Vocabulary flashcards: edges', () => {
  it('Previous on the first card goes to the last; Next on the last goes to the first', () => {
    const n = vocabularyWords({ theme: '', level: 0, q: 'kauppa' }).length
    renderAt('/vocabulary?view=cards&q=kauppa')
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(counter()).toHaveTextContent(`${n} / ${n}`)
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    expect(counter()).toHaveTextContent(`1 / ${n}`)
  })

  it('a letter, a key or a word from the list also lands on a card face down', () => {
    renderAt('/vocabulary?view=cards')
    fireEvent.click(card())
    fireEvent.click(letter('K'))
    expect(card()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(card())
    fireEvent.keyDown(card(), { key: 'End' })
    expect(card()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(card())
    fireEvent.click(screen.getByRole('button', { name: 'All words' }))
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button').find((b) => b.textContent?.startsWith('vesi'))!)
    expect(card()).toHaveAttribute('aria-expanded', 'false')
  })

  it('letter keys with Ctrl, Cmd or Alt are left to the browser', () => {
    renderAt('/vocabulary?view=cards')
    for (const mod of ['ctrlKey', 'metaKey', 'altKey']) fireEvent.keyDown(card(), { key: 'k', [mod]: true })
    expect(counter()).toHaveTextContent(`1 / ${all.length}`)
  })

  it('typing in the "All words" search does not move the deck', () => {
    renderAt('/vocabulary?view=cards')
    fireEvent.click(screen.getByRole('button', { name: 'All words' }))
    const find = within(screen.getByRole('dialog')).getByRole('searchbox', { name: 'Find a word' })
    for (const key of ['k', 'End', 'ArrowRight']) fireEvent.keyDown(find, { key })
    expect(counter()).toHaveTextContent(`1 / ${all.length}`)
  })

  it('"All words": a search with no match says so, and closing the list clears its search', () => {
    renderAt('/vocabulary?view=cards')
    fireEvent.click(screen.getByRole('button', { name: 'All words' }))
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('searchbox', { name: 'Find a word' }), { target: { value: 'zzzz' } })
    expect(within(screen.getByRole('dialog')).getByText('No word matches.')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'All words' }))
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('searchbox', { name: 'Find a word' })).toHaveValue('')
    expect(within(sheet).getByRole('button', { current: true })).toHaveTextContent(all[0]!.lemma)
  })

  it('focus stays on Next while moving, for keyboard users', () => {
    renderAt('/vocabulary?view=cards')
    const next = screen.getByRole('button', { name: /^Next/ })
    next.focus()
    fireEvent.click(next)
    fireEvent.click(next)
    expect(counter()).toHaveTextContent(/^3 \//)
    expect(next).toHaveFocus()
  })

  it('no matching words: a message, and no letters or word list', () => {
    renderAt('/vocabulary?view=cards&q=zzzz')
    expect(screen.getByText('No words match the filters.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Jump to a letter' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'All words' })).toBeNull()
  })

  it('the photo credit is its own button beside the card, and does not turn it', () => {
    renderAt('/vocabulary?view=cards&q=banaani')
    const credit = screen.getByRole('button', { name: /^Photo credit/ })
    expect(card()).not.toContainElement(credit)
    fireEvent.click(credit)
    expect(card()).toHaveAttribute('aria-expanded', 'false')
  })

  it('intermediate mode names the forms in Finnish', () => {
    useSettings.setState({ mode: 'intermediate' })
    renderAt('/vocabulary?view=cards&q=kauppa')
    fireEvent.click(card())
    for (const label of ['yksikön genetiivi', 'yksikön partitiivi', 'monikon partitiivi']) expect(screen.getByText(label)).toBeInTheDocument()
  })
})

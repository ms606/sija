// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NAV_GROUPS } from '../../../components/layout/nav'
import { LESSONS } from '../../../data/curriculum'
import { routes } from '../../../router'
import { EMPTY_PROGRESS, useProgress } from '../../../stores/progress'
import { useSettings } from '../../../stores/settings'
import MapPage from '../MapPage'

type Lessons = typeof EMPTY_PROGRESS.lessons

function renderMap(lessons: Lessons = {}) {
  useProgress.setState({ ...EMPTY_PROGRESS, lessons })
  return render(
    <MemoryRouter>
      <MapPage />
    </MemoryRouter>,
  )
}

const doneAll = (ids: string[]): Lessons => Object.fromEntries(ids.map((id) => [id, { status: 'done' as const, score: 100, at: 1 }]))
const levelCard = (n: number) => screen.getByRole('article', { name: new RegExp(`^Level ${n}:`) })
/** The lesson stop of a lesson: the link whose accessible name starts with its id. */
const stop = (id: string) => screen.getAllByRole('link', { hidden: true }).find((a) => a.getAttribute('href') === `/learn/${id}` && a.textContent?.startsWith(id))!

beforeEach(() => useSettings.setState({ mode: 'beginner' }))
afterEach(() => {
  cleanup()
  useProgress.setState({ ...EMPTY_PROGRESS })
})

describe('Learning map page', () => {
  it('shows four worlds, the eight existing levels and a link to every one of the 54 lessons', () => {
    renderMap()
    expect(screen.getByRole('heading', { level: 1, name: 'Learning map' })).toBeInTheDocument()
    for (const name of ['First steps', 'Stems and gradation', '-i words and plurals', 'Nouns in use']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('article')).toHaveLength(8)
    const stops = new Set(LESSONS.map((l) => stop(l.id)?.getAttribute('href')))
    expect(stops.size).toBe(LESSONS.length)
    expect([...stops].every((h) => /^\/learn\/\d+\.\d+$/.test(h ?? ''))).toBe(true)
  })

  it('marks a new learner as being at level 1, with 1.1 as the current step', () => {
    renderMap()
    expect(within(levelCard(1)).getByText('You are here')).toBeInTheDocument()
    expect(within(levelCard(2)).getByText('Upcoming')).toBeInTheDocument()
    expect(stop('1.1')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('link', { name: /^Start with 1\.1/ })).toHaveAttribute('href', '/learn/1.1')
    expect(screen.getByText('0 of 54 lessons completed')).toBeInTheDocument()
  })

  it('shows completed, current and upcoming levels from the existing lesson progress', () => {
    renderMap(doneAll(LESSONS.filter((l) => l.level === 1).map((l) => l.id)))
    expect(within(levelCard(1)).getByText('Completed')).toBeInTheDocument()
    expect(within(levelCard(2)).getByText('You are here')).toBeInTheDocument()
    expect(within(levelCard(3)).getByText('Upcoming')).toBeInTheDocument()
    expect(stop('2.1')).toHaveAttribute('aria-current', 'step')
    expect(stop('1.1')).not.toHaveAttribute('aria-current')
    expect(stop('1.1')).toHaveAccessibleName(/completed/)
    expect(within(stop('1.1')).getByText('best score 100%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Continue: 2\.1/ })).toBeInTheDocument()
    expect(screen.getByText('8 of 54 lessons completed')).toBeInTheDocument()
  })

  it('names the status of each lesson for screen readers', () => {
    renderMap({ '1.1': { status: 'done', score: 90, at: 1 }, '1.2': { status: 'started', at: 1 } })
    expect(stop('1.1')).toHaveAccessibleName(/completed/)
    expect(stop('1.2')).toHaveAccessibleName(/started/)
    expect(stop('1.3')).toHaveAccessibleName(/not started/)
  })

  it('shows prerequisites as a recommendation and never blocks the lesson', () => {
    renderMap()
    const lesson = stop('1.2')
    expect(lesson).toHaveAttribute('href', '/learn/1.2')
    expect(lesson).toHaveAccessibleName(/recommended after 1\.1/)
    expect(stop('1.1')).not.toHaveAccessibleName(/recommended after/)
    // Levels link to the levels they build on.
    expect(within(levelCard(2)).getByRole('link', { name: 'Level 1' })).toHaveAttribute('href', '#level-1')
  })

  it('opens the lesson list of the current level and keeps the others collapsed', () => {
    renderMap()
    const details = (n: number) => levelCard(n).querySelector('details')!
    expect(details(1).open).toBe(true)
    expect(details(2).open).toBe(false)
  })

  it('is reachable from the main navigation and the router', () => {
    expect(NAV_GROUPS.flatMap((g) => g.items).some((i) => i.to === '/map' && i.label === 'Learning map')).toBe(true)
    expect(routes[0]!.children!.some((r) => r.path === 'map')).toBe(true)
  })
})

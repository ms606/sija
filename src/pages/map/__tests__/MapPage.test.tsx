// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NAV_GROUPS } from '../../../components/layout/nav'
import { LESSONS } from '../../../data/curriculum'
import { routes } from '../../../router'
import type { SkillStat } from '../../../services/learning/mastery'
import { EMPTY_PROGRESS, useProgress } from '../../../stores/progress'
import { useSettings } from '../../../stores/settings'
import Dashboard from '../../Dashboard'
import LearnPage from '../../learn/LearnPage'
import MapPage from '../MapPage'

type Lessons = typeof EMPTY_PROGRESS.lessons

function seed(lessons: Lessons = {}, skills: Record<string, SkillStat> = {}) {
  useProgress.setState({ ...EMPTY_PROGRESS, lessons, skills })
}
function renderPage(Page: () => React.JSX.Element) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  )
}
const renderMap = (lessons: Lessons = {}, skills: Record<string, SkillStat> = {}) => {
  seed(lessons, skills)
  return renderPage(MapPage)
}

const doneAll = (ids: string[]): Lessons => Object.fromEntries(ids.map((id) => [id, { status: 'done' as const, score: 100, at: 1 }]))
const required = (n: number) => LESSONS.filter((l) => l.level === n && !l.advanced).map((l) => l.id)
const allRequired = LESSONS.filter((l) => !l.advanced).map((l) => l.id)
const strong: SkillStat = { attempts: 30, correct: 30, recent: Array.from({ length: 30 }, (_, i) => ({ at: i, ok: true })) }
const skillsOf = (n: number) => Object.fromEntries([...new Set(LESSONS.filter((l) => l.level === n).flatMap((l) => l.skills))].map((s) => [s, strong]))
const levelCard = (n: number) => screen.getByRole('article', { name: new RegExp(`^Level ${n}:`) })
/** The lesson stop of a lesson: the link whose text starts with its id. */
const stop = (id: string) => screen.getAllByRole('link', { hidden: true }).find((a) => a.getAttribute('href') === `/learn/${id}` && a.textContent?.startsWith(id))!
/** The primary "Start …" / "Continue …" action of a page. */
const primaryAction = () => screen.getAllByRole('link').find((a) => /^(Start|Continue)/.test(a.textContent?.trim() ?? '') && a.getAttribute('href')?.startsWith('/learn/'))

beforeEach(() => useSettings.setState({ mode: 'beginner' }))
afterEach(() => {
  cleanup()
  useProgress.setState({ ...EMPTY_PROGRESS })
})

describe('Learning map page', () => {
  it('shows the four worlds, the eight existing levels and a normal link to every lesson', () => {
    renderMap()
    expect(screen.getByRole('heading', { level: 1, name: 'Learning map' })).toBeInTheDocument()
    for (const name of ['Foundations and cases', 'Stems and gradation', 'Words ending in -i and plurals', 'Possessives and usage']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('article')).toHaveLength(8)
    for (const l of LESSONS) expect(stop(l.id)).toHaveAttribute('href', `/learn/${l.id}`)
  })

  it('has no dashed lesson borders; a prerequisite is a text note on an ordinary link', () => {
    renderMap()
    for (const l of LESSONS) expect(stop(l.id).className).not.toMatch(/border-dashed/)
    expect(stop('1.2')).toHaveAccessibleName(/recommended after 1\.1/)
    expect(stop('1.1')).not.toHaveAccessibleName(/recommended after/)
    expect(levelCard(2).querySelector('.border-dashed')).toBeNull()
  })

  it('marks a new learner as being at level 1 and says "Start"', () => {
    renderMap()
    expect(within(levelCard(1)).getByText('You are here')).toBeInTheDocument()
    expect(within(levelCard(2)).getByText('Upcoming')).toBeInTheDocument()
    expect(stop('1.1')).toHaveAttribute('aria-current', 'step')
    expect(primaryAction()).toHaveTextContent(/^Start 1\.1 What is a Finnish noun\?$/)
    expect(screen.getByText(`0 of ${allRequired.length} required lessons completed`)).toBeInTheDocument()
  })

  it('says "Continue" for a recommended lesson that has been started', () => {
    renderMap({ '1.1': { status: 'started', at: 1 } })
    expect(primaryAction()).toHaveTextContent(/^Continue 1\.1/)
  })

  it('says "Start" for the next lesson after a completed level, even though progress exists', () => {
    renderMap(doneAll(required(1)))
    expect(within(levelCard(1)).getByText('Completed')).toBeInTheDocument()
    expect(within(levelCard(2)).getByText('You are here')).toBeInTheDocument()
    expect(primaryAction()).toHaveTextContent(/^Start 2\.1/)
    expect(stop('1.1')).toHaveAccessibleName(/completed/)
  })

  it('completes a level without its optional lesson and shows the lesson as an optional extra', () => {
    renderMap(doneAll([...required(1), ...required(2)]))
    expect(within(levelCard(2)).getByText('Completed')).toBeInTheDocument()
    expect(within(levelCard(2)).getByText('Optional extra: 0 of 1 completed')).toBeInTheDocument()
    expect(within(stop('2.10')).getByText(/optional extra/)).toBeInTheDocument()
    expect(stop('3.1')).toHaveAttribute('aria-current', 'step')
  })

  it('offers optional lessons once every required lesson is done', () => {
    renderMap(doneAll(allRequired))
    expect(primaryAction()).toHaveTextContent(/^Start 2\.10 .*\(optional\)$/)
    for (const article of screen.getAllByRole('article')) expect(within(article).queryByText('You are here')).toBeNull()
    expect(screen.getByText(/Every required lesson is complete\. 2 optional extras are still open\./)).toBeInTheDocument()
  })

  it('hides mastery on untouched levels and labels it "Related-skill mastery" on active ones', () => {
    renderMap(doneAll(required(1)), { ...skillsOf(1), ...skillsOf(6) })
    expect(within(levelCard(1)).getByText('Related-skill mastery: Mastered')).toBeInTheDocument()
    expect(within(levelCard(6)).queryByText(/mastery/i)).toBeNull()
    expect(within(levelCard(2)).queryByText(/mastery/i)).toBeNull()
  })

  it('shows related-skill mastery for a level with a started lesson', () => {
    renderMap({ '2.1': { status: 'started', at: 1 } }, skillsOf(2))
    expect(within(levelCard(2)).getByText(/^Related-skill mastery: /)).toBeInTheDocument()
  })

  it('never shows "Not started" mastery next to a completed level (imported progress without skill data)', () => {
    renderMap(doneAll(required(1)), {})
    expect(within(levelCard(1)).getByText('Completed')).toBeInTheDocument()
    expect(within(levelCard(1)).queryByText(/mastery/i)).toBeNull()
    expect(screen.queryByText(/Not started/)).toBeNull()
  })

  it('gives level headings a scroll margin so anchor jumps clear the sticky header', () => {
    renderMap()
    const heading = document.getElementById('level-1')!
    expect(heading.className).toMatch(/scroll-mt-/)
    expect(within(levelCard(2)).getByRole('link', { name: 'Level 1' })).toHaveAttribute('href', '#level-1')
  })

  it('is reachable from the main navigation and the router', () => {
    expect(NAV_GROUPS.flatMap((g) => g.items).some((i) => i.to === '/map' && i.label === 'Learning map')).toBe(true)
    expect(routes[0]!.children!.some((r) => r.path === 'map')).toBe(true)
  })
})

describe('Continue recommendation is the same on the Dashboard, the Learn page and the map', () => {
  const states: [string, Lessons, string][] = [
    ['new learner', {}, '1.1'],
    ['1.1 started', { '1.1': { status: 'started', at: 1 } }, '1.1'],
    ['level 1 completed', doneAll(required(1)), '2.1'],
    ['optional 2.10 skipped, working in level 3', { ...doneAll([...required(1), ...required(2), '3.1']), '3.2': { status: 'started', at: 1 } }, '3.2'],
    ['every required lesson done', doneAll(allRequired), '2.10'],
    ['imported progress with gaps and unknown ids', { ...doneAll(['3.1', '5.5', 'old-id']), '2.4': { status: 'started', at: 1 } }, '1.1'],
  ]
  for (const [name, lessons, expected] of states) {
    it(name, () => {
      const hrefs = [Dashboard, LearnPage, MapPage].map((Page) => {
        seed(lessons)
        renderPage(Page)
        const href = primaryAction()?.getAttribute('href')
        cleanup()
        return href
      })
      expect(hrefs).toEqual([`/learn/${expected}`, `/learn/${expected}`, `/learn/${expected}`])
    })
  }
})

import { Ellipsis, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useApplyPreferences } from '../../hooks/useApplyPreferences'
import { useSettings, type LearnerMode } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { ExplainSheet } from '../grammar/ExplainSheet'
import { Segmented } from '../ui/Segmented'
import { Sheet } from '../ui/Sheet'
import { NAV_GROUPS, TAB_ITEMS } from './nav'
import { AppStatus } from './AppStatus'
import { HeaderStatus } from './HeaderStatus'

const MODES: { value: LearnerMode; label: string; hint: string }[] = [
  { value: 'beginner', label: 'Beginner', hint: 'English explanations, lots of visual support' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Mostly Finnish, short English glosses' },
  { value: 'advanced', label: 'Advanced', hint: 'Finnish explanations, technical analysis' },
]

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
      <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-lg text-on-primary">
        S
      </span>
      <span className="text-lg leading-none">
        Sija
        <span className="block text-[0.7rem] font-medium tracking-normal text-muted">Finnish Noun Lab</span>
      </span>
    </Link>
  )
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const mode = useSettings((s) => s.mode)
  return (
    <nav aria-label="Main" className="space-y-5">
      {NAV_GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1 px-3 text-[0.7rem] font-bold tracking-wider text-muted uppercase">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      'flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors',
                      isActive ? 'bg-primary-soft text-primary-strong' : 'text-text hover:bg-surface-2',
                    )
                  }
                >
                  <item.icon aria-hidden className="size-5 shrink-0" />
                  <span>
                    {mode === 'advanced' ? <span lang="fi">{item.fi}</span> : item.label}
                    {mode === 'intermediate' && (
                      <span lang="fi" className="block text-xs text-muted">
                        {item.fi}
                      </span>
                    )}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AppShell() {
  useApplyPreferences()
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const mode = useSettings((s) => s.mode)
  const set = useSettings((s) => s.set)
  const inMore = !TAB_ITEMS.some((t) => (t.to === '/' ? location.pathname === '/' : location.pathname.startsWith(t.to)))

  return (
    <div className="min-h-dvh">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Brand />
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <Segmented label="Learner mode" size="sm" value={mode} options={MODES} onChange={(v) => set({ mode: v })} />
            </div>
            <HeaderStatus />
            <Link to="/settings" aria-label="Settings" title="Settings" className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-surface-2">
              <SettingsIcon aria-hidden className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 overflow-y-auto py-6 lg:block">
          <SideNav />
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 pt-5 pb-28 outline-none sm:pt-8 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Phone navigation */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {TAB_ITEMS.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }) =>
                  cx('flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold', isActive ? 'text-primary' : 'text-muted')
                }
              >
                <t.icon aria-hidden className="size-6" />
                {t.label}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cx('flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold', inMore ? 'text-primary' : 'text-muted')}
              aria-haspopup="dialog"
            >
              <Ellipsis aria-hidden className="size-6" />
              More
            </button>
          </li>
        </ul>
      </nav>
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="All sections">
        <div className="mb-5 md:hidden">
          <p className="mb-2 text-sm font-semibold">Learner mode</p>
          <Segmented label="Learner mode" size="sm" value={mode} options={MODES} onChange={(v) => set({ mode: v })} />
        </div>
        <SideNav onNavigate={() => setMoreOpen(false)} />
      </Sheet>

      <ExplainSheet />
      <AppStatus />
      <ScrollRestoration />
    </div>
  )
}

import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Fi } from './FiText'

/** Every page says what it is, why it matters and what comes next. */
export function PageHeader({
  title,
  fi,
  why,
  next,
  actions,
}: {
  title: string
  fi?: string
  why?: ReactNode
  next?: { to: string; label: string }
  actions?: ReactNode
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {fi && (
            <p className="mt-0.5 text-sm font-medium text-muted">
              <Fi>{fi}</Fi>
            </p>
          )}
        </div>
        {actions}
      </div>
      {why && <p className="max-w-[72ch] text-[0.97rem] text-muted">{why}</p>}
      {next && (
        <Link to={next.to} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          Next up: {next.label}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </header>
  )
}

import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

export function ErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : 'Unknown error'
  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted">{message}</p>
      <Link to="/" className="mt-4 inline-block font-semibold text-primary hover:underline">
        Back to the dashboard
      </Link>
    </div>
  )
}

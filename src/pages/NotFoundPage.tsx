import { House, Search } from 'lucide-react'
import { ButtonLink } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'

export default function NotFoundPage() {
  return (
    <div>
      <PageHeader title="Page not found" fi="Sivua ei löytynyt" why="This address does not match any page. The word or lesson may have a different name." />
      <div className="flex flex-wrap gap-2">
        <ButtonLink to="/" variant="primary" icon={<House aria-hidden className="size-4" />}>
          Dashboard
        </ButtonLink>
        <ButtonLink to="/reference" icon={<Search aria-hidden className="size-4" />}>
          Search words
        </ButtonLink>
      </div>
    </div>
  )
}

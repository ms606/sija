import { useId } from 'react'
import type { Lexeme } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'

/** Featured words as chips, plus a native select with every word (accessible on all devices). */
export function WordPicker({
  value,
  onChange,
  featured,
  filter,
  label = 'Word',
  className,
}: {
  value: string
  onChange: (lexemeId: string) => void
  featured: readonly string[]
  /** Restricts the full list (e.g. only words with gradation). */
  filter?: (lex: Lexeme) => boolean
  label?: string
  className?: string
}) {
  const selectId = useId()
  const all = grammar.lexicon
    .filter((l) => !filter || filter(l))
    .slice()
    .sort((a, b) => a.lemma.localeCompare(b.lemma, 'fi'))
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      <ul className="flex flex-wrap gap-1.5" aria-label={`Featured: ${label.toLowerCase()}`}>
        {featured.map((id) => {
          const lex = grammar.get(id)
          if (!lex) return null
          const active = id === value
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(id)}
                className={cx(
                  'min-h-9 rounded-full border px-3 text-[0.95rem] font-semibold transition-colors',
                  active ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border bg-surface hover:bg-surface-2',
                )}
              >
                <Fi>{lex.lemma}</Fi>
              </button>
            </li>
          )
        })}
      </ul>
      <label htmlFor={selectId} className="sr-only">
        {label}: choose any word
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-9 max-w-full rounded-lg border border-border-strong bg-surface px-2 text-[0.95rem]"
      >
        {all.map((l) => (
          <option key={l.id} value={l.id} lang="fi">
            {l.lemma} — {l.gloss.en.split(';')[0]}
          </option>
        ))}
      </select>
    </div>
  )
}

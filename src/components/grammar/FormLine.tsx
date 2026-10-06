import type { Lexeme, PersonId, SlotKey } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { useExplain } from '../../stores/explain'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { Fi } from '../ui/FiText'
import { ColoredForm } from './ColoredForm'

/**
 * One engine-generated form: coloured pieces, accepted variants, audio, and a
 * tap target that opens "how is this built?".
 */
export function FormLine({
  lexeme,
  slot,
  person,
  showVariants = true,
  audio = true,
  size = 'md',
  className,
}: {
  lexeme: Lexeme
  slot: SlotKey
  person?: PersonId
  showVariants?: boolean
  audio?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const open = useExplain((s) => s.open)
  const form = person ? grammar.withPossessive(lexeme, slot, person) : grammar.inflect(lexeme, slot)
  if (form.status === 'not-used') return <span className="text-muted">—</span>
  const [primary, ...others] = form.variants.filter((v) => v.register !== 'rare')
  if (!primary) return null
  const text = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-[0.95rem]' : 'text-[1.05rem]'
  return (
    <span className={cx('inline-flex items-start gap-1', className)}>
      <span className="min-w-0">
        <button
          type="button"
          onClick={() => open({ lexemeId: lexeme.id, slot, ...(person ? { person } : {}) })}
          className={cx('rounded-md px-1 text-left font-semibold hover:bg-surface-2', text)}
          aria-label={`${primary.text} — show how it is built`}
        >
          <ColoredForm variant={primary} />
        </button>
        {showVariants && others.length > 0 && (
          <span className="block px-1 text-xs text-muted">
            also <Fi>{others.map((o) => o.text).join(', ')}</Fi>
          </span>
        )}
      </span>
      {audio && <AudioButton text={primary.text} size="sm" slow={false} />}
    </span>
  )
}

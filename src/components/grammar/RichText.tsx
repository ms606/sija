import { segments } from '../../services/explain'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'

/** Explanation text with its Finnish parts rendered as Finnish (lang="fi", emphasised). */
export function RichText({ text, className, fiClassName = 'font-semibold' }: { text: string; className?: string; fiClassName?: string }) {
  return (
    <span className={className}>
      {segments(text).map((s, i) =>
        s.fi ? (
          <Fi key={i} className={cx(fiClassName, 'whitespace-nowrap')}>
            {s.text}
          </Fi>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  )
}

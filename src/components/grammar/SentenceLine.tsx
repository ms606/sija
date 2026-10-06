import type { RenderedSentence } from '../../grammar'
import { useExplain } from '../../stores/explain'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { Fi } from '../ui/FiText'

/**
 * A rendered example sentence. Engine-generated forms are buttons that open
 * their derivation; the focus form is emphasised.
 */
export function SentenceLine({
  view,
  translation,
  showTranslation,
  size = 'md',
  audio = true,
  className,
}: {
  view: RenderedSentence
  translation?: string
  showTranslation?: boolean
  size?: 'sm' | 'md' | 'lg'
  audio?: boolean
  className?: string
}) {
  const open = useExplain((s) => s.open)
  const showSetting = useSettings((s) => s.showTranslations)
  const show = showTranslation ?? showSetting
  const text = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-[0.95rem]' : 'text-lg'
  return (
    <div className={cx('flex items-start gap-2', className)}>
      {audio && <AudioButton text={view.text} size="sm" />}
      <div className="min-w-0">
        <p className={cx('leading-snug', text)}>
          <Fi>
            {view.parts.map((p, i) => {
              const t = p.token
              if (!t) return <span key={i}>{p.text}</span>
              const lexemeId = t.lexemeIds[t.lexemeIds.length - 1]
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => lexemeId && open({ lexemeId, slot: t.slot, ...(t.person ? { person: t.person } : {}), variantText: p.text })}
                  className={cx(
                    'rounded-sm text-left',
                    t.focus
                      ? 'font-semibold text-primary-strong underline decoration-2 underline-offset-4'
                      : 'underline decoration-border-strong decoration-dotted underline-offset-4 hover:decoration-primary',
                  )}
                  aria-label={`${p.text} — show how this form is built`}
                >
                  {p.text}
                </button>
              )
            })}
          </Fi>
        </p>
        {show && translation && <p className="mt-0.5 text-sm text-muted">{translation}</p>}
      </div>
    </div>
  )
}

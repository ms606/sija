import { Info } from 'lucide-react'
import { useState } from 'react'
import { useSettings, type PictureStyle } from '../../stores/settings'
import type { Noun } from '../../types/content'
import { cx } from '../../utils/cx'
import { Illustration } from './illustrations'

type Context = 'card' | 'diagram' | 'chip'
type Kind = 'photo' | 'illustration' | 'emoji'

const ORDER: Record<Context, Kind[]> = {
  card: ['photo', 'illustration', 'emoji'],
  diagram: ['illustration', 'emoji', 'photo'],
  chip: ['emoji', 'illustration'],
}

function chooseKind(noun: Noun, context: Context, style: PictureStyle): Kind | null {
  const img = noun.image
  if (!img) return null
  const has: Record<Kind, boolean> = { photo: !!img.photo, illustration: !!img.illustration, emoji: !!img.emoji }
  const order = style === 'auto' ? ORDER[context] : [style, ...ORDER[context].filter((k) => k !== style)]
  return order.find((k) => has[k]) ?? null
}

const SIZE = { sm: 'size-10 text-2xl', md: 'size-16 text-4xl', lg: 'size-28 text-6xl', xl: 'size-40 text-7xl' } as const

/**
 * Picture for a noun, chosen by context: cards prefer photos, diagrams prefer
 * illustrations, chips use emoji. Abstract nouns have no picture by design.
 */
export function NounImage({
  noun,
  context = 'card',
  size = 'md',
  className,
}: {
  noun: Noun
  context?: Context
  size?: keyof typeof SIZE
  className?: string
}) {
  const style = useSettings((s) => s.pictureStyle)
  const [showCredit, setShowCredit] = useState(false)
  const kind = chooseKind(noun, context, style)
  const img = noun.image
  if (!img || !kind) return null
  const alt = img.alt.en
  if (kind === 'emoji') {
    return (
      <span role="img" aria-label={alt} className={cx('inline-flex shrink-0 items-center justify-center leading-none', SIZE[size], className)}>
        {img.emoji}
      </span>
    )
  }
  if (kind === 'illustration' && img.illustration) {
    return <Illustration id={img.illustration} title={alt} className={cx('shrink-0 text-primary', SIZE[size], className)} />
  }
  const photo = img.photo
  if (!photo) return null
  return (
    <figure className={cx('relative shrink-0 overflow-hidden rounded-xl bg-surface-2', SIZE[size], className)}>
      <img src={photo.src} alt={alt} width={photo.w} height={photo.h} loading="lazy" className="size-full object-cover" />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowCredit((v) => !v)
        }}
        className="absolute right-1 bottom-1 z-20 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
        aria-label={`Photo credit: ${photo.credit.attributionText}, ${photo.credit.licenseName}`}
        aria-expanded={showCredit}
      >
        <Info aria-hidden className="size-4" />
      </button>
      {showCredit && (
        <figcaption className="absolute inset-x-0 bottom-0 z-10 bg-black/75 p-1.5 pr-9 text-[0.65rem] leading-tight text-white">
          {photo.credit.attributionText}
          {!photo.credit.attributionText.includes(photo.credit.licenseName) && <> · {photo.credit.licenseName}</>} · Wikimedia Commons
        </figcaption>
      )}
    </figure>
  )
}

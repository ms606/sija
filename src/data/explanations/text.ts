import type { LocalizedText, ModeText } from '../../types/content'

/** Localized text: English, optionally Finnish. */
export const t = (en: string, fi?: string): LocalizedText => (fi ? { en, fi } : { en })

/**
 * Mode text. `en` is the beginner explanation (English with Finnish terms);
 * `fi` is a short Finnish version used in intermediate/advanced modes;
 * `adv` is an optional technical note for advanced mode.
 */
export const m = (en: string, fi?: string, adv?: LocalizedText): ModeText => {
  const out: ModeText = { beginner: t(en) }
  if (fi) out.intermediate = t(en, fi)
  if (adv) out.advanced = adv
  else if (fi) out.advanced = t(en, fi)
  return out
}

import type { ExampleSentence } from '../../types/content'
import { CASE_SENTENCES } from './cases'
import { CITY_SENTENCES } from './city'
import { DESCRIPTION_SENTENCES } from './descriptions'
import { EXTRA_SENTENCES } from './everyday-extra'
import { FOOD_SHOP_SENTENCES } from './food-shop'
import { HEALTH_SENTENCES } from './health'
import { HOME_SENTENCES } from './home'
import { NATURE_TIME_SENTENCES } from './nature-time'
import { PEOPLE_MISC_SENTENCES } from './people-misc'
import { WORK_SCHOOL_SENTENCES } from './work-school'

/** Every curated example sentence (templates; noun forms come from the engine). */
export const SENTENCES: readonly ExampleSentence[] = [
  ...CASE_SENTENCES,
  ...HOME_SENTENCES,
  ...FOOD_SHOP_SENTENCES,
  ...CITY_SENTENCES,
  ...WORK_SCHOOL_SENTENCES,
  ...HEALTH_SENTENCES,
  ...NATURE_TIME_SENTENCES,
  ...PEOPLE_MISC_SENTENCES,
  ...DESCRIPTION_SENTENCES,
  ...EXTRA_SENTENCES,
]

const byId = new Map<string, ExampleSentence>()
for (const s of SENTENCES) {
  if (byId.has(s.id)) throw new Error(`Duplicate sentence id "${s.id}"`)
  byId.set(s.id, s)
}

export function getSentence(id: string): ExampleSentence | undefined {
  return byId.get(id)
}

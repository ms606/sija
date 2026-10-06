import type { SlotKey } from '../grammar/types'
import type { LocalizedText, ThemeId } from '../types/content'
import { t } from './explanations/text'

export const THEME_LABEL: Readonly<Record<ThemeId, LocalizedText>> = {
  home: t('Home', 'Koti'),
  family: t('Family', 'Perhe'),
  food: t('Food', 'Ruoka'),
  shop: t('Shopping', 'Kauppa'),
  city: t('City', 'Kaupunki'),
  transport: t('Transport', 'Liikenne'),
  work: t('Work', 'Työ'),
  school: t('School', 'Koulu'),
  health: t('Health', 'Terveys'),
  nature: t('Nature', 'Luonto'),
  weather: t('Weather', 'Sää'),
  time: t('Time', 'Aika'),
  body: t('Body', 'Keho'),
  people: t('People', 'Ihmiset'),
  money: t('Money', 'Raha'),
  services: t('Services', 'Asiointi'),
  daycare: t('Daycare', 'Päiväkoti'),
  leisure: t('Free time', 'Vapaa-aika'),
  language: t('Language', 'Kieli'),
  numbers: t('Numbers', 'Luvut'),
  descriptions: t('Describing', 'Kuvailu'),
}

/** Pairs of forms that are easy to confuse by ear (listening drill). */
export const LISTENING_PAIRS: readonly [{ lexemeId: string; slot: SlotKey }, { lexemeId: string; slot: SlotKey }][] = [
  [{ lexemeId: 'kuusi-spruce', slot: 'sg.genitive' }, { lexemeId: 'kuusi-six', slot: 'sg.genitive' }],
  [{ lexemeId: 'tuuli', slot: 'sg.genitive' }, { lexemeId: 'tuoli', slot: 'sg.genitive' }],
  [{ lexemeId: 'tili', slot: 'sg.nominative' }, { lexemeId: 'tiili', slot: 'sg.nominative' }],
  [{ lexemeId: 'kauppa', slot: 'sg.inessive' }, { lexemeId: 'kauppa', slot: 'sg.elative' }],
  [{ lexemeId: 'talo', slot: 'sg.illative' }, { lexemeId: 'talo', slot: 'sg.genitive' }],
  [{ lexemeId: 'kauppa', slot: 'sg.nominative' }, { lexemeId: 'kauppa', slot: 'sg.genitive' }],
  [{ lexemeId: 'tyttö', slot: 'sg.genitive' }, { lexemeId: 'tyttö', slot: 'sg.partitive' }],
  [{ lexemeId: 'katu', slot: 'sg.genitive' }, { lexemeId: 'katu', slot: 'sg.illative' }],
  [{ lexemeId: 'pöytä', slot: 'sg.adessive' }, { lexemeId: 'pöytä', slot: 'sg.ablative' }],
  [{ lexemeId: 'tuli', slot: 'sg.partitive' }, { lexemeId: 'tuuli', slot: 'sg.partitive' }],
  [{ lexemeId: 'tuli', slot: 'sg.nominative' }, { lexemeId: 'tuuli', slot: 'sg.nominative' }],
  [{ lexemeId: 'kuppi', slot: 'sg.genitive' }, { lexemeId: 'kuppi', slot: 'sg.nominative' }],
]

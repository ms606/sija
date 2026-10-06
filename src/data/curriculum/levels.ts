import type { Level } from '../../types/curriculum'
import { m, t } from '../explanations/text'

export const LEVELS: readonly Level[] = [
  { id: 1, title: t('Foundation', 'Perusteet'), summary: m('Nouns, singular and plural, what a case is, vowel harmony, and the three grammatical cases.', 'Substantiivi, luku, sija, vokaalisointu.') },
  { id: 2, title: t('Core cases', 'Tärkeimmät sijat'), summary: m('The six place cases, inside vs on/at places, the essive and translative, and the rare cases.', 'Paikallissijat, essiivi ja translatiivi.') },
  { id: 3, title: t('Noun inflection', 'Taivutus'), summary: m('Stems: what they are, how they are formed, and which ending uses which stem.', 'Vartalot ja taivutustyypit.') },
  { id: 4, title: t('Consonant gradation', 'Astevaihtelu'), summary: m('Strong and weak grade, every pattern, words without gradation, and inverse gradation.', 'Vahva ja heikko aste.') },
  { id: 5, title: t('-i nouns', 'I-loppuiset sanat'), summary: m('The four -i families and how to tell them apart.', 'Neljä i-sanojen ryhmää.') },
  { id: 6, title: t('Plural', 'Monikko'), summary: m('The plural markers, plural stems, and the plural genitive and partitive.', 'Monikon tunnukset ja vartalot.') },
  { id: 7, title: t('Possessive suffixes', 'Omistusliitteet'), summary: m('-ni, -si, -nsa, -mme, -nne with every case — and what spoken Finnish does instead.', 'Omistusliitteet.') },
  { id: 8, title: t('Advanced usage', 'Käyttö'), summary: m('Objects, aspect, quantity, negation, existential sentences, agreement, spoken Finnish and YKI.', 'Objekti, määrä, kieltolause, kongruenssi.') },
]

/**
 * Sources and licences, recorded per source exactly as the provider states
 * them. Nothing here is generalised: each entry quotes its own terms.
 */
export interface SourceCredit {
  id: string
  title: string
  provider: string
  /** What the app uses from the source. */
  use: string
  licenseName: string
  licenseUrl?: string
  /** Attribution exactly as the provider asks for it. */
  attributionText: string
  sourceUrl: string
  /** Is the material (or data derived from it) shipped in the app? */
  distributed: boolean
  modifications?: string
  retrievedAt: string
}

export const DATA_SOURCES: readonly SourceCredit[] = [
  {
    id: 'kotus-sanalista',
    title: 'Nykysuomen sanalista',
    provider: 'Kotimaisten kielten keskus (Institute for the Languages of Finland, Kotus)',
    use: 'The declension type numbers and gradation letters (taivutustiedot) of the words taught in this app were checked against the list and are stored with each word.',
    licenseName: 'Creative Commons Nimeä 4.0 Kansainvälinen (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/deed.fi',
    attributionText:
      'Nykysuomen sanalista. Kotimaisten kielten keskus. Päivitetty 30.4.2024 [viitattu 5.10.2026]. Saatavissa https://kaino.kotus.fi/lataa/nykysuomensanalista2024.txt',
    sourceUrl: 'https://kotus.fi/sanakirjat/kielitoimiston-sanakirja/nykysuomen-sana-aineistot/nykysuomen-sanalista/',
    distributed: true,
    modifications: 'Only the inflection information of about 275 headwords is used. The list itself is not included in the app.',
    retrievedAt: '2026-10-05',
  },
]

/** Tools used during development to verify the grammar engine. Not part of the app. */
export const VERIFICATION_TOOLS: readonly { title: string; provider: string; licenseName: string; note: string; url: string }[] = [
  {
    title: 'Finnish morphological analyser and generator (lang-fin)',
    provider: 'GiellaLT (copyright file: “2005, The University of Tromsø”)',
    licenseName: 'GPL-3+ (as stated in the copyright file of the downloaded package)',
    note: 'Used only on the developer machine to compare the engine’s forms with an independent analyser. Not distributed with the app.',
    url: 'https://github.com/giellalt/lang-fin',
  },
  {
    title: 'Wiktionary declension tables',
    provider: 'Wiktionary contributors',
    licenseName: 'See the terms stated on Wiktionary',
    note: 'Consulted to settle disagreements between sources. No Wiktionary text is copied into the app.',
    url: 'https://en.wiktionary.org/',
  },
]

export const SOFTWARE: readonly { name: string; license: string; url: string }[] = [
  { name: 'Inter (typeface, via Fontsource)', license: 'SIL Open Font License 1.1 — Copyright 2016 The Inter Project Authors', url: 'https://github.com/rsms/inter' },
  { name: 'React and React DOM', license: 'MIT', url: 'https://react.dev' },
  { name: 'React Router', license: 'MIT', url: 'https://reactrouter.com' },
  { name: 'Zustand', license: 'MIT', url: 'https://github.com/pmndrs/zustand' },
  { name: 'idb-keyval', license: 'Apache-2.0', url: 'https://github.com/jakearchibald/idb-keyval' },
  { name: 'Lucide icons', license: 'ISC', url: 'https://lucide.dev' },
  { name: 'Tailwind CSS', license: 'MIT', url: 'https://tailwindcss.com' },
]

// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { DECLENSION_TYPES } from '../../../grammar'
import INounLabPage from '../INounLabPage'
import NounTypeDetailPage from '../NounTypeDetailPage'
import NounTypesPage from '../NounTypesPage'

afterEach(cleanup)

/** The -i cards as the learner sees them: type name, Kotus number, example and family. */
function iCards() {
  const section = screen.getByRole('region', { name: 'Words in -i' })
  return within(section)
    .getAllByRole('link')
    .map((card) => ({
      name: within(card).getByTestId('type-name').textContent,
      text: card.textContent ?? '',
    }))
}

describe('Noun types page, "Words in -i"', () => {
  it('names each Kotus type after its own model word and labels the learning family separately', () => {
    render(
      <MemoryRouter>
        <NounTypesPage />
      </MemoryRouter>,
    )
    const cards = iCards()
    expect(cards.map((c) => c.name)).toEqual([
      'risti-type',
      'paperi-type',
      'ovi-type',
      'tiili-type',
      'uni-type',
      'toimi-type',
      'pieni-type',
      'käsi-type',
      'kynsi-type',
      'lapsi-type',
      'veitsi-type',
      'kaksi-type',
    ])
    const byKotus = (n: number) => cards.find((c) => c.text.includes(`Kotus ${n}`))!
    expect(byKotus(6).text).toContain('paperi-type')
    expect(byKotus(6).text).toContain('Learning family: pankki')
    expect(byKotus(29).text).toContain('Learning family: kieli')
    // No card is headed by a family name as if it were a declension type.
    for (const c of cards) expect(c.name).not.toMatch(/^(pankki|lehti|kieli|uusi)-type$/)
    expect(new Set(cards.map((c) => c.name)).size).toBe(cards.length)
  })
})

describe('Noun types page, all 35 type cards', () => {
  function card(kotus: number) {
    return screen.getByRole('link', { name: new RegExp(`-type, Kotus ${kotus}(,|$)`) })
  }

  it('each card shows its own model word as the example', () => {
    render(
      <MemoryRouter>
        <NounTypesPage />
      </MemoryRouter>,
    )
    for (const def of Object.values(DECLENSION_TYPES)) {
      const c = card(def.kotus)
      expect(within(c).getByTestId('type-name').textContent, def.id).toBe(`${def.modelWord}-type`)
      expect(within(c).getByTestId('type-example').textContent?.split(' – ')[0], def.id).toBe(def.modelWord)
    }
  })

  it('the Kotus 5 card shows risti with its own forms, marked as a model word, never a word of another type', () => {
    render(
      <MemoryRouter>
        <NounTypesPage />
      </MemoryRouter>,
    )
    const c = card(5)
    expect(within(c).getByTestId('type-name')).toHaveTextContent('risti-type')
    expect(within(c).getByTestId('type-example')).toHaveTextContent('risti – ristin – ristiä – ristejä')
    expect(within(c).getByTestId('type-example')).toHaveTextContent('Model word of the type, not one of the learner words')
    expect(c).toHaveTextContent('Learning family: pankki')
    expect(c.textContent).not.toMatch(/pankki –|pankin|kalan/)
  })

  it('the Kotus 9 card shows kala with its own forms', () => {
    render(
      <MemoryRouter>
        <NounTypesPage />
      </MemoryRouter>,
    )
    const c = card(9)
    expect(within(c).getByTestId('type-name')).toHaveTextContent('kala-type')
    expect(within(c).getByTestId('type-example')).toHaveTextContent('kala – kalan – kalaa – kaloja')
    expect(within(c).getByTestId('type-example')).not.toHaveTextContent('Model word of the type')
    expect(c).not.toHaveTextContent('Learning family')
  })
})

describe('type detail page', () => {
  function renderType(id: string) {
    render(
      <MemoryRouter initialEntries={[`/noun-types/${id}`]}>
        <Routes>
          <Route path="/noun-types/:typeId" element={<NounTypeDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('Kotus 5 shows the stems and key forms of risti, and names the learner word used for the full table', () => {
    renderType('k5')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('risti-type')
    expect(screen.getByText(/The stems of the model word risti/)).toBeInTheDocument()
    expect(screen.getByTestId('model-forms')).toHaveTextContent('risti – ristin – ristiä – ristiin – ristien – ristejä')
    expect(screen.getByText(/is a risti-type word \(Kotus 5\) taught in the app; the model word/)).toBeInTheDocument()
  })

  it('Kotus 31 explains kaksi as a distinct pattern inside the uusi family, a teaching group', () => {
    renderType('k31')
    const note = screen.getByTestId('family-note')
    expect(note).toHaveTextContent('teaching group')
    expect(note).toHaveTextContent('not an official class')
    expect(note).toHaveTextContent('A distinct pattern inside the uusi family')
    expect(note).toHaveTextContent('k becomes h and s becomes t')
    expect(screen.getByTestId('model-forms')).toHaveTextContent('kaksi – kahden – kahta – kahteen – kaksien – kaksia')
  })
})

describe('-i Noun Lab', () => {
  it('shows which declension types each learning family groups', () => {
    render(
      <MemoryRouter>
        <INounLabPage />
      </MemoryRouter>,
    )
    const kieli = screen.getByRole('list', { name: 'Declension types in the kieli family' })
    expect(within(kieli).getAllByRole('listitem').map((li) => li.textContent?.split(' · ')[0])).toEqual([
      'tiili-type',
      'uni-type',
      'toimi-type',
      'pieni-type',
      'lapsi-type',
      'veitsi-type',
    ])
    const uusi = screen.getByRole('list', { name: 'Declension types in the uusi family' })
    expect(within(uusi).getAllByRole('listitem').map((li) => li.textContent?.split(' · ')[0])).toEqual(['käsi-type', 'kynsi-type', 'kaksi-type'])
    const pankki = screen.getByRole('list', { name: 'Declension types in the pankki family' })
    expect(pankki).toHaveTextContent('risti-type · Kotus 5')
    expect(pankki).toHaveTextContent('paperi-type · Kotus 6')
    expect(screen.getByRole('heading', { level: 2, name: 'The pankki family' })).toBeInTheDocument()
  })

  it('labels the families as teaching groups, not official classes', () => {
    render(
      <MemoryRouter>
        <INounLabPage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('learning-family-note')).toHaveTextContent('not an official class of Finnish grammar')
    expect(screen.getByTestId('learning-family-note')).toHaveTextContent('Kotus declension type decides its forms')
  })

  it('shows each type of a family with its own model word, stems and forms, so differences are visible', () => {
    render(
      <MemoryRouter>
        <INounLabPage />
      </MemoryRouter>,
    )
    const row = (family: string, type: string) =>
      within(screen.getByRole('table', { name: new RegExp(`^Types in the ${family} family`) }))
        .getByRole('rowheader', { name: new RegExp(`^${type}`) })
        .closest('tr')!
    // kieli family: shared -e- stem, different consonant stems and partitives.
    expect(row('kieli', 'pieni-type')).toHaveTextContent(/piene-.*pien-.*pienen.*pientä/)
    expect(row('kieli', 'lapsi-type')).toHaveTextContent(/lapse-.*las-.*lapsen.*lasta.*lapseen.*lasten ~ lapsien/)
    expect(row('kieli', 'veitsi-type')).toHaveTextContent(/veitse-.*veis-.*veitsen.*veistä.*veitseen.*veisten ~ veitsien/)
    // uusi family: kaksi has its own stems.
    expect(row('uusi', 'kaksi-type')).toHaveTextContent(/kahte- \/ kahde-.*kah-.*kahden.*kahta.*kahteen/)
    expect(row('uusi', 'käsi-type')).toHaveTextContent(/käte- \/ käde-.*kät-.*käden.*kättä.*käteen/)
    // pankki family: risti is shown with its own forms although it is not a learner word.
    expect(row('pankki', 'risti-type')).toHaveTextContent(/risti-.*ristin.*ristiä.*ristiin/)
    const kaksiNote = within(screen.getByRole('list', { name: 'What each type in the uusi family does' })).getByText(/^kaksi-type/).closest('li')!
    expect(kaksiNote).toHaveTextContent('A distinct pattern inside the uusi family')
    const kieliSummary = screen.getAllByText(/Not shared/)[0]!.closest('p')!
    expect(kieliSummary).toHaveTextContent('kieltä')
    expect(kieliSummary).toHaveTextContent('lasta')
    expect(kieliSummary).toHaveTextContent('veistä')
  })
})

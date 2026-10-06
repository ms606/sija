import { CASE_ORDER } from '../../data/cases'
import { PERSONS, type NumberId, type SlotKey } from '../../grammar'
import { parseSlot } from '../../grammar'
import { grammar } from '../../services/grammar'
import { caseName, PERSON_LABEL } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { Fi } from '../ui/FiText'
import { Segmented } from '../ui/Segmented'
import { FormLine } from './FormLine'
import { WordPicker } from './WordPicker'

const WORDS = ['talo', 'kauppa', 'koti', 'perhe', 'nimi', 'käsi', 'ystävä', 'auto', 'kieli', 'huone']

/** One word, one case, all five persons — every form from the engine. */
export function PossessiveBuilder({
  word,
  slot,
  onChange,
  className,
}: {
  word: string
  slot: SlotKey
  onChange: (word: string, slot: SlotKey) => void
  className?: string
}) {
  const mode = useSettings((s) => s.mode)
  const lex = grammar.require(word)
  const { number, kase } = parseSlot(slot)
  const cases = CASE_ORDER.filter((c) => c !== 'accusative' && c !== 'instructive' && (number === 'pl' || c !== 'comitative'))
  return (
    <div className={cx('space-y-4', className)}>
      <WordPicker value={word} onChange={(w) => onChange(w, slot)} featured={WORDS} filter={(l) => l.pos === 'noun'} />
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Number"
          size="sm"
          value={number}
          options={[
            { value: 'sg', label: 'Singular' },
            { value: 'pl', label: 'Plural' },
          ]}
          onChange={(n: NumberId) => onChange(word, `${n}.${n === 'sg' && kase === 'comitative' ? 'nominative' : kase}` as SlotKey)}
        />
        <label className="flex items-center gap-2 text-sm font-semibold">
          Case
          <select
            value={kase}
            onChange={(e) => onChange(word, `${number}.${e.target.value}` as SlotKey)}
            className="min-h-9 rounded-lg border border-border-strong bg-surface px-2 font-normal"
          >
            {cases.map((c) => (
              <option key={c} value={c}>
                {caseName(c, mode)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <table className="w-full text-left">
        <caption className="sr-only">
          Possessive forms of {lex.lemma}, {slot}
        </caption>
        <tbody>
          {PERSONS.map((p) => (
            <tr key={p} className="border-b border-border last:border-0">
              <th scope="row" className="w-36 py-2 pr-2 align-top font-normal">
                <Fi className="font-semibold">{PERSON_LABEL[p].fi}</Fi>
                <span className="block text-xs text-muted">{PERSON_LABEL[p].en}</span>
              </th>
              <td className="py-1.5 align-top">
                <FormLine lexeme={lex} slot={slot} person={p} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

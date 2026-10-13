import { MINIMAL_PAIRS } from '../../data/noun-families'
import { grammar } from '../../services/grammar'
import { familyName, pickText, typeName } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { Fi } from '../ui/FiText'

/** Look-alike words that inflect differently — proof that spelling alone does not decide the type. */
export function MinimalPairs({ pairs = MINIMAL_PAIRS, className }: { pairs?: typeof MINIMAL_PAIRS; className?: string }) {
  const mode = useSettings((s) => s.mode)
  return (
    <ul className={cx('grid gap-3 md:grid-cols-2', className)}>
      {pairs.map((pair) => {
        const words = [grammar.require(pair.a), grammar.require(pair.b)]
        const note = pickText(pair.note, mode)
        return (
          <li key={`${pair.a}-${pair.b}`} className="rounded-2xl border border-border bg-surface p-3">
            <div className="grid grid-cols-2 gap-3">
              {words.map((w) => (
                <div key={w.id} className="min-w-0">
                  <p className="flex items-center gap-1.5">
                    <Fi className="text-xl font-bold">{w.lemma}</Fi>
                    <AudioButton text={w.lemma} size="sm" slow={false} />
                  </p>
                  <p className="text-xs text-muted">{w.gloss.en.split(';')[0]}</p>
                  <p className="mt-1 text-[0.95rem]">
                    <Fi className="font-semibold">{grammar.primary(w, 'sg.genitive')}</Fi>
                    <span className="text-muted"> · </span>
                    <Fi className="font-semibold">{grammar.primary(w, 'sg.partitive')}</Fi>
                  </p>
                  <p className="text-xs text-muted">
                    {typeName(w.typeId, { kotus: true })}
                    {grammar.type(w).iGroup && <> · {familyName(grammar.type(w).iGroup!)}</>}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 border-t border-border pt-2 text-sm text-muted" lang={note.lang}>
              {note.main}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

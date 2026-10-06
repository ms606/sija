import { Link } from 'react-router'
import { grammar } from '../../services/grammar'
import { PERSON_LABEL, slotLabel } from '../../services/content/text'
import { useExplain } from '../../stores/explain'
import { useSettings } from '../../stores/settings'
import { Fi } from '../ui/FiText'
import { Sheet } from '../ui/Sheet'
import { DerivationPipeline } from './DerivationPipeline'

/** Global sheet: "how is this form built?" — opened from tables, sentences and exercises. */
export function ExplainSheet() {
  const { target, close } = useExplain()
  const mode = useSettings((s) => s.mode)
  const noun = target ? grammar.get(target.lexemeId) : undefined
  return (
    <Sheet
      open={!!target && !!noun}
      onClose={close}
      title={
        noun && target ? (
          <span>
            <Fi>{noun.lemma}</Fi> · {slotLabel(target.slot, mode)}
            {target.person && <span className="text-muted"> · {PERSON_LABEL[target.person].en}</span>}
          </span>
        ) : (
          ''
        )
      }
    >
      {noun && target && (
        <>
          <DerivationPipeline
            key={`${target.lexemeId}:${target.slot}:${target.person ?? ''}:${target.variantText ?? ''}`}
            lexemeId={target.lexemeId}
            slot={target.slot}
            {...(target.person ? { person: target.person } : {})}
            {...(target.variantText ? { variantText: target.variantText } : {})}
          />
          <Link to={`/reference/${encodeURIComponent(noun.id)}`} onClick={close} className="mt-4 inline-block font-semibold text-primary hover:underline">
            All forms of <Fi>{noun.lemma}</Fi> →
          </Link>
        </>
      )}
    </Sheet>
  )
}

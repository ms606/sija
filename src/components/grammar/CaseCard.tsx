import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { CASES_INFO } from '../../data/cases'
import type { CaseId } from '../../grammar/types'
import { grammar } from '../../services/grammar'
import { pickText } from '../../services/content/text'
import { useSettings } from '../../stores/settings'
import { cx } from '../../utils/cx'
import { AudioButton } from '../audio/AudioButton'
import { Fi } from '../ui/FiText'
import { ColoredForm } from './ColoredForm'

/**
 * Summary card for one case: name, question word, endings and a worked
 * example. The whole card is clickable (stretched link); the audio button sits
 * above the link so the two interactive elements are not nested.
 */
export function CaseCard({ caseId, className }: { caseId: CaseId; className?: string }) {
  const mode = useSettings((s) => s.mode)
  const info = CASES_INFO[caseId]
  const noun = grammar.require(info.demoNounId)
  const v = grammar.inflect(noun, info.demoSlot).variants[0]
  const meaning = pickText(info.meaning, mode)
  return (
    <article
      className={cx(
        'group relative flex h-full flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/60',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold leading-tight">
            <Link to={`/cases/${caseId}`} className="after:absolute after:inset-0 after:rounded-2xl after:content-['']">
              <Fi>{info.fi}</Fi>
            </Link>
          </h3>
          <p className="text-sm text-muted">{info.en}</p>
        </div>
        <Fi className="rounded-lg bg-surface-2 px-2 py-1 text-sm font-semibold">{info.questions[0]?.fi}</Fi>
      </div>
      <p className="mt-2 line-clamp-3 text-sm" lang={meaning.lang}>
        {meaning.main}
      </p>
      {v && (
        <div className="mt-auto flex items-center gap-2 pt-3">
          <p className="text-[1.05rem]">
            <Fi className="font-semibold">{noun.lemma}</Fi>
            <span className="text-muted"> → </span>
            {/* The engine's pieces: the plural marker and the case ending keep their own colours. */}
            <ColoredForm variant={v} className="font-semibold" />
          </p>
          <AudioButton text={v.text} size="sm" slow={false} className="relative z-10" />
          <ArrowRight aria-hidden className="ml-auto size-4 text-muted group-hover:text-primary" />
        </div>
      )}
    </article>
  )
}

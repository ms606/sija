import type { RefObject } from 'react'

/** On-screen ä / ö keys that insert into an input at the cursor. */
export function UmlautKeys({ inputRef, onInsert }: { inputRef: RefObject<HTMLInputElement | null>; onInsert: (value: string) => void }) {
  const insert = (ch: string) => {
    const el = inputRef.current
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + ch + el.value.slice(end)
    onInsert(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + 1, start + 1)
    })
  }
  return (
    <div className="flex gap-1.5" role="group" aria-label="Insert special letters">
      {['ä', 'ö', 'Ä', 'Ö'].map((ch) => (
        <button
          key={ch}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(ch)}
          className="min-h-10 min-w-10 rounded-lg border border-border bg-surface-2 px-2 text-lg font-semibold hover:bg-surface-3"
          aria-label={`Insert ${ch}`}
        >
          {ch}
        </button>
      ))}
    </div>
  )
}

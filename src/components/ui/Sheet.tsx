import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'

/**
 * Modal sheet on the native <dialog> element: focus is trapped and Escape
 * closes it. Slides up from the bottom on phones, centred on wider screens.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl border border-border bg-surface p-0 text-text shadow-card backdrop:bg-black/40 sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <IconButton label="Close" onClick={onClose}>
          <X aria-hidden className="size-5" />
        </IconButton>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-4 py-4">{children}</div>
    </dialog>
  )
}

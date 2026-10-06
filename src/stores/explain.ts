import { create } from 'zustand'
import type { PersonId, SlotKey } from '../grammar/types'

export interface ExplainTarget {
  lexemeId: string
  slot: SlotKey
  person?: PersonId
  /** Show this particular variant (e.g. the learner's accepted alternative). */
  variantText?: string
}

/** Opens the global "how is this form built?" sheet from anywhere in the app. */
export const useExplain = create<{ target: ExplainTarget | null; open: (t: ExplainTarget) => void; close: () => void }>()((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}))

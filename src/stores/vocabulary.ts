import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface VocabularyPlace {
  /** The page's filters and view, as a query string ('' when there are none). */
  search: string
  /** The word the learner is on, shared by the card grid and the flashcards. */
  wordId: string | null
}

interface VocabularyStore extends VocabularyPlace {
  set: (patch: Partial<VocabularyPlace>) => void
}

/** Where the learner left the Vocabulary page, so coming back through the menu resumes there (localStorage, per device). */
export const useVocabularyPlace = create<VocabularyStore>()(
  persist(
    (set) => ({
      search: '',
      wordId: null,
      set: (patch) => set(patch),
    }),
    {
      name: 'sija-vocabulary',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
)

import type { ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { ErrorPage } from './pages/ErrorPage'

type PageModule = { default: ComponentType }
const page = (load: () => Promise<PageModule>) => async () => ({ Component: (await load()).default })

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: <div className="p-8 text-muted">Loading…</div>,
    children: [
      { index: true, lazy: page(() => import('./pages/Dashboard')) },
      { path: 'learn', lazy: page(() => import('./pages/learn/LearnPage')) },
      { path: 'learn/:lessonId', lazy: page(() => import('./pages/learn/LessonPage')) },
      { path: 'cases', lazy: page(() => import('./pages/cases/CasesPage')) },
      { path: 'cases/partitive/lab', lazy: page(() => import('./pages/cases/PartitiveLabPage')) },
      { path: 'cases/genitive/lab', lazy: page(() => import('./pages/cases/GenitiveLabPage')) },
      { path: 'cases/:caseId', lazy: page(() => import('./pages/cases/CaseDetailPage')) },
      { path: 'noun-types', lazy: page(() => import('./pages/types/NounTypesPage')) },
      { path: 'noun-types/i-words', lazy: page(() => import('./pages/types/INounLabPage')) },
      { path: 'noun-types/:typeId', lazy: page(() => import('./pages/types/NounTypeDetailPage')) },
      { path: 'stem-lab', lazy: page(() => import('./pages/stem/StemLabPage')) },
      { path: 'stem-lab/harmony', lazy: page(() => import('./pages/stem/VowelHarmonyPage')) },
      { path: 'stem-lab/possessives', lazy: page(() => import('./pages/stem/PossessiveLabPage')) },
      { path: 'gradation', lazy: page(() => import('./pages/gradation/GradationPage')) },
      { path: 'gradation/:patternId', lazy: page(() => import('./pages/gradation/GradationPatternPage')) },
      { path: 'plural', lazy: page(() => import('./pages/plural/PluralLabPage')) },
      { path: 'practice', lazy: page(() => import('./pages/practice/PracticePage')) },
      { path: 'practice/session', lazy: page(() => import('./pages/practice/PracticeSessionPage')) },
      { path: 'listening', lazy: page(() => import('./pages/listening/ListeningPage')) },
      { path: 'vocabulary', lazy: page(() => import('./pages/vocabulary/VocabularyPage')) },
      { path: 'progress', lazy: page(() => import('./pages/progress/ProgressPage')) },
      { path: 'reference', lazy: page(() => import('./pages/reference/ReferencePage')) },
      { path: 'reference/:nounId', lazy: page(() => import('./pages/reference/NounDetailPage')) },
      { path: 'yki', lazy: page(() => import('./pages/yki/YkiPage')) },
      { path: 'yki/:taskId', lazy: page(() => import('./pages/yki/YkiTaskPage')) },
      { path: 'settings', lazy: page(() => import('./pages/settings/SettingsPage')) },
      { path: 'credits', lazy: page(() => import('./pages/settings/CreditsPage')) },
      { path: '*', lazy: page(() => import('./pages/NotFoundPage')) },
    ],
  },
]

export const router = createBrowserRouter(routes)

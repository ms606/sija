import {
  BookOpen,
  ChartColumn,
  Dumbbell,
  FlaskConical,
  GraduationCap,
  Grid3x3,
  Headphones,
  House,
  Layers,
  Library,
  MapIcon,
  Search,
  Shapes,
  Waves,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  fi: string
  icon: LucideIcon
}

export const NAV_GROUPS: readonly { title: string; items: NavItem[] }[] = [
  {
    title: 'Start',
    items: [
      { to: '/', label: 'Dashboard', fi: 'Etusivu', icon: House },
      { to: '/learn', label: 'Learn', fi: 'Opi', icon: BookOpen },
      { to: '/map', label: 'Learning map', fi: 'Oppimispolku', icon: MapIcon },
    ],
  },
  {
    title: 'Explore',
    items: [
      { to: '/cases', label: 'Cases', fi: 'Sijat', icon: Grid3x3 },
      { to: '/noun-types', label: 'Noun Types', fi: 'Taivutustyypit', icon: Shapes },
      { to: '/stem-lab', label: 'Stem Lab', fi: 'Vartalolaboratorio', icon: FlaskConical },
      { to: '/gradation', label: 'Consonant Gradation', fi: 'Astevaihtelu', icon: Waves },
      { to: '/plural', label: 'Plural Lab', fi: 'Monikko', icon: Layers },
    ],
  },
  {
    title: 'Practice',
    items: [
      { to: '/practice', label: 'Practice', fi: 'Harjoittele', icon: Dumbbell },
      { to: '/listening', label: 'Listening', fi: 'Kuuntelu', icon: Headphones },
      { to: '/yki', label: 'YKI practice', fi: 'YKI-harjoitus', icon: GraduationCap },
    ],
  },
  {
    title: 'Words & progress',
    items: [
      { to: '/vocabulary', label: 'Vocabulary', fi: 'Sanasto', icon: Library },
      { to: '/progress', label: 'Progress', fi: 'Edistyminen', icon: ChartColumn },
      { to: '/reference', label: 'Reference', fi: 'Hakemisto', icon: Search },
    ],
  },
]

/** Bottom tab bar on phones (the rest lives under "More"). */
export const TAB_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Home', fi: 'Etusivu', icon: House },
  { to: '/learn', label: 'Learn', fi: 'Opi', icon: BookOpen },
  { to: '/practice', label: 'Practice', fi: 'Harjoittele', icon: Dumbbell },
  { to: '/reference', label: 'Search', fi: 'Haku', icon: Search },
]

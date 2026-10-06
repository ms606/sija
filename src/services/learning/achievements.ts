import { CASE_ORDER } from '../../data/cases'
import type { SkillStat } from './mastery'
import { mastery } from './mastery'

export interface AchievementState {
  xp: number
  streak: { current: number; best: number }
  lessons: Record<string, { status: 'started' | 'done' }>
  skills: Record<string, SkillStat>
  perfectSessions: number
  sessions: number
  totalAttempts: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  check: (s: AchievementState) => boolean
}

const correct = (s: AchievementState, skill: string) => s.skills[skill]?.correct ?? 0

/** Understated milestones for adults — no confetti, just a record of progress. */
export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-answer', title: 'First steps', description: 'Answer your first exercise.', check: (s) => s.totalAttempts >= 1 },
  { id: 'first-session', title: 'Warmed up', description: 'Finish a practice session.', check: (s) => s.sessions >= 1 },
  { id: 'first-lesson', title: 'First lesson', description: 'Complete a lesson.', check: (s) => Object.values(s.lessons).some((l) => l.status === 'done') },
  { id: 'perfect', title: 'Clean sheet', description: 'Finish a session without mistakes.', check: (s) => s.perfectSessions >= 1 },
  { id: 'streak-3', title: 'Three days running', description: 'Reach your daily goal three days in a row.', check: (s) => s.streak.best >= 3 },
  { id: 'streak-7', title: 'A full week', description: 'Reach your daily goal seven days in a row.', check: (s) => s.streak.best >= 7 },
  { id: 'xp-500', title: '500 XP', description: 'Collect 500 experience points.', check: (s) => s.xp >= 500 },
  { id: 'xp-2000', title: '2000 XP', description: 'Collect 2000 experience points.', check: (s) => s.xp >= 2000 },
  { id: 'gradation-25', title: 'Strong and weak', description: 'Get 25 consonant-gradation items right.', check: (s) => correct(s, 'gradation') >= 25 },
  { id: 'partitive-25', title: 'Some of it', description: 'Get 25 partitive items right.', check: (s) => correct(s, 'partitive') >= 25 },
  { id: 'i-words', title: 'Four families', description: 'Reach 80% mastery on -i words.', check: (s) => mastery(s.skills['i-words']) >= 0.8 },
  { id: 'plural-25', title: 'More than one', description: 'Get 25 plural items right.', check: (s) => correct(s, 'plural') >= 25 },
  { id: 'possessives', title: 'Mine and yours', description: 'Get 15 possessive-suffix items right.', check: (s) => correct(s, 'possessives') >= 15 },
  { id: 'all-cases', title: 'Every case', description: 'Practise all 15 cases.', check: (s) => CASE_ORDER.filter((c) => c !== 'accusative').every((c) => (s.skills[`case:${c}`]?.attempts ?? 0) > 0) },
  { id: 'level-1', title: 'Foundation laid', description: 'Complete every lesson of level 1.', check: (s) => ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8'].every((id) => s.lessons[id]?.status === 'done') },
]

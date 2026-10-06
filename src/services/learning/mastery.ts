import type { CategoryId, SkillId } from '../../types/exercise'
import { CATEGORY_ORDER, CATEGORY_INFO, skillLabel } from '../exercises/skills'

export interface SkillStat {
  attempts: number
  correct: number
  /** The most recent attempts, oldest first (max 30). */
  recent: { at: number; ok: boolean }[]
}

export const RECENT_WINDOW = 30
const FULL_CONFIDENCE_AFTER = 8

/** Recency-weighted accuracy over the last 30 attempts, scaled down until there are 8 attempts. */
export function mastery(stat: SkillStat | undefined): number {
  if (!stat || stat.recent.length === 0) return 0
  let weighted = 0
  let total = 0
  const n = stat.recent.length
  stat.recent.forEach((r, i) => {
    const w = 0.92 ** (n - 1 - i)
    total += w
    if (r.ok) weighted += w
  })
  return (weighted / total) * Math.min(1, stat.attempts / FULL_CONFIDENCE_AFTER)
}

export type MasteryTier = 'new' | 'learning' | 'familiar' | 'confident' | 'mastered'

export function tier(m: number, attempts: number): MasteryTier {
  if (attempts === 0) return 'new'
  if (m >= 0.9) return 'mastered'
  if (m >= 0.75) return 'confident'
  if (m >= 0.5) return 'familiar'
  return 'learning'
}

export const TIER_LABEL: Record<MasteryTier, string> = {
  new: 'Not started',
  learning: 'Learning',
  familiar: 'Familiar',
  confident: 'Confident',
  mastered: 'Mastered',
}

export function categoryMastery(skills: Readonly<Record<string, SkillStat>>): { id: CategoryId; label: string; value: number; attempts: number }[] {
  return CATEGORY_ORDER.map((id) => ({ id, label: CATEGORY_INFO[id].label, value: mastery(skills[id]), attempts: skills[id]?.attempts ?? 0 }))
}

/** Overall mastery: the mean over all 15 categories (unpractised ones count as 0). */
export function overallMastery(skills: Readonly<Record<string, SkillStat>>): number {
  const cats = categoryMastery(skills)
  return cats.reduce((s, c) => s + c.value, 0) / cats.length
}

export interface WeakArea {
  skill: SkillId
  label: string
  value: number
  attempts: number
  suggestion: string
}

/** Skills with at least 5 attempts and the lowest mastery, each with a concrete suggestion. */
export function weakAreas(skills: Readonly<Record<string, SkillStat>>, limit = 4): WeakArea[] {
  return Object.entries(skills)
    .filter(([, s]) => s.attempts >= 5)
    .map(([skill, s]) => ({ skill: skill as SkillId, label: skillLabel(skill as SkillId), value: mastery(s), attempts: s.attempts }))
    .filter((w) => w.value < 0.8)
    .sort((a, b) => a.value - b.value)
    .slice(0, limit)
    .map((w) => ({ ...w, suggestion: `Practise 10 ${w.label} items` }))
}

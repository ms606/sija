import { ALL_SLOTS, PERSONS, type PersonId, type SlotKey } from '../../grammar'
import { EMPTY_PROGRESS, type DailyStat, type ProgressData } from '../../stores/progress'
import type { SkillStat } from '../learning/mastery'
import type { ReviewItem } from '../learning/srs'

export const BACKUP_FORMAT = 'sija-progress'

/** A JSON backup of all progress (everything stays on this device unless the learner exports it). */
export function exportProgress(data: ProgressData): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), data }, null, 2)
}

// A backup is untrusted input: it is persisted and later read by every page, so
// one wrong shape (e.g. `recentNouns: {}`) would break the app on each load.
// Every field is rebuilt from scratch; malformed entries and unknown keys are dropped.

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

function list<T>(v: unknown, parse: (x: unknown) => T | null): T[] {
  return Array.isArray(v) ? v.map(parse).filter((x): x is T => x !== null) : []
}

function record<T>(v: unknown, parse: (x: unknown) => T | null): Record<string, T> {
  if (!isObj(v)) return {}
  const entries: [string, T][] = []
  for (const [k, x] of Object.entries(v)) {
    const p = parse(x)
    if (p !== null && k !== '__proto__') entries.push([k, p])
  }
  return Object.fromEntries(entries)
}

const slotSet = new Set<string>(ALL_SLOTS)
const personSet = new Set<string>(PERSONS)

const num = (v: unknown): number | null => (isNum(v) ? v : null)

const skill = (v: unknown): SkillStat | null =>
  isObj(v) && isNum(v.attempts) && isNum(v.correct)
    ? {
        attempts: v.attempts,
        correct: v.correct,
        recent: list(v.recent, (r) => (isObj(r) && isNum(r.at) && typeof r.ok === 'boolean' ? { at: r.at, ok: r.ok } : null)),
      }
    : null

const lesson = (v: unknown): ProgressData['lessons'][string] | null =>
  isObj(v) && (v.status === 'started' || v.status === 'done') && isNum(v.at)
    ? { status: v.status, at: v.at, ...(isNum(v.score) ? { score: v.score } : {}) }
    : null

const day = (v: unknown): DailyStat | null =>
  isObj(v) && isNum(v.items) && isNum(v.correct) && isNum(v.xp)
    ? { items: v.items, correct: v.correct, xp: v.xp, ...(typeof v.goalMet === 'boolean' ? { goalMet: v.goalMet } : {}) }
    : null

function review(v: unknown): ReviewItem | null {
  if (!isObj(v) || !isStr(v.key) || (v.kind !== 'form' && v.kind !== 'recognize')) return null
  const t = v.target
  if (!isObj(t) || !isStr(t.lexemeId) || !isStr(t.slot) || !slotSet.has(t.slot)) return null
  if (t.person !== undefined && !(isStr(t.person) && personSet.has(t.person))) return null
  if (![v.ease, v.intervalDays, v.due, v.reps, v.lapses].every(isNum)) return null
  return {
    key: v.key,
    kind: v.kind,
    target: { lexemeId: t.lexemeId, slot: t.slot as SlotKey, ...(t.person !== undefined ? { person: t.person as PersonId } : {}) },
    ease: v.ease as number,
    intervalDays: v.intervalDays as number,
    due: v.due as number,
    reps: v.reps as number,
    lapses: v.lapses as number,
    ...(isNum(v.lastReviewed) ? { lastReviewed: v.lastReviewed } : {}),
    history: list(v.history, (h) =>
      isObj(h) && isNum(h.at) && typeof h.correct === 'boolean' && isNum(h.ms) ? { at: h.at, correct: h.correct, ms: h.ms } : null,
    ),
  }
}

function streak(v: unknown): ProgressData['streak'] {
  if (!isObj(v) || !isNum(v.current) || !isNum(v.best)) return EMPTY_PROGRESS.streak
  return { current: v.current, best: v.best, lastDay: isStr(v.lastDay) ? v.lastDay : null }
}

/** Parses and validates a backup file. Throws with a readable message when it is not valid. */
export function parseBackup(text: string): ProgressData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT || !isObj(raw.data)) {
    throw new Error('This is not a Sija progress backup.')
  }
  const d = raw.data
  if (!isNum(d.xp) || !isObj(d.skills) || !isObj(d.lessons)) {
    throw new Error('The backup is missing required fields.')
  }
  return {
    schemaVersion: 1,
    xp: d.xp,
    streak: streak(d.streak),
    lessons: record(d.lessons, lesson),
    skills: record(d.skills, skill),
    achievements: record(d.achievements, num),
    recentNouns: list(d.recentNouns, (r) => (isObj(r) && isStr(r.id) && isNum(r.at) ? { id: r.id, at: r.at } : null)),
    daily: record(d.daily, day),
    reviews: record(d.reviews, review),
    sessions: num(d.sessions) ?? 0,
    perfectSessions: num(d.perfectSessions) ?? 0,
    totalAttempts: num(d.totalAttempts) ?? 0,
  }
}

import { ALL_SLOTS, PERSONS, type PersonId, type SlotKey } from '../../grammar'
import type { ProgressData } from '../../stores/progress'
import type { SkillStat } from '../learning/mastery'
import type { ReviewItem } from '../learning/srs'

/**
 * The synced copy of the learner's progress: one document on the server, merged
 * on each device. Counters are kept as one tally per device, so sending a tally
 * again replaces it instead of adding it twice (a lost reply can't double-count).
 */

export const SYNC_FORMAT = 'sija-sync'
export const SYNC_FORMAT_VERSION = 1

/** Local calendar day, e.g. "2026-11-16". */
export type DayKey = string

export interface DayTally {
  items: number
  correct: number
  /** XP from answers only. The daily-goal bonus is counted from `goalDays`. */
  xp: number
  activeMs: number
}

/** Everything one device has added since the start. It only ever grows. */
export interface Tally {
  /** XP from answers only. Daily-goal and lesson bonuses are counted once, from goal days and lessons. */
  xp: number
  totalAttempts: number
  sessions: number
  perfectSessions: number
  skills: Record<string, { attempts: number; correct: number }>
  daily: Record<DayKey, DayTally>
}

export type Streak = ProgressData['streak']

/** The progress a new epoch starts from (the first device's, or a reset or imported one). */
export interface StartPoint {
  /** Totals at the start, bonuses included. */
  counters: Tally
  /** Goal days already in `counters`, so their bonus is not added again. */
  goalDays: DayKey[]
  /** Lessons already done in `counters`, so their bonus is not added again. */
  doneLessons: string[]
  streak: Streak
}

export type PrefValue = string | number | boolean | null

export interface PrefEntry {
  value: PrefValue
  changedAt: number
}

export interface SyncDoc {
  format: typeof SYNC_FORMAT
  formatVersion: typeof SYNC_FORMAT_VERSION
  /** Changes when progress is replaced: first upload, reset, import, "use this device's progress". */
  epoch: string
  start: StartPoint
  /** Device id → that device's tally. */
  tallies: Record<string, Tally>
  /** Every day the daily goal was reached, sorted. */
  goalDays: DayKey[]
  lessons: ProgressData['lessons']
  reviews: Record<string, ReviewItem>
  /** Skill → its most recent answers (the mastery window). */
  skillHistory: Record<string, SkillStat['recent']>
  achievements: Record<string, number>
  recentNouns: ProgressData['recentNouns']
  /** Learner settings shared by all devices; the last change wins. */
  prefs: Record<string, PrefEntry>
}

/** What a device keeps about its own syncing, saved in the same record as its progress. */
export interface DeviceSync {
  deviceId: string
  epoch: string
  /** The server version this device last saw. */
  version: number
  /** Everything this device has added, synced or not. */
  myTally: Tally
  /** The progress already counted in `myTally`; new work is measured from here. */
  base: ProgressData
}

/** A connected device's sync bookkeeping, saved in the same record as its progress, so both change in one write. */
export interface SyncInfo {
  deviceId: string
  /** Null until the first sync after connecting has settled which progress to keep. */
  state: DeviceSync | null
  /** Progress changed on this device since its last successful sync. */
  dirty: boolean
  /** The next sync replaces the synced progress with this device's (reset, import, "use this device's progress"). */
  replace: boolean
  lastSyncedAt: number | null
}

export function emptyTally(): Tally {
  return { xp: 0, totalAttempts: 0, sessions: 0, perfectSessions: 0, skills: {}, daily: {} }
}

/** The synced copy was written by a newer version of the app. */
export class NewerFormatError extends Error {
  constructor() {
    super('The synced progress was saved by a newer version of Sija. Update the app to keep syncing.')
    this.name = 'NewerFormatError'
  }
}

/** The synced copy is damaged or not a Sija sync document. */
export class InvalidSyncDocError extends Error {
  readonly path: string
  constructor(path: string) {
    super(`The synced progress could not be read (${path}).`)
    this.name = 'InvalidSyncDocError'
    this.path = path
  }
}

// --------------------------------------------------------------------------
// Validation. A downloaded copy is untrusted. Unlike a backup import, nothing is
// repaired: the device uploads what it reads, so a dropped entry would be lost
// on every device. Any malformed known field rejects the whole copy. Fields this
// version doesn't know are dropped, which is safe because a newer app that adds
// fields also raises SYNC_FORMAT_VERSION, and this app then refuses to write.

type Obj = Record<string, unknown>

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

const fail = (path: string): never => {
  throw new InvalidSyncDocError(path)
}

function obj(v: unknown, path: string): Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Obj) : fail(path)
}

function arr(v: unknown, path: string): unknown[] {
  return Array.isArray(v) ? v : fail(path)
}

function num(v: unknown, path: string): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fail(path)
}

function count(v: unknown, path: string): number {
  const n = num(v, path)
  return n >= 0 ? n : fail(path)
}

function str(v: unknown, path: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fail(path)
}

/** A real local calendar day in the app's "2026-11-16" form. */
export function isDayKey(v: string): boolean {
  if (!DAY_RE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number) as [number, number, number]
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

function day(v: unknown, path: string): DayKey {
  return typeof v === 'string' && isDayKey(v) ? v : fail(path)
}

function bool(v: unknown, path: string): boolean {
  return typeof v === 'boolean' ? v : fail(path)
}

const SLOTS = new Set<string>(ALL_SLOTS)
const PERSON_IDS = new Set<string>(PERSONS)

function lesson(v: unknown, path: string): ProgressData['lessons'][string] {
  const o = obj(v, path)
  const status = o.status === 'started' || o.status === 'done' ? o.status : fail(`${path}.status`)
  return { status, at: num(o.at, `${path}.at`), ...(o.score !== undefined ? { score: num(o.score, `${path}.score`) } : {}) }
}

function review(v: unknown, path: string): ReviewItem {
  const o = obj(v, path)
  const t = obj(o.target, `${path}.target`)
  const slot = typeof t.slot === 'string' && SLOTS.has(t.slot) ? (t.slot as SlotKey) : fail(`${path}.target.slot`)
  const person = t.person === undefined ? undefined : typeof t.person === 'string' && PERSON_IDS.has(t.person) ? (t.person as PersonId) : fail(`${path}.target.person`)
  return {
    key: str(o.key, `${path}.key`),
    kind: o.kind === 'form' || o.kind === 'recognize' ? o.kind : fail(`${path}.kind`),
    target: { lexemeId: str(t.lexemeId, `${path}.target.lexemeId`), slot, ...(person ? { person } : {}) },
    ease: num(o.ease, `${path}.ease`),
    intervalDays: count(o.intervalDays, `${path}.intervalDays`),
    due: num(o.due, `${path}.due`),
    reps: count(o.reps, `${path}.reps`),
    lapses: count(o.lapses, `${path}.lapses`),
    ...(o.lastReviewed !== undefined ? { lastReviewed: num(o.lastReviewed, `${path}.lastReviewed`) } : {}),
    history: arr(o.history, `${path}.history`).map((h, i) => {
      const e = obj(h, `${path}.history.${i}`)
      return { at: num(e.at, `${path}.history.${i}.at`), correct: bool(e.correct, `${path}.history.${i}.correct`), ms: count(e.ms, `${path}.history.${i}.ms`) }
    }),
  }
}

function record<T>(v: unknown, path: string, parse: (x: unknown, p: string) => T, key: (k: string, p: string) => string = (k) => k): Record<string, T> {
  const out: [string, T][] = []
  for (const [k, x] of Object.entries(obj(v, path))) {
    const p = `${path}.${k}`
    if (k === '__proto__') fail(p)
    out.push([key(k, p), parse(x, p)])
  }
  return Object.fromEntries(out)
}

function sortedUnique(items: string[]): string[] {
  return [...new Set(items)].sort()
}

function tally(v: unknown, path: string): Tally {
  const o = obj(v, path)
  return {
    xp: count(o.xp, `${path}.xp`),
    totalAttempts: count(o.totalAttempts, `${path}.totalAttempts`),
    sessions: count(o.sessions, `${path}.sessions`),
    perfectSessions: count(o.perfectSessions, `${path}.perfectSessions`),
    skills: record(o.skills, `${path}.skills`, (x, p) => {
      const s = obj(x, p)
      return { attempts: count(s.attempts, `${p}.attempts`), correct: count(s.correct, `${p}.correct`) }
    }),
    daily: record(
      o.daily,
      `${path}.daily`,
      (x, p) => {
        const d = obj(x, p)
        return { items: count(d.items, `${p}.items`), correct: count(d.correct, `${p}.correct`), xp: count(d.xp, `${p}.xp`), activeMs: count(d.activeMs, `${p}.activeMs`) }
      },
      day,
    ),
  }
}

function streak(v: unknown, path: string): Streak {
  const o = obj(v, path)
  return {
    current: count(o.current, `${path}.current`),
    best: count(o.best, `${path}.best`),
    lastDay: o.lastDay === null ? null : day(o.lastDay, `${path}.lastDay`),
  }
}

function prefValue(v: unknown, path: string): PrefValue {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v
  return num(v, path)
}

/**
 * Checks a downloaded sync document. Throws `NewerFormatError` for a copy from a
 * newer app version and `InvalidSyncDocError` for anything malformed.
 */
export function parseSyncDoc(raw: unknown): SyncDoc {
  const o = obj(raw, 'document')
  if (o.format !== SYNC_FORMAT) fail('format')
  const version = num(o.formatVersion, 'formatVersion')
  if (version > SYNC_FORMAT_VERSION) throw new NewerFormatError()
  if (version !== SYNC_FORMAT_VERSION) fail('formatVersion')

  const s = obj(o.start, 'start')
  return {
    format: SYNC_FORMAT,
    formatVersion: SYNC_FORMAT_VERSION,
    epoch: str(o.epoch, 'epoch'),
    start: {
      counters: tally(s.counters, 'start.counters'),
      goalDays: sortedUnique(arr(s.goalDays, 'start.goalDays').map((d, i) => day(d, `start.goalDays.${i}`))),
      doneLessons: sortedUnique(arr(s.doneLessons, 'start.doneLessons').map((d, i) => str(d, `start.doneLessons.${i}`))),
      streak: streak(s.streak, 'start.streak'),
    },
    tallies: record(o.tallies, 'tallies', tally),
    goalDays: sortedUnique(arr(o.goalDays, 'goalDays').map((d, i) => day(d, `goalDays.${i}`))),
    lessons: record(o.lessons, 'lessons', lesson),
    reviews: record(o.reviews, 'reviews', review),
    skillHistory: record(o.skillHistory, 'skillHistory', (x, p) =>
      arr(x, p).map((r, i) => {
        const e = obj(r, `${p}.${i}`)
        return { at: num(e.at, `${p}.${i}.at`), ok: bool(e.ok, `${p}.${i}.ok`) }
      }),
    ),
    achievements: record(o.achievements, 'achievements', num),
    recentNouns: arr(o.recentNouns, 'recentNouns').map((r, i) => {
      const e = obj(r, `recentNouns.${i}`)
      return { id: str(e.id, `recentNouns.${i}.id`), at: num(e.at, `recentNouns.${i}.at`) }
    }),
    prefs: record(o.prefs, 'prefs', (x, p) => {
      const e = obj(x, p)
      return { value: prefValue(e.value, `${p}.value`), changedAt: num(e.changedAt, `${p}.changedAt`) }
    }),
  }
}

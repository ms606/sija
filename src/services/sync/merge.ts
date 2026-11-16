import type { DailyStat, ProgressData } from '../../stores/progress'
import { ACHIEVEMENTS } from '../learning/achievements'
import { RECENT_WINDOW, type SkillStat } from '../learning/mastery'
import type { ReviewItem } from '../learning/srs'
import { previousDay, XP } from '../learning/xp'
import { emptyTally, SYNC_FORMAT, SYNC_FORMAT_VERSION, type DayKey, type DayTally, type DeviceSync, type PrefEntry, type Streak, type SyncDoc, type Tally } from './doc'

/*
 * Merge rules for syncing progress between devices. Everything here is pure.
 *
 * Counters (XP from answers, answers, sessions, skill counts, each day's numbers)
 * are kept per device: total = start + every device's tally. A device only ever
 * writes its own tally, and merging two copies of one tally takes the larger
 * value, so a tally sent twice (lost reply, crash, retry) is still counted once.
 *
 * Bonuses are not in the tallies. The +25 daily-goal bonus is counted once per
 * goal day and the +50 lesson bonus once per lesson first completed, so two
 * devices earning the same bonus offline can't count it twice.
 *
 * Everything else merges with rules that give the same result in any order and
 * when repeated (see mergeDocs).
 */

/** The progress store keeps this many answers per review card (srs.ts). */
const REVIEW_HISTORY = 12
/** The progress store keeps this many recently viewed words (stores/progress.ts). */
const RECENT_NOUNS = 12

const ZERO_DAY: DayTally = { items: 0, correct: 0, xp: 0, activeMs: 0 }
const ZERO_SKILL = { attempts: 0, correct: 0 }

const keysOf = (...objects: object[]): string[] => [...new Set(objects.flatMap((o) => Object.keys(o)))]

function mapValues<T, U>(o: Record<string, T>, f: (v: T) => U): Record<string, U> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]))
}

/** Days on which the daily goal was reached, sorted. */
export function goalDaysOf(p: ProgressData): DayKey[] {
  return Object.keys(p.daily)
    .filter((d) => p.daily[d]?.goalMet)
    .sort()
}

function doneLessonsOf(lessons: ProgressData['lessons']): string[] {
  return Object.keys(lessons)
    .filter((id) => lessons[id]?.status === 'done')
    .sort()
}

// --------------------------------------------------------------------------
// Tallies

function combine(a: Tally, b: Tally, op: (x: number, y: number) => number): Tally {
  const skills: Tally['skills'] = {}
  for (const k of keysOf(a.skills, b.skills)) {
    const x = a.skills[k] ?? ZERO_SKILL
    const y = b.skills[k] ?? ZERO_SKILL
    skills[k] = { attempts: op(x.attempts, y.attempts), correct: op(x.correct, y.correct) }
  }
  const daily: Tally['daily'] = {}
  for (const d of keysOf(a.daily, b.daily)) {
    const x = a.daily[d] ?? ZERO_DAY
    const y = b.daily[d] ?? ZERO_DAY
    daily[d] = { items: op(x.items, y.items), correct: op(x.correct, y.correct), xp: op(x.xp, y.xp), activeMs: op(x.activeMs, y.activeMs) }
  }
  return {
    xp: op(a.xp, b.xp),
    totalAttempts: op(a.totalAttempts, b.totalAttempts),
    sessions: op(a.sessions, b.sessions),
    perfectSessions: op(a.perfectSessions, b.perfectSessions),
    skills,
    daily,
  }
}

export const addTally = (a: Tally, b: Tally): Tally => combine(a, b, (x, y) => x + y)

/** Two copies of one device's tally: each number only grows, so the larger is the newer. */
export const maxTally = (a: Tally, b: Tally): Tally => combine(a, b, Math.max)

const gain = (now: number, before: number) => Math.max(0, now - before)

/**
 * The counters added between two snapshots of one device's progress, without
 * bonuses: a goal day or a first lesson completion reached in between is taken
 * out again, because bonuses are counted from goal days and lessons.
 */
export function diffTally(base: ProgressData, local: ProgressData): Tally {
  const baseGoalDays = new Set(goalDaysOf(base))
  const newGoalDays = goalDaysOf(local).filter((d) => !baseGoalDays.has(d)).length
  const baseDone = new Set(doneLessonsOf(base.lessons))
  const newDone = doneLessonsOf(local.lessons).filter((id) => !baseDone.has(id)).length

  const skills: Tally['skills'] = {}
  for (const [k, s] of Object.entries(local.skills)) {
    const b = base.skills[k]
    const attempts = gain(s.attempts, b?.attempts ?? 0)
    const correct = gain(s.correct, b?.correct ?? 0)
    if (attempts || correct) skills[k] = { attempts, correct }
  }
  const daily: Tally['daily'] = {}
  for (const [d, s] of Object.entries(local.daily)) {
    const b = base.daily[d]
    const bonus = s.goalMet && !b?.goalMet ? XP.dailyGoal : 0
    const t: DayTally = {
      items: gain(s.items, b?.items ?? 0),
      correct: gain(s.correct, b?.correct ?? 0),
      xp: gain(s.xp - bonus, b?.xp ?? 0),
      activeMs: gain(s.activeMs ?? 0, b?.activeMs ?? 0),
    }
    if (t.items || t.correct || t.xp || t.activeMs) daily[d] = t
  }
  return {
    xp: gain(local.xp - XP.dailyGoal * newGoalDays - XP.lesson * newDone, base.xp),
    totalAttempts: gain(local.totalAttempts, base.totalAttempts),
    sessions: gain(local.sessions, base.sessions),
    perfectSessions: gain(local.perfectSessions, base.perfectSessions),
    skills,
    daily,
  }
}

/** Counts the device's work since its base into its tally. */
export function absorb(sync: DeviceSync, local: ProgressData): DeviceSync {
  return { ...sync, myTally: addTally(sync.myTally, diffTally(sync.base, local)), base: local }
}

// --------------------------------------------------------------------------
// Records

function mergeRecord<T>(a: Record<string, T>, b: Record<string, T>, merge: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = {}
  for (const k of keysOf(a, b)) {
    const x = a[k]
    const y = b[k]
    out[k] = x !== undefined && y !== undefined ? merge(x, y) : (x ?? y)!
  }
  return out
}

type Lesson = ProgressData['lessons'][string]

const bestScore = (...scores: (number | undefined)[]) => {
  const known = scores.filter((s): s is number => s !== undefined)
  return known.length ? { score: Math.max(...known) } : {}
}

/** "Done" beats "started"; the best score and the latest completion are kept. */
function mergeLesson(x: Lesson, y: Lesson): Lesson {
  if (x.status === 'started' && y.status === 'started') return { status: 'started', at: Math.min(x.at, y.at) }
  const at = Math.max(...[x, y].filter((l) => l.status === 'done').map((l) => l.at))
  return { status: 'done', ...bestScore(x.score, y.score), at }
}

/** Positive when x is the later review of the card; ties fall through to fields that only grow. */
function compareReviews(x: ReviewItem, y: ReviewItem): number {
  return (
    (x.lastReviewed ?? -1) - (y.lastReviewed ?? -1) ||
    x.reps - y.reps ||
    x.lapses - y.lapses ||
    x.due - y.due ||
    x.ease - y.ease ||
    x.intervalDays - y.intervalDays
  )
}

/** The most recent review's schedule wins; both answer histories are kept. */
function mergeReview(x: ReviewItem, y: ReviewItem): ReviewItem {
  const later = compareReviews(x, y) >= 0 ? x : y
  const seen = new Map<string, ReviewItem['history'][number]>()
  for (const h of [...x.history, ...y.history]) seen.set(`${h.at}|${h.correct}|${h.ms}`, h)
  const history = [...seen.values()].sort((a, b) => a.at - b.at || a.ms - b.ms || Number(a.correct) - Number(b.correct)).slice(-REVIEW_HISTORY)
  return { ...later, history }
}

/** A skill's recent answers from both devices, in time order, last 30 kept. */
function mergeRecent(x: SkillStat['recent'], y: SkillStat['recent']): SkillStat['recent'] {
  const seen = new Map<string, SkillStat['recent'][number]>()
  for (const r of [...x, ...y]) seen.set(`${r.at}|${r.ok}`, r)
  return [...seen.values()].sort((a, b) => a.at - b.at || Number(a.ok) - Number(b.ok)).slice(-RECENT_WINDOW)
}

/** Recently viewed words from both devices, newest first, top 12. */
function mergeRecentNouns(x: ProgressData['recentNouns'], y: ProgressData['recentNouns']): ProgressData['recentNouns'] {
  const latest = new Map<string, number>()
  for (const r of [...x, ...y]) latest.set(r.id, Math.max(r.at, latest.get(r.id) ?? -Infinity))
  return [...latest]
    .map(([id, at]) => ({ id, at }))
    .sort((a, b) => b.at - a.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, RECENT_NOUNS)
}

/** The last change wins; a tie is settled by the value so every device picks the same one. */
function mergePref(x: PrefEntry, y: PrefEntry): PrefEntry {
  if (x.changedAt !== y.changedAt) return x.changedAt > y.changedAt ? x : y
  return JSON.stringify(x.value) >= JSON.stringify(y.value) ? x : y
}

/**
 * Merges two copies of the synced document from the same epoch. The result is
 * the same in either order, and merging a copy into itself changes nothing.
 */
export function mergeDocs(a: SyncDoc, b: SyncDoc): SyncDoc {
  if (a.epoch !== b.epoch) throw new Error(`Cannot merge progress from different epochs (${a.epoch}, ${b.epoch}).`)
  return {
    format: SYNC_FORMAT,
    formatVersion: SYNC_FORMAT_VERSION,
    epoch: a.epoch,
    start: a.start,
    tallies: mergeRecord(a.tallies, b.tallies, maxTally),
    goalDays: [...new Set([...a.goalDays, ...b.goalDays])].sort(),
    lessons: mergeRecord(a.lessons, b.lessons, mergeLesson),
    reviews: mergeRecord(a.reviews, b.reviews, mergeReview),
    skillHistory: mergeRecord(a.skillHistory, b.skillHistory, mergeRecent),
    achievements: mergeRecord(a.achievements, b.achievements, Math.min),
    recentNouns: mergeRecentNouns(a.recentNouns, b.recentNouns),
    prefs: mergeRecord(a.prefs, b.prefs, mergePref),
  }
}

// --------------------------------------------------------------------------
// Totals

function countersOf(p: ProgressData): Tally {
  return {
    xp: p.xp,
    totalAttempts: p.totalAttempts,
    sessions: p.sessions,
    perfectSessions: p.perfectSessions,
    skills: mapValues(p.skills, (s) => ({ attempts: s.attempts, correct: s.correct })),
    daily: mapValues(p.daily, (d) => ({ items: d.items, correct: d.correct, xp: d.xp, activeMs: d.activeMs ?? 0 })),
  }
}

/**
 * The streak from the goal days. Without new goal days the starting streak is
 * kept as it was. The starting streak also vouches for its own run of days, in
 * case older data lacks a goal mark on one of them.
 */
function streakOf(doc: SyncDoc): Streak {
  const start = doc.start.streak
  const startDays = new Set(doc.start.goalDays)
  if (doc.goalDays.every((d) => startDays.has(d))) return { ...start }
  const days = new Set(doc.goalDays)
  let d = start.lastDay
  for (let i = 0; i < start.current && d; i++) {
    days.add(d)
    d = previousDay(d)
  }
  let best = start.best
  let run = 0
  let last: DayKey | null = null
  for (const day of [...days].sort()) {
    run = last !== null && previousDay(day) === last ? run + 1 : 1
    best = Math.max(best, run)
    last = day
  }
  return { current: run, best, lastDay: last }
}

/** The progress the app shows for a synced document. */
export function assemble(doc: SyncDoc): ProgressData {
  const total = Object.values(doc.tallies).reduce(addTally, doc.start.counters)
  const startGoalDays = new Set(doc.start.goalDays)
  const goalDays = new Set(doc.goalDays)
  const startDone = new Set(doc.start.doneLessons)
  const newGoalDays = doc.goalDays.filter((d) => !startGoalDays.has(d)).length
  const newDone = doneLessonsOf(doc.lessons).filter((id) => !startDone.has(id)).length

  const daily: Record<DayKey, DailyStat> = {}
  for (const d of [...keysOf(total.daily), ...doc.goalDays.filter((g) => !Object.hasOwn(total.daily, g))].sort()) {
    const t = total.daily[d] ?? ZERO_DAY
    const met = goalDays.has(d)
    const stat: DailyStat = { items: t.items, correct: t.correct, xp: t.xp + (met && !startGoalDays.has(d) ? XP.dailyGoal : 0) }
    if (met) stat.goalMet = true
    if (t.activeMs > 0) stat.activeMs = t.activeMs
    daily[d] = stat
  }

  const skills: Record<string, SkillStat> = {}
  for (const k of keysOf(total.skills, doc.skillHistory)) {
    skills[k] = { attempts: total.skills[k]?.attempts ?? 0, correct: total.skills[k]?.correct ?? 0, recent: [...(doc.skillHistory[k] ?? [])] }
  }

  return {
    schemaVersion: 1,
    xp: total.xp + XP.dailyGoal * newGoalDays + XP.lesson * newDone,
    streak: streakOf(doc),
    lessons: { ...doc.lessons },
    skills,
    achievements: { ...doc.achievements },
    recentNouns: [...doc.recentNouns],
    daily,
    reviews: { ...doc.reviews },
    sessions: total.sessions,
    perfectSessions: total.perfectSessions,
    totalAttempts: total.totalAttempts,
  }
}

// --------------------------------------------------------------------------
// Syncing a device

/**
 * A new epoch that starts from this progress: the first upload, a reset, an
 * import, or "use this device's progress". `assemble` gives the progress back.
 */
export function startDoc(progress: ProgressData, epoch: string, prefs: Record<string, PrefEntry> = {}): SyncDoc {
  const goalDays = goalDaysOf(progress)
  return {
    format: SYNC_FORMAT,
    formatVersion: SYNC_FORMAT_VERSION,
    epoch,
    start: { counters: countersOf(progress), goalDays, doneLessons: doneLessonsOf(progress.lessons), streak: { ...progress.streak } },
    tallies: {},
    goalDays,
    lessons: { ...progress.lessons },
    reviews: { ...progress.reviews },
    skillHistory: mapValues(progress.skills, (s) => [...s.recent]),
    achievements: { ...progress.achievements },
    recentNouns: [...progress.recentNouns],
    prefs: { ...prefs },
  }
}

/** Takes over a synced document as this device's progress (first connect, or another device replaced progress). */
export function adopt(doc: SyncDoc, deviceId: string, version: number): { sync: DeviceSync; progress: ProgressData } {
  const progress = assemble(doc)
  return { progress, sync: { deviceId, epoch: doc.epoch, version, myTally: doc.tallies[deviceId] ?? emptyTally(), base: progress } }
}

/**
 * When a sync brings new answers to a day that also has answers from elsewhere,
 * the combined count is checked against the daily goal. A device on its own
 * already checked the goal when each answer was given, and days already marked
 * keep their mark.
 */
function markCombinedGoals(doc: SyncDoc, server: SyncDoc, deviceId: string, dailyGoal: number): SyncDoc {
  const mine = doc.tallies[deviceId]
  if (!mine || !(dailyGoal > 0)) return doc
  const marked = new Set(doc.goalDays)
  const added: DayKey[] = []
  for (const [d, t] of Object.entries(mine.daily)) {
    if (marked.has(d) || t.items <= (server.tallies[deviceId]?.daily[d]?.items ?? 0)) continue
    let others = doc.start.counters.daily[d]?.items ?? 0
    for (const [id, other] of Object.entries(doc.tallies)) if (id !== deviceId) others += other.daily[d]?.items ?? 0
    if (others > 0 && others + t.items >= dailyGoal) added.push(d)
  }
  return added.length ? { ...doc, goalDays: [...doc.goalDays, ...added].sort() } : doc
}

/** Achievements the combined totals reach, unlocked now. Earlier unlocks keep their time. */
function unlockAchievements(doc: SyncDoc, now: number): SyncDoc {
  const progress = assemble(doc)
  const achievements = { ...doc.achievements }
  let changed = false
  for (const a of ACHIEVEMENTS) {
    if (achievements[a.id] === undefined && a.check(progress)) {
      achievements[a.id] = now
      changed = true
    }
  }
  return changed ? { ...doc, achievements } : doc
}

export interface MergeOptions {
  /** The learner's daily goal (exercises per day). */
  dailyGoal: number
  now: number
  /** This device's synced settings. */
  prefs?: Record<string, PrefEntry>
}

export interface MergeResult {
  /** The document to upload. */
  doc: SyncDoc
  /** The progress to show once the upload has succeeded. */
  progress: ProgressData
  /** The device's sync info to save together with `progress`. */
  sync: DeviceSync
}

/**
 * Merges this device's progress into the server's copy. Nothing is saved: on a
 * failed or rejected upload, call again with the same `sync` and the new server
 * copy. Throws when the server copy belongs to a different epoch (adopt it instead).
 */
export function mergeLocal(server: SyncDoc, sync: DeviceSync, local: ProgressData, { dailyGoal, now, prefs = {} }: MergeOptions): MergeResult {
  if (server.epoch !== sync.epoch) throw new Error(`The synced progress was replaced (epoch ${server.epoch}, this device has ${sync.epoch}).`)
  const absorbed = absorb(sync, local)
  const mine: SyncDoc = {
    format: SYNC_FORMAT,
    formatVersion: SYNC_FORMAT_VERSION,
    epoch: server.epoch,
    start: server.start,
    tallies: { [sync.deviceId]: absorbed.myTally },
    goalDays: goalDaysOf(local),
    lessons: local.lessons,
    reviews: local.reviews,
    skillHistory: mapValues(local.skills, (s) => s.recent),
    achievements: local.achievements,
    recentNouns: local.recentNouns,
    prefs,
  }
  const doc = unlockAchievements(markCombinedGoals(mergeDocs(server, mine), server, sync.deviceId, dailyGoal), now)
  const progress = assemble(doc)
  return { doc, progress, sync: { ...absorbed, myTally: doc.tallies[sync.deviceId] ?? absorbed.myTally, base: progress } }
}

/**
 * After an upload succeeded. `sent` is the local progress the upload was made
 * from and `current` the local progress now: answers given while the upload was
 * on its way are merged on top, and go up with the next sync.
 */
export function settle(result: MergeResult, version: number, sent: ProgressData, current: ProgressData, options: MergeOptions): MergeResult {
  return mergeLocal(result.doc, { ...result.sync, version, base: sent }, current, options)
}

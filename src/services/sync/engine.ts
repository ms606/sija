import { useProgress, type ProgressData } from '../../stores/progress'
import { SYNCED_SETTINGS, useSettings, type SyncedSetting } from '../../stores/settings'
import { useSyncStatus, type ProgressSummary } from '../../stores/sync'
import * as api from './api'
import { InvalidSyncDocError, NewerFormatError, type PrefEntry, type SyncDoc, type SyncInfo } from './doc'
import { adopt, assemble, mergeLocal, settle, startDoc, trimHistories, type MergeOptions, type MergeResult } from './merge'

/*
 * Keeps a connected device's progress in sync (see the Sija Sync Plan).
 *
 * Each sync merges this device's progress into the server's copy (mergeLocal)
 * and saves the result on top of the version it was merged with. If another
 * device saved first, the server answers with its newer copy and the device
 * merges again. Nothing is saved locally until an upload has succeeded, so a
 * failed or refused upload is simply redone from the same saved sync info.
 *
 * Syncs run when the app starts, when it comes back into view, a few seconds
 * after a change (at most once a minute), when it is hidden and when the device
 * comes back online. Only one tab syncs at a time (Web Locks).
 */

const DEBOUNCE_MS = 3_000
const PUSH_GAP_MS = 60_000
const ATTEMPTS = 3
/** Uploads above this drop the oldest review-card answers (see trimHistories). */
const TRIM_FROM_CHARS = 1_500_000

const OFFLINE = "Not synced yet. Changes from this device upload when you're online."

class TooLargeError extends Error {}
class BusyError extends Error {}

// ---------------------------------------------------------------------------
// Progress and settings

const PROGRESS_KEYS = ['schemaVersion', 'xp', 'streak', 'lessons', 'skills', 'achievements', 'recentNouns', 'daily', 'reviews', 'sessions', 'perfectSessions', 'totalAttempts'] as const

function progressOf(s: ProgressData): ProgressData {
  return Object.fromEntries(PROGRESS_KEYS.map((k) => [k, s[k]])) as unknown as ProgressData
}

/** Whether any progress changed between two store states (each change makes new objects). */
const sameProgress = (a: ProgressData, b: ProgressData) => PROGRESS_KEYS.every((k) => a[k] === b[k])

/** Whether a device has done anything worth asking about before replacing it. */
export function hasProgress(p: ProgressData): boolean {
  return p.xp > 0 || p.totalAttempts > 0 || Object.keys(p.lessons).length > 0 || Object.keys(p.daily).length > 0
}

export function summarize(p: ProgressData): ProgressSummary {
  return {
    xp: p.xp,
    exercises: p.totalAttempts,
    lessonsDone: Object.values(p.lessons).filter((l) => l.status === 'done').length,
    lastDay: Object.keys(p.daily).sort().at(-1) ?? null,
  }
}

/** A short name for this device, e.g. "iPhone · Safari", shown nowhere but stored with its session. */
export function deviceName(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
  const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Device'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox' : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${device} · ${browser}`
}

function localPrefs(): Record<string, PrefEntry> {
  const s = useSettings.getState()
  return Object.fromEntries(SYNCED_SETTINGS.map((k) => [k, { value: s[k], changedAt: s.changedAt[k] ?? 0 }]))
}

/** Takes the synced settings that changed more recently than this device's, or all of them. */
function takePrefs(doc: SyncDoc, all: boolean): void {
  const s = useSettings.getState()
  const values: Partial<Record<SyncedSetting, PrefEntry>> = {}
  for (const key of SYNCED_SETTINGS) {
    const entry = doc.prefs[key]
    if (entry && (all || entry.changedAt > (s.changedAt[key] ?? 0))) values[key] = entry
  }
  if (!Object.keys(values).length) return
  applyingPrefs = true
  try {
    s.applySynced(values)
  } finally {
    applyingPrefs = false
  }
}

/** Set while settings are taken from sync, so that does not count as a change on this device. */
let applyingPrefs = false

const samePrefs = (a: Record<string, PrefEntry>, b: Record<string, PrefEntry>) => JSON.stringify(a) === JSON.stringify(b)

const mergeOptions = (): MergeOptions => ({ dailyGoal: useSettings.getState().dailyGoal, now: Date.now(), prefs: localPrefs() })

const info = (): SyncInfo | null => useProgress.getState().sync

let applying = false

/** Saves progress and sync info in one write. */
function save(progress: ProgressData | null, sync: SyncInfo | null): void {
  applying = true
  try {
    useProgress.setState(progress ? { ...progress, sync } : { sync })
  } finally {
    applying = false
  }
}

function status(phase: 'idle' | 'connecting' | 'syncing' | 'offline' | 'error', message: string | null = null): void {
  useSyncStatus.setState({ phase, message, choice: null })
}

// ---------------------------------------------------------------------------
// Talking to the server

/** The server's copy as of `cache.version`, kept so a sync can merge without downloading it again. */
let cache: (api.Remote & { doc: SyncDoc }) | null = null
let lastPushAt = 0

async function fullPull(): Promise<api.Remote> {
  const remote = await api.pull()
  if (remote === 'unchanged') throw new Error('The server answered "unchanged" to a full download.')
  return remote
}

/** Base64 of the compressed document, trimmed of old review answers if it nears the server's limit. */
async function encodeForUpload(doc: SyncDoc): Promise<string> {
  let text = await api.encode(doc)
  for (const keep of [6, 2, 0]) {
    if (text.length <= TRIM_FROM_CHARS) break
    text = await api.encode(trimHistories(doc, keep))
  }
  if (text.length > api.MAX_UPLOAD_CHARS) throw new TooLargeError()
  return text
}

const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden'

async function upload(doc: SyncDoc, base: number): Promise<api.PushResult> {
  const result = await api.push(await encodeForUpload(doc), base, { keepalive: hidden() })
  lastPushAt = Date.now()
  return result
}

/**
 * Saves a successful sync: the merged progress plus anything the learner did
 * while it ran (settle). Returns false when the device was disconnected, reset
 * or imported meanwhile; that change wins and is synced next.
 */
function finish(
  result: MergeResult,
  version: number,
  sentState: ProgressData & { sync: SyncInfo | null },
  sentPrefs: Record<string, PrefEntry>,
  extra: Partial<SyncInfo> = {},
): boolean {
  const now = useProgress.getState()
  const sync = now.sync
  if (!sync || sync.deviceId !== sentState.sync?.deviceId) return false // disconnected meanwhile
  const isReplace = extra.replace === false
  if (sync.replace && !isReplace) {
    void request('full') // reset or imported meanwhile: that replaces the synced progress next
    return false
  }
  const settled = settle(result, version, progressOf(sentState), progressOf(now), mergeOptions())
  // Progress or a synced setting changed while this sync ran: sync again shortly.
  const changed = !sameProgress(sentState, now) || !samePrefs(sentPrefs, localPrefs())
  save(settled.progress, { ...sync, ...extra, state: settled.sync, dirty: changed, lastSyncedAt: Date.now() })
  takePrefs(result.doc, false)
  cache = { version, doc: result.doc }
  status('idle')
  if (changed) schedulePush()
  return true
}

/** Takes over the server's copy as this device's progress (first connect, or replaced on another device). */
function takeOver(remote: api.Remote & { doc: SyncDoc }): void {
  const sync = info()
  if (!sync) return
  const adopted = adopt(remote.doc, sync.deviceId, remote.version)
  save(adopted.progress, { ...sync, state: adopted.sync, dirty: false, replace: false, lastSyncedAt: Date.now() })
  takePrefs(remote.doc, true)
  cache = remote
  status('idle')
}

/** Uploads this device's progress as a new epoch on top of `base`. */
async function uploadStart(base: number): Promise<api.PushResult> {
  const sentState = useProgress.getState()
  const sync = sentState.sync!
  const prefs = localPrefs()
  const doc = startDoc(progressOf(sentState), crypto.randomUUID(), prefs)
  const pushed = await upload(doc, base)
  if (pushed.saved) {
    const adopted = adopt(doc, sync.deviceId, pushed.version)
    finish({ doc, progress: adopted.progress, sync: adopted.sync }, pushed.version, sentState, prefs, { replace: false })
  }
  return pushed
}

/** Replaces the synced progress with this device's, whatever the server holds. */
async function replaceSynced(knownBase?: number): Promise<void> {
  let base = knownBase ?? (await fullPull()).version
  for (let attempt = 1; ; attempt++) {
    const pushed = await uploadStart(base)
    if (pushed.saved) return
    if (attempt >= ATTEMPTS) throw new BusyError()
    base = pushed.remote.version
  }
}

/** After connecting: start the synced progress, take it over, or ask which progress to keep. */
async function firstSync(): Promise<void> {
  let remote = await fullPull()
  if (!remote.doc) {
    const pushed = await uploadStart(remote.version)
    if (pushed.saved) return
    remote = pushed.remote // another device started it a moment earlier
  }
  if (!remote.doc) throw new BusyError()
  const local = progressOf(useProgress.getState())
  if (!hasProgress(local)) return takeOver({ ...remote, doc: remote.doc })
  useSyncStatus.setState({ phase: 'choose', message: null, choice: { synced: summarize(assemble(remote.doc)), local: summarize(local) } })
}

/** One sync of a connected device whose progress is already settled. */
async function syncOnce(full: boolean): Promise<void> {
  const known = info()!.state!.version
  let remote: api.Remote
  if (!full && cache?.version === known) {
    remote = cache
  } else {
    const got = await api.pull(known)
    if (got === 'unchanged') {
      if (!info()!.dirty) {
        save(null, { ...info()!, lastSyncedAt: Date.now() })
        status('idle')
        return
      }
      remote = cache?.version === known ? cache : await fullPull()
    } else {
      remote = got
    }
  }

  for (let attempt = 1; ; attempt++) {
    if (!remote.doc) return replaceSynced(remote.version) // the server lost its copy: this device starts it again
    const sentState = useProgress.getState()
    const sync = sentState.sync!
    if (remote.doc.epoch !== sync.state!.epoch) return takeOver({ ...remote, doc: remote.doc }) // replaced on another device
    const options = mergeOptions()
    const result = mergeLocal(remote.doc, sync.state!, progressOf(sentState), options)
    if (!sync.dirty) {
      finish(result, remote.version, sentState, options.prefs!) // nothing new here: just take the newer copy
      cache = { ...remote, doc: remote.doc }
      return
    }
    const pushed = await upload(result.doc, remote.version)
    if (pushed.saved) {
      finish(result, pushed.version, sentState, options.prefs!)
      return
    }
    if (attempt >= ATTEMPTS) throw new BusyError()
    remote = pushed.remote
  }
}

// ---------------------------------------------------------------------------
// Running syncs: one at a time, in one tab at a time

type Job = 'pull' | 'push' | 'full'
const RANK: Record<Job, number> = { pull: 0, push: 1, full: 2 }

let queue: Promise<void> = Promise.resolve()
let waiting: { job: Job; done: Promise<void> } | null = null
let timer: ReturnType<typeof setTimeout> | null = null

/** Runs `fn` while no other tab of this app is syncing (they share the same saved progress). */
async function locked(fn: () => Promise<void>): Promise<void> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  if (!locks) return fn()
  await locks.request('sija-sync', fn)
}

/** Runs `fn` after any running sync; errors become a status for the learner. */
function exclusive(fn: () => Promise<void>): Promise<void> {
  const done = queue.then(() => locked(fn)).catch(handle)
  queue = done
  return done
}

function handle(e: unknown): void {
  if (e instanceof api.OfflineError) return status('offline', OFFLINE)
  if (e instanceof api.SignedOutError) {
    cache = null
    save(null, null)
    return status('idle', 'This device was disconnected from sync, so its progress now stays on this device. Connect again to sync it.')
  }
  if (e instanceof NewerFormatError) return status('error', 'Update Sija to keep syncing. Your progress is safe on this device.')
  if (e instanceof InvalidSyncDocError) return status('error', "The synced copy couldn't be read. This device kept its own progress.")
  if (e instanceof TooLargeError) return status('error', 'Your progress has grown too large to sync. It is safe on this device.')
  if (e instanceof BusyError) return status('error', 'Another device kept saving at the same time. Sync will try again shortly.')
  if (e instanceof api.SyncServerError) return status('error', e.message)
  console.error(e)
  status('error', 'Sync failed. It will try again later.')
}

async function work(job: Job): Promise<void> {
  const sync = info()
  if (!sync) return
  if (useSyncStatus.getState().phase === 'choose') return // waiting for the learner
  status('syncing')
  if (!sync.state) return firstSync()
  if (sync.replace) return replaceSynced()
  return syncOnce(job === 'full')
}

/** Asks for a sync. Requests made while one waits to start are merged into it. */
function request(job: Job): Promise<void> {
  if (!info()) return Promise.resolve()
  if (waiting) {
    if (RANK[job] > RANK[waiting.job]) waiting.job = job
    return waiting.done
  }
  const entry: { job: Job; done: Promise<void> } = { job, done: Promise.resolve() }
  waiting = entry
  entry.done = exclusive(() => {
    waiting = null
    return work(entry.job)
  })
  return entry.done
}

function schedulePush(): void {
  if (timer) return
  timer = setTimeout(
    () => {
      timer = null
      void request('push')
    },
    Math.max(DEBOUNCE_MS, lastPushAt + PUSH_GAP_MS - Date.now()),
  )
}

function pushNow(): void {
  if (timer) clearTimeout(timer)
  timer = null
  void request('push')
}

// ---------------------------------------------------------------------------
// For the app

let started = false

/** Starts syncing in this tab (once the saved progress has loaded). */
export function startSync(): void {
  if (started || typeof window === 'undefined') return
  started = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (info()?.dirty) pushNow()
    } else void request('pull')
  })
  window.addEventListener('online', () => void request('full'))
  useProgress.subscribe((s) => {
    if (!applying && s.sync?.dirty) schedulePush()
  })
  // A synced setting changed here (not taken from sync): mark it for the next upload.
  useSettings.subscribe((s, prev) => {
    if (applyingPrefs || SYNCED_SETTINGS.every((k) => s.changedAt[k] === prev.changedAt[k])) return
    const sync = info()
    if (sync && !sync.dirty) useProgress.setState({ sync: { ...sync, dirty: true } })
  })
  void request('full')
}

/** "Sync now". */
export const syncNow = (): Promise<void> => request('full')

/** Connects this device with the sync passphrase, then runs its first sync. */
export async function connectDevice(passphrase: string): Promise<api.ConnectResult> {
  status('connecting')
  const result = await api.connect(passphrase, deviceName())
  if (!result.ok) {
    status('idle')
    return result
  }
  cache = null
  save(null, { deviceId: crypto.randomUUID(), state: null, dirty: false, replace: false, lastSyncedAt: null })
  await request('full')
  return result
}

/** The learner's answer to "which progress to keep?" on first connect. */
export function resolveChoice(keep: 'synced' | 'mine'): Promise<void> {
  useSyncStatus.setState({ phase: 'syncing', message: null, choice: null })
  return exclusive(async () => {
    if (keep === 'mine') return replaceSynced()
    const remote = await fullPull()
    if (remote.doc) takeOver({ ...remote, doc: remote.doc })
    else await replaceSynced(remote.version)
  })
}

/** Disconnects this device (or every device). Its progress stays here. Returns an error message or null. */
export async function disconnectDevice(all: boolean): Promise<string | null> {
  try {
    await api.disconnect(all)
  } catch (e) {
    if (e instanceof api.OfflineError) return "You're offline. Connect to the internet to disconnect."
    return e instanceof Error ? e.message : 'Could not disconnect. Try again.'
  }
  if (timer) clearTimeout(timer)
  timer = null
  cache = null
  save(null, null)
  status('idle')
  return null
}

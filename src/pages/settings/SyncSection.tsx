import { Download, RefreshCw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { CardTitle } from '../../components/ui/Card'
import { useNow } from '../../hooks/useNow'
import { downloadBackup } from '../../services/storage/download'
import { connectDevice, disconnectDevice, resolveChoice, syncNow } from '../../services/sync/engine'
import { useProgress } from '../../stores/progress'
import { useSyncStatus, type ProgressSummary } from '../../stores/sync'
import { cx } from '../../utils/cx'

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
function ago(then: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - then) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

function ConnectForm() {
  const phase = useSyncStatus((s) => s.phase)
  const notice = useSyncStatus((s) => s.message)
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const busy = phase === 'connecting'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!passphrase.trim()) return setError('Paste your sync passphrase first.')
    setError(null)
    const result = await connectDevice(passphrase)
    if (result.ok) setPassphrase('')
    else setError(result.message)
  }

  return (
    <form className="space-y-3" onSubmit={(e) => void submit(e)}>
      <p className="text-sm text-muted">
        Sync keeps the same progress on your phone and your laptop. It is for the owner of this copy of Sija; everything works without it, with progress saved on this device.
      </p>
      {notice && <p className="rounded-xl bg-surface-2 p-3 text-sm">{notice}</p>}
      <label className="block max-w-md" htmlFor="sync-passphrase">
        <span className="mb-1 block font-semibold">Sync passphrase</span>
        <input
          id="sync-passphrase"
          type="password"
          autoComplete="current-password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3"
        />
      </label>
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? 'Connecting…' : 'Connect this device'}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
    </form>
  )
}

function Summary({ title, s }: { title: string; s: ProgressSummary }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="font-semibold">{title}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-3 text-sm">
        <dt className="text-muted">XP</dt>
        <dd className="tabular-nums">{s.xp}</dd>
        <dt className="text-muted">Exercises</dt>
        <dd className="tabular-nums">{s.exercises}</dd>
        <dt className="text-muted">Lessons done</dt>
        <dd className="tabular-nums">{s.lessonsDone}</dd>
        <dt className="text-muted">Last used</dt>
        <dd>{s.lastDay ?? '—'}</dd>
      </dl>
    </div>
  )
}

function Choice({ synced, local }: { synced: ProgressSummary; local: ProgressSummary }) {
  return (
    <div className="space-y-3" role="group" aria-label="Which progress to keep">
      <p className="font-semibold">This device already has its own progress. Which progress do you want to keep?</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Summary title="Synced progress" s={synced} />
        <Summary title="This device" s={local} />
      </div>
      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void resolveChoice('synced')}>
            Use synced progress
          </Button>
          <Button variant="ghost" onClick={() => downloadBackup(useProgress.getState())} icon={<Download aria-hidden className="size-4" />}>
            Download this device's progress first
          </Button>
        </div>
        <p className="text-sm text-muted">This device's progress will be replaced.</p>
      </div>
      <div className="space-y-1">
        <Button onClick={() => void resolveChoice('mine')}>Use this device's progress</Button>
        <p className="text-sm text-muted">This replaces the synced progress on every device.</p>
      </div>
    </div>
  )
}

function Connected() {
  const lastSyncedAt = useProgress((s) => s.sync?.lastSyncedAt ?? null)
  const dirty = useProgress((s) => s.sync?.dirty ?? false)
  const phase = useSyncStatus((s) => s.phase)
  const message = useSyncStatus((s) => s.message)
  const now = useNow()
  const [confirmAll, setConfirmAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const line =
    phase === 'syncing' || phase === 'connecting'
      ? 'Syncing…'
      : phase === 'offline' || phase === 'error'
        ? message
        : lastSyncedAt === null
          ? 'Not synced yet.'
          : `Synced ${ago(lastSyncedAt, now)}${dirty ? '. New changes upload shortly.' : '.'}`

  const disconnect = async (all: boolean) => {
    setError(await disconnectDevice(all))
    setConfirmAll(false)
  }

  return (
    <div className="space-y-3">
      <p role="status" data-testid="sync-status" className={cx('font-semibold', phase === 'error' ? 'text-error' : phase === 'offline' ? 'text-warning' : '')}>
        {line}
      </p>
      <p className="text-sm text-muted">
        Synced between your devices: progress, daily goal, learner mode, translations, word-part labels and pictures. Theme, animations and voice stay on each device.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void syncNow()} disabled={phase === 'syncing'} icon={<RefreshCw aria-hidden className="size-4" />}>
          Sync now
        </Button>
        <Button variant="ghost" onClick={() => void disconnect(false)}>
          Disconnect this device
        </Button>
        {!confirmAll ? (
          <Button variant="ghost" onClick={() => setConfirmAll(true)}>
            Disconnect all devices
          </Button>
        ) : (
          <span className="flex flex-wrap items-center gap-2 rounded-xl bg-error-soft px-3 py-1.5 text-sm">
            Disconnect every device? Each keeps its progress; connecting again needs the passphrase.
            <Button size="sm" variant="danger" onClick={() => void disconnect(true)}>
              Disconnect all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmAll(false)}>
              Cancel
            </Button>
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}

/** Settings → Sync: connect this device, see how syncing is going, or disconnect. */
export function SyncSection() {
  const connected = useProgress((s) => s.sync !== null)
  const choice = useSyncStatus((s) => s.choice)
  return (
    <>
      <CardTitle sub="Your progress on all your devices.">Sync</CardTitle>
      {!connected ? <ConnectForm /> : choice ? <Choice synced={choice.synced} local={choice.local} /> : <Connected />}
    </>
  )
}

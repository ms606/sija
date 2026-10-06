import { RefreshCw, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '../ui/Button'

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** Offline notice, "ready to work offline" note, and the update prompt for a new version. */
export function AppStatus() {
  const online = useOnline()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {!online && (
        <p className="pointer-events-auto flex items-center gap-2 rounded-xl bg-text px-3 py-2 text-sm font-semibold text-bg shadow-card">
          <WifiOff aria-hidden className="size-4" /> You are offline — everything in the app still works.
        </p>
      )}
      {offlineReady && (
        <p className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-card">
          Ready to work offline.
          <button type="button" onClick={() => setOfflineReady(false)} aria-label="Dismiss" className="rounded p-1 hover:bg-surface-2">
            <X aria-hidden className="size-4" />
          </button>
        </p>
      )}
      {needRefresh && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-card" role="status">
          A new version is available.
          <Button size="sm" variant="primary" onClick={() => void updateServiceWorker(true)} icon={<RefreshCw aria-hidden className="size-4" />}>
            Update
          </Button>
          <button type="button" onClick={() => setNeedRefresh(false)} aria-label="Later" className="rounded p-1 hover:bg-surface-2">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}

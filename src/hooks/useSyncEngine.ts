import { useEffect } from 'react'
import { startSync } from '../services/sync/engine'
import { useProgress } from '../stores/progress'

/** Starts sync for a connected device once its saved progress has loaded. Mounted once, in AppShell. A guest's device never contacts the server. */
export function useSyncEngine() {
  const hydrated = useProgress((s) => s.hydrated)
  useEffect(() => {
    if (hydrated) startSync()
  }, [hydrated])
}

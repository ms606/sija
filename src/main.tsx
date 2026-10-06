import '@fontsource-variable/inter'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { router } from './router'

/**
 * Mount React only after the router has loaded the first route's lazy module.
 * RouterProvider subscribes to router updates in a layout effect; if the
 * initial load finished before that subscription, the update would be lost
 * and the app would stay on the fallback.
 */
function routerReady(): Promise<void> {
  if (router.state.initialized) return Promise.resolve()
  return new Promise((resolve) => {
    const unsubscribe = router.subscribe((state) => {
      if (state.initialized) {
        unsubscribe()
        resolve()
      }
    })
  })
}

void routerReady().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

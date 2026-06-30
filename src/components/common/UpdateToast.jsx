import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './UpdateToast.module.css'

/**
 * UpdateToast — shown when a new service worker is waiting to activate.
 * With registerType: 'prompt', the new SW waits until the user approves.
 * Tapping "Update" calls skipWaiting on the waiting SW and reloads the page.
 */
export default function UpdateToast() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 60 minutes while the tab is open
      if (r) {
        setInterval(() => {
          if (!(!r.installing && navigator)) return
          if ('connection' in navigator && !navigator.onLine) return
          r.update()
        }, 60 * 60 * 1000)
      }
    },
  })

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (needRefresh) setVisible(true)
  }, [needRefresh])

  if (!visible) return null

  return (
    <div className={styles.toast}>
      <span className={styles.text}>🆕 New version available</span>
      <button
        className={styles.reloadBtn}
        onClick={() => updateServiceWorker(true)}
      >
        Update
      </button>
      <button
        className={styles.dismissBtn}
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

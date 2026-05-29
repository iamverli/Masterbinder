import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './UpdateToast.module.css'

/**
 * UpdateToast — shown when autoUpdate finishes installing a new SW.
 * The new SW activates on next navigation automatically, but we show
 * a tap-to-reload banner so the user gets the update immediately.
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
      <span className={styles.text}>✨ Update ready</span>
      <button
        className={styles.reloadBtn}
        onClick={() => updateServiceWorker(true)}
      >
        Reload
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

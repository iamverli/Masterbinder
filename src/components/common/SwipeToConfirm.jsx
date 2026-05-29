import { useRef, useState } from 'react'
import styles from './SwipeToConfirm.module.css'

export default function SwipeToConfirm({ label = 'Slide to remove', onConfirm, onCancel }) {
  const trackRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const startX = useRef(null)

  function onPointerDown(e) {
    startX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (startX.current === null) return
    const track = trackRef.current
    if (!track) return
    const trackWidth = track.offsetWidth
    const thumbSize = 52
    const maxTravel = trackWidth - thumbSize - 8
    const delta = Math.max(0, Math.min(e.clientX - startX.current, maxTravel))
    setProgress(delta / maxTravel)
  }

  function onPointerUp() {
    if (progress >= 0.9) {
      setConfirmed(true)
      setTimeout(() => onConfirm?.(), 200)
    } else {
      setProgress(0)
    }
    startX.current = null
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <p className={styles.question}>Are you sure?</p>
        <div ref={trackRef} className={styles.track}>
          <div
            className={`${styles.thumb} ${confirmed ? styles.thumbConfirmed : ''}`}
            style={{ left: `calc(4px + ${progress * 100}% - ${progress * 52}px)` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {confirmed ? '✓' : '→'}
          </div>
          <span className={styles.trackLabel} style={{ opacity: 1 - progress * 2 }}>
            {label}
          </span>
        </div>
        <button className={`btn btn-ghost ${styles.cancelBtn}`} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { writePublicSnapshot } from '../../firebase/firestore'
import styles from './ShareSheet.module.css'

const BASE_URL = 'https://bluemoontracker.netlify.app'

export default function ShareSheet({ uid, displayName, setId, onClose }) {
  const { pokedex, sets } = useApp()
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  const shareUrl = setId
    ? `${BASE_URL}/guest/${uid}/set/${setId}`
    : `${BASE_URL}/guest/${uid}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&color=000000&bgcolor=ffffff&data=${encodeURIComponent(shareUrl)}`

  // Publish snapshot on open
  useEffect(() => {
    if (!uid) return
    setPublishing(true)
    setError(null)

    // Sanitise sets — only include fields needed for guest view (strip owned arrays for size)
    const publicSets = {}
    for (const [setId, s] of Object.entries(sets)) {
      const ownedCount = s.mastersetMode
        ? (s.masterOwned?.length || 0)
        : (s.baseOwned?.length || 0)
      const total = s.mastersetMode
        ? (s.masterTotal || s.printedTotal || 0)
        : (s.printedTotal || 0)
      if (ownedCount === 0) continue // skip sets with no cards owned
      publicSets[setId] = {
        setId,
        setName: s.setName || setId,
        series: s.series || null,
        ownedCount,
        total,
        mastersetMode: s.mastersetMode || false,
        images: s.images || {},
        baseOwned: s.baseOwned || [],
      }
    }

    writePublicSnapshot(uid, {
      displayName,
      pokedexOwned: pokedex,
      sets: publicSets,
    })
      .then(() => setPublished(true))
      .catch((err) => {
        console.error('[Share] Failed to publish snapshot:', err)
        setError('Could not publish. Check your connection.')
      })
      .finally(() => setPublishing(false))
  }, [uid])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback — select the text
      const el = document.createElement('textarea')
      el.value = shareUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className={`${styles.sheet} animate-slide-up`} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
          <span className={styles.title}>{setId ? 'Share Set' : 'Share Collection'}</span>
          <div style={{ width: 32 }} />
        </div>

        {/* QR code */}
        <div className={styles.qrWrap}>
          {publishing ? (
            <div className={styles.qrPlaceholder}>
              <div className={styles.spinner} />
            </div>
          ) : error ? (
            <div className={styles.qrPlaceholder}>
              <span className={styles.errorText}>{error}</span>
            </div>
          ) : (
            <img
              src={qrSrc}
              alt="QR code"
              className={styles.qrImg}
              width={220}
              height={220}
            />
          )}
        </div>

        {/* Status */}
        <div className={styles.statusRow}>
          {publishing
            ? <span className={styles.statusText}>Publishing snapshot…</span>
            : published
              ? <span className={styles.statusOk}>✓ Live — anyone with the link can view</span>
              : error
                ? <span className={styles.statusErr}>{error}</span>
                : null
          }
        </div>

        {/* URL row */}
        <div className={styles.urlRow}>
          <span className={styles.urlText}>{shareUrl}</span>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`}
            onClick={handleCopy}
            disabled={publishing}
          >
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>
        </div>

        {/* Info */}
        <p className={styles.info}>
          Guests see your Pokédex progress and sets — no cards can be edited.
        </p>
      </div>
    </div>
  )
}

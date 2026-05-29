import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { signOutUser } from '../../firebase/auth'
import { idbSetMeta, exportLocalData, clearAllLocalData } from '../../db/indexeddb'
import SwipeToConfirm from './SwipeToConfirm'
import { APP_VERSION } from '../../screens/Landing'
import styles from './LeftDrawer.module.css'

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home', path: '/' },
  { icon: '📖', label: 'National Pokédex', path: '/pokedex' },
]

const SYNC_LABELS = {
  syncing: { text: 'Syncing…', cls: 'syncing' },
  done:    { text: 'Synced',   cls: 'done' },
  error:   { text: 'Sync failed', cls: 'error' },
}

export default function LeftDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const { user, isLocal, syncStatus } = useAuth()

  const [confirmClear, setConfirmClear] = useState(false)
  const [exporting, setExporting] = useState(false)

  const displayName = user?.displayName || (isLocal ? 'Local Trainer' : 'Trainer')
  const email = user?.email || null
  const avatarLetter = displayName[0].toUpperCase()
  const avatarPhoto = user?.photoURL || null

  const syncInfo = syncStatus ? SYNC_LABELS[syncStatus] : null

  async function handleSignOut() {
    onClose()
    if (!isLocal) {
      await signOutUser()
    } else {
      await idbSetMeta('localMode', false)
      window.location.href = '/landing'
    }
  }

  function handleNav(path) {
    onClose()
    navigate(path)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const data = await exportLocalData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `masterbinder-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleClearConfirmed() {
    setConfirmClear(false)
    await clearAllLocalData()
    window.location.href = '/landing'
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div className={styles.drawer}>

        {/* ── Profile section ─────────────────────────────────────────── */}
        <div className={styles.profile}>
          {avatarPhoto ? (
            <img src={avatarPhoto} className={styles.avatar} alt={displayName} />
          ) : (
            <div className={styles.avatarFallback}>{avatarLetter}</div>
          )}
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{displayName}</span>
            {email && <span className={styles.profileEmail}>{email}</span>}
            {isLocal && <span className={styles.localBadge}>Local Mode</span>}
            {syncInfo && (
              <span className={`${styles.syncBadge} ${styles['syncBadge_' + syncInfo.cls]}`}>
                {syncInfo.text}
              </span>
            )}
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── Navigation ──────────────────────────────────────────────── */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              className={styles.navItem}
              onClick={() => handleNav(item.path)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.divider} />

        {/* ── Settings section ─────────────────────────────────────────── */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Data</span>
          <button
            className={styles.navItem}
            onClick={handleExport}
            disabled={exporting}
          >
            <span className={styles.navIcon}>💾</span>
            <span className={styles.navLabel}>
              {exporting ? 'Exporting…' : 'Export collection'}
            </span>
          </button>
          <button
            className={`${styles.navItem} ${styles.navItemDanger}`}
            onClick={() => setConfirmClear(true)}
          >
            <span className={styles.navIcon}>🗑</span>
            <span className={styles.navLabel}>Clear all data</span>
          </button>
        </div>

        <div className={styles.spacer} />

        {/* ── Bottom ──────────────────────────────────────────────────── */}
        <div className={styles.bottom}>
          <div className={styles.divider} />
          <button className={styles.signOutBtn} onClick={handleSignOut}>
            <span className={styles.navIcon}>🚪</span>
            <span>{isLocal ? 'Back to Login' : 'Sign Out'}</span>
          </button>
          <span className={styles.version}>{APP_VERSION}</span>
        </div>
      </div>

      {/* ── Clear data confirmation ──────────────────────────────────── */}
      {confirmClear && (
        <SwipeToConfirm
          label="Slide to clear all data"
          onConfirm={handleClearConfirmed}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </>
  )
}

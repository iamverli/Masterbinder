import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { signOutUser } from '../../firebase/auth'
import {
  idbSetMeta,
  exportLocalData,
  importLocalData,
  clearAllLocalData,
  idbPutCardCache,
  idbGetTheme,
  idbSetTheme,
  getDB,
} from '../../db/indexeddb'
import SwipeToConfirm from './SwipeToConfirm'
import { restoreFromCloud } from '../../services/syncService'
import { APP_VERSION } from '../../screens/Landing'
import styles from './LeftDrawer.module.css'

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home', path: '/' },
  { icon: '📖', label: 'National Pokédex', path: '/pokedex' },
]

export default function LeftDrawer({ open, onClose, onOpenHelp }) {
  const navigate = useNavigate()
  const { user, isLocal, syncStatus } = useAuth()
  const { pokedexOwnedCount, setsInProgress, setsCompleted, reload } = useApp()

  const [confirmClear, setConfirmClear] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [clearingCache, setClearingCache] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const importRef = useRef(null)

  // Load saved theme on mount
  useEffect(() => {
    idbGetTheme().then((t) => setIsDark(t !== 'light'))
  }, [])

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState(null)
  useEffect(() => {
    function handler(e) { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Track sync status → last sync time
  useEffect(() => {
    if (syncStatus === 'done') setLastSync(new Date())
  }, [syncStatus])

  const displayName = user?.displayName || (isLocal ? 'Local Trainer' : 'Trainer')
  const email = user?.email || null
  const avatarLetter = displayName[0].toUpperCase()
  const avatarPhoto = user?.photoURL || null

  const setsActiveCount = setsInProgress.length
  const setsDoneCount = setsCompleted.length

  function handleNav(path) { onClose(); navigate(path) }

  async function handleSignOut() {
    onClose()
    if (!isLocal) {
      await signOutUser()
    } else {
      await idbSetMeta('localMode', false)
      window.location.href = '/landing'
    }
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

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      await importLocalData(json)
      window.location.reload()
    } catch {
      alert("Could not import — make sure it's a valid MasterBinder backup file.")
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function handleRefreshSets() {
    // Clear the all-sets cache so SetSelector re-fetches from API
    await idbPutCardCache('__all_sets__', null)
    onClose()
  }

  async function handleClearCache() {
    setClearingCache(true)
    try {
      const db = await getDB()
      await db.clear('cardCache')
    } finally {
      setClearingCache(false)
    }
  }

  async function handleRestoreFromCloud() {
    if (!user?.uid) return
    setRestoring(true)
    try {
      await restoreFromCloud(user.uid)
      await reload()
      setLastSync(new Date())
    } finally {
      setRestoring(false)
    }
  }

  async function handleToggleTheme() {
    const next = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    document.documentElement.setAttribute('data-theme', next)
    await idbSetTheme(next)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await reload()
      setLastSync(new Date())
    } finally {
      setSyncing(false)
    }
  }

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  async function handleClearConfirmed() {
    setConfirmClear(false)
    await clearAllLocalData()
    window.location.href = '/landing'
  }

  const syncLabel = syncing
    ? 'Syncing…'
    : lastSync
      ? `Synced ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : syncStatus === 'error'
        ? 'Sync failed'
        : 'Sync'

  if (!open) return null

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.drawer}>

        {/* ── Profile + stats ──────────────────────────────────────────── */}
        <div className={styles.profile}>
          <div className={styles.profileTop}>
            {avatarPhoto ? (
              <img src={avatarPhoto} className={styles.avatar} alt={displayName} />
            ) : (
              <div className={styles.avatarFallback}>{avatarLetter}</div>
            )}
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{displayName}</span>
              {email && <span className={styles.profileEmail}>{email}</span>}
              {isLocal
                ? <span className={styles.localBadge}>Local · Not synced</span>
                : <span className={styles.syncedBadge}>
                    {syncStatus === 'syncing' ? '↻ Syncing…' : '✓ Synced'}
                  </span>
              }
            </div>
          </div>
          {/* Inline stats */}
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statVal}>{pokedexOwnedCount}</span>
              <span className={styles.statLbl}>Dex Owned</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statVal}>{setsActiveCount}</span>
              <span className={styles.statLbl}>Sets Active</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={`${styles.statVal} ${setsDoneCount > 0 ? styles.statValGold : ''}`}>{setsDoneCount}</span>
              <span className={styles.statLbl}>Sets Done</span>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── Navigation ──────────────────────────────────────────────── */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button key={item.path} className={styles.navItem} onClick={() => handleNav(item.path)}>
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.divider} />

        {/* ── Settings ─────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Settings</span>

          {/* Dark mode toggle */}
          <button className={styles.navItem} onClick={handleToggleTheme}>
            <span className={styles.navIcon}>{isDark ? '🌙' : '☀️'}</span>
            <span className={styles.navLabel}>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            <div className={isDark ? styles.toggleOn : styles.toggleOff} />
          </button>

          {/* Export */}
          <button className={styles.navItem} onClick={handleExport} disabled={exporting}>
            <span className={styles.navIcon}>💾</span>
            <span className={styles.navLabel}>{exporting ? 'Exporting…' : 'Export collection'}</span>
            <span className={styles.navChevron}>›</span>
          </button>

          {/* Import */}
          <button className={styles.navItem} onClick={() => importRef.current?.click()} disabled={importing}>
            <span className={styles.navIcon}>📂</span>
            <span className={styles.navLabel}>{importing ? 'Importing…' : 'Import collection'}</span>
            <span className={styles.navChevron}>›</span>
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

          {/* Restore from cloud — only for signed-in users */}
          {!isLocal && (
            <button className={styles.navItem} onClick={handleRestoreFromCloud} disabled={restoring}>
              <span className={styles.navIcon}>☁️</span>
              <span className={styles.navLabel}>{restoring ? 'Restoring…' : 'Restore from Cloud'}</span>
              <span className={styles.navChevron}>›</span>
            </button>
          )}

          {/* Refresh Sets List */}
          <button className={styles.navItem} onClick={handleRefreshSets}>
            <span className={styles.navIcon}>🔄</span>
            <span className={styles.navLabel}>Refresh Sets List</span>
            <span className={styles.navChevron}>›</span>
          </button>

          {/* Clear Cache */}
          <button className={styles.navItem} onClick={handleClearCache} disabled={clearingCache}>
            <span className={styles.navIcon}>🗂</span>
            <span className={styles.navLabel}>{clearingCache ? 'Clearing…' : 'Clear Cache'}</span>
            <span className={styles.navChevron}>›</span>
          </button>
        </div>

        <div className={styles.divider} />

        {/* ── Help ─────────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <button className={styles.navItem} onClick={() => { onClose(); onOpenHelp?.() }}>
            <span className={styles.navIcon}>❓</span>
            <span className={styles.navLabel}>How to use MasterBinder</span>
            <span className={styles.navChevron}>›</span>
          </button>
        </div>

        <div className={styles.spacer} />

        {/* ── Install + Sync row ───────────────────────────────────────── */}
        <div className={styles.actionRow}>
          {installPrompt && (
            <button className={styles.installBtn} onClick={handleInstall}>
              <span>📲</span> Install App
            </button>
          )}
          <button
            className={`${styles.syncBtn} ${syncing ? styles.syncBtnBusy : ''}`}
            onClick={handleSync}
            disabled={syncing}
          >
            <span>{syncing ? '↻' : '✓'}</span>
            <span>{syncLabel}</span>
          </button>
        </div>

        {/* ── Bottom ──────────────────────────────────────────────────── */}
        <div className={styles.bottom}>
          <div className={styles.divider} />
          <button className={styles.signOutBtn} onClick={handleSignOut}>
            <span className={styles.navIcon}>🚪</span>
            <span>{isLocal ? 'Back to Login' : 'Sign Out'}</span>
          </button>
          <button className={styles.version} onClick={() => console.log('MasterBinder', APP_VERSION)}>
            {APP_VERSION}
          </button>
        </div>
      </div>

      {/* ── Danger zone: Export/Import sub-actions ───────────────────── */}
      {/* Tapping Export/Import shows the choice inline */}

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

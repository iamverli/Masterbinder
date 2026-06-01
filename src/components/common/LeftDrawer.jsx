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
  idbGetAllSavedShares,
  getDB,
} from '../../db/indexeddb'
import SwipeToConfirm from './SwipeToConfirm'
import { restoreFromCloud } from '../../services/syncService'
import { APP_VERSION } from '../../screens/Landing'
import ChangelogSheet from './ChangelogSheet'
import BugReportSheet from './BugReportSheet'
import styles from './LeftDrawer.module.css'

export default function LeftDrawer({ open, onClose, onOpenHelp, onOpenChangelog, onOpenBugReport }) {
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateDone, setUpdateDone] = useState(false)
  const [savedShares, setSavedShares] = useState([])
  const [showAllShares, setShowAllShares] = useState(false)
  const importRef = useRef(null)

  // Load saved theme on mount
  useEffect(() => {
    idbGetTheme().then((t) => setIsDark(t !== 'light'))
  }, [])

  // Load saved shares when drawer opens
  useEffect(() => {
    if (open) {
      idbGetAllSavedShares().then(setSavedShares).catch(() => {})
    }
  }, [open])

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

  async function handleCheckUpdates() {
    setUpdating(true)
    setUpdateDone(false)
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (reg) {
        await reg.update()
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          setTimeout(() => window.location.reload(), 500)
        } else {
          setUpdateDone(true)
          setTimeout(() => setUpdateDone(false), 3000)
        }
      } else {
        window.location.reload()
      }
    } finally {
      setUpdating(false)
    }
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

        {/* ── Saved Shares (Trainer icon strip) ───────────────────────── */}
        {savedShares.length > 0 ? (
          <div className={styles.sharesSection}>
            <span className={styles.sharesSectionLabel}>Trainer Cards</span>
            <div className={styles.sharesStrip}>
              {savedShares.slice(0, 4).map(share => (
                <button
                  key={`${share.uid}_${share.setId}`}
                  className={styles.shareChip}
                  onClick={() => { onClose(); navigate(`/guest/${share.uid}/set/${share.setId}`) }}
                >
                  <div className={styles.shareChipImg}>
                    {share.setImage
                      ? <img src={share.setImage} alt={share.setName} className={styles.shareChipIcon} />
                      : <span className={styles.shareChipFallback}>🃏</span>
                    }
                  </div>
                  <span className={styles.shareChipName} title={`${share.trainerName}'s ${share.setName}`}>
                    {share.trainerName}'s
                  </span>
                  <span className={styles.shareChipSet} title={share.setName}>{share.setName}</span>
                </button>
              ))}
              {savedShares.length > 4 && (
                <button className={styles.shareChipMore} onClick={() => setShowAllShares(true)}>
                  <span className={styles.shareChipMoreIcon}>›</span>
                  <span className={styles.shareChipMoreLabel}>{savedShares.length - 4} more</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.sharesEmpty}>
            <span className={styles.sharesEmptyText}>Open a shared set link to see it here</span>
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.spacer} />

        {/* ── Settings (pinned above Check for Updates) ─────────────────── */}
        <div className={styles.section}>
          <button className={styles.sectionToggle} onClick={() => setSettingsOpen(o => !o)}>
            <span className={styles.sectionLabel}>Settings</span>
            <span className={styles.chevron}>{settingsOpen ? '▼' : '▲'}</span>
          </button>

          <div className={`${styles.settingsPanel} ${settingsOpen ? styles.settingsPanelOpen : ''}`}>
            {/* ── Appearance ── */}
            <span className={styles.settingsCat}>Appearance</span>
            <button className={styles.navItem} onClick={handleToggleTheme}>
              <span className={styles.navIcon}>{isDark ? '🌙' : '☀️'}</span>
              <span className={styles.navLabel}>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
              <div className={isDark ? styles.toggleOn : styles.toggleOff} />
            </button>

            {/* ── Backup & Sync ── */}
            <span className={styles.settingsCat}>Backup & Sync</span>
            <button className={styles.navItem} onClick={handleExport} disabled={exporting}>
              <span className={styles.navIcon}>💾</span>
              <span className={styles.navLabel}>{exporting ? 'Exporting…' : 'Export collection'}</span>
              <span className={styles.navChevron}>›</span>
            </button>
            <button className={styles.navItem} onClick={() => importRef.current?.click()} disabled={importing}>
              <span className={styles.navIcon}>📂</span>
              <span className={styles.navLabel}>{importing ? 'Importing…' : 'Import collection'}</span>
              <span className={styles.navChevron}>›</span>
            </button>
            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            {!isLocal && (
              <button className={styles.navItem} onClick={handleRestoreFromCloud} disabled={restoring}>
                <span className={styles.navIcon}>☁️</span>
                <span className={styles.navLabel}>{restoring ? 'Restoring…' : 'Restore from Cloud'}</span>
                <span className={styles.navChevron}>›</span>
              </button>
            )}

            {/* ── App ── */}
            <span className={styles.settingsCat}>App</span>
            <button className={styles.navItem} onClick={handleRefreshSets}>
              <span className={styles.navIcon}>🔄</span>
              <span className={styles.navLabel}>Refresh Sets List</span>
              <span className={styles.navChevron}>›</span>
            </button>
            <button className={styles.navItem} onClick={handleClearCache} disabled={clearingCache}>
              <span className={styles.navIcon}>🗂</span>
              <span className={styles.navLabel}>{clearingCache ? 'Clearing…' : 'Clear Cache'}</span>
              <span className={styles.navChevron}>›</span>
            </button>
          </div>
        </div>

        {/* ── Check for updates + Help (above sync) ────────────────────── */}
        <div className={styles.bottomActions}>
          <button className={styles.navItem} onClick={handleCheckUpdates} disabled={updating}>
            <span className={styles.navIcon}>⬆️</span>
            <span className={styles.navLabel}>
              {updating ? 'Checking…' : updateDone ? '✓ Up to date' : 'Check for Updates'}
            </span>
            <span className={styles.navChevron}>›</span>
          </button>
          <button className={styles.navItem} onClick={() => { onClose(); onOpenHelp?.() }}>
            <span className={styles.navIcon}>❓</span>
            <span className={styles.navLabel}>How to use MasterBinder</span>
            <span className={styles.navChevron}>›</span>
          </button>
        </div>

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
          <div className={styles.bottomRow}>
            <button className={styles.signOutBtn} onClick={handleSignOut}>
              <span className={styles.navIcon}>🚪</span>
              <span>{isLocal ? 'Back to Login' : 'Sign Out'}</span>
            </button>
            <button className={styles.bugBtn} onClick={() => { onClose(); onOpenBugReport?.() }}>
              <span className={styles.navIcon}>🐛</span>
              <span>Report Bug</span>
            </button>
          </div>
          <button className={styles.version} onClick={() => { onClose(); onOpenChangelog?.() }}>
            {APP_VERSION} ›
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

      {/* ── All saved shares popup ───────────────────────────────────── */}
      {showAllShares && (
        <div className="overlay" onClick={() => setShowAllShares(false)}>
          <div className={`${styles.allSharesSheet} animate-slide-up`} onClick={e => e.stopPropagation()}>
            <div className={styles.allSharesHandle} />
            <div className={styles.allSharesHeader}>
              <span className={styles.allSharesTitle}>Trainer Cards</span>
              <button className={styles.allSharesClose} onClick={() => setShowAllShares(false)}>✕</button>
            </div>
            <div className={styles.allSharesGrid}>
              {savedShares.map(share => (
                <button
                  key={`${share.uid}_${share.setId}`}
                  className={styles.shareChip}
                  onClick={() => { setShowAllShares(false); onClose(); navigate(`/guest/${share.uid}/set/${share.setId}`) }}
                >
                  <div className={styles.shareChipImg}>
                    {share.setImage
                      ? <img src={share.setImage} alt={share.setName} className={styles.shareChipIcon} />
                      : <span className={styles.shareChipFallback}>🃏</span>
                    }
                  </div>
                  <span className={styles.shareChipName}>{share.trainerName}'s</span>
                  <span className={styles.shareChipSet}>{share.setName}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </>
  )
}

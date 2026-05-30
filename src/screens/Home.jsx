import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import LeftDrawer from '../components/common/LeftDrawer'
import SetSelector from '../components/sets/SetSelector'
import ShareSheet from '../components/common/ShareSheet'
import HelpSheet from '../components/common/HelpSheet'
import ChangelogSheet from '../components/common/ChangelogSheet'
import BugReportSheet from '../components/common/BugReportSheet'
import styles from './Home.module.css'

const POKEDEX_TOTAL = 1025

export default function Home() {
  const navigate = useNavigate()
  const { user, isLocal } = useAuth()
  const {
    pokedex,
    sets,
    pokedexOwnedCount,
    setsInProgress,
    setsCompleted,
    loaded,
  } = useApp()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [setSelectorOpen, setSetSelectorOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)

  const inProgressRef = useRef(null)
  const completedRef = useRef(null)

  const displayName = isLocal
    ? 'Trainer'
    : user?.displayName?.split(' ')[0] || 'Trainer'

  const avatarLetter = (user?.displayName || 'T')[0].toUpperCase()
  const avatarPhoto = user?.photoURL || null

  const pokedexPct = Math.round((pokedexOwnedCount / POKEDEX_TOTAL) * 100)
  const hasPokedexStarted = pokedexOwnedCount > 0

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const allSetsArray = Object.values(sets)

  return (
    <div className={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button
          className={styles.avatarBtn}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          {avatarPhoto ? (
            <img src={avatarPhoto} className={styles.avatarImg} alt={displayName} />
          ) : (
            <div className={styles.avatarFallback}>{avatarLetter}</div>
          )}
        </button>
        <div className={styles.greeting}>
          <span className={styles.greetingHi}>Hi,</span>
          <span className={styles.greetingName}>{displayName}!</span>
        </div>
        {!isLocal && (
          <button
            className={styles.shareBtn}
            onClick={() => setShareOpen(true)}
            aria-label="Share collection"
          >
            🔗
          </button>
        )}
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className={styles.scroll}>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div className={styles.statsRow}>
          <button
            className={styles.statCard}
            onClick={() => scrollTo(inProgressRef)}
          >
            <span className={styles.statValue}>{setsInProgress.length}</span>
            <span className={styles.statLabel}>In Progress</span>
          </button>
          <button
            className={styles.statCard}
            onClick={() => scrollTo(completedRef)}
          >
            <span className={`${styles.statValue} ${setsCompleted.length > 0 ? styles.statValueGold : ''}`}>
              {setsCompleted.length}
            </span>
            <span className={styles.statLabel}>Completed</span>
          </button>
        </div>

        {/* ── National Pokédex widget ───────────────────────────────────── */}
        <button
          className={styles.pokedexCard}
          onClick={() => navigate('/pokedex')}
        >
          <div className={styles.pokedexCardTop}>
            <div className={styles.pokedexIcon}>◆</div>
            <div className={styles.pokedexTitleGroup}>
              <span className={styles.pokedexTitle}>National Pokédex</span>
              <span className={styles.pokedexSub}>Gen I – IX · All Regions</span>
            </div>
          </div>
          <div className={styles.pokedexStats}>
            <div className={styles.pokedexStat}>
              <span className={`${styles.pokedexStatValue} ${styles.owned}`}>{pokedexOwnedCount}</span>
              <span className={styles.pokedexStatLabel}>Owned</span>
            </div>
            <div className={styles.pokedexStat}>
              <span className={`${styles.pokedexStatValue} ${styles.missing}`}>{POKEDEX_TOTAL - pokedexOwnedCount}</span>
              <span className={styles.pokedexStatLabel}>Missing</span>
            </div>
            <div className={styles.pokedexStat}>
              <span className={`${styles.pokedexStatValue} ${styles.complete}`}>{pokedexPct}%</span>
              <span className={styles.pokedexStatLabel}>Complete</span>
            </div>
          </div>
          <div className={styles.pokedexProgress}>
            <div className={styles.pokedexProgressFill} style={{ width: `${pokedexPct}%` }} />
          </div>
        </button>

        {/* ── Sets in progress ─────────────────────────────────────────── */}
        <div ref={inProgressRef} className={styles.section}>
          <span className={styles.sectionLabel}>In Progress</span>
          {setsInProgress.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📦</span>
              <p className={styles.emptyText}>No sets in progress.</p>
              <p className={styles.emptySubtext}>Tap + to open a set and start collecting.</p>
            </div>
          ) : (
            <div className={styles.setsList}>
              {setsInProgress.map((s) => (
                <SetCard key={s.setId} set={s} onClick={() => navigate(`/sets/${s.setId}`)} />
              ))}
            </div>
          )}
        </div>

        {/* ── Completed sets ────────────────────────────────────────────── */}
        {setsCompleted.length > 0 && (
          <div ref={completedRef} className={styles.section}>
            <span className={styles.sectionLabel}>Completed</span>
            <div className={styles.setsList}>
              {setsCompleted.map((s) => (
                <SetCard key={s.setId} set={s} onClick={() => navigate(`/sets/${s.setId}`)} complete />
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>

      {/* ── Floating + button ─────────────────────────────────────────── */}
      <button
        className={styles.fab}
        onClick={() => setSetSelectorOpen(true)}
        aria-label="Add set"
      >
        <span className={styles.fabIcon}>+</span>
      </button>

      {/* ── Left drawer ───────────────────────────────────────────────── */}
      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpenHelp={() => setHelpOpen(true)} onOpenChangelog={() => setChangelogOpen(true)} onOpenBugReport={() => setBugReportOpen(true)} />

      {/* ── Set selector ──────────────────────────────────────────────── */}
      {setSelectorOpen && (
        <SetSelector onClose={() => setSetSelectorOpen(false)} />
      )}

      {/* ── Share sheet ───────────────────────────────────────────────── */}
      {shareOpen && !isLocal && (
        <ShareSheet
          uid={user?.uid}
          displayName={user?.displayName || 'Trainer'}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* ── Help sheet ────────────────────────────────────────────────── */}
      {helpOpen && (
        <HelpSheet onClose={() => setHelpOpen(false)} />
      )}

      {changelogOpen && (
        <ChangelogSheet onClose={() => setChangelogOpen(false)} />
      )}

      {bugReportOpen && (
        <BugReportSheet onClose={() => setBugReportOpen(false)} />
      )}
    </div>
  )
}

function SetCard({ set, onClick, complete = false }) {
  // baseOwned tracks all regular card versions (base + secret rares)
  // masterOwned tracks reverse holo versions — show combined count on home
  const owned = (set.baseOwned?.length || 0)
  const total = set.printedTotal || 0
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0

  return (
    <button
      className={`${styles.setCard} ${complete ? styles.setCardComplete : ''}`}
      onClick={onClick}
    >
      <div className={styles.setCardTop}>
        <span className={styles.setName}>{set.setName}</span>
        <span className={styles.setStats}>{owned}/{total}</span>
      </div>
      {set.series && (
        <span className={styles.setSeries}>{set.series}</span>
      )}
      <div className={styles.setProgressWrap}>
        <div className="progress-bar" style={{ flex: 1 }}>
          <div
            className={`progress-bar-fill${complete ? ' complete' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={styles.setPct}>{pct}%</span>
      </div>
    </button>
  )
}

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import LeftDrawer from '../components/common/LeftDrawer'
import SetSelector from '../components/sets/SetSelector'
import styles from './Home.module.css'

const POKEDEX_TOTAL = 1025

export default function Home() {
  const navigate = useNavigate()
  const { user, isLocal } = useAuth()
  const {
    pokedex,
    sets,
    pokedexOwnedCount,
    setsNotStarted,
    setsInProgress,
    setsCompleted,
    loaded,
  } = useApp()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [setSelectorOpen, setSetSelectorOpen] = useState(false)

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
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className={styles.scroll}>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div className={styles.statsRow}>
          <button
            className={styles.statCard}
            onClick={() => scrollTo(inProgressRef)}
          >
            <span className={styles.statValue}>{setsInProgress.length + setsNotStarted.length}</span>
            <span className={styles.statLabel}>Sets Active</span>
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
          <div className={styles.pokedexLeft}>
            <span className={styles.pokedexTitle}>National Pokédex</span>
            <span className={styles.pokedexSub}>
              {hasPokedexStarted
                ? `${pokedexOwnedCount} / ${POKEDEX_TOTAL} Pokémon`
                : 'Not started yet — tap to begin'}
            </span>
            {hasPokedexStarted && (
              <div className="progress-bar" style={{ marginTop: 10, width: '100%' }}>
                <div
                  className={`progress-bar-fill${pokedexOwnedCount === POKEDEX_TOTAL ? ' complete' : ''}`}
                  style={{ width: `${pokedexPct}%` }}
                />
              </div>
            )}
          </div>
          <div className={styles.pokedexRight}>
            {hasPokedexStarted ? (
              <>
                <span className={styles.pokedexPct}>{pokedexPct}%</span>
                <span className={styles.pokedexPctLabel}>complete</span>
              </>
            ) : (
              <span className={styles.pokedexArrow}>→</span>
            )}
          </div>
        </button>

        {/* ── Not started sets ─────────────────────────────────────────── */}
        {setsNotStarted.length > 0 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Not Started</span>
            <div className={styles.setsList}>
              {setsNotStarted.map((s) => (
                <SetCard key={s.setId} set={s} onClick={() => navigate(`/sets/${s.setId}`)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Sets in progress ─────────────────────────────────────────── */}
        <div ref={inProgressRef} className={styles.section}>
          <span className={styles.sectionLabel}>In Progress</span>
          {setsInProgress.length === 0 && setsNotStarted.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📦</span>
              <p className={styles.emptyText}>No sets added yet.</p>
              <p className={styles.emptySubtext}>Tap + to add your first set.</p>
            </div>
          ) : setsInProgress.length === 0 ? null : (
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
      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* ── Set selector ──────────────────────────────────────────────── */}
      {setSelectorOpen && (
        <SetSelector onClose={() => setSetSelectorOpen(false)} />
      )}
    </div>
  )
}

function SetCard({ set, onClick, complete = false }) {
  const isMasterMode = set.mastersetMode
  const owned = isMasterMode ? (set.masterOwned?.length || 0) : (set.baseOwned?.length || 0)
  const total = isMasterMode ? (set.masterTotal || set.printedTotal || 0) : (set.printedTotal || 0)
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

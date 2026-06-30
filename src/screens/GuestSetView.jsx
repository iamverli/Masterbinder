import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicSnapshot } from '../firebase/firestore'
import { fetchSetCards } from '../services/pokemonApi'
import { idbPutSavedShare, idbDeleteSavedShare } from '../db/indexeddb'
import { APP_BASE_URL } from '../config'
import styles from './GuestSetView.module.css'

const BASE_URL = APP_BASE_URL

function sortByNumber(a, b) {
  const na = parseInt(a.number, 10)
  const nb = parseInt(b.number, 10)
  if (!isNaN(na) && !isNaN(nb)) return na - nb
  return a.number?.localeCompare(b.number || '') || 0
}

export default function GuestSetView() {
  const { uid, setId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [trainerName, setTrainerName] = useState('')
  const [setData, setSetData] = useState(null)   // snapshot set entry
  const [cards, setCards] = useState([])          // base cards from API
  const [baseOwned, setBaseOwned] = useState([])
  const [expandedGroups, setExpandedGroups] = useState({})
  const [allExpanded, setAllExpanded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!uid || !setId) { setError('Invalid link.'); setLoading(false); return }

    Promise.all([
      getPublicSnapshot(uid),
      fetchSetCards(setId),
    ])
      .then(([snap, cardData]) => {
        if (!snap) { setError("This trainer hasn't shared their collection."); return }
        const set = snap.sets?.[setId]
        if (!set) { setError('This set hasn\'t been shared.'); return }

        const name = snap.displayName || 'Trainer'
        setTrainerName(name)
        setSetData(set)
        setBaseOwned(set.baseOwned || [])

        const baseCards = (cardData.base || []).sort(sortByNumber)
        setCards(baseCards)

        // Open first group by default
        const supertypes = [...new Set(baseCards.map(c => c.supertype || 'Other'))]
        const order = ['Pokémon', 'Trainer', 'Energy', 'Other']
        supertypes.sort((a, b) => order.indexOf(a) - order.indexOf(b))
        if (supertypes[0]) setExpandedGroups({ [supertypes[0]]: true })

        // Auto-save to savedShares
        idbPutSavedShare(uid, setId, {
          trainerName: name,
          setName: set.setName || setId,
          setImage: set.images?.symbol || null,
          visitedAt: new Date().toISOString(),
        }).catch(() => {}) // non-critical
      })
      .catch(() => setError('Could not load. Check your connection.'))
      .finally(() => setLoading(false))
  }, [uid, setId])

  function getGroups() {
    const supertypes = {}
    cards.forEach(c => {
      const group = c.supertype || 'Other'
      if (!supertypes[group]) supertypes[group] = []
      supertypes[group].push(c)
    })
    const order = ['Pokémon', 'Trainer', 'Energy', 'Other']
    return Object.entries(supertypes)
      .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
      .map(([label, items]) => ({ label, items: items.sort(sortByNumber) }))
  }

  function toggleGroup(label) {
    setExpandedGroups(prev => {
      const next = { ...prev, [label]: !prev[label] }
      setAllExpanded(getGroups().every(g => next[g.label]))
      return next
    })
  }

  function toggleAll() {
    if (allExpanded) {
      setExpandedGroups({})
      setAllExpanded(false)
    } else {
      const all = {}
      getGroups().forEach(g => (all[g.label] = true))
      setExpandedGroups(all)
      setAllExpanded(true)
    }
  }

  async function handleDelete() {
    await idbDeleteSavedShare(uid, setId).catch(() => {})
    navigate(-1)
  }

  // ── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.root}>
        <div className={styles.center}>
          <div className={styles.spinner} />
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.root}>
        <div className={styles.center}>
          <span className={styles.errorIcon}>😔</span>
          <p className={styles.errorMsg}>{error}</p>
          <a href={BASE_URL} className={styles.homeLink}>Open MasterBinder →</a>
        </div>
      </div>
    )
  }

  const groups = getGroups()
  const ownedCount = cards.filter(c => baseOwned.includes(c.id)).length
  const total = setData.total || cards.length
  const pct = total > 0 ? Math.round((ownedCount / total) * 100) : 0
  const isComplete = ownedCount >= total && total > 0

  return (
    <div className={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(`/guest/${uid}`)}>←</button>
        <div className={styles.headerCenter}>
          <span className={styles.setName}>{setData.setName}</span>
          <span className={styles.trainerTag}>👁 {trainerName}'s collection</span>
        </div>
        <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)} aria-label="Remove saved share">🗑</button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <span className={`${styles.statsText} ${isComplete ? styles.statsComplete : ''}`}>
          {ownedCount} / {total}
        </span>
        <div className={styles.progressWrap}>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div
              className={`progress-bar-fill${isComplete ? ' complete' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={styles.pct}>{pct}%</span>
        </div>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className={styles.controls}>
        <div className={styles.filterBtns}>
          {['all', 'owned', 'missing'].map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className={styles.expandAllBtn} onClick={toggleAll}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* ── Card groups ────────────────────────────────────────────────── */}
      <div className={styles.scroll}>
        {groups.map(group => {
          const isOpen = !!expandedGroups[group.label]
          const groupOwned = group.items.filter(c => baseOwned.includes(c.id)).length
          const visibleCards = group.items.filter(c => {
            if (filter === 'owned') return baseOwned.includes(c.id)
            if (filter === 'missing') return !baseOwned.includes(c.id)
            return true
          })
          if (filter !== 'all' && visibleCards.length === 0) return null

          return (
            <div key={group.label} className={styles.group}>
              <button className={styles.groupHeader} onClick={() => toggleGroup(group.label)}>
                <span className={styles.groupLabel}>{group.label}</span>
                <span className={styles.groupStats}>{groupOwned}/{group.items.length}</span>
                <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className={styles.cardGrid}>
                  {visibleCards.map(card => {
                    const owned = baseOwned.includes(card.id)
                    return (
                      <GuestCardTile key={card.id} card={card} owned={owned} />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        <div style={{ height: 40 }} />
      </div>

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="overlay overlay-center" onClick={() => setConfirmDelete(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmText}>Remove {trainerName}'s {setData.setName} from your saved shares?</p>
            <div className={styles.confirmActions}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Guest card tile (read-only) ───────────────────────────────────────────────

function GuestCardTile({ card, owned }) {
  return (
    <div className={`${styles.cardTile} ${owned ? styles.cardOwned : styles.cardMissing}`}>
      <div className={styles.cardTileInner}>
        {card.images?.small ? (
          <img
            src={card.images.small}
            alt={card.name}
            className={`${styles.cardTileImg} ${!owned ? styles.cardTileImgDimmed : ''}`}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className={`${styles.cardTileImgPlaceholder} ${!owned ? styles.cardTileImgDimmed : ''}`}>?</div>
        )}
      </div>
      <div className={styles.cardTileFooter}>
        <div className={styles.cardTileInfo}>
          <span className={styles.cardTileNum}>#{card.number}</span>
          <span className={styles.cardTileName}>{card.name}</span>
        </div>
      </div>
    </div>
  )
}

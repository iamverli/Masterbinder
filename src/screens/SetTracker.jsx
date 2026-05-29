import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchSetCards } from '../services/pokemonApi'
import CardSelectorPopup from '../components/pokedex/CardSelectorPopup'
import SwipeToConfirm from '../components/common/SwipeToConfirm'
import styles from './SetTracker.module.css'

// Rarity order for masterset grouping
const RARITY_ORDER = [
  'Common', 'Uncommon', 'Rare', 'Rare Holo',
  'Rare Holo EX', 'Rare Holo GX', 'Rare Holo V',
  'Rare Holo VMAX', 'Rare Holo VSTAR',
  'Rare Ultra', 'Rare Rainbow', 'Rare Secret',
  'Amazing Rare', 'Radiant Rare',
  'Double Rare', 'Illustration Rare',
  'Special Illustration Rare', 'Hyper Rare',
  'ACE SPEC Rare', 'Shiny Rare', 'Shiny Ultra Rare',
]

function getRarityGroup(card) {
  if (!card.rarity) return 'Other'
  // Reverse holos
  if (card.number?.startsWith('TG') || card.number?.startsWith('GG')) return 'Trainer Gallery'
  return card.rarity
}

function sortByNumber(a, b) {
  const na = parseInt(a.number, 10)
  const nb = parseInt(b.number, 10)
  if (!isNaN(na) && !isNaN(nb)) return na - nb
  return a.number?.localeCompare(b.number || '') || 0
}

export default function SetTracker() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const { sets, updateSet, removeSet } = useApp()

  const setData = sets[setId]

  const [cards, setCards] = useState({ base: [], master: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMaster, setIsMaster] = useState(setData?.mastersetMode || false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [allExpanded, setAllExpanded] = useState(false)
  const [filter, setFilter] = useState('all') // all | owned | missing

  // Card detail popup
  const [detailCard, setDetailCard] = useState(null)

  // Remove confirmation
  const [removeCard, setRemoveCard] = useState(null)

  useEffect(() => {
    if (!setId) return
    setLoading(true)
    fetchSetCards(setId)
      .then(data => {
        setCards(data)

        // Backfill set metadata if it was imported from legacy format
        // (setName === setId means it's a placeholder, printedTotal === 0 means unknown)
        const firstCard = data.master?.[0] || data.base?.[0]
        if (firstCard && setData) {
          const needsUpdate =
            setData.setName === setId ||
            !setData.printedTotal ||
            setData.printedTotal === 0
          if (needsUpdate) {
            updateSet(setId, {
              setName: firstCard.set?.name || setData.setName,
              series: firstCard.set?.series || setData.series,
              printedTotal: firstCard.set?.printedTotal || setData.printedTotal,
              total: firstCard.set?.total || setData.total,
            })
          }
        }

            // Open first group by default
        const activeCards = isMaster ? data.master : data.base
        const groups = getGroups(activeCards)
        if (groups.length > 0) {
          setExpandedGroups({ [groups[0].label]: true })
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load cards.')
        setLoading(false)
      })
  }, [setId])

  if (!setData) {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Set not found.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          Go Home
        </button>
      </div>
    )
  }

  const activeCards = isMaster ? cards.master : cards.base
  const ownedList = isMaster ? (setData.masterOwned || []) : (setData.baseOwned || [])
  const totalCards = activeCards.length || (isMaster ? setData.total : setData.printedTotal) || 0
  const ownedCount = ownedList.length
  const pct = totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0
  const isComplete = ownedCount >= totalCards && totalCards > 0

  // Always group by supertype (Pokémon / Trainer / Energy)
  // Masterset mode just shows the full card list — grouping stays the same
  function getGroups(cardList) {
    const supertypes = {}
    cardList.forEach(c => {
      const group = c.supertype || 'Other'
      if (!supertypes[group]) supertypes[group] = []
      supertypes[group].push(c)
    })
    return Object.entries(supertypes)
      .sort(([a], [b]) => {
        const order = ['Pokémon', 'Trainer', 'Energy', 'Other']
        return order.indexOf(a) - order.indexOf(b)
      })
      .map(([label, items]) => ({ label, items: items.sort(sortByNumber) }))
  }

  const groups = getGroups(activeCards)

  function toggleMode() {
    const next = !isMaster
    setIsMaster(next)
    updateSet(setId, { mastersetMode: next })
    // Open first group
    const nextCards = next ? cards.master : cards.base
    const nextGroups = getGroups(nextCards)
    if (nextGroups.length > 0) {
      setExpandedGroups({ [nextGroups[0].label]: true })
    }
    setAllExpanded(false)
  }

  function toggleGroup(label) {
    setExpandedGroups(prev => {
      const next = { ...prev, [label]: !prev[label] }
      setAllExpanded(groups.every(g => next[g.label]))
      return next
    })
  }

  function toggleAll() {
    if (allExpanded) {
      setExpandedGroups({})
      setAllExpanded(false)
    } else {
      const all = {}
      groups.forEach(g => (all[g.label] = true))
      setExpandedGroups(all)
      setAllExpanded(true)
    }
  }

  function isOwned(cardId) {
    return ownedList.includes(cardId)
  }

  function toggleOwned(cardId) {
    let next
    if (ownedList.includes(cardId)) {
      next = ownedList.filter(id => id !== cardId)
    } else {
      next = [...ownedList, cardId]
    }
    if (isMaster) {
      updateSet(setId, { masterOwned: next })
    } else {
      updateSet(setId, { baseOwned: next })
    }
  }

  function handleLongPress(card) {
    if (isOwned(card.id)) {
      setRemoveCard(card)
    }
  }

  function handleRemoveConfirm() {
    if (removeCard) {
      toggleOwned(removeCard.id)
      setRemoveCard(null)
    }
  }

  return (
    <div className={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <div className={styles.headerCenter}>
          <span className={styles.setName}>{setData.setName}</span>
          {setData.series && <span className={styles.setSeries}>{setData.series}</span>}
        </div>
        {/* Base / Masterset toggle */}
        <button
          className={`${styles.modeToggle} ${isMaster ? styles.modeToggleMaster : ''}`}
          onClick={toggleMode}
        >
          {isMaster ? 'Masterset' : 'Base'}
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <span className={`${styles.statsText} ${isComplete ? styles.statsComplete : ''}`}>
          {ownedCount} / {totalCards}
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
        {loading && (
          <div className={styles.center}>
            <div className={styles.spinner} />
          </div>
        )}
        {error && (
          <div className={styles.center}>
            <p style={{ color: 'var(--color-error)', fontSize: 13 }}>{error}</p>
          </div>
        )}
        {!loading && !error && groups.map(group => {
          const isOpen = !!expandedGroups[group.label]
          const groupOwned = group.items.filter(c => isOwned(c.id)).length

          const visibleCards = group.items.filter(c => {
            if (filter === 'owned') return isOwned(c.id)
            if (filter === 'missing') return !isOwned(c.id)
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
                  {visibleCards.map(card => (
                    <SetCardTile
                      key={card.id}
                      card={card}
                      owned={isOwned(card.id)}
                      isMaster={isMaster}
                      onTap={() => toggleOwned(card.id)}
                      onLongPress={() => handleLongPress(card)}
                      onDots={() => setDetailCard(card)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <div style={{ height: 40 }} />
      </div>

      {/* ── Card detail popup ───────────────────────────────────────────── */}
      {detailCard && (
        <CardDetailPopup
          card={detailCard}
          owned={isOwned(detailCard.id)}
          onToggle={() => toggleOwned(detailCard.id)}
          onClose={() => setDetailCard(null)}
        />
      )}

      {/* ── Remove confirmation ─────────────────────────────────────────── */}
      {removeCard && (
        <SwipeToConfirm
          label={`Slide to remove ${removeCard.name}`}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveCard(null)}
        />
      )}
    </div>
  )
}

// ── Set card tile ─────────────────────────────────────────────────────────────

function SetCardTile({ card, owned, isMaster, onTap, onLongPress, onDots }) {
  const pressTimer = useRef(null)
  const [pressing, setPressing] = useState(false)

  function startPress() {
    setPressing(true)
    pressTimer.current = setTimeout(() => {
      setPressing(false)
      onLongPress?.()
    }, 500)
  }

  function endPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
      if (pressing) {
        setPressing(false)
        onTap?.()
      }
    }
  }

  function cancelPress() {
    clearTimeout(pressTimer.current)
    setPressing(false)
  }

  return (
    <div className={`${styles.cardTile} ${owned ? styles.cardOwned : styles.cardMissing} ${pressing ? styles.cardPressing : ''}`}>
      <button className={styles.cardDots} onClick={e => { e.stopPropagation(); onDots?.() }}>⋮</button>
      <div
        className={styles.cardTileInner}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
      >
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
        <span className={styles.cardTileNum}>#{card.number}</span>
        <span className={styles.cardTileName}>{card.name}</span>
        {isMaster && card.rarity && (
          <span className={styles.cardTileRarity}>{card.rarity}</span>
        )}
      </div>
    </div>
  )
}

// ── Card detail popup ─────────────────────────────────────────────────────────

function CardDetailPopup({ card, owned, onToggle, onClose }) {
  const price = card.tcgplayer?.prices?.holofoil?.market
    || card.tcgplayer?.prices?.normal?.market
    || card.tcgplayer?.prices?.['1stEditionHolofoil']?.market
    || null

  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div className={`${styles.detailPopup} animate-scale-in`} onClick={e => e.stopPropagation()}>
        <div className={styles.detailHeader}>
          <button className={styles.detailClose} onClick={onClose}>✕</button>
          <span className={styles.detailTitle}>{card.name}</span>
          <div style={{ width: 32 }} />
        </div>

        <div className={styles.detailBody}>
          {card.images?.large && (
            <img src={card.images.large} alt={card.name} className={styles.detailImg} />
          )}
          <div className={styles.detailInfo}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Set</span>
              <span className={styles.detailValue}>{card.set?.name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Number</span>
              <span className={styles.detailValue}>#{card.number}</span>
            </div>
            {card.rarity && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Rarity</span>
                <span className={styles.detailValue}>{card.rarity}</span>
              </div>
            )}
            {price && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Market</span>
                <span className={styles.detailValue}>${price.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.detailActions}>
          <button
            className={`btn ${owned ? 'btn-danger' : 'btn-primary'}`}
            style={{ flex: 1 }}
            onClick={() => { onToggle(); onClose() }}
          >
            {owned ? 'Remove from collection' : 'Mark as owned'}
          </button>
        </div>
      </div>
    </div>
  )
}

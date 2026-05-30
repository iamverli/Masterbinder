import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchSetCards } from '../services/pokemonApi'
import { useAppBack } from '../hooks/useAppBack'
import SwipeToConfirm from '../components/common/SwipeToConfirm'
import styles from './SetTracker.module.css'

// Rarities that get a Reverse Holo variant
const REVERSE_HOLO_RARITIES = new Set(['Common', 'Uncommon', 'Rare', 'Rare Holo'])

// Grand Master pattern variants by set era
// SV era has Poké Ball + Master Ball pattern holos
function getPatternVariants(setId) {
  if (!setId) return []
  if (setId.startsWith('sv')) {
    return [
      { suffix: '_rh_pb', label: 'Poké Ball' },
      { suffix: '_rh_mb', label: 'Master Ball' },
    ]
  }
  // SWSH, ME, XY, SM, older eras — no pattern variants
  return []
}

// Mode cycle: base → master → grandmaster (only if set has pattern variants)
const MODES = ['base', 'master', 'grandmaster']

function sortByNumber(a, b) {
  const na = parseInt(a.number, 10)
  const nb = parseInt(b.number, 10)
  if (!isNaN(na) && !isNaN(nb)) return na - nb
  return a.number?.localeCompare(b.number || '') || 0
}

export default function SetTracker() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const { sets, updateSet, loaded } = useApp()

  const resolvedKey = sets[setId]
    ? setId
    : Object.keys(sets).find(k => sets[k]?.setId === setId) || setId
  const setData = sets[resolvedKey]

  useAppBack('/')

  const patternVariants = getPatternVariants(setId)
  const hasPatternVariants = patternVariants.length > 0

  const [cards, setCards] = useState({ base: [], master: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState(() => {
    if (setData?.grandMastersetMode) return 'grandmaster'
    if (setData?.mastersetMode) return 'master'
    return 'base'
  })
  const [expandedGroups, setExpandedGroups] = useState({})
  const [allExpanded, setAllExpanded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [detailCard, setDetailCard] = useState(null)
  const [removeCard, setRemoveCard] = useState(null)

  const isMaster = mode === 'master' || mode === 'grandmaster'
  const isGrandMaster = mode === 'grandmaster'

  useEffect(() => {
    if (!setId) return
    setLoading(true)
    fetchSetCards(setId)
      .then(data => {
        setCards(data)
        const firstCard = data.master?.[0] || data.base?.[0]
        if (firstCard && setData) {
          const needsUpdate = setData.setName === setId || !setData.printedTotal || setData.printedTotal === 0
          if (needsUpdate) {
            updateSet(resolvedKey, {
              setName: firstCard.set?.name || setData.setName,
              series: firstCard.set?.series || setData.series,
              printedTotal: firstCard.set?.printedTotal || setData.printedTotal,
              total: firstCard.set?.total || setData.total,
            })
          }
        }
        const firstGroup = getGroupsFromCards(data.master)[0]
        if (firstGroup) setExpandedGroups({ [firstGroup.label]: true })
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load cards.')
        setLoading(false)
      })
  }, [setId])

  if (!loaded) {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2.5px solid rgba(245,158,11,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 700ms linear infinite' }} />
      </div>
    )
  }

  if (!setData) {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Set not found.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>Go Home</button>
      </div>
    )
  }

  // ── Card model ────────────────────────────────────────────────────────────
  //
  // base mode       = cards.master (all API cards = numbered base + secret rares)
  // master mode     = cards.master + standard RH (_rh) per eligible base card
  // grandmaster mode= master + pattern variants (_rh_pb, _rh_mb) per eligible base card (SV era only)
  //
  // Ownership arrays:
  //   baseOwned[]         — regular card versions
  //   masterOwned[]       — standard RH versions (_rh)
  //   grandMasterOwned[]  — pattern variant RH versions (_rh_pb, _rh_mb)

  const printedTotal = setData.printedTotal || 0
  const baseOwned = setData.baseOwned || []
  const masterOwned = setData.masterOwned || []
  const grandMasterOwned = setData.grandMasterOwned || []

  // Eligible base cards for reverse holos
  const rhEligible = cards.base.filter(c => {
    const n = parseInt(c.number, 10)
    return !isNaN(n) && n <= printedTotal && REVERSE_HOLO_RARITIES.has(c.rarity)
  })

  // Generate synthetic RH entries
  function makeRH(card, suffix, variantLabel) {
    return {
      ...card,
      id: `${card.id}${suffix}`,
      rarity: variantLabel ? `${variantLabel} Pattern` : 'Reverse Holo',
      isReverseHolo: true,
      rhSuffix: suffix,
      baseCardId: card.id,
    }
  }

  const standardRHCards = isMaster
    ? rhEligible.map(c => makeRH(c, '_rh', null))
    : []

  const patternRHCards = isGrandMaster
    ? patternVariants.flatMap(v => rhEligible.map(c => makeRH(c, v.suffix, v.label)))
    : []

  // Build a map: baseCardId → [rh, rh_pb, rh_mb] for interleaving
  const rhByBase = {}
  ;[...standardRHCards, ...patternRHCards].forEach(rh => {
    if (!rhByBase[rh.baseCardId]) rhByBase[rh.baseCardId] = []
    rhByBase[rh.baseCardId].push(rh)
  })

  function isOwned(cardId) {
    if (cardId.endsWith('_rh_pb') || cardId.endsWith('_rh_mb')) return grandMasterOwned.includes(cardId)
    if (cardId.endsWith('_rh')) return masterOwned.includes(cardId)
    return baseOwned.includes(cardId)
  }

  function toggleOwned(cardId) {
    if (cardId.endsWith('_rh_pb') || cardId.endsWith('_rh_mb')) {
      const next = grandMasterOwned.includes(cardId)
        ? grandMasterOwned.filter(id => id !== cardId)
        : [...grandMasterOwned, cardId]
      updateSet(resolvedKey, { grandMasterOwned: next })
    } else if (cardId.endsWith('_rh')) {
      const next = masterOwned.includes(cardId)
        ? masterOwned.filter(id => id !== cardId)
        : [...masterOwned, cardId]
      updateSet(resolvedKey, { masterOwned: next })
    } else {
      const next = baseOwned.includes(cardId)
        ? baseOwned.filter(id => id !== cardId)
        : [...baseOwned, cardId]
      updateSet(resolvedKey, { baseOwned: next })
    }
  }

  // Count all cards in current mode
  const allCardsInMode = [
    ...cards.master,
    ...standardRHCards,
    ...patternRHCards,
  ]
  const totalCards = allCardsInMode.length
  const ownedCount = allCardsInMode.filter(c => isOwned(c.id)).length
  const pct = totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0
  const isComplete = totalCards > 0 && ownedCount >= totalCards

  // ── Grouping — interleave RH variants directly after their base card ───────
  function getGroupsFromCards(cardList) {
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

  const groups = getGroupsFromCards(cards.master).map(group => {
    const interleaved = []
    group.items.forEach(card => {
      interleaved.push(card)
      if (rhByBase[card.id]) {
        interleaved.push(...rhByBase[card.id])
      }
    })
    return { ...group, items: interleaved }
  })

  // ── Mode toggle ───────────────────────────────────────────────────────────
  const modeLabels = {
    base: 'Base',
    master: 'Masterset',
    grandmaster: 'Grand Master',
  }

  function cycleMode() {
    const available = hasPatternVariants ? MODES : ['base', 'master']
    const currentIndex = available.indexOf(mode)
    const next = available[(currentIndex + 1) % available.length]
    setMode(next)
    updateSet(resolvedKey, {
      mastersetMode: next === 'master' || next === 'grandmaster',
      grandMastersetMode: next === 'grandmaster',
    })
    const firstGroup = getGroupsFromCards(cards.master)[0]
    if (firstGroup) setExpandedGroups({ [firstGroup.label]: true })
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

  function handleLongPress(card) {
    if (isOwned(card.id)) setRemoveCard(card)
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
        <button
          className={`${styles.modeToggle} ${mode === 'master' ? styles.modeToggleMaster : ''} ${mode === 'grandmaster' ? styles.modeToggleGrand : ''}`}
          onClick={cycleMode}
        >
          {modeLabels[mode]}
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
        {loading && <div className={styles.center}><div className={styles.spinner} /></div>}
        {error && <div className={styles.center}><p style={{ color: 'var(--color-error)', fontSize: 13 }}>{error}</p></div>}

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
                      onTap={() => { if (!isOwned(card.id)) toggleOwned(card.id) }}
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

      {detailCard && (
        <CardDetailPopup
          card={detailCard}
          owned={isOwned(detailCard.id)}
          onToggle={() => toggleOwned(detailCard.id)}
          onClose={() => setDetailCard(null)}
        />
      )}

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

function SetCardTile({ card, owned, onTap, onLongPress, onDots }) {
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

  const isRH = !!card.isReverseHolo
  const isPB = card.rhSuffix === '_rh_pb'
  const isMB = card.rhSuffix === '_rh_mb'

  return (
    <div className={`
      ${styles.cardTile}
      ${owned ? styles.cardOwned : styles.cardMissing}
      ${pressing ? styles.cardPressing : ''}
      ${isRH ? styles.cardRH : ''}
      ${isRH && owned ? styles.cardRHShimmer : ''}
      ${isPB && owned ? styles.cardPBShimmer : ''}
      ${isMB && owned ? styles.cardMBShimmer : ''}
    `}>
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
      </div>
      <div className={styles.cardTileFooter}>
        <div className={styles.cardTileInfo}>
          <span className={styles.cardTileNum}>
            #{card.number}
            {isPB ? ' PB' : isMB ? ' MB' : isRH ? ' RH' : ''}
          </span>
          <span className={styles.cardTileName}>{card.name}</span>
        </div>
        <button className={styles.cardDots} onClick={e => { e.stopPropagation(); onDots?.() }}>⋮</button>
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

  const variantLabel = card.rhSuffix === '_rh_pb' ? ' (Poké Ball)' :
                       card.rhSuffix === '_rh_mb' ? ' (Master Ball)' :
                       card.isReverseHolo ? ' (Reverse Holo)' : ''

  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div className={`${styles.detailPopup} animate-scale-in`} onClick={e => e.stopPropagation()}>
        <div className={styles.detailHeader}>
          <button className={styles.detailClose} onClick={onClose}>✕</button>
          <span className={styles.detailTitle}>{card.name}{variantLabel}</span>
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
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Rarity</span>
              <span className={styles.detailValue}>{card.rarity || '—'}</span>
            </div>
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

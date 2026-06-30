import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { fetchSetCards } from '../services/pokemonApi'
import { useAppBack } from '../hooks/useAppBack'
import SwipeToConfirm from '../components/common/SwipeToConfirm'
import ShareSheet from '../components/common/ShareSheet'
import ErrorBoundary from '../components/common/ErrorBoundary'
import styles from './SetTracker.module.css'

// Rarities that get a Reverse Holo variant
const REVERSE_HOLO_RARITIES = new Set(['Common', 'Uncommon', 'Rare', 'Rare Holo'])

// Era config — maps specific setId overrides to their era key.
// 'sv'  = Scarlet & Violet era (auto-detected by prefix): standard RH + grandmaster PB/MB
// 'me'  = ME era: Pokémon get PB+Energy pattern RH, Trainers/Energy get 1 standard RH, no grandmaster
// Add more set IDs here as new eras or exceptions are identified.
const SET_ERA_CONFIG = {
  me2pt5: 'me',
}

function getSetEra(setId) {
  if (!setId) return null
  if (SET_ERA_CONFIG[setId]) return SET_ERA_CONFIG[setId]
  if (setId.startsWith('sv')) return 'sv'
  return null
}

// Pattern variants by set era
// SV era: Poké Ball + Master Ball (grandmaster mode)
// ME era: Poké Ball + Energy (master mode, Pokémon only)
function getPatternVariants(setId) {
  const era = getSetEra(setId)
  if (era === 'sv') {
    return [
      { suffix: '_rh_pb', label: 'Poké Ball' },
      { suffix: '_rh_mb', label: 'Master Ball' },
    ]
  }
  if (era === 'me') {
    return [
      { suffix: '_rh_pb', label: 'Poké Ball' },
      { suffix: '_rh_energy', label: 'Energy' },
    ]
  }
  return []
}

// Mode cycle: base → master → grandmaster (grandmaster only for SV era pattern sets)
const MODES = ['base', 'master', 'grandmaster']

// Deduplicate card array by number — removes promo alt-arts sharing a slot number
function dedupeByNumber(arr) {
  const seen = new Set()
  return arr.filter(c => {
    if (seen.has(c.number)) return false
    seen.add(c.number)
    return true
  })
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
  const { sets, updateSet, removeSet, loaded } = useApp()
  const { user } = useAuth()

  const resolvedKey = sets[setId]
    ? setId
    : Object.keys(sets).find(k => sets[k]?.setId === setId) || setId
  const setData = sets[resolvedKey]

  useAppBack('/')

  const patternVariants = getPatternVariants(setId)
  const isMEEra = getSetEra(setId) === 'me'
  // SV era: 3 modes (base → master → grandmaster)
  // ME era: 2 modes (base → master, pattern variants shown at master level)
  // Other: 2 modes (base → master, standard RH only)
  const hasPatternVariants = patternVariants.length > 0
  const hasGrandMaster = hasPatternVariants && !isMEEra

  const [cards, setCards] = useState({ base: [], master: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [degraded, setDegraded] = useState(false)
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
  const [confirmDeleteSet, setConfirmDeleteSet] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const isMaster = mode === 'master' || mode === 'grandmaster'
  const isGrandMaster = mode === 'grandmaster'

  useEffect(() => {
    if (!setId) return
    setLoading(true)
    fetchSetCards(setId)
      .then(data => {
        if (data.degraded) setDegraded(true)
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
        const firstGroup = getGroupsFromCards(dedupeByNumber(data.master))[0]
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
  // base mode        = cards.base (numbered 1–printedTotal only)
  // master mode      = cards.master (base + secret rares) + RH cards:
  //   SV/other era:  + _rh for all eligible C/U/R cards
  //   ME era:        + _rh_pb + _rh_energy for Pokémon C/U/R
  //                  + _rh for Trainer/Energy C/U (standard ME reverse)
  // grandmaster mode = master + _rh_pb + _rh_mb (SV era only)
  //
  // Ownership arrays:
  //   baseOwned[]         — regular card versions (base + secret rares)
  //   masterOwned[]       — standard RH versions (_rh)
  //   grandMasterOwned[]  — pattern variant RH versions (_rh_pb, _rh_mb, _rh_energy)

  const printedTotal = setData.printedTotal || 0
  const baseOwned = setData.baseOwned || []
  const masterOwned = setData.masterOwned || []
  const grandMasterOwned = setData.grandMasterOwned || []

  const baseCards = dedupeByNumber(cards.base)
  const masterCards = dedupeByNumber(cards.master)

  // Eligible base cards for reverse holos
  const rhEligible = baseCards.filter(c => {
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

  let standardRHCards = []
  let patternRHCards = []

  if (isMaster) {
    if (isMEEra) {
      // ME era: Trainers/Energy → standard _rh; Pokémon → Poké Ball + Energy patterns
      const rhPokemon = rhEligible.filter(c => c.supertype === 'Pokémon')
      const rhNonPokemon = rhEligible.filter(c => c.supertype !== 'Pokémon')
      standardRHCards = rhNonPokemon.map(c => makeRH(c, '_rh', null))
      patternRHCards = patternVariants.flatMap(v => rhPokemon.map(c => makeRH(c, v.suffix, v.label)))
    } else {
      // SV / other eras: standard _rh for all eligible
      standardRHCards = rhEligible.map(c => makeRH(c, '_rh', null))
      if (isGrandMaster) {
        patternRHCards = patternVariants.flatMap(v => rhEligible.map(c => makeRH(c, v.suffix, v.label)))
      }
    }
  }

  // Build a map: baseCardId → [rh, rh_pb, rh_mb] for interleaving
  const rhByBase = {}
  ;[...standardRHCards, ...patternRHCards].forEach(rh => {
    if (!rhByBase[rh.baseCardId]) rhByBase[rh.baseCardId] = []
    rhByBase[rh.baseCardId].push(rh)
  })

  function isPatternVariant(cardId) {
    return cardId.endsWith('_rh_pb') || cardId.endsWith('_rh_mb') || cardId.endsWith('_rh_energy')
  }

  function isOwned(cardId) {
    if (isPatternVariant(cardId)) return grandMasterOwned.includes(cardId)
    if (cardId.endsWith('_rh')) return masterOwned.includes(cardId)
    return baseOwned.includes(cardId)
  }

  function toggleOwned(cardId) {
    if (isPatternVariant(cardId)) {
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
  const regularCards = isMaster ? masterCards : baseCards
  const allCardsInMode = [
    ...regularCards,
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

  const groups = getGroupsFromCards(regularCards).map(group => {
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
    const available = hasGrandMaster ? MODES : ['base', 'master']
    const currentIndex = available.indexOf(mode)
    const next = available[(currentIndex + 1) % available.length]
    setMode(next)
    updateSet(resolvedKey, {
      mastersetMode: next === 'master' || next === 'grandmaster',
      grandMastersetMode: next === 'grandmaster',
    })
    const nextRegular = next === 'base' ? baseCards : masterCards
    const firstGroup = getGroupsFromCards(nextRegular)[0]
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

  function handleDeleteSet() {
    removeSet(resolvedKey)
    navigate('/')
  }

  return (
    <ErrorBoundary fallbackLabel="Could not load this set. Tap to try again.">
    <div className={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <div className={styles.headerCenter}>
          <span className={styles.setName}>{setData.setName}</span>
          {setData.series && <span className={styles.setSeries}>{setData.series}</span>}
        </div>
        <div className={styles.headerRight}>
          <button
            className={`${styles.modeToggle} ${mode === 'master' ? styles.modeToggleMaster : ''} ${mode === 'grandmaster' ? styles.modeToggleGrand : ''}`}
            onClick={cycleMode}
          >
            {modeLabels[mode]}
          </button>
          {user && <button className={styles.shareBtn} onClick={() => setShowShare(true)} aria-label="Share set">↗</button>}
          <button className={styles.deleteSetBtn} onClick={() => setConfirmDeleteSet(true)} aria-label="Remove set">🗑</button>
        </div>
      </div>

      {/* ── Degraded mode banner ───────────────────────────────────────── */}
      {degraded && (
        <div className={styles.degradedBanner}>
          ⚠️ Couldn't load cards — check your connection. Ownership is preserved.
        </div>
      )}

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

      {confirmDeleteSet && (
        <SwipeToConfirm
          label={`Slide to remove ${setData.setName} from collection`}
          onConfirm={handleDeleteSet}
          onCancel={() => setConfirmDeleteSet(false)}
        />
      )}

      {showShare && (
        <ShareSheet
          uid={user.uid}
          displayName={user.displayName || 'Trainer'}
          setId={setId}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
    </ErrorBoundary>
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
  const isEnergy = card.rhSuffix === '_rh_energy'

  return (
    <div className={`
      ${styles.cardTile}
      ${owned ? styles.cardOwned : styles.cardMissing}
      ${pressing ? styles.cardPressing : ''}
      ${isRH ? styles.cardRH : ''}
      ${isRH && owned && !isPB && !isMB && !isEnergy ? styles.cardRHShimmer : ''}
      ${isPB && owned ? styles.cardPBShimmer : ''}
      ${isMB && owned ? styles.cardMBShimmer : ''}
      ${isEnergy && owned ? styles.cardEnergyShimmer : ''}
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
            {isPB ? ' PB' : isMB ? ' MB' : isEnergy ? ' EN' : isRH ? ' RH' : ''}
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
                       card.rhSuffix === '_rh_energy' ? ' (Energy)' :
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

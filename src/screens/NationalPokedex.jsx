import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useAppBack } from '../hooks/useAppBack'
import {
  GENERATIONS,
  POKEDEX_TOTAL,
  padDex,
  fetchPokemonNames,
} from '../utils/pokemonData'
import CardSelectorPopup from '../components/pokedex/CardSelectorPopup'
import CardDetailPopup from '../components/pokedex/CardDetailPopup'
import SwipeToConfirm from '../components/common/SwipeToConfirm'
import ShareSheet from '../components/common/ShareSheet'
import styles from './NationalPokedex.module.css'

export default function NationalPokedex() {
  const navigate = useNavigate()
  const { pokedex, setPokedexCard, removePokedexCard } = useApp()
  const { uid } = useAuth()

  useAppBack('/')

  const [names, setNames] = useState({})
  const [namesLoading, setNamesLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedGens, setExpandedGens] = useState(() => {
    const all = {}
    GENERATIONS.forEach(g => (all[g.id] = true))
    return all
  })
  const [allExpanded, setAllExpanded] = useState(true)

  const [selectorPokemon, setSelectorPokemon] = useState(null)
  const [showShare, setShowShare] = useState(false)
  const [detailPokemon, setDetailPokemon] = useState(null)
  const [removePokemon, setRemovePokemon] = useState(null)

  useEffect(() => {
    fetchPokemonNames()
      .then(setNames)
      .catch(() => {})
      .finally(() => setNamesLoading(false))
  }, [])

  const ownedCount = Object.keys(pokedex).length
  const missingCount = POKEDEX_TOTAL - ownedCount
  const pct = Math.round((ownedCount / POKEDEX_TOTAL) * 100)

  function toggleAll() {
    if (allExpanded) {
      setExpandedGens({})
      setAllExpanded(false)
    } else {
      const all = {}
      GENERATIONS.forEach(g => (all[g.id] = true))
      setExpandedGens(all)
      setAllExpanded(true)
    }
  }

  function toggleGen(id) {
    setExpandedGens(prev => {
      const next = { ...prev, [id]: !prev[id] }
      const anyCollapsed = GENERATIONS.some(g => !next[g.id])
      setAllExpanded(!anyCollapsed)
      return next
    })
  }

  function handleTap(dexNumber) {
    if (pokedex[dexNumber]) return
    setPokedexCard(dexNumber, {
      cardId: null, setId: null, setName: null,
      cardNumber: null, imageUrl: null, imageBase64: null,
    })
  }

  function handleDots(dexNumber, name) {
    const cardData = pokedex[dexNumber]
    if (cardData?.cardId || cardData?.imageBase64) {
      setDetailPokemon({ dexNumber, name })
    } else {
      setSelectorPokemon({ dexNumber, name })
    }
  }

  function handleChangeCard(dexNumber, name) {
    setDetailPokemon(null)
    setSelectorPokemon({ dexNumber, name })
  }

  function handleRemoveConfirm() {
    if (removePokemon) {
      removePokedexCard(removePokemon.dexNumber)
      setRemovePokemon(null)
    }
  }

  function handleCardSelect(cardData) {
    if (selectorPokemon) {
      setPokedexCard(selectorPokemon.dexNumber, cardData)
      setSelectorPokemon(null)
    }
  }

  const searchLower = search.trim().toLowerCase()

  const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'owned', label: `Owned ${ownedCount}` },
    { key: 'missing', label: `Missing ${missingCount}` },
  ]

  return (
    <div className={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <span className={styles.headerTitle}>National Pokédex</span>
        {uid
          ? <button className={styles.shareBtn} onClick={() => setShowShare(true)} aria-label="Share Pokédex">↗</button>
          : <div style={{ width: 40 }} />
        }
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={`${styles.statVal} ${styles.statOwned}`}>{ownedCount}</span>
          <span className={styles.statLbl}>Owned</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={`${styles.statVal} ${styles.statMissing}`}>{missingCount}</span>
          <span className={styles.statLbl}>Missing</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={`${styles.statVal} ${styles.statPct}`}>{pct}%</span>
          <span className={styles.statLbl}>Complete</span>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search Pokémon or #number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Filter tabs ────────────────────────────────────────────────── */}
      <div className={styles.filterRow}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.filterBtn} ${filter === tab.key ? styles.filterActive : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        <button className={styles.expandBtn} onClick={toggleAll}>
          {allExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* ── Generation groups ───────────────────────────────────────────── */}
      <div className={styles.scroll}>
        {GENERATIONS.map(gen => {
          const nums = []
          for (let i = gen.start; i <= gen.end; i++) nums.push(padDex(i))

          const ownedInGen = nums.filter(n => pokedex[n]).length
          const missingInGen = nums.length - ownedInGen
          const totalInGen = nums.length
          const genPct = Math.round((ownedInGen / totalInGen) * 100)

          let visibleNums = nums.filter(n => {
            if (filter === 'owned') return !!pokedex[n]
            if (filter === 'missing') return !pokedex[n]
            return true
          })

          if (searchLower) {
            visibleNums = visibleNums.filter(n => {
              const name = (names[n] || '').toLowerCase()
              return name.includes(searchLower) || n.includes(searchLower)
            })
          }

          if (visibleNums.length === 0) return null

          const isOpen = !!expandedGens[gen.id]

          const genCountLabel = filter === 'owned'
            ? `${ownedInGen} owned`
            : filter === 'missing'
              ? `${missingInGen} missing`
              : `${ownedInGen}/${totalInGen}`

          return (
            <div key={gen.id} className={styles.genSection}>
              {/* Gen header */}
              <button
                className={styles.genHeader}
                onClick={() => toggleGen(gen.id)}
              >
                <div className={styles.genHeaderLeft}>
                  <span className={styles.genPill} style={{ background: gen.color }}>
                    GEN {gen.id}
                  </span>
                  <div className={styles.genTitleGroup}>
                    <span className={styles.genName}>{gen.name}</span>
                    <span className={styles.genRegion}>
                      {gen.region} · #{gen.start}–{gen.end}
                    </span>
                  </div>
                </div>
                <div className={styles.genHeaderRight}>
                  <span className={styles.genCount}>{genCountLabel}</span>
                  <div className={styles.genBar}>
                    <div
                      className={styles.genBarFill}
                      style={{ width: `${genPct}%` }}
                    />
                  </div>
                  <span className={styles.genChevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Card list */}
              {isOpen && (
                <div className={styles.cardList}>
                  {visibleNums.map((dexNum, idx) => {
                    const owned = !!pokedex[dexNum]
                    const cardData = pokedex[dexNum] || null
                    const name = names[dexNum] || `#${dexNum}`
                    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${parseInt(dexNum, 10)}.png`
                    const isEven = idx % 2 === 0

                    return (
                      <button
                        key={dexNum}
                        className={`${styles.pokeCard} ${!owned ? styles.pokeCardMissing : ''}`}
                        onClick={() => owned ? null : handleTap(dexNum)}
                      >
                        {/* Sprite */}
                        {cardData?.imageUrl ? (
                          <div className={`${styles.spriteBox} ${styles.spriteBoxCard}`}>
                            <img
                              src={cardData.imageUrl}
                              alt={name}
                              className={`${styles.spriteImgCard} ${!owned ? styles.spriteDimmed : ''}`}
                            />
                            {owned && <div className={styles.ownedDot} />}
                          </div>
                        ) : (
                          <div className={`${styles.spriteBox} ${!owned ? styles.spriteBoxMissing : ''}`}>
                            <img
                              src={spriteUrl}
                              alt={name}
                              className={`${styles.spriteImg} ${!owned ? styles.spriteDimmed : ''}`}
                            />
                            {owned && <div className={styles.ownedDot} />}
                          </div>
                        )}

                        {/* Info */}
                        <div className={styles.pokeInfo}>
                          <span className={styles.pokeNum}>#{dexNum}</span>
                          <span className={`${styles.pokeName} ${!owned ? styles.pokeNameMissing : ''}`}>
                            {name}
                          </span>
                        </div>

                        {/* Dots */}
                        <button
                          className={styles.dots}
                          onClick={e => { e.stopPropagation(); handleDots(dexNum, name) }}
                          aria-label="Options"
                        >
                          •••
                        </button>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        <div style={{ height: 40 }} />
      </div>

      {/* ── Card detail popup ──────────────────────────────────────────── */}
      {detailPokemon && (
        <CardDetailPopup
          pokemon={detailPokemon}
          cardData={pokedex[detailPokemon.dexNumber] || null}
          onChangeCard={() => handleChangeCard(detailPokemon.dexNumber, detailPokemon.name)}
          onRemove={() => { setDetailPokemon(null); setRemovePokemon(detailPokemon) }}
          onClose={() => setDetailPokemon(null)}
          onSavePurchasePrice={(price) => {
            const existing = pokedex[detailPokemon.dexNumber] || {}
            setPokedexCard(detailPokemon.dexNumber, { ...existing, purchasePrice: price })
          }}
        />
      )}

      {/* ── Card selector popup ─────────────────────────────────────────── */}
      {selectorPokemon && (
        <CardSelectorPopup
          pokemon={selectorPokemon}
          currentCard={pokedex[selectorPokemon.dexNumber] || null}
          onSelect={handleCardSelect}
          onClose={() => setSelectorPokemon(null)}
        />
      )}

      {/* ── Remove confirmation ─────────────────────────────────────────── */}
      {removePokemon && (
        <SwipeToConfirm
          label={`Slide to remove ${removePokemon.name}`}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemovePokemon(null)}
        />
      )}

      {showShare && uid && (
        <ShareSheet
          uid={uid}
          displayName={null}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}

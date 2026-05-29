import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import {
  GENERATIONS,
  POKEDEX_TOTAL,
  padDex,
  fetchPokemonNames,
} from '../utils/pokemonData'
import PokemonTile from '../components/pokedex/PokemonTile'
import CardSelectorPopup from '../components/pokedex/CardSelectorPopup'
import CardDetailPopup from '../components/pokedex/CardDetailPopup'
import SwipeToConfirm from '../components/common/SwipeToConfirm'
import styles from './NationalPokedex.module.css'

const FILTERS = ['all', 'owned', 'missing']

export default function NationalPokedex() {
  const navigate = useNavigate()
  const { pokedex, setPokedexCard, removePokedexCard } = useApp()
  const { uid } = useAuth()

  const [names, setNames] = useState({}) // { "001": "Bulbasaur", ... }
  const [namesLoading, setNamesLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expandedGens, setExpandedGens] = useState({ 1: true }) // Gen I open by default
  const [allExpanded, setAllExpanded] = useState(false)

  // Card selector popup (pick/change a card)
  const [selectorPokemon, setSelectorPokemon] = useState(null) // { dexNumber, name }

  // Card detail popup (view assigned card)
  const [detailPokemon, setDetailPokemon] = useState(null) // { dexNumber, name }

  // Removal confirmation
  const [removePokemon, setRemovePokemon] = useState(null) // { dexNumber, name }

  // Load Pokémon names
  useEffect(() => {
    fetchPokemonNames()
      .then(setNames)
      .catch(() => {}) // fail silently — tiles show dex number only
      .finally(() => setNamesLoading(false))
  }, [])

  // Stats
  const ownedCount = Object.keys(pokedex).length
  const missingCount = POKEDEX_TOTAL - ownedCount
  const pct = Math.round((ownedCount / POKEDEX_TOTAL) * 100)

  // Expand / collapse all
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

  // Tile actions
  function handleTap(dexNumber) {
    if (pokedex[dexNumber]) return // already owned — tap does nothing when owned
    // Mark as owned with minimal card data
    setPokedexCard(dexNumber, {
      cardId: null,
      setId: null,
      setName: null,
      cardNumber: null,
      imageUrl: null,
      imageBase64: null,
    })
  }

  function handleTapOwned(dexNumber) {
    // If owned and tapped again — do nothing (long press to remove)
  }

  function handleLongPress(dexNumber, name) {
    setRemovePokemon({ dexNumber, name })
  }

  function handleDots(dexNumber, name) {
    const cardData = pokedex[dexNumber]
    // If a specific card is assigned, show the detail view
    // If owned with no card (manually marked) or not owned, open the selector
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

  return (
    <div className={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <span className={styles.headerTitle}>National Pokédex</span>
        <div style={{ width: 40 }} />
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{ownedCount}</span>
          <span className={styles.statLbl}>Owned</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statVal}>{missingCount}</span>
          <span className={styles.statLbl}>Missing</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={`${styles.statVal} ${styles.statPct}`}>{pct}%</span>
          <span className={styles.statLbl}>Complete</span>
        </div>
      </div>

      {/* ── Controls row ───────────────────────────────────────────────── */}
      <div className={styles.controls}>
        <div className={styles.filterBtns}>
          {FILTERS.map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className={styles.expandBtn} onClick={toggleAll}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* ── Generation groups ───────────────────────────────────────────── */}
      <div className={styles.scroll}>
        {GENERATIONS.map(gen => {
          const isOpen = !!expandedGens[gen.id]
          const nums = []
          for (let i = gen.start; i <= gen.end; i++) nums.push(padDex(i))

          const ownedInGen = nums.filter(n => pokedex[n]).length
          const totalInGen = nums.length
          const genPct = Math.round((ownedInGen / totalInGen) * 100)

          const visibleNums = nums.filter(n => {
            if (filter === 'owned') return !!pokedex[n]
            if (filter === 'missing') return !pokedex[n]
            return true
          })

          if (filter !== 'all' && visibleNums.length === 0) return null

          return (
            <div key={gen.id} className={styles.genSection}>
              {/* Gen header */}
              <button
                className={styles.genHeader}
                style={{ '--gen-color': gen.color }}
                onClick={() => toggleGen(gen.id)}
              >
                <div className={styles.genHeaderLeft}>
                  <span className={styles.genName}>{gen.name}</span>
                  <span className={styles.genRegion}>{gen.region}</span>
                </div>
                <div className={styles.genHeaderRight}>
                  <span className={styles.genStats}>{ownedInGen}/{totalInGen}</span>
                  <span className={styles.genPct}>{genPct}%</span>
                  <span className={styles.genChevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Progress bar */}
              {isOpen && (
                <div className={styles.genProgress}>
                  <div
                    className={styles.genProgressFill}
                    style={{
                      width: `${genPct}%`,
                      background: gen.color,
                    }}
                  />
                </div>
              )}

              {/* Pokémon grid */}
              {isOpen && (
                <div className={styles.grid}>
                  {visibleNums.map(dexNum => {
                    const owned = !!pokedex[dexNum]
                    const cardData = pokedex[dexNum] || null
                    const name = names[dexNum] || `#${dexNum}`
                    return (
                      <PokemonTile
                        key={dexNum}
                        dexNumber={dexNum}
                        name={name}
                        owned={owned}
                        cardData={cardData}
                        onTap={() => owned ? handleTapOwned(dexNum) : handleTap(dexNum)}
                        onLongPress={() => owned ? handleLongPress(dexNum, name) : null}
                        onDots={() => handleDots(dexNum, name)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        <div style={{ height: 40 }} />
      </div>

      {/* ── Card detail popup ──────────────────────────────────────────────── */}
      {detailPokemon && (
        <CardDetailPopup
          pokemon={detailPokemon}
          cardData={pokedex[detailPokemon.dexNumber] || null}
          onChangeCard={() => handleChangeCard(detailPokemon.dexNumber, detailPokemon.name)}
          onRemove={() => {
            setDetailPokemon(null)
            setRemovePokemon(detailPokemon)
          }}
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
    </div>
  )
}

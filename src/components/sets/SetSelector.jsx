import { useState, useEffect, useRef } from 'react'
import { fetchAllSets } from '../../services/pokemonApi'
import { useApp } from '../../context/AppContext'
import styles from './SetSelector.module.css'

export default function SetSelector({ onClose }) {
  const { sets, addSet } = useApp()
  const [allSets, setAllSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [expandedEras, setExpandedEras] = useState({})
  const [allExpanded, setAllExpanded] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    fetchAllSets()
      .then(sets => {
        setAllSets(sets)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load sets. Check your connection.')
        setLoading(false)
      })
  }, [])

  // Group sets by series
  const grouped = allSets.reduce((acc, s) => {
    const era = s.series || 'Other'
    if (!acc[era]) acc[era] = []
    acc[era].push(s)
    return acc
  }, {})

  // Sort eras by release date of first set in era
  const sortedEras = Object.keys(grouped).sort((a, b) => {
    const aDate = grouped[a][0]?.releaseDate || ''
    const bDate = grouped[b][0]?.releaseDate || ''
    return aDate.localeCompare(bDate)
  })

  // Filter
  const searchLower = search.toLowerCase()
  const filteredEras = sortedEras.filter(era => {
    if (!searchLower) return true
    return (
      era.toLowerCase().includes(searchLower) ||
      grouped[era].some(s => s.name.toLowerCase().includes(searchLower))
    )
  })

  function toggleEra(era) {
    setExpandedEras(prev => {
      const next = { ...prev, [era]: !prev[era] }
      setAllExpanded(Object.keys(grouped).every(e => next[e]))
      return next
    })
  }

  function toggleAll() {
    if (allExpanded) {
      setExpandedEras({})
      setAllExpanded(false)
    } else {
      const all = {}
      sortedEras.forEach(e => (all[e] = true))
      setExpandedEras(all)
      setAllExpanded(true)
    }
  }

  async function handleAddSet(set) {
    if (sets[set.id]) return // already added
    await addSet(set.id, {
      setId: set.id,
      setName: set.name,
      series: set.series || null,
      releaseDate: set.releaseDate || null,
      printedTotal: set.printedTotal || 0,
      total: set.total || 0,
      images: set.images || {},
      baseOwned: [],
      masterOwned: [],
      mastersetMode: false,
    })
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className={`${styles.sheet} animate-slide-up`} onClick={e => e.stopPropagation()}>
        <div className="bottom-sheet-handle" />

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Add a Set</span>
          <button className={styles.expandBtn} onClick={toggleAll}>
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Era list */}
        <div className={styles.eraList}>
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
          {!loading && !error && filteredEras.map(era => {
            const isOpen = !!expandedEras[era]
            const eraSets = searchLower
              ? grouped[era].filter(s => s.name.toLowerCase().includes(searchLower) || era.toLowerCase().includes(searchLower))
              : grouped[era]

            return (
              <div key={era} className={styles.eraSection}>
                <button className={styles.eraHeader} onClick={() => toggleEra(era)}>
                  <span className={styles.eraName}>{era}</span>
                  <span className={styles.eraCount}>{eraSets.length} sets</span>
                  <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className={styles.setList}>
                    {eraSets.map(set => {
                      const added = !!sets[set.id]
                      return (
                        <button
                          key={set.id}
                          className={`${styles.setItem} ${added ? styles.setAdded : ''}`}
                          onClick={() => !added && handleAddSet(set)}
                          disabled={added}
                        >
                          <div className={styles.setInfo}>
                            <span className={styles.setName}>{set.name}</span>
                            <span className={styles.setMeta}>
                              {set.releaseDate?.slice(0, 4)} · {set.printedTotal} cards
                            </span>
                          </div>
                          {added ? (
                            <span className={styles.addedBadge}>Added</span>
                          ) : (
                            <span className={styles.addIcon}>+</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ height: 20 }} />
        </div>

        {/* Search bar — fixed at bottom, above keyboard */}
        <div className={styles.searchBar}>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search sets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>
    </div>
  )
}

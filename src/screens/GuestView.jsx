import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicSnapshot } from '../firebase/firestore'
import styles from './GuestView.module.css'

const POKEDEX_TOTAL = 1025

export default function GuestView() {
  const { uid } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!uid) { setError('Invalid link.'); setLoading(false); return }
    getPublicSnapshot(uid)
      .then((snap) => {
        if (!snap) setError('This trainer hasn\'t shared their collection yet.')
        else setData(snap)
      })
      .catch(() => setError('Could not load collection. Check your connection.'))
      .finally(() => setLoading(false))
  }, [uid])

  if (loading) {
    return (
      <div className={styles.root}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading trainer data…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.root}>
        <div className={styles.errorWrap}>
          <span className={styles.errorIcon}>😔</span>
          <p className={styles.errorMsg}>{error}</p>
          <a href="https://bluemoontracker.netlify.app" className={styles.homeLink}>
            Open MasterBinder →
          </a>
        </div>
      </div>
    )
  }

  const dexCount = Object.keys(data.pokedexOwned || {}).length
  const dexPct = Math.round((dexCount / POKEDEX_TOTAL) * 100)
  const sets = Object.values(data.sets || {})
  const setsWithCards = sets.filter(s => s.ownedCount > 0)

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.trainerName}>{data.displayName}'s Collection</div>
        <div className={styles.readOnly}>👁 View only</div>
      </div>

      <div className={styles.scroll}>
        {/* Pokédex summary */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.cardTitle}>National Pokédex</span>
            <span className={styles.cardPct}>{dexPct}%</span>
          </div>
          <div className={styles.cardSub}>{dexCount} / {POKEDEX_TOTAL} Pokémon</div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${dexCount === POKEDEX_TOTAL ? styles.progressComplete : ''}`}
              style={{ width: `${dexPct}%` }}
            />
          </div>
        </div>

        {/* Sets */}
        {setsWithCards.length > 0 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Sets</span>
            <div className={styles.setsList}>
              {setsWithCards.map(s => {
                const pct = s.total > 0 ? Math.round((s.ownedCount / s.total) * 100) : 0
                const complete = s.ownedCount >= s.total && s.total > 0
                return (
                  <button
                    key={s.setId}
                    className={`${styles.setCard} ${complete ? styles.setCardComplete : ''}`}
                    onClick={() => navigate(`/guest/${uid}/set/${s.setId}`)}
                  >
                    <div className={styles.setTop}>
                      <span className={styles.setName}>{s.setName}</span>
                      <span className={styles.setStats}>{s.ownedCount}/{s.total}</span>
                    </div>
                    {s.series && <span className={styles.setSeries}>{s.series}</span>}
                    <div className={styles.setProgressWrap}>
                      <div className={styles.progressBar} style={{ flex: 1 }}>
                        <div
                          className={`${styles.progressFill} ${complete ? styles.progressComplete : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={styles.setPct}>{pct}%</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {setsWithCards.length === 0 && dexCount === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📦</span>
            <p>No collection data shared yet.</p>
          </div>
        )}

        {/* Footer CTA */}
        <div className={styles.footer}>
          <p className={styles.footerText}>Track your own collection</p>
          <a
            href="https://bluemoontracker.netlify.app"
            className={styles.footerBtn}
          >
            🌙 Open MasterBinder
          </a>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}

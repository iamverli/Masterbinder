import { useState, useEffect, useRef } from 'react'
import { searchCardsByPokemon, CARD_LANGUAGES } from '../../services/pokemonApi'
import { compressImageToBase64 } from '../../utils/imageUtils'
import styles from './CardSelectorPopup.module.css'

const STORE_URL = 'https://www.bluemooncollectibles.com/en/shop?query='

export default function CardSelectorPopup({ pokemon, currentCard, onSelect, onClose }) {
  const { dexNumber, name } = pokemon

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('en')
  const [promoOnly, setPromoOnly] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    loadCards()
  }, [language, promoOnly])

  async function loadCards() {
    setLoading(true)
    setError(null)
    try {
      const results = await searchCardsByPokemon(name, language)
      const filtered = promoOnly
        ? results.filter(c =>
            c.set?.name?.toLowerCase().includes('promo') ||
            c.set?.id?.endsWith('p') ||
            c.set?.id?.includes('promo')
          )
        : results
      setCards(filtered)
    } catch (err) {
      setError('Could not load cards. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = cards.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.set?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.number?.includes(search)
  )

  async function handleFileUpload(file) {
    if (!file) return
    setUploading(true)
    try {
      const base64 = await compressImageToBase64(file)
      onSelect({
        cardId: `custom_${dexNumber}_${Date.now()}`,
        setId: 'custom',
        setName: 'Custom',
        cardNumber: null,
        imageUrl: null,
        imageBase64: base64,
        isCustom: true,
      })
    } catch {
      alert('Could not process image. Try another file.')
    } finally {
      setUploading(false)
    }
  }

  function handleSelectCard(card) {
    onSelect({
      cardId: card.id,
      setId: card.set?.id || null,
      setName: card.set?.name || null,
      cardNumber: card.number || null,
      imageUrl: card.images?.small || null,
      imageBase64: null,
      isCustom: false,
    })
  }

  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div className={`${styles.popup} animate-scale-in`} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
          <span className={styles.title}>{name}</span>
          <div style={{ width: 32 }} />
        </div>

        {/* Language + Promo filters */}
        <div className={styles.filters}>
          <div className={styles.langRow}>
            {CARD_LANGUAGES.map(l => (
              <button
                key={l.code}
                className={`${styles.langChip} ${language === l.code && !promoOnly ? styles.langActive : ''}`}
                onClick={() => { setLanguage(l.code); setPromoOnly(false) }}
              >
                {l.label}
              </button>
            ))}
            <button
              className={`${styles.langChip} ${promoOnly ? styles.langActive : ''}`}
              onClick={() => setPromoOnly(p => !p)}
            >
              ★ Promo
            </button>
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchWrap}>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search by name, set or number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Card grid */}
        <div className={styles.grid}>
          {loading && (
            <div className={styles.centerMsg}>
              <div className={styles.spinner} />
            </div>
          )}
          {error && (
            <div className={styles.centerMsg}>
              <p className={styles.errorText}>{error}</p>
              <button className="btn btn-secondary" onClick={loadCards}>Retry</button>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className={styles.centerMsg}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No cards found</p>
            </div>
          )}
          {!loading && !error && filtered.map(card => (
            <button
              key={card.id}
              className={`${styles.cardItem} ${currentCard?.cardId === card.id ? styles.cardSelected : ''}`}
              onClick={() => handleSelectCard(card)}
            >
              {card.images?.small ? (
                <img
                  src={card.images.small}
                  alt={card.name}
                  className={styles.cardImg}
                  loading="lazy"
                />
              ) : (
                <div className={styles.cardImgPlaceholder}>?</div>
              )}
              <span className={styles.cardSet}>{card.set?.name}</span>
              <span className={styles.cardNum}>#{card.number}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <a
            href={`${STORE_URL}${encodeURIComponent(name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-secondary ${styles.actionBtn}`}
          >
            🌙 Search on store
          </a>
          <div className={styles.uploadRow}>
            <button
              className={`btn btn-ghost ${styles.uploadBtn}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              📁 Add your own
            </button>
            <button
              className={`btn btn-ghost ${styles.uploadBtn}`}
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              📷 Take photo
            </button>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => handleFileUpload(e.target.files?.[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => handleFileUpload(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}

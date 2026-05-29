import { useState, useEffect, useRef } from 'react'
import { fetchCardById } from '../../services/pokemonApi'
import styles from './CardDetailPopup.module.css'

const STORE_URL = 'https://www.bluemooncollectibles.com/en/shop?query='

const TYPE_EMOJIS = {
  Fire: '🔥', Water: '💧', Grass: '🌿', Electric: '⚡',
  Psychic: '🔮', Fighting: '🥊', Darkness: '🌑', Metal: '⚙️',
  Fairy: '✨', Dragon: '🐉', Colorless: '⭐',
  Poison: '☠️', Rock: '🪨', Ground: '🌍', Ice: '❄️',
  Ghost: '👻', Bug: '🐛', Flying: '🌬️',
}

function getBestPrices(tcgplayer) {
  if (!tcgplayer?.prices) return null
  const prices = tcgplayer.prices
  // Priority order for price variant
  const preferredKeys = [
    'holofoil', '1stEditionHolofoil', 'unlimited',
    'reverseHolofoil', 'normal', '1stEdition',
  ]
  for (const key of preferredKeys) {
    if (prices[key]?.market != null) return prices[key]
  }
  // Fall back to first key that has market
  for (const key of Object.keys(prices)) {
    if (prices[key]?.market != null) return prices[key]
  }
  return null
}

export default function CardDetailPopup({
  pokemon,
  cardData,
  onChangeCard,
  onRemove,
  onClose,
  onSavePurchasePrice,
}) {
  const { name } = pokemon
  const [fullCard, setFullCard] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [purchasePrice, setPurchasePrice] = useState(
    cardData?.purchasePrice != null ? String(cardData.purchasePrice) : ''
  )
  const inputRef = useRef(null)

  // Fetch full card data for prices/rarity/types
  useEffect(() => {
    if (!cardData?.cardId || cardData.isCustom) return
    setPriceLoading(true)
    fetchCardById(cardData.cardId)
      .then(setFullCard)
      .finally(() => setPriceLoading(false))
  }, [cardData?.cardId])

  const imgSrc =
    cardData?.imageBase64 ||
    fullCard?.images?.large ||
    cardData?.imageUrl ||
    null

  const prices = getBestPrices(fullCard?.tcgplayer)
  const rarity = fullCard?.rarity || null
  const types = fullCard?.types || []

  // Compute range bar position for Market between Low and High
  let marketPct = 50
  if (prices?.low != null && prices?.high != null && prices?.market != null) {
    const range = prices.high - prices.low
    if (range > 0) {
      marketPct = Math.round(((prices.market - prices.low) / range) * 100)
      marketPct = Math.max(2, Math.min(98, marketPct))
    }
  }

  function handlePriceBlur() {
    const trimmed = purchasePrice.trim()
    const parsed = parseFloat(trimmed.replace(/[^0-9.]/g, ''))
    const finalValue = isNaN(parsed) ? null : parsed
    if (onSavePurchasePrice) {
      onSavePurchasePrice(finalValue)
    }
  }

  function formatPrice(val) {
    if (val == null) return '—'
    return `$${val.toFixed(2)}`
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className={`${styles.popup} animate-slide-up`} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
          <span className={styles.title}>{name}</span>
          <div style={{ width: 32 }} />
        </div>

        {/* Card image */}
        <div className={styles.imageWrap}>
          {imgSrc ? (
            <img src={imgSrc} alt={name} className={styles.cardImg} />
          ) : (
            <div className={styles.noImage}>No image</div>
          )}
        </div>

        {/* Set info */}
        <div className={styles.setInfo}>
          {cardData?.setName && <span className={styles.setName}>{cardData.setName}</span>}
          {cardData?.setName && cardData?.cardNumber && <span className={styles.setDot}>·</span>}
          {cardData?.cardNumber && <span className={styles.cardNum}>#{cardData.cardNumber}</span>}
          {cardData?.isCustom && <span className={styles.customBadge}>Custom</span>}
        </div>

        {/* Type + rarity badges */}
        {(rarity || types.length > 0) && (
          <div className={styles.badges}>
            {rarity && (
              <span className={styles.rarityBadge}>★ {rarity}</span>
            )}
            {types.map(t => (
              <span key={t} className={styles.typeBadge}>
                {TYPE_EMOJIS[t] || '⭐'} {t}
              </span>
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div className={styles.scrollBody}>

          {/* Market Price */}
          <div className={styles.priceSection}>
            <span className={styles.priceSectionLabel}>Market Price (USD)</span>
            {priceLoading ? (
              <div className={styles.priceLoading}>Loading prices…</div>
            ) : prices ? (
              <>
                <div className={styles.marketPrice}>{formatPrice(prices.market)}</div>
                {/* Range bar */}
                <div className={styles.rangeWrap}>
                  <div className={styles.rangeTrack}>
                    <div className={styles.rangeFill} />
                    <div
                      className={styles.rangeDot}
                      style={{ left: `${marketPct}%` }}
                    />
                  </div>
                  <div className={styles.rangeLabels}>
                    <span className={styles.rangeLabel}>
                      <span className={styles.rangeLabelVal}>{formatPrice(prices.low)}</span>
                      <span className={styles.rangeLabelText}>Low</span>
                    </span>
                    <span className={`${styles.rangeLabel} ${styles.rangeLabelCenter}`}>
                      <span className={styles.rangeLabelVal}>{formatPrice(prices.market)}</span>
                      <span className={styles.rangeLabelText}>Market</span>
                    </span>
                    <span className={`${styles.rangeLabel} ${styles.rangeLabelRight}`}>
                      <span className={styles.rangeLabelVal}>{formatPrice(prices.high)}</span>
                      <span className={styles.rangeLabelText}>High</span>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              !cardData?.isCustom && (
                <div className={styles.noPrice}>No price data available</div>
              )
            )}
          </div>

          {/* Purchase price */}
          <div className={styles.purchaseSection}>
            <span className={styles.priceSectionLabel}>My purchase price</span>
            <div className={styles.purchaseInputWrap}>
              <span className={styles.purchaseCurrency}>$</span>
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                className={styles.purchaseInput}
                value={purchasePrice}
                onChange={e => setPurchasePrice(e.target.value)}
                onBlur={handlePriceBlur}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <a
              href={`${STORE_URL}${encodeURIComponent(name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.storeBtn}
            >
              🌙 Search in store
            </a>
            <button className={styles.changeBtn} onClick={onChangeCard}>
              🔄 Change the card
            </button>
            <button className={styles.removeBtn} onClick={onRemove}>
              × Remove from Pokédex
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

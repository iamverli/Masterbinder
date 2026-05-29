import { useRef, useState } from 'react'
import { getSpriteUrl } from '../../utils/pokemonData'
import styles from './PokemonTile.module.css'

const LONG_PRESS_MS = 500

export default function PokemonTile({ dexNumber, name, owned, cardData, onTap, onLongPress, onDots }) {
  const timerRef = useRef(null)
  const [pressing, setPressing] = useState(false)

  const spriteUrl = cardData?.imageBase64 || cardData?.imageUrl || getSpriteUrl(parseInt(dexNumber, 10))
  const isCustomImage = !!(cardData?.imageBase64 || cardData?.imageUrl)

  function startPress(e) {
    setPressing(true)
    timerRef.current = setTimeout(() => {
      setPressing(false)
      onLongPress?.()
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    clearTimeout(timerRef.current)
    setPressing(false)
  }

  function handlePointerUp(e) {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      if (pressing) {
        setPressing(false)
        onTap?.()
      }
    }
  }

  return (
    <div className={`${styles.tile} ${owned ? styles.owned : styles.missing} ${pressing ? styles.pressing : ''}`}>
      {/* Dots button */}
      <button
        className={styles.dots}
        onClick={(e) => { e.stopPropagation(); onDots?.() }}
        aria-label="Card options"
      >
        ⋮
      </button>

      {/* Main tap area */}
      <div
        className={styles.tileInner}
        onPointerDown={startPress}
        onPointerUp={handlePointerUp}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
      >
        <div className={isCustomImage ? styles.cardWrap : styles.spriteWrap}>
          <img
            src={spriteUrl}
            alt={name}
            className={isCustomImage ? styles.cardImg : `${styles.sprite} ${!owned ? styles.spriteDimmed : ''}`}
            loading="lazy"
            draggable={false}
          />
          {owned && !isCustomImage && (
            <div className={styles.ownedDot} />
          )}
        </div>
        <span className={styles.number}>#{dexNumber}</span>
        <span className={styles.name}>{name}</span>
      </div>
    </div>
  )
}

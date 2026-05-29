import styles from './CardDetailPopup.module.css'

export default function CardDetailPopup({ pokemon, cardData, onChangeCard, onRemove, onClose }) {
  const { name } = pokemon
  const imgSrc = cardData?.imageBase64 || cardData?.imageUrl || null

  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div className={`${styles.popup} animate-scale-in`} onClick={e => e.stopPropagation()}>

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
            <div className={styles.noImage}>No card image</div>
          )}
        </div>

        {/* Card info */}
        {(cardData?.setName || cardData?.cardNumber) && (
          <div className={styles.info}>
            {cardData.setName && (
              <span className={styles.infoSet}>{cardData.setName}</span>
            )}
            {cardData.cardNumber && (
              <span className={styles.infoNum}>#{cardData.cardNumber}</span>
            )}
            {cardData.isCustom && (
              <span className={styles.infoBadge}>Custom</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button className={`btn btn-secondary ${styles.actionBtn}`} onClick={onChangeCard}>
            🔄 Change Card
          </button>
          <button className={`btn btn-ghost ${styles.removeBtn}`} onClick={onRemove}>
            Remove from Pokédex
          </button>
        </div>

      </div>
    </div>
  )
}

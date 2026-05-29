import styles from './HelpSheet.module.css'

const SECTIONS = [
  {
    icon: '📖',
    title: 'National Pokédex',
    steps: [
      'Tap a Pokémon tile to mark it as owned.',
      'Tap the ⋮ button to assign a specific card — search by name, set, or number.',
      'Long-press an owned tile to remove it.',
      'Filter by Owned / Missing, or expand all generations at once.',
    ],
  },
  {
    icon: '📦',
    title: 'Set Tracker',
    steps: [
      'Tap + on the Home screen to add a set from the full set list.',
      'Once added, tap the set card to open the Set Tracker.',
      'Tap a card tile to mark it as owned. Tap again to unmark.',
      'Switch between Base Set and Master Set modes using the toggle at the top.',
      'Long-press a card tile to see its details.',
    ],
  },
  {
    icon: '💾',
    title: 'Backup & Restore',
    steps: [
      'Open the side menu → Export collection to download a backup JSON file.',
      'To restore, open the menu → Import collection and select your backup file.',
      'If you sign in with Google, your data syncs to the cloud automatically.',
    ],
  },
  {
    icon: '📲',
    title: 'Install as App',
    steps: [
      'On the Home screen, tap Install App in the side menu (if available).',
      'On iOS: tap the Share button in Safari → Add to Home Screen.',
      'The app works fully offline once installed.',
    ],
  },
]

export default function HelpSheet({ onClose }) {
  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div className={`${styles.sheet} animate-scale-in`} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
          <span className={styles.title}>How to use MasterBinder</span>
          <div style={{ width: 32 }} />
        </div>

        <div className={styles.scroll}>
          {SECTIONS.map(s => (
            <div key={s.title} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>{s.icon}</span>
                <span className={styles.sectionTitle}>{s.title}</span>
              </div>
              <ol className={styles.steps}>
                {s.steps.map((step, i) => (
                  <li key={i} className={styles.step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}

          <div className={styles.footer}>
            <span>Built for</span>
            <a
              href="https://www.bluemooncollectibles.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.storeLink}
            >
              🌙 Blue Moon Collectibles
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

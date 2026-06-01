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
      'Tap ↗ in the header to share your full Pokédex with a QR code and link.',
    ],
  },
  {
    icon: '📦',
    title: 'Set Tracker',
    steps: [
      'Tap + on the Home screen to add a set from the full set list.',
      'Once added, tap the set card to open the Set Tracker.',
      'Tap a card tile once to mark it as owned. Long-press to remove it.',
      'Toggle between Base, Masterset, and Grand Master modes using the button in the header.',
      'Base = printed cards only. Masterset adds reverse holos and secret rares. Grand Master adds Poké Ball and Master Ball pattern variants (SV era).',
      'For Ascended Heroes and ME era sets, Masterset shows Pokémon with Poké Ball + Energy pattern variants and Trainers with 1 standard reverse holo.',
      'Tap ↗ in the header to share the set with a QR code and link.',
    ],
  },
  {
    icon: '↗',
    title: 'Sharing',
    steps: [
      'Tap ↗ in any Set Tracker or Pokédex header to share your collection.',
      'A QR code and link are generated — anyone with the link can view your cards.',
      'Guests see your progress in read-only mode — no edits possible.',
      'When you open a shared set link, it\'s saved to your Trainer Cards in the side menu.',
      'The Trainer Cards strip shows your 4 most recently opened shared sets. Tap one to reopen it. Tap › to see all saved shares.',
      'To remove a saved share, open it and tap the trash icon.',
    ],
  },
  {
    icon: '💾',
    title: 'Backup & Restore',
    steps: [
      'Open the side menu → Settings → Export collection to download a backup JSON file.',
      'To restore, open Settings → Import collection and select your backup file.',
      'If you sign in with Google, your data syncs to the cloud automatically.',
    ],
  },
  {
    icon: '📲',
    title: 'Install as App',
    steps: [
      'Open the side menu → tap Install App (if available).',
      'On iOS: tap the Share button in Safari → Add to Home Screen.',
      'The app works fully offline once installed.',
    ],
  },
]

export default function HelpSheet({ onClose }) {
  return (
    <div className={`overlay ${styles.overlay}`} onClick={onClose}>
      <div className={`${styles.sheet} animate-slide-up`} onClick={e => e.stopPropagation()}>

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

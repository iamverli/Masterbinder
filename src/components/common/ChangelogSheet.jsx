import styles from './ChangelogSheet.module.css'

const CHANGELOG = [
  {
    version: 'V2.1 Ivysaur',
    date: 'June 2026',
    entries: [
      { type: 'feature', text: 'Per-set sharing — share button in Set Tracker generates a set-specific QR code and link' },
      { type: 'feature', text: 'Pokédex share — share button in National Pokédex for full collection sharing' },
      { type: 'feature', text: 'Guest Set View — guests see full card-level set layout, same as Set Tracker (read-only)' },
      { type: 'feature', text: 'Trainer Cards strip in drawer — saved shared sets appear as a scrollable strip; tap to reopen' },
      { type: 'feature', text: 'Ascended Heroes ME era RH — Pokémon get Poké Ball + Energy pattern variants, Trainers get 1 standard RH' },
      { type: 'feature', text: 'Settings accordion slide animation — smooth expand/collapse in the drawer' },
      { type: 'feature', text: 'Settings repositioned above Check for Updates in the drawer' },
      { type: 'fix', text: 'Base mode showing promo alt-art duplicates for sets like Ascended Heroes' },
      { type: 'fix', text: 'Masterset inflated card count caused by undeduped promo entries in card cache' },
    ],
  },
  {
    version: 'V2.0 Ivysaur',
    date: 'May 2026',
    entries: [
      { type: 'feature', text: 'Base / Masterset / Grand Master set modes' },
      { type: 'feature', text: 'Correct reverse holo logic — RH cards paired next to base card' },
      { type: 'feature', text: 'Grand Master: Poké Ball + Master Ball pattern variants for SV era sets' },
      { type: 'feature', text: 'Remove set from collection (trash icon in set header)' },
      { type: 'feature', text: 'Set browser redesigned — 3-column grid, tap to open' },
      { type: 'feature', text: 'Set tracker — 4-column card grid, number/name left, dots right' },
      { type: 'feature', text: 'Single tap marks owned only — long press to remove' },
      { type: 'feature', text: 'Check for Updates button in menu' },
      { type: 'feature', text: 'Settings section collapsible with categories' },
      { type: 'feature', text: 'Nav items as 2-col icon grid' },
      { type: 'fix', text: 'Set not found when opening from Home screen' },
      { type: 'fix', text: 'Set stuck in In Progress with 0 owned cards' },
      { type: 'fix', text: 'Long press triggering image save menu on mobile' },
    ],
  },
  {
    version: 'V1.3 Bulbasaur',
    date: 'May 2026',
    entries: [
      { type: 'feature', text: 'National Pokédex — 2-column horizontal card layout' },
      { type: 'feature', text: 'Pokédex — search bar, filter tabs with counts, gen headers redesigned' },
      { type: 'feature', text: 'Home — Pokédex widget with stat boxes (Owned / Missing / Complete)' },
      { type: 'feature', text: 'HelpSheet lifted out of drawer — independent dismiss' },
      { type: 'feature', text: 'PWA back gesture — in-app navigation hook' },
      { type: 'fix', text: 'Pull-to-refresh disabled (overscroll-behavior: none)' },
      { type: 'fix', text: 'Light mode CSS broken by hardcoded rgba whites' },
      { type: 'fix', text: 'Bottom-sheet overlays floating in center of screen' },
    ],
  },
  {
    version: 'V1.1 Bulbasaur',
    date: 'May 2026',
    entries: [
      { type: 'feature', text: 'CardDetailPopup redesign — type badges, price range bar, purchase price input' },
      { type: 'feature', text: 'Share collection — QR code + public guest view at /guest/:uid' },
      { type: 'feature', text: 'SetSelector redesign — set logos, progress bars, era badges' },
      { type: 'fix', text: 'App.jsx guest route using window.location instead of useLocation' },
      { type: 'fix', text: 'Firestore rules created for publicProfiles collection' },
    ],
  },
  {
    version: 'V1.0 Bulbasaur',
    date: 'April 2026',
    entries: [
      { type: 'feature', text: 'Initial release — National Pokédex, Set Tracker, Home screen' },
      { type: 'feature', text: 'Firebase Auth + Firestore + IndexedDB sync' },
      { type: 'feature', text: 'PWA — installable, offline-capable' },
      { type: 'feature', text: 'Local mode (no account required)' },
      { type: 'feature', text: 'TCG API integration with 3-tier caching' },
    ],
  },
]

export default function ChangelogSheet({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`${styles.sheet} animate-slide-up`} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
          <span className={styles.title}>What's New</span>
          <div style={{ width: 32 }} />
        </div>

        <div className={styles.scroll}>
          {CHANGELOG.map((release, i) => (
            <div key={release.version} className={styles.release}>
              <div className={styles.releaseHeader}>
                <span className={`${styles.version} ${i === 0 ? styles.versionLatest : ''}`}>
                  {release.version}
                </span>
                <span className={styles.date}>{release.date}</span>
              </div>
              <div className={styles.entries}>
                {release.entries.map((entry, j) => (
                  <div key={j} className={styles.entry}>
                    <span className={`${styles.tag} ${entry.type === 'fix' ? styles.tagFix : styles.tagFeature}`}>
                      {entry.type === 'fix' ? 'Fix' : 'New'}
                    </span>
                    <span className={styles.entryText}>{entry.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  )
}

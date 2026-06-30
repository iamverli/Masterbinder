# MasterBinder — Project Handout
**V3.0 Venusaur · June 2026**

This document is a complete reference for the MasterBinder codebase. It is intended for a fresh Claude session that has no prior context on this project.

---

## What is MasterBinder?

MasterBinder is a Pokémon TCG collection tracker built as a Progressive Web App (PWA). It is built for **Blue Moon Collectibles**, a card store in Tirana, Albania (owner: Endri). The live URL is `https://bluemoontracker.netlify.app`.

Users can:
- Track their **National Pokédex** completion (which Pokémon they own a card of)
- Track **Set completion** in Base, Masterset, or Grand Master mode
- **Share** their collection or individual sets via QR code / link
- Install the app on their phone and use it **offline**
- Sign in with Google to **sync to the cloud**, or use **local mode** (no account)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Styling | CSS Modules |
| Auth | Firebase Auth (Google) |
| Cloud DB | Firestore |
| Local DB | IndexedDB via `idb` library |
| PWA | vite-plugin-pwa (Workbox) |
| TCG Data | Pokémon TCG API (dev.pokemontcg.io) |
| Hosting | Netlify |

---

## Architecture Overview

### Three-Tier Card Cache
Card data is fetched once and cached at three levels:
1. **IndexedDB** (`cardCache` store) — checked first, fastest
2. **Firestore** (`cache/pokemon/sets/{setId}`) — shared across all users; checked if IDB is empty
3. **TCG API** — only hit on a true cache miss; result is written back to both caches

This means each set's card list is fetched from the API exactly once, ever (globally).

### Data Sync Model
- **Local-first optimistic writes**: every user action writes to IndexedDB immediately, then syncs to Firestore asynchronously
- **Last-write-wins** conflict resolution via `updatedAt` ISO timestamp on every set record
- `determineSyncDirection()` in `syncService.js` compares timestamps per set; falls back to count comparison if no timestamps exist
- `pullFromCloud()` only overwrites a local set if the cloud version is newer or equal (never wipes newer local data)
- `pushToCloud()` uploads all local data to Firestore

### PWA
- `registerType: 'prompt'` — new service workers wait for user approval; a "🆕 New version available / Update" toast appears
- Workbox caches: PokeAPI sprites (CacheFirst, 1 year), card images (CacheFirst, 30 days), all app assets (precache)
- Offline: IndexedDB covers all user data; card images served from cache; degraded banner shown if TCG API unreachable

---

## Set Modes

Each set has three possible modes (not all sets support all three):

| Mode | Contents |
|---|---|
| **Base** | Cards numbered 1–printedTotal, deduped by number |
| **Masterset** | All cards (including secret rares) + reverse holo variants |
| **Grand Master** | Masterset + Poké Ball + Master Ball pattern variants (SV era only) |

### Reverse Holo Rules by Era

| Era | Sets | Pokémon RH | Trainer/Energy RH | Grand Master? |
|---|---|---|---|---|
| SV era | `sv*` prefix | Standard `_rh` | Standard `_rh` | ✅ PB + MB |
| ME era | `me2pt5` | PB `_rh_pb` + Energy `_rh_energy` | Standard `_rh` | ❌ |
| Other | All others | Standard `_rh` | Standard `_rh` | ❌ |

Era config lives in `SET_ERA_CONFIG` in `SetTracker.jsx`. Adding a new era exception is one line:
```js
const SET_ERA_CONFIG = {
  me2pt5: 'me',
  // newSetId: 'era-key',
}
```

### Ownership Arrays (stored per set in IndexedDB + Firestore)
- `baseOwned[]` — regular card IDs (base + secret rares)
- `masterOwned[]` — standard reverse holo IDs (`cardId_rh`)
- `grandMasterOwned[]` — pattern variant IDs (`cardId_rh_pb`, `cardId_rh_mb`, `cardId_rh_energy`)

### Card Deduplication
The TCG API returns promo/alt-art variants that share a number with regular base cards. Both pass the `n <= printedTotal` filter. `dedupeByNumber()` in `SetTracker.jsx` removes duplicates, keeping the first occurrence. Applied to both `cards.base` and `cards.master` before display.

---

## IndexedDB Schema

**DB name:** `masterbinder` | **Current version:** 3

| Store | Key | Value |
|---|---|---|
| `profile` | `'current'` | `{ uid, displayName, email, avatarBase64? }` |
| `pokedex` | `'owned'` | `{ "001": { cardId, setId, ... }, ... }` |
| `userSets` | `setId` | `{ setId, setName, series, baseOwned, masterOwned, grandMasterOwned, updatedAt, ... }` |
| `cardCache` | `setId` | `{ base: [...], master: [...] }` |
| `guestTrainers` | `guestId` | guest trainer snapshot |
| `savedShares` | `${uid}_${setId}` | `{ uid, setId, trainerName, setName, setImage, visitedAt }` |
| `meta` | string key | misc metadata (`lastSync`, `theme`, `localMode`, etc.) |

---

## Firestore Schema

```
users/{uid}/
  (root doc)             — profile: { displayName, email, avatarBase64?, updatedAt }
  data/pokedex           — { owned: { "001": {...}, ... }, updatedAt }
  sets/{setId}           — { setId, setName, series, baseOwned, masterOwned, addedAt, updatedAt }
  guestTrainers/{id}     — { displayName, pokedex, createdAt }

cache/pokemon/sets/{setId}  — shared card cache: { data: { base, master }, cachedAt }
cache/pokemon/cards/{id}    — individual card cache

publicProfiles/{uid}        — public share snapshot: { displayName, pokedexOwned: {"001":true,...}, sets: {...}, updatedAt }
```

**publicProfiles** is public-read, owner-write only. The `pokedexOwned` field stores keys only (`{ "001": true }`) — no card objects — to minimise document size.

---

## Key Files

### Screens
| File | Purpose |
|---|---|
| `src/screens/Landing.jsx` | Login screen + app version constant (`APP_VERSION`) |
| `src/screens/Home.jsx` | Home dashboard — set cards, Pokédex widget |
| `src/screens/SetTracker.jsx` | Set tracking screen — the largest/most complex file |
| `src/screens/NationalPokedex.jsx` | Pokédex grid — 1025 Pokémon |
| `src/screens/GuestView.jsx` | Public share landing (`/guest/:uid`) |
| `src/screens/GuestSetView.jsx` | Public share set view (`/guest/:uid/set/:setId`) |
| `src/screens/SetSelector.jsx` | Set browser for adding new sets |

### Components
| File | Purpose |
|---|---|
| `src/components/common/LeftDrawer.jsx` | Side drawer — profile, Trainer Cards strip, settings, backup |
| `src/components/common/ShareSheet.jsx` | Share bottom sheet — QR code + link |
| `src/components/common/UpdateToast.jsx` | PWA update notification toast |
| `src/components/common/ErrorBoundary.jsx` | React error boundary — top-level (full screen) and nested (inline) |
| `src/components/common/ChangelogSheet.jsx` | What's New bottom sheet |
| `src/components/common/HelpSheet.jsx` | How to use app bottom sheet |

### Services / Data
| File | Purpose |
|---|---|
| `src/config.js` | `APP_BASE_URL = 'https://bluemoontracker.netlify.app'` — single source of truth |
| `src/db/indexeddb.js` | All IndexedDB operations; `getDB()`, `idbPut*`, `idbGet*` functions |
| `src/firebase/firestore.js` | All Firestore operations; `updateSetOwned`, `writePublicSnapshot`, etc. |
| `src/services/syncService.js` | Sync orchestration — `determineSyncDirection`, `pullFromCloud`, `pushToCloud`, optimistic write helpers |
| `src/services/pokemonApi.js` | TCG API calls with 3-tier caching; degraded fallback returns `{ degraded: true }` |
| `src/context/AppContext.jsx` | Global state — `pokedex`, `sets`, `guests`; exposes `updateSet`, `addSet`, etc. |
| `src/context/AuthContext.jsx` | Auth state — `user`, `uid`, `isLocal`, `syncStatus` |

---

## Sharing Feature

### How it works
1. User taps ↗ in Set Tracker or Pokédex header
2. `ShareSheet` opens, publishes a snapshot to `publicProfiles/{uid}` in Firestore
3. Share URL is `APP_BASE_URL/guest/:uid` (collection) or `APP_BASE_URL/guest/:uid/set/:setId` (set)
4. Guest opens the link → `GuestView` or `GuestSetView` loads the public snapshot
5. `GuestSetView` auto-saves to `savedShares` in the guest's IndexedDB on first visit

### Saved Shares (Trainer Cards strip)
- Stored in `savedShares` IndexedDB store, keyed by `${uid}_${setId}`
- `LeftDrawer` shows 4 most recent as a horizontal scroll strip
- Tap `›` to open a full grid of all saved shares
- Tap 🗑 in the opened set view to remove a saved share

---

## PWA Update Flow

1. Vite build produces a new service worker hash on any file change
2. On app load, the old SW checks for a new one in the background
3. If found, `needRefresh` becomes `true` in `UpdateToast.jsx`
4. User sees "🆕 New version available / Update" toast at the bottom
5. Tapping "Update" calls `updateServiceWorker(true)` → `skipWaiting` + page reload
6. `LeftDrawer` also has a "Check for Updates" button that manually polls the SW

---

## Error Handling

- **Top-level** `ErrorBoundary` in `main.jsx` wraps the whole app — shows a full-screen 🌙 recovery with "Reload app" button
- **Nested** `ErrorBoundary` in `SetTracker.jsx` wraps just the set view — shows an inline "Try again" banner
- **TCG API degraded**: `fetchSetCards` catches network/API errors and returns `{ base: [], master: [], degraded: true }` instead of throwing. SetTracker shows an amber warning banner; ownership data is unaffected.
- **Firestore failures**: all cloud writes are fire-and-forget with `.catch()` logging — local data is never blocked by cloud errors

---

## iOS Considerations

- iOS Safari in standalone PWA mode: deleting the app from the home screen **wipes IndexedDB**
- A warning is shown in `LeftDrawer` Settings > Backup & Sync when `isLocal && isIOSStandalone`
- `isIOSStandalone = /iPad|iPhone|iPod/.test(navigator.userAgent) && window.navigator.standalone === true`

---

## Version History

| Version | Name | Key Changes |
|---|---|---|
| V3.0 | Venusaur | Tap-to-update PWA, iOS warning, degraded offline mode, last-write-wins sync, era config refactor, crash recovery, slim Firestore snapshots |
| V2.1 | Ivysaur | Per-set sharing, guest set view, Trainer Cards strip, ME era RH (Ascended Heroes), card dedup fix |
| V2.0 | Ivysaur | Base/Masterset/Grand Master modes, reverse holo logic, set remove, 4-col grid |
| V1.3 | Bulbasaur | National Pokédex, Pokédex search/filter, home Pokédex widget |
| V1.1 | Bulbasaur | CardDetailPopup redesign, share collection, QR code |
| V1.0 | Bulbasaur | Initial release — Pokédex, Set Tracker, Firebase sync, PWA, local mode |

---

## Crosscheck Protocol

When Endri says "crosscheck [Set Name]", do the following:

1. Look up the set on Bulbapedia or the TCG API to confirm: set ID, printedTotal, era, which cards are Pokémon vs Trainer vs Energy, what RH rules apply
2. List any fixes needed for `SET_ERA_CONFIG`, `getPatternVariants()`, or ownership array logic
3. **Do not build anything** — present the findings and wait for "fix [set name]" to proceed

---

## Working Rules (established by Endri)

- **Always ask before building** — do not start implementation without explicit go-ahead
- **Always ask before bumping DB_VERSION** in `indexeddb.js`
- **Crosscheck protocol**: research only → findings list → wait for "fix" command before touching code
- Keep responses concise — no unnecessary summaries

---

## Pending / On Hold

| Item | Status | Notes |
|---|---|---|
| Check Store feature | On hold | Blue Moon singles lookup via Primalt API. Need API endpoint, auth, field names from store. Endri to ask Primalt. |

All tasks #1–#13 from the premortem task list are complete as of V3.0.

---

## Store Info

- **Blue Moon Collectibles** — Tirana, Albania
- Store URL: `https://bluemooncollectibles.com`
- Singles shop URL: `https://bluemooncollectibles.com/en/shop?category=019cd83c-f6a5-7264-91fb-3ab430e9596e&subcategory=019d2569-0894-70c8-8747-64b650b864d0`
- Platform: Primalt (18 items/page)
- The "Check Store" feature would cross-reference missing cards with in-store singles availability and show a red dot on Pokémon that can be found in store

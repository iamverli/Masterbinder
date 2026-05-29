# MasterBinder — Confirmed Decisions

_Last updated: 2026-05-28_

---

## App Identity
- **Name**: MasterBinder
- **Owned by**: Endri (personal project)
- **Distribution**: QR code at local stores in Tirana, Albania (Blue Moon Collectibles and one other)
- **Branding**: Blue Moon Collectibles mascot + logo appears on splash/onboarding only — partnership nod, not store-branded
- **Purpose**: PWA for tracking Pokémon card collections. Small user base — quality and reliability over scale.

---

## Core Modes

### National Pokédex Binder
- One slot per Pokémon, #001–#1025 (Gen 1–9)
- One card per slot (one representative card fills the slot)
- User records which card fills it (set, number, name)

### Set Tracker
- User searches and adds any set they want to track
- Two checklists per set:
  - **Base set** — standard numbered cards (1 to X)
  - **Masterset** — full official checklist as in ETB booklets (reverse holos, full arts, secret rares — everything with an official number)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React PWA |
| Hosting | Netlify (auto-deploy from GitHub) |
| Auth | Firebase Auth |
| Database | Firestore (source of truth) + IndexedDB (offline cache) |
| Card data | Scrydex API (scrydex.com — formerly pokemontcg.io) → cached in Firestore. Free tier: 5,000 req/month. API key from scrydex.com |

**Architecture rule:** Firestore is always source of truth. IndexedDB is always the cache. Never reversed.

---

## Auth
- Google login (primary — one tap)
- Email + password (fallback)
- No other providers

---

## UI Style
- Clean & minimal

---

## Storage
- Local-first via IndexedDB (works offline at the card shop)
- Cloud sync via Firestore
- Manual JSON export/import for backup
- **Custom card images**: Stored as compressed base64 strings in Firestore (no Firebase Storage — stays on free Spark plan). Images are compressed client-side before saving. Target: well under 200KB per image after compression.

## Firebase Config
- Project ID: `masterbinder-7c1b1`
- Auth domain: `masterbinder-7c1b1.firebaseapp.com`
- Region: `europe-west3` (Frankfurt)
- Plan: Spark (free) — no Firebase Storage
- Analytics: enabled (measurementId: G-4WSBNE9Q8G)

---

## Engineering Principles
- Optimistic UI with rollback on sync failure
- No data deletion without confirmation
- Every feature ships with loading, error, and empty states
- Auth required before any data access — no anonymous sessions
- TCG API data fetched once, cached in Firestore — no repeated external calls

---

## Visual Direction

- **Mode**: Dark first
- **Background**: Deep dark navy (references Blue Moon mascot body color)
- **Accent**: Yellow/gold (references mascot lightning bolts, Pokémon energy palette)
- **Cards**: Dark slate tiles, slightly lighter than background, large border radius, subtle elevation
- **Typography**: Bold display numbers for stats, clean sans-serif for UI text
- **Progress**: Circular rings for Pokédex completion, horizontal bars for set completion
- **Border radius**: Large and consistent — rounded everywhere (cards, buttons, badges)
- **Mascot**: Blue Moon Collectibles character used in empty states and onboarding only
- **Header pattern**: Greeting — "Hi, Endri!" — personal and warm

## Landing Screen (QR entry point)

Three entry points:
- **"Add Trainer"** — create new account (Trainer terminology used here only)
- **Sign in** — Google or email, pulls existing cloud data
- **Continue Locally** — no account, use app immediately, sync later at any time

Bottom of screen: Blue Moon Collectibles logo + app version string.

### Sync Logic
- **Local → Cloud**: User starts locally, later signs in → local data has priority, writes up to cloud
- **Cloud → Local**: Fresh sign in / new device → no local data, cloud pulls down and fills app
- Local never gets overwritten. Cloud never overwrites a user who has local data.

### "Trainer" Terminology
- Used only on the landing screen ("Add Trainer" button)
- Rest of the app uses neutral language: profile, account, settings

---

## Version Naming System

Pokédex-ordered Pokémon names as version codenames:
- Major releases: V1.0 Bulbasaur → V2.0 Ivysaur → V3.0 Venusaur → ...
- Patch releases: V1.1 Bulbasaur, V1.2 Bulbasaur (same Pokémon, minor fixes)
- On request, Claude outputs a formatted version bump with version string and changelog format

---

## National Pokédex Screen

**Header**
← Back | National Pokédex | Share (generates QR of collection snapshot)

**Stats bar**
Owned · Missing · Completed %

**Controls row**
[All] [Owned] [Missing] ———— [Expand All / Collapse All]

**Generation groups — stacked card style (like receipt stack UI)**
Each gen = a stacked header card with gradient fading down into card grid
- Left: Generation name + total Pokémon count
- Right: Stats (update live with filter)
- Below: 3-column Pokémon grid

**Generation colors**
- Gen I Kanto: Scarlet `#B71C1C`
- Gen II Johto: Copper `#BF6900`
- Gen III Hoenn: Emerald `#1B5E20`
- Gen IV Sinnoh: Sapphire `#1A237E`
- Gen V Unova: Deep Teal `#006064`
- Gen VI Kalos: Royal Indigo `#311B92`
- Gen VII Alola: Burnt Orange `#E64A19`
- Gen VIII Galar: Violet `#6A1B9A`
- Gen IX Paldea: Rose `#880E4F`

### Card Tile
- Pokémon sprite + name + Pokédex number
- Owned → full color / Missing → dimmed
- **Tap** → mark as owned (instant, optimistic UI)
- **Long press** → "Are you sure?" swipe-to-confirm slider to remove
- **⋮ (3 dots)** → opens Card Selector popup

### Card Selector Popup
**Header**: Pokémon name
**Filters**: Language selector (EN, JP, FR, DE, IT, ES, PT, KR, CN) + Black Star Promo toggle
**Search bar**: filters card grid as you type
**Card grid**: 4 columns — card image + set name + set number below each
**"Search availability on store"**: redirects to Blue Moon Collectibles — `https://www.bluemooncollectibles.com/en/shop?query={pokemonName}`
**"Add your own"**: upload from gallery → crop tool → auto-compressed silently, no size shown
**"Take a photo"**: camera capture → same crop/resize flow → same output size as uploads

### Share Feature (QR)
- Generates a live share link (not a snapshot) — requires cloud account
- Recipient scans QR → app opens → creates read-only guest trainer
- Guest trainers persist until manually deleted
- Multiple guest trainers supported
- Viewing a guest: their owned cards = their color, cards you reserved for them = your accent color
- Reserved card they found elsewhere and marked owned = **glowing red** (stand down signal)
- Your overlay is local only, never syncs

---

## Open / In Progress
- Set Tracker screen
- Left drawer menu
- Profile / settings screen
- Bottom navigation structure

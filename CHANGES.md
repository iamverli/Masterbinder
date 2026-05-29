# MasterBinder — Changes List

> Add ideas here during brainstorm sessions. Star (⭐) items = priority. Check off when built.

---

## Queued

### 1. Fix Share + Per-Set & Pokédex Sharing *(moved to next build)*

---

## Built in V1.3

### 11. Disable pull-to-refresh
- [ ] Add `overscroll-behavior: none` to body and main scroll containers in `index.css`

### 10. PWA back gesture — in-app navigation
- [ ] Custom `useAppBack(parentRoute)` hook that intercepts `popstate`
- [ ] Pushes a dummy history entry on screen mount so there's always something to pop
- [ ] On back gesture/button: cancel browser default, navigate to logical parent
- [ ] `/pokedex` → `/`, `/sets/:setId` → `/`, all others → `/`
- [ ] Works for iOS swipe-back and Android back button

### 9. SetTracker — 2-column card grid
- [ ] Switch card grid from single column to 2 columns
- [ ] Cards resize to fit — image, number, name, owned indicator all adapt

### 8. HelpSheet — Lift out of drawer, independent dismiss
- [ ] "How to use" in drawer closes the drawer and opens HelpSheet separately at screen level
- [ ] HelpSheet has X button to close
- [ ] Tapping outside HelpSheet closes only the sheet, not the drawer

### 7. SetTracker — Hold to remove card ownership
- [ ] Long-press / hold on an owned card triggers swipe-to-confirm removal (same pattern as Pokédex)
- [ ] Applies to both base and masterset cards

### 6. SetTracker — Masterset mode adds cards, not replaces
- [ ] Base set always visible as the foundation
- [ ] Toggling masterset ON adds the extra cards (secret rares, promos, etc.) on top of base
- [ ] Toggling masterset OFF removes the extras, keeps base intact
- [ ] Progress counts update accordingly (base only vs base + extras)

### 5. National Pokédex — Search bar
- [ ] Add search input between stats and All/Owned/Missing filter tabs
- [ ] Filters the Pokémon list by name or dex number as user types

### 4. National Pokédex — Full layout redesign
- [ ] Switch from square tile grid → 2-column horizontal card list
- [ ] Card: sprite in dark square (left) · dex number + name stacked (center) · `• • •` dots (right)
- [ ] Gen header: amber `GEN X` pill · title + region/range subtitle · owned/missing count (amber) + short progress bar + collapse arrow
- [ ] Filter tabs: active tab gets amber pill fill + shows count ("Missing 82", "Owned 943")
- [ ] `PokemonTile.jsx` replaced by inline card in `NationalPokedex.jsx`
- [ ] Full restyle of `NationalPokedex.module.css`

### 3. PokemonTile — Missing card dimming + dots visibility
- [ ] `.spriteDimmed` opacity: `0.25` → `0.20` (80% visible)
- [ ] `.dots` color: `#94a3b8`, font-size: `16px`, font-weight: `700` — no background, no border

### 2. National Pokédex Home Widget Redesign
- [ ] Circular icon (dark + gold border) + title "National Pokédex" + subtitle "Gen I – IX · All Regions"
- [ ] Three stat boxes: OWNED (green), MISSING (red-orange), COMPLETE (gold/%)
- [ ] Full-width gold progress bar along bottom of card
- [ ] Gold/amber border on the whole card
- [ ] Changes only in `Home.jsx` pokedexCard block + `Home.module.css`

### 1. Fix Share + Per-Set & Pokédex Sharing
- [ ] Deploy Firestore rules (`firebase deploy --only firestore:rules`) — fixes broken share immediately
- [ ] Store `baseOwned`/`masterOwned` arrays in public snapshot (not just counts)
- [ ] New route `/guest/:uid/set/:setId` + `GuestSetView.jsx` — guest card grid for a single set
- [ ] `ShareSheet` accepts optional `setId` prop → changes URL to per-set route
- [ ] Share button in `SetTracker` header → per-set share
- [ ] Share button in `NationalPokedex` header → full collection share

## Done

- [x] #11 Disable pull-to-refresh (`overscroll-behavior: none`)
- [x] #3 PokemonTile — dimming 0.20, bolder dots
- [x] #2 Home — Pokédex widget redesign (stat boxes, amber border, progress bar)
- [x] #8 HelpSheet — lifted out of drawer, independent dismiss
- [x] #4 + #5 National Pokédex — 2-col layout, new gen headers, search bar, filter counts
- [x] #9 SetTracker — 2-column card grid
- [x] #6 SetTracker — masterset adds base + extras (not replaces)
- [x] #7 SetTracker — hold to remove (already wired, confirmed)
- [x] #10 PWA back gesture — `useAppBack` hook in Pokédex + SetTracker

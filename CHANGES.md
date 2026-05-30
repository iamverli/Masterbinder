# MasterBinder — Changes List

> Add ideas here during brainstorm sessions. Star (⭐) items = priority. Check off when built.

---

## Session 2 — Queued

### 2. Base Set / Master Set — correct data model ⭐
- [ ] Base Set = ALL API cards (numbered 1–printedTotal + secret rares) — use `cards.master` as base display
- [ ] Master Set = Base Set + synthetic reverse holo entries (`${cardId}_rh`) for every card ≤ printedTotal
- [ ] `baseOwned` tracks standard versions of all cards
- [ ] `masterOwned` tracks reverse holo versions (masterset mode only)
- [ ] Update `fetchSetCards` split logic and owned count calculations
- [ ] Reverse holo entries share card image, flagged as RH in rarity label

### 1. Fix Share + Per-Set & Pokédex Sharing
- [ ] Deploy Firestore rules (`firebase deploy --only firestore:rules`) — fixes broken share immediately
- [ ] Store `baseOwned`/`masterOwned` arrays in public snapshot (not just counts)
- [ ] New route `/guest/:uid/set/:setId` + `GuestSetView.jsx` — guest card grid for a single set
- [ ] `ShareSheet` accepts optional `setId` prop → changes URL to per-set route
- [ ] Share button in `SetTracker` header → per-set share
- [ ] Share button in `NationalPokedex` header → full collection share

---

## Session 2 — Built (Live session fixes)
- [x] Pokédex dots clipping on right column — reduced sprite box + tighter gaps
- [x] Card image portrait fit — `spriteBoxCard` class, no black padding
- [x] All gens expanded by default on Pokédex load
- [x] SetSelector — 3-column grid, no + / › buttons, tap to open
- [x] SetTracker — 4-column card grid
- [x] SetTracker card tile — number + name left, dots right, below image
- [x] SetTracker — single tap only marks as owned, long press required to remove
- [x] SetTracker — "Set not found" fix (loading guard + key fallback in AppContext)

---

## Session 1 — Done (V1.3 Bulbasaur)
- [x] Disable pull-to-refresh (`overscroll-behavior: none`)
- [x] PokemonTile — dimming 0.20, bolder dots
- [x] Home — Pokédex widget redesign (stat boxes, amber border, progress bar)
- [x] HelpSheet — lifted out of drawer, independent dismiss
- [x] National Pokédex — 2-col layout, new gen headers, search bar, filter counts
- [x] SetTracker — masterset adds base + extras (not replaces)
- [x] SetTracker — hold to remove wired
- [x] PWA back gesture — `useAppBack` hook in Pokédex + SetTracker

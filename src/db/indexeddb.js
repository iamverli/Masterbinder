/**
 * IndexedDB — offline cache layer
 *
 * MasterBinder always reads/writes Firestore as source of truth.
 * IndexedDB is a local mirror that makes the app work offline.
 *
 * Stores:
 *   profile     — { uid, displayName, email, avatarBase64? }
 *   pokedex     — { uid, owned: { "001": {...}, ... } }
 *   userSets    — keyed by setId: { setId, setName, series, baseOwned, masterOwned }
 *   cardCache   — keyed by setId: cached TCG API card data for that set
 *   guestTrainers — keyed by guestId: guest trainer snapshot
 *   meta        — app metadata: { lastSync, onboardingDone, localUserId }
 */

import { openDB } from 'idb'

const DB_NAME = 'masterbinder'
const DB_VERSION = 3 // v3: added savedShares store

// Cache the PROMISE (not the resolved value) so concurrent calls
// before the first resolves all share the same openDB call.
let _dbPromise = null

export function getDB() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile')
        }
        if (!db.objectStoreNames.contains('pokedex')) {
          db.createObjectStore('pokedex')
        }
        if (!db.objectStoreNames.contains('userSets')) {
          db.createObjectStore('userSets')
        }
        if (!db.objectStoreNames.contains('cardCache')) {
          db.createObjectStore('cardCache')
        }
        if (!db.objectStoreNames.contains('guestTrainers')) {
          db.createObjectStore('guestTrainers')
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
        }
        if (!db.objectStoreNames.contains('savedShares')) {
          db.createObjectStore('savedShares')
        }
      },
    })
  }
  return _dbPromise
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function idbGetProfile() {
  const db = await getDB()
  return db.get('profile', 'current')
}

export async function idbSetProfile(data) {
  const db = await getDB()
  await db.put('profile', data, 'current')
}

// ── Pokédex ───────────────────────────────────────────────────────────────────

export async function idbGetPokedex() {
  const db = await getDB()
  const data = await db.get('pokedex', 'owned')
  return data || {}
}

export async function idbSetPokedex(ownedMap) {
  const db = await getDB()
  await db.put('pokedex', ownedMap, 'owned')
}

export async function idbSetPokedexCard(dexNumber, cardData) {
  const existing = await idbGetPokedex()
  existing[dexNumber] = cardData
  await idbSetPokedex(existing)
}

export async function idbRemovePokedexCard(dexNumber) {
  const existing = await idbGetPokedex()
  delete existing[dexNumber]
  await idbSetPokedex(existing)
}

// ── Sets ──────────────────────────────────────────────────────────────────────

export async function idbGetAllSets() {
  const db = await getDB()
  const keys = await db.getAllKeys('userSets')
  const result = {}
  for (const key of keys) {
    result[key] = await db.get('userSets', key)
  }
  return result
}

export async function idbGetSet(setId) {
  const db = await getDB()
  return db.get('userSets', setId)
}

export async function idbPutSet(setId, data) {
  const db = await getDB()
  await db.put('userSets', data, setId)
}

export async function idbDeleteSet(setId) {
  const db = await getDB()
  await db.delete('userSets', setId)
}

// ── Card cache (TCG API responses) ────────────────────────────────────────────

export async function idbGetCardCache(setId) {
  const db = await getDB()
  return db.get('cardCache', setId)
}

export async function idbPutCardCache(setId, data) {
  const db = await getDB()
  await db.put('cardCache', data, setId)
}

// ── Saved shares (visited guest set links) ────────────────────────────────────
//
// Key: `${uid}_${setId}`
// Value: { uid, setId, trainerName, setName, setImage, visitedAt }

export async function idbGetAllSavedShares() {
  const db = await getDB()
  const keys = await db.getAllKeys('savedShares')
  const result = []
  for (const key of keys) {
    result.push(await db.get('savedShares', key))
  }
  return result.sort((a, b) => new Date(b.visitedAt) - new Date(a.visitedAt))
}

export async function idbPutSavedShare(uid, setId, data) {
  const db = await getDB()
  await db.put('savedShares', { uid, setId, ...data }, `${uid}_${setId}`)
}

export async function idbDeleteSavedShare(uid, setId) {
  const db = await getDB()
  await db.delete('savedShares', `${uid}_${setId}`)
}

// ── Guest trainers ────────────────────────────────────────────────────────────

export async function idbGetAllGuests() {
  const db = await getDB()
  const keys = await db.getAllKeys('guestTrainers')
  const result = {}
  for (const key of keys) {
    result[key] = await db.get('guestTrainers', key)
  }
  return result
}

export async function idbPutGuest(guestId, data) {
  const db = await getDB()
  await db.put('guestTrainers', data, guestId)
}

export async function idbDeleteGuest(guestId) {
  const db = await getDB()
  await db.delete('guestTrainers', guestId)
}

// ── Meta ──────────────────────────────────────────────────────────────────────

export async function idbGetMeta(key) {
  const db = await getDB()
  return db.get('meta', key)
}

export async function idbSetMeta(key, value) {
  const db = await getDB()
  await db.put('meta', value, key)
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export async function idbGetTheme() {
  return (await idbGetMeta('theme')) || 'dark'
}

export async function idbSetTheme(theme) {
  await idbSetMeta('theme', theme)
}

// Apply theme to <html> element — call once on app boot
export async function applyStoredTheme() {
  const theme = await idbGetTheme()
  document.documentElement.setAttribute('data-theme', theme)
}

// ── Migration from old app (pb_ prefixed keys) ────────────────────────────────
//
// Old app structure (localStorage + IndexedDB with pb_ prefix):
//   pb_sets       → array of tracked sets with baseOwned / masterOwned arrays
//   pb_dex        → object: { "001": true, ... }
//   pb_dexCards   → object: { "001": { cardId, setId, ... } }
//   pb_prices     → object: { cardId: { market, purchased } }
//   pb_megaModes  → object: { setId: boolean } — masterset toggle state
//
// Migration maps these to our new schema and writes into IndexedDB.

export async function migrateFromOldApp() {
  try {
    const alreadyMigrated = await idbGetMeta('migrated_v1')
    if (alreadyMigrated) return { migrated: false, reason: 'already done' }

    // Check if old data exists in localStorage
    const hasOldData =
      localStorage.getItem('pb_sets') ||
      localStorage.getItem('pb_dex') ||
      localStorage.getItem('pb_dexCards')

    if (!hasOldData) {
      await idbSetMeta('migrated_v1', true)
      return { migrated: false, reason: 'no old data' }
    }

    console.log('[Migration] Old pb_ data detected — migrating...')

    // ── Pokédex migration ──────────────────────────────────────────────────
    const pbDex = JSON.parse(localStorage.getItem('pb_dex') || '{}')
    const pbDexCards = JSON.parse(localStorage.getItem('pb_dexCards') || '{}')

    const newOwned = {}
    for (const [num, owned] of Object.entries(pbDex)) {
      if (owned) {
        const paddedNum = num.padStart(3, '0')
        const cardDetail = pbDexCards[num] || pbDexCards[paddedNum] || {}
        newOwned[paddedNum] = {
          cardId: cardDetail.cardId || null,
          setId: cardDetail.setId || null,
          setName: cardDetail.setName || null,
          cardNumber: cardDetail.cardNumber || null,
          imageUrl: cardDetail.imageUrl || null,
          imageBase64: cardDetail.imageBase64 || null,
          migratedFrom: 'pb_dex',
        }
      }
    }

    if (Object.keys(newOwned).length > 0) {
      await idbSetPokedex(newOwned)
      console.log(`[Migration] Pokédex: ${Object.keys(newOwned).length} cards migrated`)
    }

    // ── Sets migration ─────────────────────────────────────────────────────
    const pbSets = JSON.parse(localStorage.getItem('pb_sets') || '[]')
    const pbMegaModes = JSON.parse(localStorage.getItem('pb_megaModes') || '{}')
    const pbPrices = JSON.parse(localStorage.getItem('pb_prices') || '{}')

    for (const set of pbSets) {
      const setId = set.id || set.setId
      if (!setId) continue

      const newSet = {
        setId,
        setName: set.name || set.setName || setId,
        series: set.series || null,
        releaseDate: set.releaseDate || null,
        baseOwned: Array.isArray(set.baseOwned)
          ? set.baseOwned
          : Array.isArray(set.owned)
            ? set.owned
            : [],
        masterOwned: Array.isArray(set.masterOwned) ? set.masterOwned : [],
        mastersetMode: pbMegaModes[setId] || false,
        prices: pbPrices[setId] || {},
        addedAt: set.addedAt || new Date().toISOString(),
        migratedFrom: 'pb_sets',
      }

      await idbPutSet(setId, newSet)
    }

    if (pbSets.length > 0) {
      console.log(`[Migration] Sets: ${pbSets.length} sets migrated`)
    }

    // Mark complete
    await idbSetMeta('migrated_v1', true)
    await idbSetMeta('migrationDate', new Date().toISOString())

    console.log('[Migration] Complete — old pb_ data preserved in localStorage until manual clear')

    return {
      migrated: true,
      pokedexCount: Object.keys(newOwned).length,
      setsCount: pbSets.length,
    }
  } catch (err) {
    console.error('[Migration] Failed:', err)
    return { migrated: false, error: err.message }
  }
}

// ── Export all local data as JSON (for manual backup) ─────────────────────────

export async function exportLocalData() {
  const profile = await idbGetProfile()
  const pokedex = await idbGetPokedex()
  const sets = await idbGetAllSets()
  const guests = await idbGetAllGuests()

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    profile,
    pokedex,
    sets,
    guestTrainers: guests,
  }
}

// ── Clear all local data ──────────────────────────────────────────────────────

export async function clearAllLocalData() {
  const db = await getDB()
  const tx = db.transaction(['profile', 'pokedex', 'userSets', 'cardCache', 'guestTrainers', 'savedShares', 'meta'], 'readwrite')
  await Promise.all([
    tx.objectStore('profile').clear(),
    tx.objectStore('pokedex').clear(),
    tx.objectStore('userSets').clear(),
    tx.objectStore('cardCache').clear(),
    tx.objectStore('guestTrainers').clear(),
    tx.objectStore('savedShares').clear(),
    tx.objectStore('meta').clear(),
  ])
  await tx.done
}

// ── Import from JSON backup ───────────────────────────────────────────────────

export async function importLocalData(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid backup file — not valid JSON')
  }

  // ── Legacy format (old app, version integer, users.* structure) ──────────
  if (typeof json.version === 'number' && json.users) {
    const userData = Object.values(json.users)[0]
    if (!userData) throw new Error('Invalid backup file — no user data found')

    // Convert dex array [1, 2, 25, ...] → { "001": { cardId, imageUrl, ... } }
    if (Array.isArray(userData.dex)) {
      const ownedMap = {}
      for (const num of userData.dex) {
        const padded = String(num).padStart(3, '0')
        const card = userData.dexCards?.[String(num)] || {}
        ownedMap[padded] = {
          cardId: card.id || null,
          setId: card.setId || null,
          setName: card.setName || null,
          cardNumber: card.number || null,
          imageUrl: card.imgSmall || null,
          imageBase64: null,
          isCustom: false,
          migratedFrom: 'legacy_v3',
        }
      }
      await idbSetPokedex(ownedMap)
    }

    // Sets are NOT imported — user opens them manually via + in SetSelector
    // This matches the intended UX: sets only appear on Home once cards are marked owned

    return // legacy import done
  }

  // ── Current format (version string "1.0", flat structure) ────────────────
  const hasUsableData = json.pokedex || json.sets || json.profile || json.guestTrainers
  if (!hasUsableData) {
    throw new Error('Invalid backup file — no recognizable data found')
  }

  if (json.profile) await idbSetProfile(json.profile)
  if (json.pokedex) await idbSetPokedex(json.pokedex)

  if (json.sets) {
    for (const [setId, setData] of Object.entries(json.sets)) {
      await idbPutSet(setId, setData)
    }
  }

  if (json.guestTrainers) {
    for (const [guestId, guestData] of Object.entries(json.guestTrainers)) {
      await idbPutGuest(guestId, guestData)
    }
  }
}

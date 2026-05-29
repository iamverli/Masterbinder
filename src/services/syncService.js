/**
 * Sync Service — bridges IndexedDB (local) ↔ Firestore (cloud)
 *
 * Rules:
 *  - Local data always has priority. Never overwrite local with cloud
 *    if the user already has local data.
 *  - Cloud → Local: only on fresh install (no local data present)
 *  - Local → Cloud: triggered manually or after sign-in
 *  - All writes are optimistic: local first, cloud async
 */

import {
  getProfile,
  setProfile,
  getPokedex,
  savePokedexBulk,
  getUserSets,
  addUserSet,
  updateSetOwned,
  uploadLocalData,
} from '../firebase/firestore'
import {
  idbGetProfile,
  idbSetProfile,
  idbGetPokedex,
  idbSetPokedex,
  idbGetAllSets,
  idbPutSet,
  idbGetMeta,
  idbSetMeta,
} from '../db/indexeddb'

// ── Pull cloud data into local (fresh install / new device) ───────────────────

export async function pullFromCloud(uid) {
  try {
    // Profile
    const cloudProfile = await getProfile(uid)
    if (cloudProfile) {
      await idbSetProfile(cloudProfile)
    }

    // Pokédex
    const cloudPokedex = await getPokedex(uid)
    if (cloudPokedex?.owned && Object.keys(cloudPokedex.owned).length > 0) {
      await idbSetPokedex(cloudPokedex.owned)
    }

    // Sets
    const cloudSets = await getUserSets(uid)
    for (const [setId, setData] of Object.entries(cloudSets)) {
      await idbPutSet(setId, setData)
    }

    await idbSetMeta('lastSync', new Date().toISOString())
    console.log('[Sync] Pulled from cloud successfully')
    return { success: true }
  } catch (err) {
    console.error('[Sync] Pull failed:', err)
    return { success: false, error: err.message }
  }
}

// ── Push local data up to cloud (local user signs in for the first time) ──────

export async function pushToCloud(uid) {
  try {
    const localProfile = await idbGetProfile()
    const localPokedex = await idbGetPokedex()
    const localSets = await idbGetAllSets()

    await uploadLocalData(uid, {
      profile: localProfile
        ? { ...localProfile, uid, syncedAt: new Date().toISOString() }
        : { uid, syncedAt: new Date().toISOString() },
      pokedex: Object.keys(localPokedex).length > 0 ? localPokedex : null,
      sets: Object.keys(localSets).length > 0 ? localSets : null,
    })

    await idbSetMeta('lastSync', new Date().toISOString())
    console.log('[Sync] Pushed to cloud successfully')
    return { success: true }
  } catch (err) {
    console.error('[Sync] Push failed:', err)
    return { success: false, error: err.message }
  }
}

// ── Determine sync direction on sign-in ───────────────────────────────────────
//
// Returns: 'push' | 'pull' | 'merge' | 'none'
//
// Logic:
//   - Compare counts: cloud wins if it has MORE data than local
//   - This protects against fresh installs overwriting cloud with empty local
//   - If local has more → push
//   - If equal and non-zero → push (local is up to date)
//   - Both empty → none

export async function determineSyncDirection(uid) {
  const [localPokedex, localSets, cloudPokedex, cloudSets] = await Promise.all([
    idbGetPokedex(),
    idbGetAllSets(),
    getPokedex(uid),
    getUserSets(uid),
  ])

  const localPokedexCount = Object.keys(localPokedex).length
  const localSetsCount = Object.keys(localSets).length
  const cloudPokedexCount = cloudPokedex?.owned
    ? Object.keys(cloudPokedex.owned).length
    : 0
  const cloudSetsCount = Object.keys(cloudSets).length

  // Cloud has more data → pull (fresh install, new device, or IDB was wiped)
  if (cloudPokedexCount > localPokedexCount || cloudSetsCount > localSetsCount) {
    return 'pull'
  }

  // Local has data → push
  if (localPokedexCount > 0 || localSetsCount > 0) return 'push'

  return 'none'
}

// ── Force restore — always pulls cloud over local ─────────────────────────────
// Called manually from the drawer when user wants to recover cloud data

export async function restoreFromCloud(uid) {
  return pullFromCloud(uid)
}

// ── Optimistic write — Pokédex card ───────────────────────────────────────────

export async function syncSetPokedexCard(uid, dexNumber, cardData) {
  // Write locally immediately (optimistic)
  const existing = await idbGetPokedex()
  existing[dexNumber] = cardData
  await idbSetPokedex(existing)

  // Write to cloud async (non-blocking)
  if (uid) {
    const { setPokedexCard } = await import('../firebase/firestore')
    setPokedexCard(uid, dexNumber, cardData).catch((err) =>
      console.error('[Sync] Pokedex card cloud write failed:', err)
    )
  }
}

export async function syncRemovePokedexCard(uid, dexNumber) {
  const existing = await idbGetPokedex()
  delete existing[dexNumber]
  await idbSetPokedex(existing)

  if (uid) {
    const { removePokedexCard } = await import('../firebase/firestore')
    removePokedexCard(uid, dexNumber).catch((err) =>
      console.error('[Sync] Pokedex card remove cloud write failed:', err)
    )
  }
}

// ── Optimistic write — Set ────────────────────────────────────────────────────

export async function syncUpdateSet(uid, setId, setData) {
  await idbPutSet(setId, setData)

  if (uid) {
    const { updateSetOwned } = await import('../firebase/firestore')
    updateSetOwned(uid, setId, {
      baseOwned: setData.baseOwned,
      masterOwned: setData.masterOwned,
    }).catch((err) => console.error('[Sync] Set cloud write failed:', err))
  }
}

export async function syncAddSet(uid, setId, setMeta) {
  await idbPutSet(setId, setMeta)

  if (uid) {
    const { addUserSet } = await import('../firebase/firestore')
    addUserSet(uid, setId, setMeta).catch((err) =>
      console.error('[Sync] Add set cloud write failed:', err)
    )
  }
}

export async function syncRemoveSet(uid, setId) {
  const { idbDeleteSet } = await import('../db/indexeddb')
  await idbDeleteSet(setId)

  if (uid) {
    const { removeUserSet } = await import('../firebase/firestore')
    removeUserSet(uid, setId).catch((err) =>
      console.error('[Sync] Remove set cloud write failed:', err)
    )
  }
}

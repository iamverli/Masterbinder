/**
 * Sync Service — bridges IndexedDB (local) ↔ Firestore (cloud)
 *
 * Rules:
 *  - Last write wins: each set carries an updatedAt ISO timestamp.
 *    On sync, the set with the newer timestamp takes precedence.
 *  - Cloud → Local: when cloud set is newer than local, or local is missing.
 *  - Local → Cloud: when local set is newer than cloud, or cloud is missing.
 *  - All writes are optimistic: local first, cloud async.
 *  - Falls back to count-based comparison when no timestamps are present.
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
  idbGetSet,
  idbPutSet,
  idbGetMeta,
  idbSetMeta,
} from '../db/indexeddb'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert a Firestore Timestamp object or ISO string to milliseconds.
function tsToMs(ts) {
  if (!ts) return 0
  if (typeof ts === 'string') return new Date(ts).getTime()
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  return 0
}

// ── Pull cloud data into local (last-write-wins per set) ──────────────────────

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

    // Sets — only overwrite local if cloud set is newer (last write wins)
    const cloudSets = await getUserSets(uid)
    for (const [setId, cloudSet] of Object.entries(cloudSets)) {
      const localSet = await idbGetSet(setId)
      if (!localSet) {
        // Not in local → always pull
        await idbPutSet(setId, cloudSet)
      } else {
        const cloudMs = tsToMs(cloudSet.updatedAt)
        const localMs = tsToMs(localSet.updatedAt)
        if (cloudMs >= localMs) {
          // Cloud is same age or newer → take cloud
          await idbPutSet(setId, cloudSet)
        }
        // else: local is newer → keep local (push will handle this)
      }
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
// Returns: 'push' | 'pull' | 'none'
//
// Strategy: last write wins via updatedAt timestamps.
//   - For each set present in both local and cloud, compare updatedAt.
//   - If any cloud set is newer → pull.
//   - If any local set is newer, or local has sets cloud doesn't → push.
//   - Falls back to count comparison when timestamps aren't available.

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

  // Both empty → nothing to do
  if (localPokedexCount === 0 && localSetsCount === 0 && cloudPokedexCount === 0 && cloudSetsCount === 0) {
    return 'none'
  }

  // Fresh install or IDB wiped → always pull from cloud
  if (localPokedexCount === 0 && localSetsCount === 0 && (cloudPokedexCount > 0 || cloudSetsCount > 0)) {
    return 'pull'
  }

  // New account with only local data → push
  if (cloudPokedexCount === 0 && cloudSetsCount === 0 && (localPokedexCount > 0 || localSetsCount > 0)) {
    return 'push'
  }

  // Both have data — compare set timestamps (last write wins)
  let cloudHasNewer = false
  let localHasNewer = false

  for (const [setId, cloudSet] of Object.entries(cloudSets)) {
    const localSet = localSets[setId]
    if (!localSet) {
      // Cloud has a set local doesn't → pull
      cloudHasNewer = true
      continue
    }
    const cloudMs = tsToMs(cloudSet.updatedAt)
    const localMs = tsToMs(localSet.updatedAt)
    if (cloudMs > localMs) cloudHasNewer = true
    else if (localMs > cloudMs) localHasNewer = true
  }

  for (const setId of Object.keys(localSets)) {
    if (!cloudSets[setId]) {
      // Local has a set cloud doesn't → push
      localHasNewer = true
    }
  }

  // Cloud wins ties when both are newer (shouldn't happen often, but safe default)
  if (cloudHasNewer && !localHasNewer) return 'pull'
  if (localHasNewer) return 'push'

  // No timestamp evidence — fall back to count comparison
  if (cloudPokedexCount > localPokedexCount || cloudSetsCount > localSetsCount) return 'pull'
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
  // Stamp updatedAt on every local write so conflict resolution has a timestamp
  const stamped = { ...setData, updatedAt: new Date().toISOString() }
  await idbPutSet(setId, stamped)

  if (uid) {
    const { updateSetOwned } = await import('../firebase/firestore')
    updateSetOwned(uid, setId, {
      baseOwned: stamped.baseOwned,
      masterOwned: stamped.masterOwned,
    }).catch((err) => console.error('[Sync] Set cloud write failed:', err))
  }
}

export async function syncAddSet(uid, setId, setMeta) {
  const stamped = { ...setMeta, updatedAt: new Date().toISOString() }
  await idbPutSet(setId, stamped)

  if (uid) {
    const { addUserSet } = await import('../firebase/firestore')
    addUserSet(uid, setId, stamped).catch((err) =>
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

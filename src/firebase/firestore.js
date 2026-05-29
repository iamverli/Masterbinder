/**
 * Firestore service layer
 *
 * Data model:
 *   users/{uid}/
 *     profile        — { displayName, email, avatarBase64?, createdAt }
 *     pokedex        — { owned: { "001": { cardId, setId, setName, imageBase64? }, ... } }
 *     sets/{setId}   — { setId, setName, series, baseOwned: [...], masterOwned: [...], addedAt }
 *     guestTrainers/{guestId} — { displayName, pokedex: { owned: {...} }, createdAt }
 *
 *   cache/pokemon/sets/{setId} — cached set card list from TCG API
 *   cache/pokemon/cards/{cardId} — cached individual card data
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'

// ── Helpers ───────────────────────────────────────────────────────────────────

function userRef(uid) {
  return doc(db, 'users', uid)
}

function pokedexRef(uid) {
  return doc(db, 'users', uid, 'data', 'pokedex')
}

function setRef(uid, setId) {
  return doc(db, 'users', uid, 'sets', setId)
}

function guestRef(uid, guestId) {
  return doc(db, 'users', uid, 'guestTrainers', guestId)
}

function cacheSetRef(setId) {
  return doc(db, 'cache', 'pokemon', 'sets', setId)
}

function cacheCardRef(cardId) {
  return doc(db, 'cache', 'pokemon', 'cards', cardId)
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(uid) {
  const snap = await getDoc(userRef(uid))
  return snap.exists() ? snap.data() : null
}

export async function setProfile(uid, data) {
  await setDoc(userRef(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function updateAvatar(uid, base64) {
  await updateDoc(userRef(uid), { avatarBase64: base64, updatedAt: serverTimestamp() })
}

// ── Pokédex ───────────────────────────────────────────────────────────────────

export async function getPokedex(uid) {
  const snap = await getDoc(pokedexRef(uid))
  return snap.exists() ? snap.data() : { owned: {} }
}

export async function setPokedexCard(uid, dexNumber, cardData) {
  // dexNumber: "001" | "025" etc.
  await setDoc(
    pokedexRef(uid),
    { owned: { [dexNumber]: cardData }, updatedAt: serverTimestamp() },
    { merge: true }
  )
}

export async function removePokedexCard(uid, dexNumber) {
  const snap = await getDoc(pokedexRef(uid))
  if (!snap.exists()) return
  const owned = snap.data().owned || {}
  delete owned[dexNumber]
  await setDoc(pokedexRef(uid), { owned, updatedAt: serverTimestamp() })
}

export async function savePokedexBulk(uid, ownedMap) {
  await setDoc(pokedexRef(uid), { owned: ownedMap, updatedAt: serverTimestamp() })
}

// ── Sets ──────────────────────────────────────────────────────────────────────

export async function getUserSets(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'sets'))
  const sets = {}
  snap.forEach((d) => (sets[d.id] = d.data()))
  return sets
}

export async function addUserSet(uid, setId, setMeta) {
  await setDoc(setRef(uid, setId), {
    ...setMeta,
    baseOwned: [],
    masterOwned: [],
    addedAt: serverTimestamp(),
  })
}

export async function updateSetOwned(uid, setId, { baseOwned, masterOwned }) {
  const update = { updatedAt: serverTimestamp() }
  if (baseOwned !== undefined) update.baseOwned = baseOwned
  if (masterOwned !== undefined) update.masterOwned = masterOwned
  await updateDoc(setRef(uid, setId), update)
}

export async function removeUserSet(uid, setId) {
  await deleteDoc(setRef(uid, setId))
}

// ── Guest trainers ────────────────────────────────────────────────────────────

export async function getGuestTrainers(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'guestTrainers'))
  const guests = {}
  snap.forEach((d) => (guests[d.id] = d.data()))
  return guests
}

export async function addGuestTrainer(uid, guestId, data) {
  await setDoc(guestRef(uid, guestId), { ...data, createdAt: serverTimestamp() })
}

export async function removeGuestTrainer(uid, guestId) {
  await deleteDoc(guestRef(uid, guestId))
}

// ── TCG API cache (shared across all users) ───────────────────────────────────

export async function getCachedSet(setId) {
  const snap = await getDoc(cacheSetRef(setId))
  return snap.exists() ? snap.data() : null
}

export async function setCachedSet(setId, data) {
  await setDoc(cacheSetRef(setId), { ...data, cachedAt: serverTimestamp() })
}

export async function getCachedCard(cardId) {
  const snap = await getDoc(cacheCardRef(cardId))
  return snap.exists() ? snap.data() : null
}

export async function setCachedCard(cardId, data) {
  await setDoc(cacheCardRef(cardId), { ...data, cachedAt: serverTimestamp() })
}

// ── Public share snapshot ─────────────────────────────────────────────────────
//
// Writes a public read-only snapshot to `publicProfiles/{uid}`.
// Firestore rules must allow: match /publicProfiles/{uid} { allow read: true; }
// This collection is separate from user data so rules don't expose private info.

function publicProfileRef(uid) {
  return doc(db, 'publicProfiles', uid)
}

export async function writePublicSnapshot(uid, { displayName, pokedexOwned, sets }) {
  await setDoc(publicProfileRef(uid), {
    displayName: displayName || 'Trainer',
    pokedexOwned: pokedexOwned || {},
    sets: sets || {},
    updatedAt: serverTimestamp(),
  })
}

export async function getPublicSnapshot(uid) {
  const snap = await getDoc(publicProfileRef(uid))
  return snap.exists() ? snap.data() : null
}

// ── Full data upload (local → cloud migration) ────────────────────────────────

export async function uploadLocalData(uid, { profile, pokedex, sets }) {
  const batch = writeBatch(db)

  if (profile) {
    batch.set(userRef(uid), { ...profile, updatedAt: serverTimestamp() }, { merge: true })
  }

  if (pokedex) {
    batch.set(pokedexRef(uid), { owned: pokedex, updatedAt: serverTimestamp() })
  }

  if (sets) {
    for (const [setId, setData] of Object.entries(sets)) {
      batch.set(setRef(uid, setId), { ...setData, updatedAt: serverTimestamp() })
    }
  }

  await batch.commit()
}

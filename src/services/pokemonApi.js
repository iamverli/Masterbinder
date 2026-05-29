/**
 * Pokémon TCG API service (dev.pokemontcg.io / Scrydex)
 *
 * Strategy:
 *  1. Check IndexedDB card cache first
 *  2. If not cached, check Firestore cache (shared across all users)
 *  3. If not in Firestore, hit the TCG API and cache result in Firestore
 *
 * This means each set is fetched from the API exactly once, ever.
 * Free tier: 5,000 requests/month — easily covered.
 */

import { getCachedSet, setCachedSet } from '../firebase/firestore'
import { idbGetCardCache, idbPutCardCache } from '../db/indexeddb'

// Re-export for use in searchCardsByPokemon caching
// (already imported above)

const API_BASE = 'https://api.pokemontcg.io/v2'
const API_KEY = import.meta.env.VITE_POKEMON_TCG_API_KEY

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'X-Api-Key': API_KEY,
    },
  })
  if (!res.ok) {
    throw new Error(`TCG API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ── Fetch all sets (for Set Selector) ─────────────────────────────────────────
// Returns array of set metadata, grouped by series

export async function fetchAllSets() {
  // Check IndexedDB first
  const cached = await idbGetCardCache('__all_sets__')
  if (cached) return cached

  // Check Firestore cache (fail silently — rules may not cover cache path)
  try {
    const firestoreCached = await getCachedSet('__all_sets__')
    if (firestoreCached?.data) {
      await idbPutCardCache('__all_sets__', firestoreCached.data)
      return firestoreCached.data
    }
  } catch { /* cache miss — fall through to API */ }

  // Fetch from API — paginate through all sets
  let page = 1
  const pageSize = 250
  let allSets = []
  let hasMore = true

  while (hasMore) {
    const json = await apiFetch(`/sets?page=${page}&pageSize=${pageSize}&orderBy=releaseDate`)
    allSets = allSets.concat(json.data)
    hasMore = json.data.length === pageSize
    page++
  }

  // Normalize and sort
  const normalized = allSets.map((s) => ({
    id: s.id,
    name: s.name,
    series: s.series,
    printedTotal: s.printedTotal,
    total: s.total,
    releaseDate: s.releaseDate,
    images: {
      symbol: s.images?.symbol,
      logo: s.images?.logo,
    },
  }))

  // Cache in Firestore and IndexedDB (Firestore optional — fail silently)
  try { await setCachedSet('__all_sets__', { data: normalized }) } catch { /* ok */ }
  await idbPutCardCache('__all_sets__', normalized)

  return normalized
}

// ── Fetch cards for a specific set ────────────────────────────────────────────
// Returns { base: [...], master: [...] }
// base = cards with printedNumber only (no secret rares)
// master = all cards with official numbers

export async function fetchSetCards(setId) {
  // Check IndexedDB first
  const cached = await idbGetCardCache(setId)
  if (cached) return cached

  // Check Firestore cache (fail silently)
  try {
    const firestoreCached = await getCachedSet(setId)
    if (firestoreCached?.data) {
      await idbPutCardCache(setId, firestoreCached.data)
      return firestoreCached.data
    }
  } catch { /* cache miss — fall through to API */ }

  // Fetch from API — paginate
  let page = 1
  const pageSize = 250
  let allCards = []
  let hasMore = true

  while (hasMore) {
    const json = await apiFetch(
      `/cards?q=set.id:${setId}&page=${page}&pageSize=${pageSize}&orderBy=number`
    )
    allCards = allCards.concat(json.data)
    hasMore = json.data.length === pageSize
    page++
  }

  // Normalize cards
  const normalized = allCards.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    printedNumber: c.number, // same field — used to distinguish base vs. secret
    rarity: c.rarity || null,
    supertype: c.supertype || null, // Pokémon | Trainer | Energy
    subtypes: c.subtypes || [],
    images: {
      small: c.images?.small,
      large: c.images?.large,
    },
    set: {
      id: c.set?.id,
      name: c.set?.name,
      series: c.set?.series,
      printedTotal: c.set?.printedTotal,
      total: c.set?.total,
    },
    languages: c.availableLanguages || ['en'],
    tcgplayer: c.tcgplayer
      ? {
          url: c.tcgplayer.url,
          prices: c.tcgplayer.prices,
        }
      : null,
  }))

  // Split: base = numbered up to printedTotal, master = everything
  const printedTotal = allCards[0]?.set?.printedTotal || 999
  const base = normalized.filter((c) => {
    const n = parseInt(c.number, 10)
    return !isNaN(n) && n <= printedTotal
  })

  const result = { base, master: normalized }

  // Cache (Firestore optional — fail silently)
  try { await setCachedSet(setId, { data: result }) } catch { /* ok */ }
  await idbPutCardCache(setId, result)

  return result
}

// ── Search cards by Pokémon name (for Pokédex card selector) ─────────────────

export async function searchCardsByPokemon(pokemonName, language = 'en') {
  const cacheKey = `__search__${pokemonName.toLowerCase()}__${language}__`

  // Check IndexedDB cache first
  const cached = await idbGetCardCache(cacheKey)
  if (cached) return cached

  const langQuery = language !== 'en' ? `+language:${language}` : ''
  const json = await apiFetch(
    `/cards?q=name:"${pokemonName}"${langQuery}&orderBy=set.releaseDate&pageSize=250`
  )
  const result = json.data.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    rarity: c.rarity || null,
    images: {
      small: c.images?.small,
      large: c.images?.large,
    },
    set: {
      id: c.set?.id,
      name: c.set?.name,
      series: c.set?.series,
    },
  }))

  // Cache for this session
  await idbPutCardCache(cacheKey, result)
  return result
}

// ── Sprite URL helper (PokeAPI sprites — no API key needed) ──────────────────

export function getSpriteUrl(dexNumber) {
  // dexNumber is "001", "025", "1025" etc.
  const n = parseInt(dexNumber, 10)
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${n}.png`
}

// ── Language codes supported by the TCG API ───────────────────────────────────

export const CARD_LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ja', label: 'JP' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' },
  { code: 'it', label: 'IT' },
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
  { code: 'ko', label: 'KR' },
  { code: 'zh-Hans', label: 'CN' },
]

export const GENERATIONS = [
  { id: 1, name: 'Gen I',   region: 'Kanto',  start: 1,   end: 151,  color: '#B71C1C' },
  { id: 2, name: 'Gen II',  region: 'Johto',  start: 152, end: 251,  color: '#BF6900' },
  { id: 3, name: 'Gen III', region: 'Hoenn',  start: 252, end: 386,  color: '#1B5E20' },
  { id: 4, name: 'Gen IV',  region: 'Sinnoh', start: 387, end: 493,  color: '#1A237E' },
  { id: 5, name: 'Gen V',   region: 'Unova',  start: 494, end: 649,  color: '#006064' },
  { id: 6, name: 'Gen VI',  region: 'Kalos',  start: 650, end: 721,  color: '#311B92' },
  { id: 7, name: 'Gen VII', region: 'Alola',  start: 722, end: 809,  color: '#E64A19' },
  { id: 8, name: 'Gen VIII',region: 'Galar',  start: 810, end: 905,  color: '#6A1B9A' },
  { id: 9, name: 'Gen IX',  region: 'Paldea', start: 906, end: 1025, color: '#880E4F' },
]

export const POKEDEX_TOTAL = 1025

export function padDex(num) {
  return String(num).padStart(3, '0')
}

export function getSpriteUrl(dexNum) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNum}.png`
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Fetch all Pokémon names from PokeAPI and cache in IndexedDB
const NAMES_CACHE_KEY = '__pokemon_names__'

export async function fetchPokemonNames() {
  // Check IndexedDB cache first
  const { idbGetCardCache, idbPutCardCache } = await import('../db/indexeddb')
  const cached = await idbGetCardCache(NAMES_CACHE_KEY)
  if (cached) return cached

  // Fetch from PokeAPI (no API key needed, free)
  const res = await fetch(
    'https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0'
  )
  if (!res.ok) throw new Error('Failed to fetch Pokémon names')
  const json = await res.json()

  // Build name map: { "001": "Bulbasaur", ... }
  const names = {}
  json.results.forEach((p, i) => {
    const num = i + 1
    names[padDex(num)] = capitalize(p.name.replace(/-/g, ' '))
  })

  await idbPutCardCache(NAMES_CACHE_KEY, names)
  return names
}

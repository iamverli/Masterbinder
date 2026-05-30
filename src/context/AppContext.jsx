/**
 * AppContext — global app state
 * Holds pokedex, sets, and guest trainers loaded from IndexedDB.
 * All mutations go through sync service (local first, cloud async).
 */

import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  idbGetPokedex,
  idbGetAllSets,
  idbGetAllGuests,
} from '../db/indexeddb'
import {
  syncSetPokedexCard,
  syncRemovePokedexCard,
  syncUpdateSet,
  syncAddSet,
  syncRemoveSet,
} from '../services/syncService'

const AppContext = createContext(null)

const initialState = {
  pokedex: {},        // { "001": { cardId, setId, ... }, ... }
  sets: {},           // { setId: { setId, setName, baseOwned, masterOwned, ... } }
  guests: {},         // { guestId: { displayName, pokedex: {...} } }
  loaded: false,
}

function appReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        pokedex: action.pokedex,
        sets: action.sets,
        guests: action.guests,
        loaded: true,
      }
    case 'SET_POKEDEX_CARD':
      return {
        ...state,
        pokedex: { ...state.pokedex, [action.dexNumber]: action.cardData },
      }
    case 'REMOVE_POKEDEX_CARD': {
      const next = { ...state.pokedex }
      delete next[action.dexNumber]
      return { ...state, pokedex: next }
    }
    case 'ADD_SET':
      return {
        ...state,
        sets: { ...state.sets, [action.setId]: action.setData },
      }
    case 'UPDATE_SET':
      return {
        ...state,
        sets: {
          ...state.sets,
          [action.setId]: { ...state.sets[action.setId], ...action.updates },
        },
      }
    case 'REMOVE_SET': {
      const next = { ...state.sets }
      delete next[action.setId]
      return { ...state, sets: next }
    }
    case 'ADD_GUEST':
      return {
        ...state,
        guests: { ...state.guests, [action.guestId]: action.guestData },
      }
    case 'REMOVE_GUEST': {
      const next = { ...state.guests }
      delete next[action.guestId]
      return { ...state, guests: next }
    }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const { uid, isAuthenticated, syncStatus } = useAuth()
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Load from IndexedDB on mount and after sync completes
  const loadLocal = useCallback(async () => {
    const [pokedex, sets, guests] = await Promise.all([
      idbGetPokedex(),
      idbGetAllSets(),
      idbGetAllGuests(),
    ])
    dispatch({ type: 'LOAD', pokedex, sets, guests })
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadLocal()
    }
  }, [isAuthenticated, loadLocal])

  // Reload after cloud sync completes
  useEffect(() => {
    if (syncStatus === 'done') {
      loadLocal()
    }
  }, [syncStatus, loadLocal])

  // ── Pokédex actions ──────────────────────────────────────────────────────

  async function setPokedexCard(dexNumber, cardData) {
    dispatch({ type: 'SET_POKEDEX_CARD', dexNumber, cardData })
    await syncSetPokedexCard(uid, dexNumber, cardData)
  }

  async function removePokedexCard(dexNumber) {
    dispatch({ type: 'REMOVE_POKEDEX_CARD', dexNumber })
    await syncRemovePokedexCard(uid, dexNumber)
  }

  // ── Set actions ──────────────────────────────────────────────────────────

  async function addSet(setId, setMeta) {
    dispatch({ type: 'ADD_SET', setId, setData: setMeta })
    await syncAddSet(uid, setId, setMeta)
  }

  async function updateSet(setId, updates) {
    const current = state.sets[setId]
    if (!current) return
    const updated = { ...current, ...updates }
    dispatch({ type: 'UPDATE_SET', setId, updates })
    await syncUpdateSet(uid, setId, updated)
  }

  async function removeSet(setId) {
    dispatch({ type: 'REMOVE_SET', setId })
    await syncRemoveSet(uid, setId)
  }

  // ── Guest trainers ───────────────────────────────────────────────────────

  function addGuest(guestId, guestData) {
    dispatch({ type: 'ADD_GUEST', guestId, guestData })
  }

  function removeGuest(guestId) {
    dispatch({ type: 'REMOVE_GUEST', guestId })
  }

  const value = {
    ...state,
    setPokedexCard,
    removePokedexCard,
    addSet,
    updateSet,
    removeSet,
    addGuest,
    removeGuest,
    reload: loadLocal,
    // Derived stats
    pokedexOwnedCount: Object.keys(state.pokedex).length,
    setsNotStarted: Object.entries(state.sets)
      .map(([key, s]) => ({ ...s, setId: s.setId || key }))
      .filter((s) => (!s.baseOwned || s.baseOwned.length === 0) && (!s.masterOwned || s.masterOwned.length === 0)),
    setsInProgress: Object.entries(state.sets)
      .map(([key, s]) => ({ ...s, setId: s.setId || key }))
      .filter((s) => (s.baseOwned?.length > 0 && s.baseOwned?.length < s.printedTotal) ||
             (s.masterOwned?.length > 0 && s.masterOwned?.length < (s.masterTotal || s.printedTotal))),
    setsCompleted: Object.entries(state.sets)
      .map(([key, s]) => ({ ...s, setId: s.setId || key }))
      .filter((s) => s.baseOwned?.length >= s.printedTotal && s.printedTotal > 0),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

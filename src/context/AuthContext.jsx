import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthChange } from '../firebase/auth'
import { idbGetMeta, idbSetMeta, migrateFromOldApp } from '../db/indexeddb'
import { determineSyncDirection, pullFromCloud, pushToCloud } from '../services/syncService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // null = loading, false = no auth (local mode), object = Firebase user
  const [user, setUser] = useState(undefined)
  const [isLocal, setIsLocal] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null) // null | 'syncing' | 'done' | 'error'
  const [migrationResult, setMigrationResult] = useState(null)
  const [onboardingDone, setOnboardingDone] = useState(null) // null = not yet checked

  useEffect(() => {
    let mounted = true

    async function init() {
      // 1. Run migration from old pb_ data (silent, runs once)
      const migration = await migrateFromOldApp()
      if (mounted) setMigrationResult(migration)

      // 2. Check if onboarding has been completed
      const done = await idbGetMeta('onboardingDone')
      if (mounted) setOnboardingDone(!!done)

      // 3. Check if user chose local mode
      const localMode = await idbGetMeta('localMode')
      if (localMode) {
        if (mounted) {
          setIsLocal(true)
          setUser(null)
        }
      }
    }

    init()

    // 4. Listen for Firebase auth changes
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (!mounted) return

      if (firebaseUser) {
        setUser(firebaseUser)
        setIsLocal(false)

        // Sync on sign-in
        setSyncStatus('syncing')
        try {
          const direction = await determineSyncDirection(firebaseUser.uid)
          if (direction === 'pull') {
            await pullFromCloud(firebaseUser.uid)
          } else if (direction === 'push') {
            await pushToCloud(firebaseUser.uid)
          }
          setSyncStatus('done')
        } catch {
          setSyncStatus('error')
        }
      } else {
        // Check local mode flag again (auth state might clear on app reload)
        const localMode = await idbGetMeta('localMode')
        if (localMode) {
          setIsLocal(true)
          setUser(null)
        } else {
          setUser(null)
          setIsLocal(false)
        }
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  async function enterLocalMode() {
    await idbSetMeta('localMode', true)
    setIsLocal(true)
    setUser(null)
  }

  async function completeOnboarding() {
    await idbSetMeta('onboardingDone', true)
    setOnboardingDone(true)
  }

  const value = {
    user,           // Firebase user object or null
    isLocal,        // true = using app without account
    isAuthenticated: !!user || isLocal,
    isLoading: user === undefined,
    syncStatus,
    migrationResult,
    onboardingDone,
    uid: user?.uid || null,
    enterLocalMode,
    completeOnboarding,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

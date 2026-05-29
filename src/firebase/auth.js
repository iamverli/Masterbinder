import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from './config'

const googleProvider = new GoogleAuthProvider()

// ── Google sign-in ────────────────────────────────────────────────────────────
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

// ── Email/password ────────────────────────────────────────────────────────────
export async function signUpWithEmail(email, password, displayName) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(result.user, { displayName })
  }
  return result.user
}

export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

// ── Sign out ──────────────────────────────────────────────────────────────────
export async function signOutUser() {
  await signOut(auth)
}

// ── Auth state listener ───────────────────────────────────────────────────────
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

// ── Update display name ───────────────────────────────────────────────────────
export async function updateDisplayName(name) {
  if (!auth.currentUser) throw new Error('No authenticated user')
  await updateProfile(auth.currentUser, { displayName: name })
}

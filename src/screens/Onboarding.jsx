import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Onboarding.module.css'

const STEPS = [
  {
    emoji: '🎴',
    title: 'National Pokédex Binder',
    body: 'Track one card for every Pokémon — #001 Bulbasaur to #1025 Pecharunt. Tap to mark owned, long-press to remove, tap the dots to select which specific card fills the slot.',
  },
  {
    emoji: '📦',
    title: 'Set Tracker',
    body: 'Start tracking any set from any era. Toggle between Base Set and Masterset mode (reverse holos, full arts, secret rares — everything with an official number). Sets track completion separately for each mode.',
  },
  {
    emoji: '🔄',
    title: 'Offline First',
    body: 'MasterBinder works without internet — perfect at the card shop. Your data is saved locally first. Sign in anytime to sync to the cloud and access your collection from any device.',
  },
  {
    emoji: '⚠️',
    title: 'Early Access',
    body: "This app is a work in progress. You may encounter bugs — we're actively working on them. Your data is always safe locally. If something looks wrong, try pulling down to refresh.",
  },
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)
  const { completeOnboarding } = useAuth()
  const navigate = useNavigate()

  const isLast = step === STEPS.length - 1

  async function handleNext() {
    if (isLast) {
      await completeOnboarding()
      navigate('/', { replace: true })
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  async function handleSkip() {
    await completeOnboarding()
    navigate('/', { replace: true })
  }

  const current = STEPS[step]

  return (
    <div className={styles.root}>
      {/* Skip */}
      <div className={styles.topBar}>
        <button className={`btn btn-ghost ${styles.skipBtn}`} onClick={handleSkip}>
          Skip
        </button>
      </div>

      {/* Step content */}
      <div className={styles.content} key={step}>
        <div className={styles.emoji}>{current.emoji}</div>
        <h2 className={styles.title}>{current.title}</h2>
        <p className={styles.body}>{current.body}</p>
      </div>

      {/* Dots */}
      <div className={styles.dots}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i === step ? styles.dotActive : ''}`}
            onClick={() => setStep(i)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className={styles.nav}>
        <button
          className={`btn btn-ghost ${styles.backBtn}`}
          onClick={handleBack}
          style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
        >
          ←
        </button>

        <button className={`btn btn-primary ${styles.nextBtn}`} onClick={handleNext}>
          {isLast ? "Let's Go!" : 'Next'}
        </button>
      </div>
    </div>
  )
}

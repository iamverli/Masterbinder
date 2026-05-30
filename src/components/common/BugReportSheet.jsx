import { useState } from 'react'
import styles from './BugReportSheet.module.css'

const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID

export default function BugReportSheet({ onClose }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          message,
          _subject: '🐛 MasterBinder Bug Report',
          device: navigator.userAgent,
          app_version: document.title,
        }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        setError('Could not send. Try again.')
      }
    } catch {
      setError('No connection. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className={`${styles.sheet} animate-slide-up`} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
          <span className={styles.title}>Report a Bug</span>
          <div style={{ width: 32 }} />
        </div>

        {sent ? (
          <div className={styles.successState}>
            <span className={styles.successIcon}>✓</span>
            <span className={styles.successText}>Report sent — thank you!</span>
            <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: 16 }}>Close</button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <p className={styles.hint}>Describe what happened and how to reproduce it.</p>
            <textarea
              className={styles.textarea}
              placeholder="e.g. When I long press a card in the set tracker, the card sometimes doesn't get removed…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              autoFocus
            />
            {error && <span className={styles.error}>{error}</span>}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !message.trim()}
              style={{ width: '100%' }}
            >
              {sending ? 'Sending…' : 'Send Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const isNested = !!this.props.fallbackLabel

    if (isNested) {
      // Inline recovery — used inside SetTracker / individual screens
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
          gap: 12,
          padding: '32px 24px',
        }}>
          <span style={{ fontSize: 32 }}>⚠️</span>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
            {this.props.fallbackLabel || 'Something went wrong here.'}
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }

    // Full-screen recovery — top-level boundary
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: 'var(--bg-base)',
        gap: 16,
        padding: '0 32px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 48, lineHeight: 1 }}>🌙</span>
        <p style={{
          color: 'var(--text-primary)',
          fontSize: 'var(--font-size-base)',
          fontWeight: 700,
        }}>
          Something went wrong
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
          MasterBinder hit an unexpected error. Reload to get back.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 8 }}
          onClick={() => window.location.reload()}
        >
          Reload app
        </button>
      </div>
    )
  }
}

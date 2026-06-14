import { Component, type ReactNode } from 'react'

// Keeps a runtime slip from blanking the whole app — shows a quiet message instead.
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) {
    return { err }
  }
  render() {
    if (this.state.err) {
      return (
        <div className="k-root" data-theme="light" data-density="compact">
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--qahwa-fg-1)' }}>Something slipped</div>
            <div style={{ fontSize: 13, maxWidth: 280, fontStyle: 'italic', color: 'var(--qahwa-fg-2)' }}>
              Keela hit an unexpected error drawing this view. Your data is safe.
            </div>
            <button className="k-btn" onClick={() => location.reload()}>Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

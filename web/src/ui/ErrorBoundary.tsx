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
        <div className="k-root" data-theme="light">
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
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2A2521' }}>Something slipped</div>
            <div style={{ fontSize: 13, maxWidth: 280, fontStyle: 'italic', color: '#7A7163' }}>
              Keela hit an unexpected error drawing this view. Your data is safe.
            </div>
            <button onClick={() => location.reload()} style={{ border: 'none', borderRadius: 14, padding: '12px 22px', background: '#C4623A', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

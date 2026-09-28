import { Component, type ReactNode } from 'react';
import { motionVariables } from './motion';

export class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) return <div className="k-root" style={motionVariables as React.CSSProperties}>
      <div className="c-state-page" role="alert"><h1>Something went wrong</h1><p className="c-muted">We couldn’t display this screen. Reload to try again.</p>
        <button className="c-button c-primary" onClick={() => location.reload()}>Reload Keela</button></div>
    </div>;
    return this.props.children;
  }
}

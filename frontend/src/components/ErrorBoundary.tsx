import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render-time throws anywhere in the tree so an off-contract API
 *  payload degrades to an error card instead of a white screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <main className="app-main">
            <section className="card center">
              <h2>Something went wrong</h2>
              <div className="error-box">
                <p>{this.state.error.message || String(this.state.error)}</p>
              </div>
              <div className="actions">
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  Reload app
                </button>
              </div>
            </section>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}

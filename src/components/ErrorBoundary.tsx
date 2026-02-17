import { Component, type ReactNode } from 'react';

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    (error.name === 'TypeError' && msg.includes('fetch'))
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[GREENLIGHT] Uncaught error:', error, info.componentStack);

    // Auto-reload on chunk load failures (stale deploy)
    if (isChunkLoadError(error)) {
      const key = 'greenlight_chunk_reload';
      const lastReload = Number(sessionStorage.getItem(key) || 0);
      // Prevent reload loops — only auto-reload once per 30s
      if (Date.now() - lastReload > 30_000) {
        sessionStorage.setItem(key, String(Date.now()));
        // Brief delay so user sees the "Updating..." message
        setTimeout(() => window.location.reload(), 1200);
      }
    }
  }

  handleRestart = () => {
    // Clear mid-run save to prevent crash loops
    try { localStorage.removeItem('greenlight_midrun_save'); } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.isChunkError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#f5f0e8',
          padding: 24,
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔄</div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
            color: '#d4a843',
            marginBottom: 8,
            letterSpacing: '0.05em',
          }}>
            Updating...
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem', maxWidth: 350, lineHeight: 1.5 }}>
            A new version is available. Reloading now.
          </p>
        </div>
      );
    }
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#f5f0e8',
          padding: 24,
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎬💥</div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.8rem, 6vw, 3rem)',
            color: '#d4a843',
            marginBottom: 8,
            letterSpacing: '0.05em',
          }}>
            Something Went Wrong
          </h1>
          <p style={{ color: '#888', fontSize: '0.95rem', maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            The production hit a catastrophic snag. Don't worry — your career stats and unlocks are safe.
          </p>
          {this.state.error && (
            <pre style={{
              background: 'rgba(231,76,60,0.1)',
              border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: '0.7rem',
              color: '#e74c3c',
              maxWidth: 500,
              overflow: 'auto',
              marginBottom: 24,
              maxHeight: 80,
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleRestart}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.2rem',
              letterSpacing: '0.1em',
              padding: '12px 32px',
              background: '#d4a843',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            TAP TO RESTART
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

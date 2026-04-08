import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0b0b0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: '#111118',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '18px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚨</p>
            <h2 style={{ color: '#f87171', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.75rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1.75rem' }}>
              An unexpected error occurred. Refresh the page to try again.
            </p>
            <pre style={{
              background: '#0b0b0f',
              border: '1px solid #1c1c28',
              borderRadius: '10px',
              padding: '1rem',
              fontSize: '0.75rem',
              color: '#475569',
              textAlign: 'left',
              overflowX: 'auto',
              marginBottom: '1.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

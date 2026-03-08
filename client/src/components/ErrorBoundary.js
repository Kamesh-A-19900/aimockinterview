import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: 'var(--text-primary)', 
              marginBottom: '12px' 
            }}>
              Something went wrong
            </h2>
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              We encountered an unexpected error. Please refresh the page or try again later.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: 'var(--brand)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ 
                marginTop: '24px', 
                textAlign: 'left',
                background: 'var(--bg-elevated)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                  Error Details (Development)
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
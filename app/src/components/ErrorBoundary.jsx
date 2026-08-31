import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--green-dark, #082A1F)',
            color: 'var(--cream, #F5F5DC)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              background: 'rgba(8, 42, 31, 0.95)',
              border: '1px solid var(--green-border, #1E4A38)',
              borderRadius: 20,
              padding: '2.5rem',
              maxWidth: 550,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: 'var(--cream, #F5F5DC)', margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>
              Something went wrong loading this view
            </h2>
            <p style={{ color: 'var(--cream-muted, rgba(245,245,220,0.65))', fontSize: '0.88rem', margin: '0 0 1.5rem 0' }}>
              {this.state.error?.message || 'A temporary rendering error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '0.65rem 1.5rem',
                borderRadius: 10,
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔄 Reload CRM &amp; Admin Panel
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

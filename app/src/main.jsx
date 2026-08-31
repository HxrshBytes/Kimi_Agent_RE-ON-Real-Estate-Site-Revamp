import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import App from './App.jsx'
import './index.css'

const adminClerkKey = import.meta.env.VITE_ADMIN_CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const hasClerkKey = Boolean(adminClerkKey)

if (!hasClerkKey) {
  console.error('[Reon] VITE_ADMIN_CLERK_PUBLISHABLE_KEY is not set in .env. Clerk auth is disabled until it is configured.')
}

function MissingClerkConfigScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#071b17',
      color: '#f8f5ee',
      fontFamily: 'Inter, Arial, sans-serif',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '640px',
        width: '100%',
        background: 'rgba(18, 38, 32, 0.9)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '24px',
        padding: '2.25rem',
        boxShadow: '0 18px 60px rgba(0,0,0,0.28)',
      }}>
        <p style={{ margin: '0 0 0.75rem', color: '#a7f3d0', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
          RE-ON Admin Setup
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 6vw, 3.25rem)' }}>Clerk is not configured</h1>
        <p style={{ margin: '1rem 0 0', color: '#d7e3d9', lineHeight: 1.7 }}>
          The admin panel cannot open until the Clerk publishable key is added to the app environment.
          Add VITE_ADMIN_CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY in app/.env, then restart the app.
        </p>
        <pre style={{ marginTop: '1.5rem', padding: '1rem 1.1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', overflowX: 'auto', color: '#f8f5ee' }}>
{`VITE_ADMIN_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key`}
        </pre>
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))

if (!hasClerkKey) {
  root.render(
    <React.StrictMode>
      <MissingClerkConfigScreen />
    </React.StrictMode>,
  )
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider
        publishableKey={adminClerkKey}
        afterSignOutUrl="/admin"
        signInFallbackRedirectUrl="/admin"
        signUpFallbackRedirectUrl="/admin"
      >
        <App />
      </ClerkProvider>
    </React.StrictMode>,
  )
}


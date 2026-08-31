import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import App from './App.jsx'
import './index.css'

const adminClerkKey = import.meta.env.VITE_ADMIN_CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!adminClerkKey) {
  console.error('[Reon] VITE_ADMIN_CLERK_PUBLISHABLE_KEY is not set in .env')
}

ReactDOM.createRoot(document.getElementById('root')).render(
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


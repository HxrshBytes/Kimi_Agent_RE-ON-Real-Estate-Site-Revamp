import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ClientAuthContext = createContext()

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function useClientAuth() {
  const context = useContext(ClientAuthContext)
  if (!context) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider')
  }
  return context
}

export function ClientAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('reon_client_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('reon_client_token') || ''
    } catch {
      return ''
    }
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authSuccessToast, setAuthSuccessToast] = useState('')

  const isSignedIn = !!user

  const openAuthModal = useCallback(() => {
    setError('')
    setIsModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setError('')
    setIsModalOpen(false)
  }, [])

  // 1. Direct Phone Login & CRM Lead Creation (No OTP requirement)
  const loginWithPhone = useCallback(async ({ phone, name }) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/clients/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, authMethod: 'phone' }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check your mobile number.')
      }

      setUser(data.user)
      setToken(data.token)

      localStorage.setItem('reon_client_user', JSON.stringify(data.user))
      localStorage.setItem('reon_client_token', data.token)

      setAuthSuccessToast(`Welcome, ${data.user.name || 'Member'}!`)
      setTimeout(() => setAuthSuccessToast(''), 4000)

      setIsModalOpen(false)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 2. Legacy / Fallback OTP handlers mapped directly
  const sendOtp = useCallback(async ({ phone, name }) => {
    return loginWithPhone({ phone, name })
  }, [loginWithPhone])

  const verifyOtp = useCallback(async ({ phone, name }) => {
    return loginWithPhone({ phone, name })
  }, [loginWithPhone])

  // Direct login fallback
  const authenticateClient = useCallback(async ({ phone, email, name, authMethod = 'phone' }) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/clients/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, name, authMethod }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check your details.')
      }

      setUser(data.user)
      setToken(data.token)

      localStorage.setItem('reon_client_user', JSON.stringify(data.user))
      localStorage.setItem('reon_client_token', data.token)

      setAuthSuccessToast(`Welcome, ${data.user.name || 'Member'}!`)
      setTimeout(() => setAuthSuccessToast(''), 4000)

      setIsModalOpen(false)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    setToken('')
    localStorage.removeItem('reon_client_user')
    localStorage.removeItem('reon_client_token')
    setAuthSuccessToast('You have signed out successfully.')
    setTimeout(() => setAuthSuccessToast(''), 3000)
  }, [])

  return (
    <ClientAuthContext.Provider
      value={{
        user,
        token,
        isSignedIn,
        isModalOpen,
        loading,
        error,
        setError,
        authSuccessToast,
        openAuthModal,
        closeAuthModal,
        loginWithPhone,
        sendOtp,
        verifyOtp,
        authenticateClient,
        signOut,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  )
}

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/react'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/**
 * Syncs client user data (phone, email, name) to MongoDB
 * after they sign in via Clerk. Runs once per session.
 */
export function useClientSync() {
  const { isSignedIn, user, isLoaded } = useUser()
  const hasSynced = useRef(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || hasSynced.current) return

    const syncClient = async () => {
      try {
        const phone = user.primaryPhoneNumber?.phoneNumber || 
                       user.phoneNumbers?.[0]?.phoneNumber || null
        const email = user.primaryEmailAddress?.emailAddress ||
                       user.emailAddresses?.[0]?.emailAddress || null

        await fetch(`${API_BASE}/api/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: user.id,
            phone,
            email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            imageUrl: user.imageUrl || '',
          }),
        })

        hasSynced.current = true
        console.log('[ClientSync] User data synced to MongoDB')
      } catch (err) {
        console.warn('[ClientSync] Failed to sync:', err.message)
      }
    }

    syncClient()
  }, [isLoaded, isSignedIn, user])
}

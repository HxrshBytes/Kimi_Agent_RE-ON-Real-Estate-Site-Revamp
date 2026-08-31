import { useEffect, useRef } from 'react'
import { useClientAuth } from '../contexts/ClientAuthContext'
import { useAdmin } from '../contexts/AdminContext'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/**
 * 30-Second Dwell Lead Capture Engine:
 * When a logged-in visitor spends 30+ seconds viewing any property detail page,
 * it automatically generates a high-intent inquiry lead in MongoDB contacts with
 * the property name, location, and the client's name & phone number.
 */
export function usePropertyDwellLead(property) {
  const { user: authUser, isSignedIn } = useClientAuth()
  const { submitContactInquiry } = useAdmin()
  const timerRef = useRef(null)

  useEffect(() => {
    // 1. Resolve logged-in user from context or persistent client storage
    let clientUser = authUser
    if (!clientUser) {
      try {
        const saved = localStorage.getItem('reon_client_user')
        if (saved) clientUser = JSON.parse(saved)
      } catch {}
    }

    const hasUser = isSignedIn || !!clientUser
    if (!hasUser || !clientUser || !property) return

    const propertyId = property.id || property._id
    if (!propertyId) return

    const propertyName = property.name || property.title || 'Property Listing'
    const clientPhone = clientUser.phone || ''
    const clientEmail = clientUser.email || ''
    const clientName = clientUser.name || (clientPhone ? `Client (${clientPhone})` : 'Registered Client')

    // Avoid duplicate triggers within 5 minutes for the exact same property and client
    const dwellCooldownKey = `reon_dwell_last_${clientPhone || clientEmail || 'client'}_${propertyId}`
    const lastTriggered = parseInt(sessionStorage.getItem(dwellCooldownKey) || '0', 10)
    const now = Date.now()
    if (lastTriggered && now - lastTriggered < 300000) {
      console.log(`[LeadTracker] Dwell timer skipped (recently triggered within 5m for "${propertyName}")`)
      return
    }

    console.log(`[LeadTracker] ⏱️ 30s dwell timer started for: "${propertyName}" (Client: ${clientName}, ${clientPhone})`)

    timerRef.current = setTimeout(async () => {
      try {
        const payload = {
          name: clientName,
          phone: clientPhone,
          email: clientEmail,
          propertyName,
          propertyId: String(propertyId),
          propertyLocation: property.location || '',
          budget: property.price || '',
          message: `🔥 High-Intent Lead: Client spent 30+ seconds exploring "${propertyName}".`,
          type: 'Automated Lead (30s+ Dwell)',
          source: 'Property Dwell Tracker (30s)',
          status: 'New',
          submittedAt: new Date().toISOString(),
        }

        console.log(`[LeadTracker] 🚀 Submitting 30s dwell lead to MongoDB for: "${propertyName}"...`)

        // 1. Submit via Admin Context handler (which updates state and hits API)
        if (typeof submitContactInquiry === 'function') {
          await submitContactInquiry(payload)
        } else {
          // 2. Direct API submission fallback
          await fetch(`${API_BASE}/api/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        }

        sessionStorage.setItem(dwellCooldownKey, String(Date.now()))
        console.log(`[LeadTracker] ✅ ⭐ 30-Second Dwell Lead Successfully Recorded in MongoDB for "${propertyName}"!`)
      } catch (err) {
        console.warn('[LeadTracker] Failed to record dwell lead:', err.message)
      }
    }, 30000) // 30 seconds threshold

    // Cleanup timer if visitor leaves page before 30 seconds
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isSignedIn, authUser, property, submitContactInquiry])
}

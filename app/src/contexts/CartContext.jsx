import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useClientAuth } from './ClientAuthContext'

const CartContext = createContext()
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function useCart() {
  return useContext(CartContext)
}

export function CartProvider({ children }) {
  const { user, isSignedIn } = useClientAuth()
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('reon_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [lastActionToast, setLastActionToast] = useState('')

  const syncCartToBackend = useCallback(async (currentItems, currentUser) => {
    if (!currentUser || (!currentUser.id && !currentUser.phone && !currentUser.email)) return
    try {
      await fetch(`${API_BASE}/api/clients/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: currentUser.id,
          phone: currentUser.phone,
          email: currentUser.email,
          name: currentUser.name,
          items: currentItems,
        }),
      })
      console.log(`[CartContext] Synced ${currentItems.length} items to MongoDB for user ${currentUser.phone || currentUser.name}`)
    } catch (err) {
      console.warn('[CartContext] Failed to sync cart to backend:', err.message)
    }
  }, [])

  // Auto-sync when items change or when user logs in
  useEffect(() => {
    if (isSignedIn && user) {
      syncCartToBackend(items, user)

      // If user had a pending property clicked before login, auto-add it now
      try {
        const pending = localStorage.getItem('reon_pending_cart_item')
        if (pending) {
          const parsedPending = JSON.parse(pending)
          localStorage.removeItem('reon_pending_cart_item')
          addItem(parsedPending)
        }
      } catch {}
    }
  }, [isSignedIn, user])

  const persist = (newItems) => {
    setItems(newItems)
    localStorage.setItem('reon_cart', JSON.stringify(newItems))
    if (isSignedIn && user) {
      syncCartToBackend(newItems, user)
    }
  }

  const addItem = useCallback((property) => {
    if (!property) return
    const propId = String(property.id || property._id || '')
    if (!propId) return

    setItems(prev => {
      const exists = prev.find(item => String(item.id || item._id) === propId)
      if (exists) return prev

      const itemToSave = {
        ...property,
        id: propId,
        _id: propId,
        name: property.name || property.title || 'Property Listing',
        title: property.title || property.name || 'Property Listing',
        price: property.price || 'Price on Request',
        location: property.location || '',
        image: property.image || property.images?.[0] || property.img || '/images/placeholder.jpg',
        type: property.type || property.bhk || property.configurations || '',
        area: property.area || '',
        status: property.status || 'Ready to Move',
        reraNumber: property.reraNumber || '',
        developer: property.developer || property.developedBy || '',
        possession: property.possession || property.possessionDate || '',
        bedrooms: property.bedrooms || '',
        bathrooms: property.bathrooms || '',
        amenities: property.amenities || [],
        highlights: property.highlights || [],
        connectivity: property.connectivity || [],
        addedAt: Date.now()
      }

      const next = [...prev, itemToSave]
      localStorage.setItem('reon_cart', JSON.stringify(next))
      if (isSignedIn && user) {
        syncCartToBackend(next, user)
      }
      return next
    })

    setLastActionToast(`Added "${property.name || property.title || 'Property'}" to your shortlist!`)
    setTimeout(() => setLastActionToast(''), 3500)
  }, [isSignedIn, user, syncCartToBackend])

  const removeItem = useCallback((id) => {
    if (!id) return
    const targetId = String(id)

    setItems(prev => {
      const next = prev.filter(item => String(item.id || item._id) !== targetId)
      localStorage.setItem('reon_cart', JSON.stringify(next))
      if (isSignedIn && user) {
        syncCartToBackend(next, user)
      }
      return next
    })

    setLastActionToast('Removed property from your shortlist.')
    setTimeout(() => setLastActionToast(''), 3000)
  }, [isSignedIn, user, syncCartToBackend])

  const toggleCartItem = useCallback((property) => {
    if (!property) return
    const propId = String(property.id || property._id || '')
    if (!propId) return

    const alreadyInCart = items.some(item => String(item.id || item._id) === propId)
    if (alreadyInCart) {
      removeItem(propId)
    } else {
      addItem(property)
    }
  }, [items, addItem, removeItem])

  const clearCart = useCallback(() => {
    persist([])
  }, [isSignedIn, user])

  const isInCart = useCallback((id) => {
    if (!id) return false
    const targetId = String(id)
    return items.some(item => String(item.id || item._id) === targetId)
  }, [items])

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      toggleCartItem,
      clearCart,
      isInCart,
      count: items.length,
      lastActionToast
    }}>
      {children}
    </CartContext.Provider>
  )
}

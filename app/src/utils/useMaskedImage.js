import { useState, useEffect } from 'react'
import { formatDirectImageUrl, getOptimizedImageUrl } from './mediaUrlUtils.js'

/**
 * Encodes a remote image URL into a protected /api/media/view endpoint on your domain,
 * or serves direct Google CDN image streams for ultra-fast loading without bottlenecks.
 */
export function toProtectedMediaUrl(rawUrl, propertyRef = '', width = 800) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl
  const directUrl = getOptimizedImageUrl(rawUrl, width)
  if (!directUrl) return rawUrl

  if (directUrl.startsWith('blob:') || directUrl.startsWith('data:') || directUrl.startsWith('/api/media/')) {
    return directUrl
  }

  // High-speed Google Drive CDN direct delivery
  if (directUrl.includes('googleusercontent.com') || directUrl.includes('drive.google.com')) {
    return directUrl
  }

  try {
    const payload = JSON.stringify({ u: directUrl, p: String(propertyRef || 'reon'), t: Date.now() })
    const b64 = btoa(unescape(encodeURIComponent(payload)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    return `/api/media/view?token=${b64}&ref=${encodeURIComponent(propertyRef || 'reon')}`
  } catch {
    return directUrl
  }
}

/**
 * Hook to convert raw image URLs into protected website API URLs
 */
export function useMaskedImages(urls = [], propertyRef = '') {
  const [maskedUrls, setMaskedUrls] = useState(() => {
    if (!Array.isArray(urls)) return []
    return urls.map((u) => {
      if (typeof u !== 'string') return u
      return toProtectedMediaUrl(u, propertyRef)
    })
  })

  useEffect(() => {
    if (!Array.isArray(urls) || urls.length === 0) {
      setMaskedUrls([])
      return
    }

    const currentList = urls.map((u) => {
      if (typeof u !== 'string') return u
      return toProtectedMediaUrl(u, propertyRef)
    })
    setMaskedUrls([...currentList])
  }, [JSON.stringify(urls), propertyRef])

  return maskedUrls
}

/**
 * Hook for single image URL masking
 */
export function useMaskedImage(url, propertyRef = '') {
  const [maskedList] = useMaskedImages(url ? [url] : [], propertyRef)
  return maskedList?.[0] || url
}

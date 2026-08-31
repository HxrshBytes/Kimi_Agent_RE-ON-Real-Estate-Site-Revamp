/**
 * Map link utility helpers to sanitize and transform Google Maps URLs
 * Handles HTML entities (&#038;, &amp;), iframe embeds, Google place URLs, shortlinks, and queries.
 */

export function sanitizeMapUrl(input) {
  if (!input || typeof input !== 'string') return ''
  let cleaned = input.trim()

  // 1. If an iframe snippet was pasted: <iframe src="https://..." ...></iframe>
  const iframeSrcMatch = cleaned.match(/src=["']([^"']+)["']/i)
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    cleaned = iframeSrcMatch[1]
  }

  // 2. Decode HTML entities (e.g. &#038;, &amp;, &#38;, etc.)
  cleaned = cleaned
    .replace(/&#0*38;/gi, '&')
    .replace(/&amp;/gi, '&')
    .replace(/&#0*34;/gi, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#0*60;/gi, '<')
    .replace(/&lt;/gi, '<')
    .replace(/&#0*62;/gi, '>')
    .replace(/&gt;/gi, '>')
    .trim()

  return cleaned
}

export function getGoogleMapsEmbedUrl(mapLink, fallbackQuery = '') {
  const cleaned = sanitizeMapUrl(mapLink)
  const defaultQuery = (fallbackQuery || '').trim() || 'Navi Mumbai, Maharashtra'

  if (!cleaned) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(defaultQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  }

  // If it's already an embed URL
  if (cleaned.includes('/maps/embed')) {
    return cleaned
  }

  if (cleaned.includes('output=embed')) {
    return cleaned
  }

  // If it's a standard maps.google.com or google.com/maps URL
  if (cleaned.includes('maps.google.com') || cleaned.includes('google.com/maps')) {
    try {
      const urlObj = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`)
      const q = urlObj.searchParams.get('q') || urlObj.searchParams.get('query')
      if (q) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
      }

      // Check for /maps/place/Place+Name/
      const placeMatch = cleaned.match(/\/maps\/place\/([^/@?]+)/)
      if (placeMatch && placeMatch[1]) {
        const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
        return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
      }

      // Check for coordinates /@19.0811,73.0965
      const coordMatch = cleaned.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (coordMatch) {
        return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&t=&z=15&ie=UTF8&iwloc=&output=embed`
      }
    } catch {
      // ignore parse error and continue
    }
  }

  // Shortlinks like maps.app.goo.gl or other search engine maps cannot be embedded directly in an iframe
  // Use the reliable property address/name fallback query for the iframe
  if (cleaned.startsWith('http')) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(defaultQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  }

  // If plain search query or address was provided
  return `https://maps.google.com/maps?q=${encodeURIComponent(cleaned || defaultQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
}

export function getGoogleMapsDirectUrl(mapLink, fallbackQuery = '') {
  const cleaned = sanitizeMapUrl(mapLink)
  const defaultQuery = (fallbackQuery || '').trim() || 'Navi Mumbai, Maharashtra'

  if (!cleaned) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(defaultQuery)}`
  }

  if (cleaned.startsWith('http')) {
    // If it's an output=embed URL, remove output=embed for better interactive viewing in new tab
    if (cleaned.includes('output=embed')) {
      return cleaned.replace(/[?&]output=embed/gi, '').replace(/\?&/, '?')
    }
    return cleaned
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleaned || defaultQuery)}`
}

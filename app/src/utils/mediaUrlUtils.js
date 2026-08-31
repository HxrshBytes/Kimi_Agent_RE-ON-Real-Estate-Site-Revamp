/**
 * Utility to convert various Google Drive, OneDrive, Dropbox, and third-party media links
 * into high-resolution direct embeddable image URLs.
 */

/**
 * Extracts Google Drive file ID from various link formats:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 * - https://lh3.googleusercontent.com/d/FILE_ID
 * - https://docs.google.com/uc?id=FILE_ID
 */
export function parseGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return null

  const trimmed = url.trim()

  // Match /file/d/ID
  const fileDMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1]
  }

  // Match ?id=ID or &id=ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i)
  if ((trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) && idParamMatch && idParamMatch[1]) {
    return idParamMatch[1]
  }

  // Match googleusercontent.com/d/ID
  const userContentMatch = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i)
  if (userContentMatch && userContentMatch[1]) {
    return userContentMatch[1]
  }

  return null
}

/**
 * Converts a raw image URL (including Google Drive, Dropbox, OneDrive, Cloudinary, etc.)
 * into a direct high-resolution image URL.
 */
export function formatDirectImageUrl(url, targetWidth = null) {
  if (!url || typeof url !== 'string') return ''

  let trimmed = url.trim()
  if (!trimmed) return ''

  // 1. Google Drive Conversion
  const gdriveId = parseGoogleDriveUrl(trimmed)
  if (gdriveId) {
    // If targetWidth is provided (e.g. 600, 800, 1200), Google CDN resizes and compresses on the fly
    const widthParam = targetWidth ? `=w${targetWidth}` : '=w1200'
    return `https://lh3.googleusercontent.com/d/${gdriveId}${widthParam}`
  }

  // 2. Dropbox Direct Link Conversion (dl=0 -> raw=1)
  if (trimmed.includes('dropbox.com')) {
    trimmed = trimmed.replace(/\?dl=0/g, '?raw=1').replace(/&dl=0/g, '&raw=1')
    if (!trimmed.includes('raw=1') && !trimmed.includes('dl=1')) {
      trimmed += (trimmed.includes('?') ? '&' : '?') + 'raw=1'
    }
    return trimmed
  }

  // 3. OneDrive direct embed link
  if (trimmed.includes('1drv.ms') || trimmed.includes('onedrive.live.com')) {
    if (trimmed.includes('view.aspx')) {
      trimmed = trimmed.replace('view.aspx', 'download.aspx')
    }
    return trimmed
  }

  return trimmed
}

/**
 * Returns a lightweight, responsive CDN-optimized image URL
 * for fast loading on low-end devices and mobile connections.
 */
export function getOptimizedImageUrl(url, width = 700) {
  if (!url || typeof url !== 'string') return ''
  const direct = formatDirectImageUrl(url, width)
  if (!direct) return url

  // If already googleusercontent, ensure width parameter
  if (direct.includes('googleusercontent.com/d/')) {
    if (!direct.includes('=w') && !direct.includes('=s')) {
      return `${direct}=w${width}`
    }
    return direct
  }

  // Unsplash CDN resizing
  if (direct.includes('images.unsplash.com')) {
    try {
      const u = new URL(direct)
      u.searchParams.set('w', String(width))
      u.searchParams.set('q', '75')
      u.searchParams.set('auto', 'format')
      return u.toString()
    } catch {
      return direct
    }
  }

  return direct
}

/**
 * Normalizes multi-line / comma-separated / space-separated image inputs
 * with automatic Google Drive parsing and NO limitation on count.
 */
export function normalizeMediaUrls(value) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? formatDirectImageUrl(item) : ''))
      .filter(Boolean)
  }

  const rawLines = String(value)
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean)

  const normalized = []
  for (const line of rawLines) {
    // If a line contains multiple URLs separated by spaces
    const parts = line.split(/\s+/).filter(Boolean)
    for (const part of parts) {
      if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('data:') || part.startsWith('blob:') || part.startsWith('/')) {
        normalized.push(formatDirectImageUrl(part))
      } else if (part.length > 5) {
        normalized.push(formatDirectImageUrl(part))
      }
    }
  }

  return normalized
}

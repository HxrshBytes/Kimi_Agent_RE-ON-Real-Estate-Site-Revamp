/**
 * Extract the first RERA number from a potentially multi-value string.
 */
export function getFirstReraNumber(reraString) {
  if (!reraString || !reraString.trim()) return null
  const parts = reraString.trim().split(/[,;&\/]+|\band\b/i).map((s) => s.trim()).filter(Boolean)
  return parts[0] || null
}

/**
 * Build the MahaRERA website URL for a given RERA number.
 * Directly filters the official MahaRERA portal to show that exact project registration.
 */
export function getReraUrl(reraNumber) {
  const cleanRera = getFirstReraNumber(reraNumber)
  if (cleanRera) {
    return `https://maharera.maharashtra.gov.in/projects-search-result?project_name=${encodeURIComponent(cleanRera)}`
  }
  return 'https://maharera.maharashtra.gov.in/projects-search-result'
}

/**
 * Handle clicking on a RERA number: copies the RERA number to clipboard for convenience.
 */
export function handleReraClick(e, reraNumber) {
  if (e && e.stopPropagation) {
    e.stopPropagation()
  }
  const cleanRera = getFirstReraNumber(reraNumber)
  if (cleanRera && navigator && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      navigator.clipboard.writeText(cleanRera)
    } catch {
      // ignore clipboard error
    }
  }
}

/**
 * Format RERA number for display on property cards.
 * If multiple RERA numbers are present, displays the first one followed by ellipsis.
 * If no RERA number is present, returns 'RERA No: Coming Soon'.
 */
export function formatCardRera(reraString) {
  if (!reraString || !reraString.trim()) return 'RERA No: Coming Soon'
  const raw = reraString.trim()
  const parts = raw.split(/[,;&\/]+|\band\b/i).map((s) => s.trim()).filter(Boolean)
  if (parts.length > 1) {
    return `RERA Verified: ${parts[0]}...`
  }
  return `RERA Verified: ${raw}`
}

/**
 * Format property type for display on property cards.
 * Strips words like "Apartment"/"Flat" and formats single or multiple BHKs cleanly (e.g. "1 BHK", "1 & 2 BHK", "1, 2 & 3 BHK").
 * Accurately reflects what is stored in the database.
 */
export function formatCardType(typeStr) {
  if (Array.isArray(typeStr)) {
    typeStr = typeStr.filter(Boolean).join(', ')
  }
  if (!typeStr || typeof typeStr !== 'string' || !typeStr.trim()) {
    return '2 BHK/more'
  }
  
  let str = typeStr.trim()
  const alreadyHasMore = /\/\s*more/i.test(str)
  if (alreadyHasMore) {
    str = str.replace(/\/\s*more/i, '').trim()
  }

  const hasBHK = /bhk/i.test(str)
  const hasRK = /(\d+)?\s*rk\b/i.test(str)
  const hasStudio = /\bstudio\b/i.test(str)
  const isCommercial = /\b(commercial|office|shop|retail|showroom)\b/i.test(str)
  const isPlot = /\b(plot|land)\b/i.test(str)
  const isVilla = /\bvilla\b/i.test(str)
  const isPenthouse = /\bpenthouse\b/i.test(str)

  // Non-residential types: preserve cleanly without converting numbers to BHK
  if (isCommercial && !hasBHK && !hasRK) {
    return str.replace(/apartments?|flats?/gi, '').replace(/^[\s,/&]+|[\s,/&]+$/g, '').trim() || 'Commercial'
  }
  if (isPlot && !hasBHK && !hasRK) {
    return str.replace(/apartments?|flats?/gi, '').replace(/^[\s,/&]+|[\s,/&]+$/g, '').trim() || 'Plot'
  }

  // Pure RK or Studio
  if (hasRK && !hasBHK) {
    const rkMatch = str.match(/(\d+)\s*rk/i)
    const rkVal = rkMatch ? `${rkMatch[1]} RK` : '1 RK'
    return `${rkVal}/more`
  }
  if (hasStudio && !hasBHK && !hasRK) {
    return 'Studio'
  }

  // BHK or mixed BHK configurations
  if (hasBHK) {
    const numbers = []
    const bhkPart = str.replace(/apartments?|flats?/gi, '')
    
    // Explicit X BHK or XBHK matches (e.g. "1 BHK", "2BHK", "1 BHK, 2 BHK", "2BHK/more")
    const explicitMatches = [...bhkPart.matchAll(/(\d+)\s*bhk/gi)]
    if (explicitMatches.length > 0) {
      explicitMatches.forEach(m => numbers.push(parseInt(m[1], 10)))
    }
    
    // Multi BHK patterns like '1, 2 BHK', '1 & 2 BHK', '1/2 BHK', '1, 2, 3 BHK'
    const listMatches = [...bhkPart.matchAll(/(\d+)(?:\s*[,&/+]|\s+and\s+)+\s*(\d+)(?:(?:\s*[,&/+]|\s+and\s+)\s*(\d+))?(?:(?:\s*[,&/+]|\s+and\s+)\s*(\d+))?\s*bhk/gi)]
    for (const match of listMatches) {
      for (let i = 1; i <= 4; i++) {
        if (match[i]) numbers.push(parseInt(match[i], 10))
      }
    }

    const uniqueNums = [...new Set(numbers)].filter(n => n > 0 && n <= 10).sort((a, b) => a - b)
    
    if (uniqueNums.length > 0) {
      let bhkText = ''
      if (uniqueNums.length === 1) {
        bhkText = `${uniqueNums[0]} BHK`
      } else if (uniqueNums.length === 2) {
        bhkText = `${uniqueNums[0]} & ${uniqueNums[1]} BHK`
      } else {
        const last = uniqueNums.pop()
        bhkText = `${uniqueNums.join(', ')} & ${last} BHK`
      }

      if (hasRK) {
        const rkMatch = str.match(/(\d+)\s*rk/i)
        const rkText = rkMatch ? `${rkMatch[1]} RK` : '1 RK'
        bhkText = `${rkText} & ${bhkText}`
      } else if (hasStudio) {
        bhkText = `Studio & ${bhkText}`
      }

      if (isPenthouse && !bhkText.toLowerCase().includes('penthouse')) {
        bhkText = `${bhkText} Penthouse`
      } else if (isVilla && !bhkText.toLowerCase().includes('villa')) {
        bhkText = `${bhkText} Villa`
      }

      return `${bhkText}/more`
    }
  }

  // Fallback if numbers are present
  const numMatch = str.match(/(\d+)/)
  if (numMatch) {
    return `${numMatch[1]} BHK/more`
  }

  return '2 BHK/more'
}

/**
 * Get CSS status badge class based on property status string.
 */
export function formatStatusClass(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('launch') || s.includes('new')) return 'status--red'
  if (s.includes('ready')) return 'status--green'
  if (s.includes('resell') || s.includes('resale')) return 'status--blue'
  if (s.includes('commercial')) return 'status--blue'
  return 'status--amber'
}


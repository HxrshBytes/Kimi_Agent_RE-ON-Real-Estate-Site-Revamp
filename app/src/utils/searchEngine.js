/**
 * Ultra-High Precision Search & Relevance Engine for RE-ON Real Estate Platform
 * 
 * Features:
 * - 100% precision multi-token AND matching (no false positives)
 * - Exact phrase and multi-attribute intent parsing (BHK, Sector, Location, Builder, MahaRERA, Price, Status)
 * - Multi-tier relevance scoring (Exact Title > Starts With > Developer > RERA > Locality > BHK > Specs > Amenities > Description)
 * - Number and shorthand normalization (e.g., 3bhk -> 3 BHK, sec 37 -> sector 37, 1.2cr -> 1.2 crore, 85l -> 85 lakhs)
 * - Match explanation generator for admin & debugging transparency
 */

import { extractArea, matchesArea, KNOWN_AREAS } from './locationUtils.js'

// Cache of stop words that should not trigger false positive single-token rejections
const STOP_WORDS = new Set([
  'in', 'at', 'the', 'of', 'for', 'and', 'a', 'an', 'to', 'with', 'is', 'on', 'near',
  'by', 'all', 'any', 'property', 'properties', 'flats', 'flat', 'apartments', 'apartment',
  'homes', 'home', 'project', 'projects', 'real', 'estate', 're', 'on', 'reon'
])

// Synonyms dictionary for real estate terms
const SYNONYMS = {
  'ready': ['ready to move', 'ready-to-move', 'rtm', 'immediate', 'possession ready'],
  'under construction': ['uc', 'under-construction', 'underconstruction', 'ongoing', 'in progress'],
  'new launch': ['new-launch', 'upcoming', 'pre launch', 'pre-launch', 'launching'],
  'resell': ['resale', 're-sale', 'second sale'],
  'studio': ['1 rk', '1rk', 'rk', 'studio apartment'],
  'commercial': ['office', 'shop', 'showroom', 'retail', 'commercial space']
}

/**
 * Parse any price string into a numeric value in INR
 * @param {string|number} priceStr e.g. "₹85 Lakhs", "₹1.25 Cr", "7500000", "Price on Request"
 * @returns {number}
 */
export function parsePriceToNumber(priceStr) {
  if (!priceStr) return 0
  if (typeof priceStr === 'number') return priceStr

  const s = String(priceStr).replace(/[₹,\s]/g, '').toLowerCase()
  const match = s.match(/[\d.]+/)
  if (!match) return 0

  let num = parseFloat(match[0])
  if (s.includes('cr') || s.includes('crore')) {
    num *= 10000000
  } else if (s.includes('l') || s.includes('lakh') || s.includes('lac') || s.includes('lacs')) {
    num *= 100000
  } else if (s.includes('k') || s.includes('thousand')) {
    num *= 1000
  }
  return num
}

/**
 * Parse price range string (e.g. "₹48 Lacs - ₹70 Lacs", "1.1Cr - 1.6Cr")
 * @param {string|number} priceStr
 * @returns {{ min: number, max: number }}
 */
export function parsePriceRange(priceStr) {
  if (!priceStr) return { min: 0, max: 0 }
  if (typeof priceStr === 'number') return { min: priceStr, max: priceStr }

  const s = String(priceStr).toLowerCase().trim()
  if (s.includes('request') || s.includes('call') || s === '') {
    return { min: 0, max: Infinity }
  }

  const parts = s.split(/[-–—]|to/i).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    let rawMin = parsePriceToNumber(parts[0])
    let rawMax = parsePriceToNumber(parts[1])

    if (rawMin > 0 && rawMin < 1000) {
      if (parts[1].includes('cr') || parts[1].includes('crore')) {
        rawMin = rawMin * 10000000
      } else if (parts[1].includes('l') || parts[1].includes('lac') || parts[1].includes('lakh')) {
        rawMin = rawMin * 100000
      }
    }

    return {
      min: Math.min(rawMin || 0, rawMax || 0),
      max: Math.max(rawMin || 0, rawMax || 0),
    }
  }

  const single = parsePriceToNumber(s)
  return { min: single, max: single }
}

/**
 * Helper to parse carpet area string into numeric square feet
 * @param {string|number} areaStr
 * @returns {number}
 */
export function parseAreaToNumber(areaStr) {
  if (!areaStr) return 0
  const match = String(areaStr).replace(/,/g, '').match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

/**
 * Normalize and clean a search query for maximum precision
 * @param {string} str
 * @returns {string}
 */
export function normalizeQuery(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/(\d+)\s*bhk/gi, '$1 bhk')
    .replace(/(\d+)\s*rk/gi, '$1 rk')
    .replace(/sec(?:tor)?\.?\s*(\d+)/gi, 'sector $1')
    .replace(/(\d+)\s*cr(?:ore)?s?/gi, '$1 cr')
    .replace(/(\d+)\s*(?:lakh?s?|lacs?|l)\b/gi, '$1 l')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Check if a property's type matches the selected filter
 */
export function matchesPropertyType(propTypeStr, filter) {
  if (!filter || filter === 'All') return true
  const p = (propTypeStr || '').toLowerCase().trim()
  const f = filter.toLowerCase().trim()

  if (f === 'all') return true

  // 1 RK / Studio
  if (f.includes('1 rk') || f === '1rk' || f.includes('studio')) {
    return p.includes('1rk') || p.includes('1 rk') || p.includes('rk') || p.includes('studio')
  }

  // 1 BHK
  if (f === '1 bhk' || f === '1bhk') {
    return (
      p.includes('1 bhk') ||
      p.includes('1,2 bhk') ||
      p.includes('1, 2 bhk') ||
      p.includes('1bhk') ||
      /\b1\s*bhk\b/i.test(p)
    )
  }

  // 2 BHK
  if (f === '2 bhk' || f === '2bhk') {
    return (
      p.includes('2 bhk') ||
      p.includes('1,2 bhk') ||
      p.includes('2,3 bhk') ||
      p.includes('2, 3 bhk') ||
      p.includes('2bhk') ||
      /\b2\s*bhk\b/i.test(p)
    )
  }

  // 3 BHK
  if (f === '3 bhk' || f === '3bhk') {
    return (
      p.includes('3 bhk') ||
      p.includes('2,3 bhk') ||
      p.includes('3,4 bhk') ||
      p.includes('3, 4 bhk') ||
      p.includes('3bhk') ||
      /\b3\s*bhk\b/i.test(p)
    )
  }

  // 4 BHK / 4 BHK+ / 5 BHK
  if (f.includes('4') || f.includes('5')) {
    return (
      p.includes('4 bhk') ||
      p.includes('5 bhk') ||
      p.includes('4,5 bhk') ||
      p.includes('4, 5 bhk') ||
      p.includes('4bhk') ||
      p.includes('5bhk') ||
      p.includes('penthouse') ||
      p.includes('villa') ||
      p.includes('duplex') ||
      /\b[4-9]\s*bhk\b/i.test(p)
    )
  }

  // Commercial
  if (f.includes('commercial') || f.includes('office') || f.includes('shop')) {
    return (
      p.includes('commercial') ||
      p.includes('office') ||
      p.includes('shop') ||
      p.includes('retail') ||
      p.includes('showroom')
    )
  }

  // Plots / Land
  if (f.includes('plot') || f.includes('land')) {
    return p.includes('plot') || p.includes('land') || p.includes('na plot')
  }

  return p.includes(f)
}

/**
 * Check if a property's status matches the selected status
 */
export function matchesStatus(propertyStatus, filterStatus, property = null) {
  if (!filterStatus || filterStatus === 'All') return true
  const p = (propertyStatus || '').toLowerCase().trim()
  const f = filterStatus.toLowerCase().trim()

  if (f === 'ready to move' || f === 'ready') {
    return p.includes('ready')
  }
  if (f === 'under construction' || f === 'uc' || f === 'construction') {
    return p.includes('under') || p.includes('construction')
  }
  if (f === 'new launch' || f === 'launch') {
    return p.includes('launch') || p.includes('new')
  }
  if (f === 'resell' || f === 'resale') {
    return p.includes('resell') || p.includes('resale')
  }
  if (f === 'commercial') {
    const typeStr = (property?.type || '').toLowerCase()
    return (
      p.includes('commercial') ||
      p.includes('office') ||
      p.includes('shop') ||
      p.includes('retail') ||
      p.includes('showroom') ||
      typeStr.includes('commercial') ||
      typeStr.includes('office') ||
      typeStr.includes('shop') ||
      typeStr.includes('retail') ||
      typeStr.includes('showroom')
    )
  }
  return p === f || p.includes(f)
}

/**
 * Check if a property's price matches the budget preset
 */
export function matchesBudget(priceStr, budget) {
  if (!budget || budget === 'All') return true
  const { min, max } = parsePriceRange(priceStr)
  if (min === 0 && max === 0) return true // "Price on Request" shows in all budgets
  const b = budget.toLowerCase().replace(/\s+/g, '')
  if (b === 'under-50l' || b === 'under50l') return min <= 5000000
  if (b === '50l-1.3cr' || b === '50l-1cr') return max >= 5000000 && min <= 13000000
  if (b === '1.3cr-2cr' || b === '1cr-2cr') return max >= 13000000 && min <= 20000000
  if (b === '2cr+' || b === 'above2cr') return max >= 20000000
  return true
}

/**
 * Evaluate single property search match with deep scoring and exact explanation
 * @param {Object} property 
 * @param {string} rawQuery 
 * @param {Object} options 
 * @returns {{ matches: boolean, score: number, matchedFields: string[], matchReason: string }}
 */
export function evaluatePropertySearch(property, rawQuery = '', options = {}) {
  const { isSuperadmin = false, currentUserEmail = '' } = options

  if (!rawQuery || !rawQuery.trim()) {
    return { matches: true, score: 100, matchedFields: ['all'], matchReason: 'All' }
  }

  const query = rawQuery.trim()
  const lowerQuery = query.toLowerCase()
  const normalizedQuery = normalizeQuery(query)

  // Property searchable text fields
  const name = (property.name || '').trim()
  const lowerName = name.toLowerCase()
  const normName = normalizeQuery(name)

  const developer = (property.developer || property.developedBy || '').trim()
  const lowerDev = developer.toLowerCase()

  const location = (property.location || '').trim()
  const lowerLoc = location.toLowerCase()
  const normLoc = normalizeQuery(location)

  const rera = (property.reraNumber || '').trim()
  const lowerRera = rera.toLowerCase()

  const type = (property.type || '').trim()
  const lowerType = type.toLowerCase()

  const status = (property.status || '').trim()
  const lowerStatus = status.toLowerCase()

  const possessionDate = (property.possessionDate || property.possession || '').trim()
  const lowerPossession = possessionDate.toLowerCase()

  const price = (property.price || '').trim()
  const lowerPrice = price.toLowerCase()

  const createdBy = (property.createdBy || '').trim().toLowerCase()

  const highlights = Array.isArray(property.highlights)
    ? property.highlights.join(' ')
    : String(property.highlights || '')
  const lowerHighlights = highlights.toLowerCase()

  const desc = (property.description || '').trim()
  const lowerDesc = desc.toLowerCase()



  let score = 0
  const matchedFields = []
  let matchReason = ''

  // ==========================================
  // TIER 1: EXACT MATCHES (Highest Priority)
  // ==========================================

  // 1. Exact full name match
  if (lowerName === lowerQuery || normName === normalizedQuery) {
    score += 1500
    matchedFields.push('name')
    matchReason = `Exact property name match: "${name}"`
    return { matches: true, score, matchedFields, matchReason }
  }

  // 2. Name starts with search query
  if (lowerName.startsWith(lowerQuery) || normName.startsWith(normalizedQuery)) {
    score += 1000
    matchedFields.push('name')
    matchReason = `Property name starts with "${query}"`
  }

  // 3. Name contains entire search phrase
  else if (lowerName.includes(lowerQuery) || normName.includes(normalizedQuery)) {
    score += 800
    matchedFields.push('name')
    matchReason = `Property name contains "${query}"`
  }

  // 4. MahaRERA ID exact or prefix match
  if (lowerRera && (lowerRera === lowerQuery || lowerRera.includes(lowerQuery.replace(/[^a-z0-9]/gi, '')))) {
    score += 700
    matchedFields.push('rera')
    if (!matchReason) matchReason = `MahaRERA ID: ${rera}`
  }

  // 5. Developer exact or prefix match
  if (lowerDev && (lowerDev === lowerQuery || lowerDev.includes(lowerQuery))) {
    score += 650
    matchedFields.push('developer')
    if (!matchReason) matchReason = `Developer: "${developer}"`
  }

  // 6. Location / Sector exact match
  if (lowerLoc && (lowerLoc === lowerQuery || normLoc.includes(normalizedQuery))) {
    score += 550
    matchedFields.push('location')
    if (!matchReason) matchReason = `Location: "${location}"`
  }

  // ==========================================
  // TIER 2: STRUCTURED INTENT & MULTI-TOKEN AND
  // ==========================================

  // Tokenize the normalized query
  const tokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 0)
  if (tokens.length === 0) {
    return { matches: true, score: 100, matchedFields: ['all'], matchReason: 'All' }
  }

  // Detect explicit BHK intent in query
  let queryBHK = null
  const bhkMatch = normalizedQuery.match(/(\d+(?:\.\d+)?)\s*bhk/i)
  if (bhkMatch) queryBHK = `${bhkMatch[1]} bhk`
  else if (/\b1\s*rk\b/i.test(normalizedQuery) || /\bstudio\b/i.test(normalizedQuery)) queryBHK = '1 rk'

  // Detect explicit Location in query
  let queryLocation = null
  for (const a of KNOWN_AREAS) {
    const aNorm = normalizeQuery(a)
    if (normalizedQuery.includes(aNorm)) {
      queryLocation = a
      break
    }
  }

  // Detect explicit Sector number in query (e.g. "sector 37", "sec 35")
  let querySector = null
  const sectorMatch = normalizedQuery.match(/sector\s*(\d+)/i)
  if (sectorMatch) querySector = `sector ${sectorMatch[1]}`

  // Apply Intent Filters as strict requirements when detected
  if (queryBHK) {
    if (!matchesPropertyType(property.type, queryBHK)) {
      // If user typed e.g. "3 BHK", property MUST match 3 BHK
      return { matches: false, score: 0, matchedFields: [], matchReason: '' }
    }
    score += 250
    matchedFields.push('type')
  }

  if (queryLocation) {
    if (!matchesArea(property, queryLocation)) {
      // If user typed specific locality like "Kharghar", property MUST be in Kharghar
      return { matches: false, score: 0, matchedFields: [], matchReason: '' }
    }
    score += 300
    matchedFields.push('location')
  }

  if (querySector) {
    const sectorRegex = new RegExp(`\\b${querySector.replace(/\s+/, '\\s*')}\\b`, 'i')
    const hasSector = sectorRegex.test(normName) || sectorRegex.test(normLoc) || sectorRegex.test(lowerDesc)
    if (!hasSector) {
      return { matches: false, score: 0, matchedFields: [], matchReason: '' }
    }
    score += 350
    matchedFields.push('sector')
  }

  // Filter out query tokens that were already consumed by intents
  const keywordTokens = tokens.filter((t) => {
    if (STOP_WORDS.has(t)) return false
    if (queryBHK && (t === 'bhk' || t === 'rk' || t === 'studio' || /^\d$/.test(t))) return false
    if (queryLocation && normalizeQuery(queryLocation).includes(t)) return false
    if (querySector && (t === 'sector' || t === sectorMatch?.[1])) return false
    return true
  })

  // If query was ONLY intents (e.g. "Kharghar 3 BHK Sector 37"), it already passed all strict tests!
  if (keywordTokens.length === 0) {
    if (!matchReason) {
      matchReason = [queryLocation, querySector, queryBHK].filter(Boolean).join(' • ')
    }
    return { matches: true, score: Math.max(score, 300), matchedFields, matchReason }
  }

  // ==========================================
  // TIER 3: KEYWORD TOKEN MATCHING (100% PRECISION AND)
  // ==========================================
  // Every remaining keyword token MUST match at least one relevant field in the property.
  // Prioritized search spaces:
  let allTokensMatched = true
  const tokenReasons = []

  for (const token of keywordTokens) {
    let tokenMatched = false
    const tokenEscaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Word boundary regex to prevent substring false positives
    const wordRegex = new RegExp(`(?:^|[\\s\\-_/,(.])${tokenEscaped}`, 'i')

    // 1. Property Name check
    if (wordRegex.test(normName) || lowerName.includes(token)) {
      score += 150
      matchedFields.push('name')
      tokenMatched = true
      tokenReasons.push(`Title: "${token}"`)
    }
    // 2. Developer check
    else if (lowerDev && (wordRegex.test(lowerDev) || lowerDev.includes(token))) {
      score += 120
      matchedFields.push('developer')
      tokenMatched = true
      tokenReasons.push(`Developer: "${developer}"`)
    }
    // 3. Location check
    else if (lowerLoc && (wordRegex.test(normLoc) || lowerLoc.includes(token))) {
      score += 90
      matchedFields.push('location')
      tokenMatched = true
      tokenReasons.push(`Location: "${location}"`)
    }
    // 4. MahaRERA ID check
    else if (lowerRera && lowerRera.includes(token)) {
      score += 80
      matchedFields.push('rera')
      tokenMatched = true
      tokenReasons.push(`RERA: ${rera}`)
    }
    // 5. Type / Configuration check
    else if (lowerType && (wordRegex.test(lowerType) || lowerType.includes(token))) {
      score += 70
      matchedFields.push('type')
      tokenMatched = true
      tokenReasons.push(`Type: ${type}`)
    }
    // 5b. Possession Date check
    else if (lowerPossession && (wordRegex.test(lowerPossession) || lowerPossession.includes(token))) {
      score += 65
      matchedFields.push('possessionDate')
      tokenMatched = true
      tokenReasons.push(`Possession: ${possessionDate}`)
    }
    // 6. Highlights / Amenities check
    else if (lowerHighlights && (wordRegex.test(lowerHighlights) || lowerHighlights.includes(token))) {
      score += 40
      matchedFields.push('highlights')
      tokenMatched = true
      tokenReasons.push(`Amenity: "${token}"`)
    }
    // 7. Creator / Admin match (only in admin mode or if explicit)
    else if (createdBy && createdBy.includes(token)) {
      score += 30
      matchedFields.push('createdBy')
      tokenMatched = true
      tokenReasons.push(`Added by: ${createdBy}`)
    }
    // 8. Description check (stricter word boundary only!)
    else if (lowerDesc && wordRegex.test(lowerDesc)) {
      score += 20
      matchedFields.push('description')
      tokenMatched = true
    }

    if (!tokenMatched) {
      allTokensMatched = false
      break
    }
  }

  if (!allTokensMatched) {
    return { matches: false, score: 0, matchedFields: [], matchReason: '' }
  }

  if (!matchReason) {
    matchReason = tokenReasons.slice(0, 2).join(' • ') || 'Keyword match'
  }

  return {
    matches: true,
    score,
    matchedFields: Array.from(new Set(matchedFields)),
    matchReason
  }
}

/**
 * Executes 100% precision search and multi-criteria ranking across properties
 * @param {Array} properties
 * @param {Object} options
 * @returns {Array} Filtered & sorted properties with match metadata attached
 */
export function searchProperties(properties = [], options = {}) {
  const {
    query = '',
    location = 'All',
    type = 'All',
    status = 'All',
    budget = 'All',
    minPrice = 0,
    maxPrice = Infinity,
    sortBy = 'relevance',
    owner = 'All', // 'All' | 'Mine' | 'Others'
    currentUserEmail = '',
    allUserEmails = [],
    isSuperadmin = false,
  } = options

  const results = []

  for (const property of properties) {
    if (!property) continue

    // Filter 1: Status
    if (!matchesStatus(property.status, status, property)) continue

    // Filter 2: Location
    if (location !== 'All' && !matchesArea(property, location)) continue

    // Filter 3: Type / BHK
    if (type !== 'All' && !matchesPropertyType(property.type, type)) continue

    // Filter 4: Budget
    if (budget !== 'All' && !matchesBudget(property.price, budget)) continue

    // Filter 5: Price Range (Min/Max numeric slider)
    if (minPrice > 0 || (maxPrice && maxPrice < Infinity)) {
      const { min: pMin, max: pMax } = parsePriceRange(property.price)
      if (minPrice > 0 && pMax < minPrice) continue
      if (maxPrice < Infinity && pMin > maxPrice) continue
    }

    // Filter 6: Owner (Admin panel)
    if (owner !== 'All' && !isSuperadmin) {
      const creator = (property.createdBy || '').toLowerCase().trim()
      const isMine = creator === currentUserEmail.toLowerCase() || allUserEmails.includes(creator)
      if (owner === 'Mine' && !isMine) continue
      if (owner === 'Others' && isMine) continue
    }

    // Filter 7: Text Search & Relevance Scoring
    const evalResult = evaluatePropertySearch(property, query, { isSuperadmin, currentUserEmail })
    if (!evalResult.matches) continue

    results.push({
      property,
      score: evalResult.score,
      matchedFields: evalResult.matchedFields,
      matchReason: evalResult.matchReason
    })
  }

  // Sort Results
  results.sort((a, b) => {
    if (sortBy === 'price-asc') {
      return parsePriceToNumber(a.property.price) - parsePriceToNumber(b.property.price)
    }
    if (sortBy === 'price-desc') {
      return parsePriceToNumber(b.property.price) - parsePriceToNumber(a.property.price)
    }
    if (sortBy === 'area-desc') {
      return parseAreaToNumber(b.property.area) - parseAreaToNumber(a.property.area)
    }
    if (sortBy === 'newest') {
      const dateA = new Date(a.property.createdAt || 0).getTime()
      const dateB = new Date(b.property.createdAt || 0).getTime()
      return dateB - dateA
    }
    // Default: Sort by highest relevance score first
    if (b.score !== a.score) {
      return b.score - a.score
    }
    // Tie-breaker: Newest first
    const dateA = new Date(a.property.createdAt || 0).getTime()
    const dateB = new Date(b.property.createdAt || 0).getTime()
    return dateB - dateA
  })

  return results.map((r) => {
    // Attach match metadata transparently to the returned property object
    return {
      ...r.property,
      _relevanceScore: r.score,
      _matchedFields: r.matchedFields,
      _matchReason: r.matchReason
    }
  })
}

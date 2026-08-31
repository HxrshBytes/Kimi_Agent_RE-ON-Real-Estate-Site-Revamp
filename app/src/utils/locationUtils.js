/**
 * Robust Location & Area Parser for RE-ON Real Estate Platform
 * 
 * Automatically extracts canonical micro-market areas from property records,
 * handling addresses, building names, highway mentions, and project titles.
 */

export const CANONICAL_LOCALITIES = [
  { canonical: 'Taloja', keywords: ['taloja phase 1', 'taloja phase 2', 'taloja phase i', 'taloja phase ii', 'taloja panchanand', 'taloja midc', 'taloja', 'ghotkamp koyana vele', 'ghotkamp', 'koyana vele', 'ghot kamp', 'ghot', 'pisarve', 'rohinjan', 'navade', 'majkur'] },
  { canonical: 'Kopar Khairane', keywords: ['kopar khairane', 'koparkhairane', 'kopar khairne'] },
  { canonical: 'Seawoods', keywords: ['seawoods grand central', 'seawoods'] },
  { canonical: 'CBD Belapur', keywords: ['cbd belapur', 'cbd', 'konkan bhavan', 'belapur'] },
  { canonical: 'Sanpada', keywords: ['sanpada'] },
  { canonical: 'Juinagar', keywords: ['juinagar', 'jui nagar'] },
  { canonical: 'Ghansoli', keywords: ['ghansoli gaon', 'upper ghansoli', 'ghansoli'] },
  { canonical: 'Airoli', keywords: ['airoli'] },
  { canonical: 'Nerul', keywords: ['nerul east', 'nerul west', 'sarsole gaon', 'sarsole', 'nerul'] },
  { canonical: 'Vashi', keywords: ['vashi sector', 'vashi'] },
  { canonical: 'Roadpali', keywords: ['roadpali'] },
  { canonical: 'Kalamboli', keywords: ['kalamboli'] },
  { canonical: 'Kamothe', keywords: ['kamothe', 'khandeshwar', 'mansarovar'] },
  { canonical: 'Karanjade', keywords: ['karanjade'] },
  { canonical: 'Ulwe', keywords: ['bamandongri', 'kharkopar', 'ulwe'] },
  { canonical: 'Dronagiri', keywords: ['dronagiri', 'uran'] },
  { canonical: 'Turbhe', keywords: ['turbhe midc', 'turbhe'] },
  { canonical: 'Kharghar', keywords: ['upper kharghar', 'kharghar'] },
  { canonical: 'Panvel', keywords: ['new panvel', 'old panvel', 'khanda colony', 'palaspe', 'ashte', 'panvel'] }
]

// Backward-compatible KNOWN_AREAS export
export const KNOWN_AREAS = [
  'Ghansoli',
  'Kharghar',
  'Nerul',
  'Panvel',
  'Taloja',
  'Vashi',
  'Seawoods',
  'Roadpali',
  'CBD Belapur',
  'Kalamboli',
  'Sanpada',
  'Juinagar',
  'Turbhe',
  'Airoli',
  'Kopar Khairane',
  'Kamothe',
  'Karanjade',
  'Ulwe',
  'Dronagiri'
]

/**
 * Resolve any raw area string to its canonical parent area name.
 * @param {string} rawArea
 * @returns {string} Canonical area name
 */
export function getCanonicalArea(rawArea) {
  if (!rawArea || rawArea === 'All') return 'All'
  const key = String(rawArea).toLowerCase().trim()
  
  for (const item of CANONICAL_LOCALITIES) {
    if (item.canonical.toLowerCase() === key) return item.canonical
    for (const kw of item.keywords) {
      if (kw === key) return item.canonical
    }
  }

  return rawArea
}

/**
 * Extract the area/locality from a property object.
 * Returns canonical area (e.g. 'Ghansoli', 'Kharghar', 'Nerul', etc.)
 * 
 * @param {Object} property - Property object with `location` and `name` fields
 * @returns {string} Clean canonical area name, or 'Other' if not extractable
 */
export function extractArea(property) {
  if (!property) return 'Other'
  const name = String(property?.name || '').trim()
  const loc = String(property?.location || '').trim()
  const nameLower = name.toLowerCase()
  const locLower = loc.toLowerCase()

  // 1. Explicit locality in Project Title (e.g. 'in Ghansoli', 'Flats in Ghansoli', 'Tata Orbis Ghansoli')
  for (const item of CANONICAL_LOCALITIES) {
    for (const kw of item.keywords) {
      if (
        nameLower.includes(' in ' + kw) ||
        nameLower.includes(' at ' + kw) ||
        nameLower.includes(' near ' + kw) ||
        nameLower.includes('flats in ' + kw) ||
        nameLower.includes('spaces in ' + kw) ||
        nameLower.includes('plots in ' + kw) ||
        nameLower.includes(' – ' + kw) ||
        nameLower.includes(' - ' + kw) ||
        nameLower.includes(' ' + kw + ' –') ||
        nameLower.includes(' ' + kw + ' -') ||
        nameLower.includes(' ' + kw + ' sector') ||
        nameLower.includes(' ' + kw + ' new launch') ||
        nameLower.includes(' ' + kw + ',') ||
        nameLower.endsWith(' ' + kw)
      ) {
        return item.canonical
      }
    }
  }

  // Clean location of highway/road names that cause false positive sub-matches
  const locCleaned = locLower
    .replace(/thane\s*[-–—]?\s*belapur\s*rd/g, 'thane_belapur_road')
    .replace(/sion\s*[-–—]?\s*panvel\s*highway/g, 'sion_panvel_highway')
    .replace(/palm\s*beach\s*road/g, 'palm_beach_road')

  // 2. 'in the heart/centre/center of <Area>' or 'in <Area>'
  const heartMatch = locCleaned.match(/in (?:the (?:heart|centre|center|prime location) of\s+)?(?:at\s+)?(?:sector[\s-]*\d+[a-z]?,?\s*)?([a-z0-9\s-]+?)(?:,\s*(?:navi\s+)?mumbai|\s*$)/i)
  if (heartMatch) {
    const captured = heartMatch[1].trim()
    for (const item of CANONICAL_LOCALITIES) {
      for (const kw of item.keywords) {
        if (captured === kw || captured.startsWith(kw) || captured.includes(kw)) {
          return item.canonical
        }
      }
    }
  }

  // 3. '<Area>, Navi Mumbai' or '<Area>, Mumbai' in location
  for (const item of CANONICAL_LOCALITIES) {
    for (const kw of item.keywords) {
      const pattern = new RegExp('(?:^|[,\\s])' + kw + '(?:,\\s*(?:navi\\s+)?mumbai|\\s*,|\\s*$)', 'i')
      if (pattern.test(locCleaned)) {
        return item.canonical
      }
    }
  }

  // 4. Exact word boundary match in location field
  for (const item of CANONICAL_LOCALITIES) {
    for (const kw of item.keywords) {
      const regex = new RegExp('(?:^|[\\s,.-])' + kw + '(?:[\\s,.-]|$)', 'i')
      if (regex.test(locCleaned)) {
        return item.canonical
      }
    }
  }

  // 5. Fallback: check if keyword appears anywhere in name or location
  const combined = nameLower + ' ' + locCleaned
  for (const item of CANONICAL_LOCALITIES) {
    for (const kw of item.keywords) {
      if (combined.includes(kw)) {
        return item.canonical
      }
    }
  }

  return 'Other'
}

/**
 * Get sorted unique canonical area names from a list of properties.
 * @param {Array} properties
 * @returns {string[]} Sorted list of area names (without 'All')
 */
export function getUniqueAreas(properties = []) {
  const areas = new Set()
  
  for (const p of properties) {
    const area = extractArea(p)
    if (area && area !== 'Other') {
      areas.add(area)
    }
  }

  const sorted = Array.from(areas).sort((a, b) => a.localeCompare(b))
  if (properties.some((p) => extractArea(p) === 'Other')) {
    sorted.push('Other')
  }
  return sorted
}

/**
 * Check if a property matches a selected area filter.
 * Strictly matches canonical area to ensure 100% precision.
 * 
 * @param {Object} property
 * @param {string} selectedArea - Area name to filter by, or 'All'
 * @returns {boolean}
 */
export function matchesArea(property, selectedArea) {
  if (!selectedArea || selectedArea === 'All') return true

  const selCanonical = getCanonicalArea(selectedArea).toLowerCase().trim()
  const propArea = extractArea(property)
  const propCanonical = getCanonicalArea(propArea).toLowerCase().trim()

  return propCanonical === selCanonical
}


/**
 * RE-ON Developer Database — Comprehensive micro-market ↔ developer mapping
 * for Navi Mumbai, Thane & extended MMR region.
 *
 * Used by:
 *  - Revenue OS Analytics (micro-market heatmap & developer affinity)
 *  - Property search engine (developer suggestions)
 *  - Admin CRM (lead-to-developer matching)
 *  - Homepage developer ticker
 */

// ─── Master Developer-to-Area Map ─────────────────────────────────────
export const AREA_DEVELOPERS = {
  'Panvel': [
    'Paradise Group', 'Arihant Superstructures', 'Godrej Properties', 'L&T Realty',
    'Marathon Realty', 'Space India', 'Neel Group', 'K.T. Group', 'Pioneer Group',
    'Future Homes', 'S.S. Developers', 'Prayag Builders & Developers',
    'Sandeep Sawant Group', 'Chaudhari Empire Developers', 'Century Realty',
    'Gami Group', 'Bhagwati Group', 'Haware Properties', 'Kamdhenu Group',
    'Riddhi Siddhi Developers',
  ],
  'Kharghar': [
    'Paradise Group', 'Gami Group', 'Adhiraj Constructions', 'Arihant Superstructures',
    'Godrej Properties', 'Akshar Group', 'Haware Properties', 'Shreeji Group',
    'Today Group', 'Bhagwati Group', 'Regalia Group', 'Mahaavir Universal',
    'L&T Realty', 'Satyam Developers', 'Tharwani Group', 'Neelkanth Group',
    'Kamdhenu Group', 'Gajra Developers',
  ],
  'Nerul': [
    'L&T Realty', 'Gami Group', 'Akshar Group', 'Mahaavir Universal', 'Moraj Group',
    'Shreeji Ventures', 'Paradise Group', 'Haware Properties', 'Arihant Superstructures',
    'Bhagwati Group', 'Satyam Developers', 'Laxmanbhai Construction', 'Gajra Developers',
    'Dosti Realty', 'Neelkanth Group',
  ],
  'Taloja': [
    'Paradise Group', 'Arihant Superstructures', 'Gami Group', 'Space India',
    'Satyam Developers', 'Gajra Developers', 'Kamdhenu Group', 'Raikar Group',
    'Haware Properties', 'Today Group', 'Riddhi Siddhi Developers', 'Neel Group',
    'S.S. Developers', 'Shreeji Group', 'Millennium Group', 'Anant Realty',
    'Qualcon Group', 'Pioneer Group', 'Lakhani Builders', 'Bhagwati Group',
  ],
  'Vashi': [
    'Gami Group', 'L&T Realty', 'Akshar Group', 'Haware Properties', 'Paradise Group',
    'Satyam Developers', 'Juhi Developers', 'Gajra Developers', 'Dosti Realty',
    'Raheja Universal', 'Arihant Superstructures', 'Wadhwa Group', 'Godrej Properties',
    'Marathon Realty', 'Rustomjee', 'Shreeji Group',
  ],
  'Seawoods': [
    'L&T Realty', 'Akshar Group', 'Gami Group', 'Paradise Group', 'Godrej Properties',
    'Arihant Superstructures', 'Dosti Realty', 'Haware Properties', 'Bhagwati Group',
    'Gajra Developers', 'Wadhwa Group', 'Raheja Universal', 'Rustomjee',
    'Marathon Realty', 'Shreeji Group',
  ],
  'Mumbra': [
    'Dosti Realty', 'Lodha Group', 'Kalpataru', 'Hiranandani Group', 'Raheja Universal',
    'Ashar Group', 'Runwal Group', 'Rustomjee', 'Arihant Superstructures',
    'Haware Properties', 'Tharwani Group', 'Neelkanth Group', 'Paradise Group',
    'Shreeji Group',
  ],
  'Kalyan': [
    'Lodha Group', 'Godrej Properties', 'Runwal Group', 'Raheja Universal', 'Rustomjee',
    'Regency Group', 'Tharwani Group', 'Birla Estates', 'Mangeshi Group',
    'Arihant Superstructures', 'Sai Developers', 'Shreeji Group', 'Vikas Developers',
    'Metro Group', 'Saket Group', 'Shree Krishna Developers', 'Mahindra Lifespaces',
    'Kolte-Patil Developers', 'Dosti Realty', 'Ashar Group',
  ],
  'Dombivli': [
    'Lodha Group', 'Runwal Group', 'Godrej Properties', 'Regency Group',
    'Arihant Superstructures', 'Mangeshi Group', 'Tharwani Group', 'Shreeji Group',
    'Globe Group', 'Marathon Realty', 'Rustomjee', 'Dosti Realty', 'Ashar Group',
    'Raheja Universal', 'Kolte-Patil Developers', 'Mahindra Lifespaces',
    'Gajra Developers', 'Neelkanth Group', 'Sai Developers', 'Shree Krishna Developers',
  ],
  'Airoli': [
    'Gami Group', 'L&T Realty', 'Akshar Group', 'Haware Properties',
    'Arihant Superstructures', 'Juhi Developers', 'Gajra Developers', 'Satyam Developers',
    'Paradise Group', 'Shreeji Group', 'Neelkanth Group', 'Rustomjee', 'Wadhwa Group',
    'Dosti Realty', 'Godrej Properties', 'Marathon Realty', 'Raheja Universal',
    'Millennium Group', 'Tharwani Group', 'Bhagwati Group',
  ],
  'Juinagar': [
    'Gami Group', 'L&T Realty', 'Akshar Group', 'Paradise Group',
    'Arihant Superstructures', 'Haware Properties', 'Juhi Developers',
    'Satyam Developers', 'Gajra Developers', 'Bhagwati Group', 'Shreeji Group',
    'Dosti Realty', 'Neelkanth Group', 'Mahaavir Universal', 'Moraj Group',
  ],
  'Sanpada': [
    'Gami Group', 'Akshar Group', 'Paradise Group', 'Arihant Superstructures',
    'Haware Properties', 'Juhi Developers', 'Satyam Developers', 'Gajra Developers',
    'Dosti Realty', 'L&T Realty', 'Wadhwa Group', 'Godrej Properties', 'Shreeji Group',
    'Bhagwati Group', 'Neelkanth Group',
  ],
  'Ulwe': [
    'Paradise Group', 'Gami Group', 'Arihant Superstructures', 'Bhagwati Group',
    'Space India', 'L&T Realty', 'Godrej Properties', 'Satyam Developers',
    'Akshar Group', 'Haware Properties', 'Neelkanth Group', 'Qualcon Group',
    'Riddhi Siddhi Developers', 'Kamdhenu Group', 'Today Group', 'Gajra Developers',
    'Shreeji Group', 'Anant Realty', 'Millennium Group', 'Pioneer Group',
  ],
  'Ghansoli': [
    'Gami Group', 'Akshar Group', 'Haware Properties', 'Arihant Superstructures',
    'Paradise Group', 'Satyam Developers', 'Juhi Developers', 'Gajra Developers',
    'Wadhwa Group', 'Godrej Properties', 'L&T Realty', 'Dosti Realty',
    'Neelkanth Group', 'Shreeji Group', 'Rustomjee',
  ],
  'Kopar Khairane': [
    'Gami Group', 'Haware Properties', 'Akshar Group', 'Arihant Superstructures',
    'Satyam Developers', 'Juhi Developers', 'Paradise Group', 'Gajra Developers',
    'Dosti Realty', 'Shreeji Group', 'Bhagwati Group', 'Neelkanth Group',
    'Wadhwa Group', 'Godrej Properties', 'L&T Realty',
  ],
  'CBD Belapur': [
    'Gami Group', 'Paradise Group', 'Akshar Group', 'Arihant Superstructures',
    'Haware Properties', 'Juhi Developers', 'Satyam Developers', 'Gajra Developers',
    'Dosti Realty', 'L&T Realty', 'Godrej Properties', 'Wadhwa Group',
    'Neelkanth Group', 'Shreeji Group', 'Bhagwati Group',
  ],
}

// ─── Flat unique developer list (for ticker, autocomplete, etc.) ──────
export const ALL_DEVELOPERS = (() => {
  const set = new Set()
  Object.values(AREA_DEVELOPERS).forEach((devs) => devs.forEach((d) => set.add(d)))
  return Array.from(set).sort()
})()

// ─── Lookup: given a developer name, which areas do they operate in? ──
export function getAreasForDeveloper(devName) {
  if (!devName) return []
  const lower = devName.toLowerCase().trim()
  const areas = []
  for (const [area, devs] of Object.entries(AREA_DEVELOPERS)) {
    if (devs.some((d) => d.toLowerCase() === lower)) {
      areas.push(area)
    }
  }
  return areas.sort()
}

// ─── Lookup: given an area, which developers operate there? ───────────
export function getDevelopersForArea(area) {
  if (!area) return []
  const key = Object.keys(AREA_DEVELOPERS).find(
    (k) => k.toLowerCase() === area.toLowerCase().trim()
  )
  return key ? [...AREA_DEVELOPERS[key]] : []
}

// ─── Check if a developer operates in a given area ────────────────────
export function isDeveloperInArea(devName, area) {
  const devs = getDevelopersForArea(area)
  return devs.some((d) => d.toLowerCase() === devName.toLowerCase().trim())
}

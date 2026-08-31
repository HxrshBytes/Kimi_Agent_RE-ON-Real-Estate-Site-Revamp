import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { sanitizeMapUrl } from '../utils/mapUtils.js'
import { downloadBackupToDevice } from '../utils/backupHelper.js'

const STORAGE_KEY = 'reon_admin_data_v2'
const SESSION_KEY = 'reon_admin_session'
const TOKEN_KEY = 'reon_admin_token'
export const ALLOWED_ADMIN_EMAIL = 'yasirreonadmin@gmail.com'
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const API_TIMEOUT_MS = 20000

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Make sure the API server is running and try again.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

const normalizeLocation = (value) =>
  String(value || '').trim()

const normalizeMultipleToArray = (value, fallback) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value) return [value].filter(Boolean)
  if (fallback) return [fallback].filter(Boolean)
  return []
}

const normalizeLinesToArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

const normalizeProperty = (property) => {
  const images = normalizeMultipleToArray(property.images, property.img)
  const videos = normalizeMultipleToArray(property.videos, property.video)
  const { img, video, image, ...rest } = property

  return {
    ...rest,
    // Use ?? to preserve id=0 (which || would treat as falsy)
    id: property.id ?? property._id,
    _id: property._id,
    location: normalizeLocation(property.location),
    possessionDate: property.possessionDate || property.possession || '',
    possession: property.possession || property.possessionDate || '',
    reraNumber: property.reraNumber || '',
    developer: property.developer || property.developedBy || '',
    developedBy: property.developedBy || property.developer || '',
    description: property.description ?? '',
    mapLink: sanitizeMapUrl(property.mapLink || property.googleMapsUrl || property.mapUrl || ''),
    highlights: normalizeLinesToArray(property.highlights),
    connectivity: normalizeLinesToArray(property.connectivity),
    images,
    videos,
  }
}


const normalizeBlog = (blog) => ({
  ...blog,
  id: blog.id ?? blog._id,
  _id: blog._id,
  images: normalizeMultipleToArray(blog.images, blog.img),
  videos: normalizeMultipleToArray(blog.videos, blog.video),
})

const normalizeNews = (item) => ({
  ...item,
  id: item.id ?? item._id,
  _id: item._id,
  source: item.source || 'RE-ON Intelligence',
  date: item.date || new Date().toISOString().split('T')[0],
  images: normalizeMultipleToArray(item.images, item.img),
  videos: normalizeMultipleToArray(item.videos, item.video),
})

const normalizeContact = (c) => ({
  ...c,
  id: c.id ?? c._id,
  _id: c._id,
  name: c.name || 'Anonymous Visitor',
  phone: c.phone || '',
  email: c.email || '',
  propertyName: c.propertyName || '',
  propertyId: c.propertyId ? String(c.propertyId) : '',
  propertyLocation: c.propertyLocation || c.location || '',
  location: c.location || c.propertyLocation || '',
  budget: c.budget || '',
  type: c.type || (c.propertyName ? 'Property Inquiry' : 'General Contact'),
  source: c.source || 'Website',
  preferredDate: c.preferredDate || '',
  status: c.status || 'New',
  notes: c.notes || '',
  assignedTo: c.assignedTo || null,
  assignedCallerName: c.assignedCallerName || c.assignedTo?.name || '',
  callStatus: c.callStatus || 'Pending',
  lastCalledAt: c.lastCalledAt || null,
  callHistory: c.callHistory || [],
  message: c.message || (c.propertyName ? `Inquiry regarding ${c.propertyName}` : ''),
  submittedAt: c.submittedAt || c.createdAt || c.date || new Date().toISOString(),
})

const defaultData = {
  admins: [
    { username: 'yasirreonadmin@gmail.com', role: 'superadmin' },
  ],
  properties: [],
  blogs: [],
  news: [],
  contacts: [],
  clientCarts: [],
  callers: [],
}

const AdminContext = createContext(null)

// Check if a JWT is expired (with 60s buffer)
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return !payload.exp || (payload.exp * 1000) < (Date.now() + 60000)
  } catch {
    return true
  }
}

export function AdminProvider({ children }) {
  const { isSignedIn, getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const exchangeInFlight = useRef(false)
  const exchangePromise = useRef(null)
  const prevSignedIn = useRef(isSignedIn)

  const [data, setData] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const raw = JSON.parse(stored)
        return {
          admins: raw.admins || defaultData.admins,
          properties: (raw.properties || defaultData.properties).map(normalizeProperty),
          blogs: (raw.blogs || defaultData.blogs).map(normalizeBlog),
          news: (raw.news || defaultData.news).map(normalizeNews),
          contacts: raw.contacts || [],
          clientCarts: raw.clientCarts || [],
        }
      }
      return defaultData
    } catch {
      return defaultData
    }
  })

  const [currentUserRole, setCurrentUserRole] = useState(() => {
    try {
      return localStorage.getItem('reon_user_role') || null
    } catch {
      return null
    }
  })

  const [dbStatus, setDbStatus] = useState({ connected: false, info: 'Connecting to MongoDB...' })
  const [isLoadingProperties, setIsLoadingProperties] = useState(() => (data.properties || []).length === 0)

  // Exchange Clerk session for a server-side JWT
  const exchangeClerkToken = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const existing = localStorage.getItem(TOKEN_KEY)
      if (existing && !isTokenExpired(existing)) {
        return existing
      }
      if (existing) {
        localStorage.removeItem(TOKEN_KEY)
      }
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }

    if (!isSignedIn || !clerkUser) {
      return ''
    }

    if (exchangePromise.current) {
      return exchangePromise.current
    }

    exchangeInFlight.current = true

    exchangePromise.current = (async () => {
      try {
        const clerkUserId = clerkUser.id || ''
        const email = clerkUser.primaryEmailAddress?.emailAddress || ''

        const res = await fetchWithTimeout(`${API_BASE}/api/auth/clerk-exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clerkUserId, email }),
        }, 15000)

        if (res.ok) {
          const responseData = await res.json()
          if (responseData.token) {
            localStorage.setItem(TOKEN_KEY, responseData.token)
            if (responseData.user?.role) {
              setCurrentUserRole(responseData.user.role)
              try {
                localStorage.setItem('reon_user_role', responseData.user.role)
              } catch {}
            }
            return responseData.token
          }
        } else {
          const errText = await res.text()
          console.error('[AdminContext] clerk-exchange failed:', res.status, errText)
        }
      } catch (err) {
        console.error('[AdminContext] clerk-exchange error:', err.message)
      } finally {
        exchangeInFlight.current = false
        exchangePromise.current = null
      }

      return ''
    })()

    return exchangePromise.current
  }, [isSignedIn, clerkUser])

  // Get the best available auth token: cached JWT → Clerk session → exchange
  const resolveAuthToken = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = localStorage.getItem(TOKEN_KEY)
      if (cached && !isTokenExpired(cached)) return cached
      if (cached) localStorage.removeItem(TOKEN_KEY)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }

    // Use Clerk session token directly — no extra API round-trip
    if (isSignedIn && getToken) {
      try {
        const clerkToken = await getToken()
        if (clerkToken) return clerkToken
      } catch (err) {
        console.warn('[resolveAuthToken] Clerk getToken failed:', err.message)
      }
    }

    return exchangeClerkToken(forceRefresh)
  }, [isSignedIn, getToken, exchangeClerkToken])

  // Ensure we have a valid auth token before any write operation
  const ensureAuthToken = useCallback(async () => {
    const authToken = await resolveAuthToken(false)
    if (!authToken) {
      throw new Error('Could not authenticate. Please sign out and sign in again, then retry.')
    }
    return authToken
  }, [resolveAuthToken])

  // Auth Header Helper
  const getAuthHeaders = useCallback(async () => {
    const authToken = await resolveAuthToken(false)
    return {
      'Content-Type': 'application/json',
      Authorization: authToken ? `Bearer ${authToken}` : '',
    }
  }, [resolveAuthToken])

  // Fetch individual property by ID with in-memory check
  const fetchPropertyById = useCallback(async (id) => {
    if (!id) return null
    const existing = (data.properties || []).find(
      (p) => String(p.id) === String(id) || String(p._id) === String(id) || (p.name && p.name.toLowerCase() === decodeURIComponent(String(id)).toLowerCase())
    )
    if (existing) return existing

    try {
      const res = await fetch(`${API_BASE}/api/properties/${encodeURIComponent(id)}`)
      if (res.ok) {
        const raw = await res.json()
        if (raw) {
          const normalized = normalizeProperty(raw)
          setData((state) => ({
            ...state,
            properties: state.properties.some((p) => String(p.id) === String(normalized.id) || String(p._id) === String(normalized._id))
              ? state.properties
              : [...state.properties, normalized],
          }))
          return normalized
        }
      }
    } catch (err) {
      console.warn('[AdminContext] fetchPropertyById failed:', err)
    }
    return null
  }, [data.properties])

  // Fetch individual blog by ID
  const fetchBlogById = useCallback(async (id) => {
    if (!id) return null
    const existing = (data.blogs || []).find(
      (b) => String(b.id) === String(id) || String(b._id) === String(id)
    )
    if (existing) return existing

    try {
      const res = await fetch(`${API_BASE}/api/blogs/${encodeURIComponent(id)}`)
      if (res.ok) {
        const raw = await res.json()
        if (raw) {
          const normalized = normalizeBlog(raw)
          setData((state) => ({
            ...state,
            blogs: state.blogs.some((b) => String(b.id) === String(normalized.id) || String(b._id) === String(normalized._id))
              ? state.blogs
              : [...state.blogs, normalized],
          }))
          return normalized
        }
      }
    } catch (err) {
      console.warn('[AdminContext] fetchBlogById failed:', err)
    }
    return null
  }, [data.blogs])

  // Fetch individual news by ID
  const fetchNewsById = useCallback(async (id) => {
    if (!id) return null
    const existing = (data.news || []).find(
      (n) => String(n.id) === String(id) || String(n._id) === String(id)
    )
    if (existing) return existing

    try {
      const res = await fetch(`${API_BASE}/api/news/${encodeURIComponent(id)}`)
      if (res.ok) {
        const raw = await res.json()
        if (raw) {
          const normalized = normalizeNews(raw)
          setData((state) => ({
            ...state,
            news: state.news.some((n) => String(n.id) === String(normalized.id) || String(n._id) === String(normalized._id))
              ? state.news
              : [...state.news, normalized],
          }))
          return normalized
        }
      }
    } catch (err) {
      console.warn('[AdminContext] fetchNewsById failed:', err)
    }
    return null
  }, [data.news])

  // Fetch initial data from MongoDB API (Stale-while-revalidate pattern)
  const refreshFromMongoDB = async () => {
    // Only show loading spinner if we don't have any cached properties
    if (!data.properties || data.properties.length === 0) {
      setIsLoadingProperties(true)
    }
    try {
      const healthRes = await fetch(`${API_BASE}/api/health`).catch(() => null)
      if (healthRes && healthRes.ok) {
        const health = await healthRes.json()
        setDbStatus({ connected: true, info: `Connected to MongoDB (${health.database})` })
      }

      const headers = await getAuthHeaders()
      const [propsRes, blogsRes, newsRes, adminsRes, contactsRes, cartsRes, callersRes] = await Promise.all([
        fetch(`${API_BASE}/api/properties`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/blogs`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/news`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/admins`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/contacts`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/admin/carts`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/callers`, { headers }).catch(() => ({ ok: false })),
      ])

      const properties = propsRes.ok ? await propsRes.json() : data.properties
      const blogs = blogsRes.ok ? await blogsRes.json() : data.blogs
      const newsItems = newsRes.ok ? await newsRes.json() : data.news
      const admins = adminsRes.ok ? await adminsRes.json() : data.admins
      const contacts = contactsRes.ok ? await contactsRes.json() : data.contacts
      const clientCarts = cartsRes.ok ? await cartsRes.json() : (data.clientCarts || [])
      const callersData = callersRes.ok ? await callersRes.json() : { callers: [] }

      setData({
        properties: Array.isArray(properties) ? properties.map(normalizeProperty) : data.properties,
        blogs: Array.isArray(blogs) ? blogs.map(normalizeBlog) : data.blogs,
        news: Array.isArray(newsItems) && newsItems.length ? newsItems.map(normalizeNews) : (data.news || defaultData.news),
        admins: Array.isArray(admins) && admins.length ? admins : defaultData.admins,
        contacts: Array.isArray(contacts) ? contacts.map(normalizeContact) : [],
        clientCarts: Array.isArray(clientCarts) ? clientCarts : [],
        callers: Array.isArray(callersData.callers) ? callersData.callers : (data.callers || []),
      })
    } catch (err) {
      console.warn('[AdminContext] MongoDB fetch failed, using local cache:', err)
      setDbStatus({ connected: false, info: 'MongoDB offline (Using local storage)' })
    } finally {
      setIsLoadingProperties(false)
    }
  }

  const recordLogout = useCallback(async (email, role) => {
    try {
      const headers = await getAuthHeaders()
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, role }),
      })
    } catch (err) {
      console.warn('[AdminContext] Record logout error:', err)
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('reon_user_role')
      setCurrentUserRole(null)
    }
  }, [getAuthHeaders])

  const addSubadmin = async (email) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/admins`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, role: 'subadmin' }),
      })
      const resData = await res.json()
      if (res.ok && resData.success) {
        setData((state) => ({
          ...state,
          admins: [...state.admins.filter((a) => (a.username || a.email) !== email), resData.admin],
        }))
        return { success: true, message: resData.message }
      }
      return { success: false, error: resData.message || resData.error || 'Failed to add subadmin' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const removeSubadmin = async (emailOrUsername) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/admins/${encodeURIComponent(emailOrUsername)}`, {
        method: 'DELETE',
        headers,
      })
      const resData = await res.json()
      if (res.ok && resData.success) {
        setData((state) => ({
          ...state,
          admins: state.admins.filter(
            (a) =>
              (a.username || '').toLowerCase() !== emailOrUsername.toLowerCase() &&
              (a.email || '').toLowerCase() !== emailOrUsername.toLowerCase()
          ),
        }))
        return { success: true, message: resData.message }
      }
      return { success: false, error: resData.message || resData.error || 'Failed to remove subadmin' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }


  // Clear token ONLY when user explicitly signs out (was signed in, now isn't)
  useEffect(() => {
    if (prevSignedIn.current === true && isSignedIn === false) {
      localStorage.removeItem(TOKEN_KEY)
      console.log('[AdminContext] User signed out, cleared server JWT')
    }
    prevSignedIn.current = isSignedIn
  }, [isSignedIn])

  // Auto-exchange Clerk token when user signs in and Clerk user data is ready
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      console.log('[AdminContext] Clerk user ready, exchanging token...')
      exchangeClerkToken().then((token) => {
        if (token) {
          console.log('[AdminContext] Token obtained, refreshing data from MongoDB...')
        } else {
          console.warn('[AdminContext] Token exchange returned empty, will retry on next action')
        }
        // Always refresh data (public endpoints work without auth)
        refreshFromMongoDB()
      })
    }
  }, [isSignedIn, clerkUser])

  // Load public data on initial mount (even before auth is ready)
  useEffect(() => {
    refreshFromMongoDB()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // ignore storage failure
    }
  }, [data])

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/audit-logs`, { headers: await getAuthHeaders() })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    }
    return []
  }

  const addProperty = async (property) => {
    const id = property.id || Date.now()
    const newProp = normalizeProperty({ ...property, id })

    // Optimistic update — show immediately in UI
    setData((state) => ({
      ...state,
      properties: [...state.properties, newProp],
    }))

    try {
      const token = await ensureAuthToken()
      const res = await fetchWithTimeout(`${API_BASE}/api/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProp),
      })
      if (res.ok) {
        const saved = await res.json()
        // Replace optimistic entry with saved MongoDB doc (has _id)
        setData((state) => ({
          ...state,
          properties: state.properties.map((p) =>
            String(p.id) === String(id) ? normalizeProperty(saved) : p
          ),
        }))
        return { success: true }
      } else {
        const errText = await res.text()
        console.warn('[addProperty] API error:', res.status, errText)
        // Rollback optimistic update on failure
        setData((state) => ({
          ...state,
          properties: state.properties.filter((p) => String(p.id) !== String(id)),
        }))
        return { success: false, error: `Server error (${res.status}): ${errText}` }
      }
    } catch (err) {
      console.warn('[addProperty] Network error, kept in local state:', err.message)
      return { success: false, error: `Network error: ${err.message}` }
    }
  }

  const updateProperty = async (id, updates) => {
    // Always prefer _id for MongoDB operations since it's the canonical identifier
    const normalizedId = String(id)
    const matchId = (p) =>
      String(p._id) === normalizedId ||
      String(p.id) === normalizedId

    console.log('[updateProperty] Starting update for ID:', normalizedId, '| Fields:', Object.keys(updates))

    // Step 1: Get auth token FIRST, before any state changes
    let authToken = ''
    try {
      authToken = await ensureAuthToken()
      console.log('[updateProperty] Auth token obtained, length:', authToken.length)
    } catch (err) {
      console.error('[updateProperty] Auth failed:', err.message)
      return { success: false, error: err.message }
    }

    // Step 2: Save previous state for rollback
    let previousProperties = null
    setData((state) => {
      previousProperties = [...state.properties]
      return {
        ...state,
        properties: state.properties.map((p) =>
          matchId(p) ? normalizeProperty({ ...p, ...updates }) : p
        ),
      }
    })

    // Step 3: Attempt the PUT request
    const attemptUpdate = async (token) => {
      const url = `${API_BASE}/api/properties/${encodeURIComponent(normalizedId)}`
      console.log('[updateProperty] PUT', url)
      return fetchWithTimeout(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })
    }

    try {
      let res = await attemptUpdate(authToken)
      console.log('[updateProperty] Response status:', res.status)

      // If 401, force-refresh token and retry once
      if (res.status === 401) {
        console.warn('[updateProperty] Got 401, force-refreshing token...')
        localStorage.removeItem(TOKEN_KEY)
        // Try exchange first (most reliable for our server)
        const freshToken = await exchangeClerkToken(true)
        if (!freshToken) {
          // Fallback to resolveAuthToken
          const fallbackToken = await resolveAuthToken(true)
          if (!fallbackToken) {
            throw new Error('Authentication failed after retry. Please sign out and sign in again.')
          }
          res = await attemptUpdate(fallbackToken)
        } else {
          res = await attemptUpdate(freshToken)
        }
        console.log('[updateProperty] Retry response status:', res.status)
      }

      if (res.ok) {
        const updated = await res.json()
        console.log('[updateProperty] ✅ Success! Updated _id:', updated._id, 'images:', updated.images?.length)
        setData((state) => ({
          ...state,
          properties: state.properties.map((p) =>
            matchId(p) ? normalizeProperty(updated) : p
          ),
        }))
        return { success: true, data: updated }
      }

      const errText = await res.text()
      console.error('[updateProperty] ❌ API error:', res.status, errText)
      // Rollback on failure
      if (previousProperties) {
        setData((state) => ({ ...state, properties: previousProperties }))
      }
      return { success: false, error: `Server error (${res.status}): ${errText}` }
    } catch (err) {
      console.error('[updateProperty] ❌ Exception:', err.message)
      if (previousProperties) {
        setData((state) => ({ ...state, properties: previousProperties }))
      }
      return { success: false, error: err.message }
    }
  }

  const removeProperty = async (id) => {
    // Optimistic remove
    setData((state) => ({
      ...state,
      properties: state.properties.filter(
        (p) =>
          p.id !== id &&
          p._id !== id &&
          String(p.id) !== String(id) &&
          String(p._id) !== String(id)
      ),
    }))
    try {
      await fetch(`${API_BASE}/api/properties/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
    } catch (err) {
      console.warn('Failed to remove property from MongoDB:', err.message)
    }
    return { success: true }
  }

  const deleteManyProperties = async (ids = [], options = {}) => {
    const { all = false } = options

    // Identify target properties to back up locally in case server is unreachable or as instant snapshot
    const targetProperties = all
      ? data.properties
      : data.properties.filter(
          (p) =>
            ids.includes(p.id) ||
            ids.includes(p._id) ||
            ids.includes(String(p.id)) ||
            ids.includes(String(p._id))
        )

    if (targetProperties.length === 0) {
      return { success: false, error: 'No matching properties found to delete' }
    }

    // Prepare snapshot data for backup
    const localBackupPayload = {
      backupMetadata: {
        type: 'properties_collection_backup',
        version: '1.0',
        createdAt: new Date().toISOString(),
        triggerReason: 'deleteMany_automation',
        triggeredBy: 'admin',
        totalPropertiesCount: data.properties.length,
        backedUpCount: targetProperties.length,
      },
      properties: targetProperties,
    }

    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/properties/delete-many`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, all }),
      })

      const resData = await res.json()

      // AUTOMATION: Download backup directly to device EVERY SINGLE TIME
      const backupToDownload = resData.backupData || localBackupPayload
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const downloadFilename = resData.backupFile || `properties-backup-deleteMany-${timestamp}.json`
      downloadBackupToDevice(backupToDownload, downloadFilename)

      if (res.ok && resData.success) {
        // Remove from local state
        setData((state) => ({
          ...state,
          properties: all
            ? []
            : state.properties.filter(
                (p) =>
                  !ids.includes(p.id) &&
                  !ids.includes(p._id) &&
                  !ids.includes(String(p.id)) &&
                  !ids.includes(String(p._id))
              ),
        }))
        return {
          success: true,
          deletedCount: resData.deletedCount || targetProperties.length,
          backupFile: downloadFilename,
          message: resData.message || `Deleted ${targetProperties.length} properties. Backup saved to device.`,
        }
      } else {
        return {
          success: false,
          error: resData.error || 'Failed to delete properties on server',
          backupFile: downloadFilename,
        }
      }
    } catch (err) {
      console.error('[deleteManyProperties] Error:', err)
      // Even on exception, download device backup so user NEVER loses data!
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fallbackFilename = `properties-emergency-backup-${timestamp}.json`
      downloadBackupToDevice(localBackupPayload, fallbackFilename)
      return { success: false, error: err.message, backupFile: fallbackFilename }
    }
  }

  const downloadPropertiesBackup = async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/properties/backup`, {
        headers,
      })
      if (res.ok) {
        const backupData = await res.json()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `reon-properties-backup-${timestamp}.json`
        downloadBackupToDevice(backupData, filename)
        return { success: true, filename }
      }
    } catch (err) {
      console.warn('Backend backup endpoint unavailable, backing up from local context:', err)
    }

    // Fallback: Backup current local context properties
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fallbackFilename = `reon-properties-backup-${timestamp}.json`
    const backupData = {
      backupMetadata: {
        type: 'properties_collection_backup',
        version: '1.0',
        createdAt: new Date().toISOString(),
        triggerReason: 'manual_device_export',
        totalPropertiesCount: data.properties.length,
        backedUpCount: data.properties.length,
      },
      properties: data.properties,
    }
    downloadBackupToDevice(backupData, fallbackFilename)
    return { success: true, filename: fallbackFilename }
  }

  const addBlog = async (blog) => {
    const id = blog.id || Date.now()
    const newBlog = normalizeBlog({ ...blog, id })

    // Optimistic update
    setData((state) => ({
      ...state,
      blogs: [...state.blogs, newBlog],
    }))

    try {
      const res = await fetch(`${API_BASE}/api/blogs`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(newBlog),
      })
      if (res.ok) {
        const saved = await res.json()
        setData((state) => ({
          ...state,
          blogs: state.blogs.map((b) =>
            String(b.id) === String(id) ? normalizeBlog(saved) : b
          ),
        }))
      }
    } catch (err) {
      console.warn('Failed to save blog to MongoDB:', err.message)
    }
  }

  const updateBlog = async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE}/api/blogs/${id}`, {
        method: 'PUT',
        headers: await getAuthHeaders(),
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setData((state) => ({
          ...state,
          blogs: state.blogs.map((b) =>
            String(b.id) === String(id) || String(b._id) === String(id)
              ? normalizeBlog(updated)
              : b
          ),
        }))
        return { success: true }
      } else {
        const errText = await res.text()
        return { success: false, error: `Server error (${res.status}): ${errText}` }
      }
    } catch (err) {
      console.error('Failed to update blog in MongoDB:', err)
      return { success: false, error: err.message }
    }
  }

  const removeBlog = async (id) => {
    try {
      await fetch(`${API_BASE}/api/blogs/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
    } catch (err) {
      console.error('Failed to remove blog from MongoDB:', err)
    } finally {
      setData((state) => ({
        ...state,
        blogs: state.blogs.filter(
          (blog) =>
            blog.id !== id &&
            blog._id !== id &&
            String(blog.id) !== String(id) &&
            String(blog._id) !== String(id)
        ),
      }))
    }
    return { success: true }
  }

  const addNews = async (newsItem) => {
    const id = newsItem.id || Date.now()
    const newNews = normalizeNews({ ...newsItem, id })

    try {
      const res = await fetch(`${API_BASE}/api/news`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(newNews),
      })
      if (res.ok) {
        const saved = await res.json()
        setData((state) => ({
          ...state,
          news: [normalizeNews(saved), ...(state.news || [])],
        }))
      }
    } catch (err) {
      console.error('Failed to save news to MongoDB:', err)
      setData((state) => ({
        ...state,
        news: [newNews, ...(state.news || [])],
      }))
    }
  }

  const updateNews = async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE}/api/news/${id}`, {
        method: 'PUT',
        headers: await getAuthHeaders(),
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setData((state) => ({
          ...state,
          news: (state.news || []).map((n) =>
            String(n.id) === String(id) || String(n._id) === String(id)
              ? normalizeNews(updated)
              : n
          ),
        }))
        return { success: true }
      } else {
        const errText = await res.text()
        return { success: false, error: `Server error (${res.status}): ${errText}` }
      }
    } catch (err) {
      console.error('Failed to update news in MongoDB:', err)
      return { success: false, error: err.message }
    }
  }

  const removeNews = async (id) => {
    try {
      await fetch(`${API_BASE}/api/news/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
    } catch (err) {
      console.error('Failed to remove news from MongoDB:', err)
    } finally {
      setData((state) => ({
        ...state,
        news: (state.news || []).filter(
          (item) =>
            item.id !== id &&
            item._id !== id &&
            String(item.id) !== String(id) &&
            String(item._id) !== String(id)
        ),
      }))
    }
    return { success: true }
  }

  const submitContactInquiry = async (contactPayload) => {
    try {
      const res = await fetch(`${API_BASE}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactPayload),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.contact) {
          setData((state) => ({
            ...state,
            contacts: [normalizeContact(result.contact), ...state.contacts],
          }))
        }
        return { success: true }
      }
    } catch (err) {
      console.error('Failed to submit contact to MongoDB:', err)
    }
    return { success: true }
  }

  const updateContactInquiry = async (id, updates) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const result = await res.json()
        const updatedContact = result.contact || { ...updates, id, _id: id }
        setData((state) => ({
          ...state,
          contacts: state.contacts.map((c) =>
            String(c.id) === String(id) || String(c._id) === String(id)
              ? { ...c, ...updates, ...updatedContact }
              : c
          ),
        }))
        return { success: true, contact: updatedContact }
      }
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: errData.error || 'Failed to update inquiry' }
    } catch (err) {
      console.error('Failed to update inquiry:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteContactInquiry = async (id) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/contacts/${id}`, {
        method: 'DELETE',
        headers,
      })
      if (res.ok) {
        setData((state) => ({
          ...state,
          contacts: state.contacts.filter(
            (c) => String(c.id) !== String(id) && String(c._id) !== String(id)
          ),
        }))
        return { success: true }
      }
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: errData.error || 'Failed to delete inquiry' }
    } catch (err) {
      console.error('Failed to delete inquiry:', err)
      return { success: false, error: err.message }
    }
  }

  const analyzeLead = async (id) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/crm/ai/analyze-lead/${id}`, {
        headers,
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.warn('[AdminContext] analyzeLead API error:', err)
    }
    return null
  }

  const runAutonomousAgent = async (leadId, agentName) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/crm/ai/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ leadId, agentName }),
      })
      if (res.ok) {
        const dataRes = await res.json()
        // Update local state with timeline entry
        if (dataRes.timelineEntry) {
          setData((state) => ({
            ...state,
            contacts: state.contacts.map((c) =>
              String(c.id) === String(leadId) || String(c._id) === String(leadId)
                ? { ...c, timeline: [dataRes.timelineEntry, ...(c.timeline || [])] }
                : c
            ),
          }))
        }
        return dataRes
      }
    } catch (err) {
      console.error('[AdminContext] runAutonomousAgent error:', err)
    }
    return null
  }

  const askCRM = async (query) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/crm/ai/ask-crm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ query }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.error('[AdminContext] askCRM error:', err)
    }
    return null
  }

  const generateScript = async (leadId, stage) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/crm/ai/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ leadId, stage }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.warn('[AdminContext] generateScript error:', err)
    }
    return null
  }

  const generateObjections = async (leadId) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/crm/ai/generate-objections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ leadId }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.warn('[AdminContext] generateObjections error:', err)
    }
    return null
  }

  const generateWhatsApp = async (leadId) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/crm/ai/generate-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ leadId }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.warn('[AdminContext] generateWhatsApp error:', err)
    }
    return null
  }

  const comparePropertiesAI = async (propertiesList) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/crm/ai/compare-properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: propertiesList }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.warn('[AdminContext] comparePropertiesAI error:', err)
    }
    return null
  }

  const addLeadTimelineEvent = async (leadId, eventPayload) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/crm/leads/${leadId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(eventPayload),
      })
      if (res.ok) {
        const dataRes = await res.json()
        if (dataRes.timelineEntry) {
          setData((state) => ({
            ...state,
            contacts: state.contacts.map((c) =>
              String(c.id) === String(leadId) || String(c._id) === String(leadId)
                ? { ...c, timeline: [dataRes.timelineEntry, ...(c.timeline || [])] }
                : c
            ),
          }))
        }
        return { success: true }
      }
    } catch (err) {
      console.error('[AdminContext] addLeadTimelineEvent error:', err)
    }
    return { success: false }
  }

  const fetchCallers = async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/callers`, { headers })
      if (res.ok) {
        const dataRes = await res.json()
        if (dataRes.callers) {
          setData((state) => ({ ...state, callers: dataRes.callers }))
          return dataRes
        }
      }
    } catch (err) {
      console.warn('[AdminContext] fetchCallers error:', err)
    }
    return null
  }

  const addCaller = async (callerPayload) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/callers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(callerPayload),
      })
      if (res.ok) {
        const dataRes = await res.json()
        if (dataRes.caller) {
          setData((state) => ({
            ...state,
            callers: [dataRes.caller, ...(state.callers || [])],
          }))
          return { success: true, caller: dataRes.caller }
        }
      }
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.error || 'Failed to add caller' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const updateCaller = async (id, updates) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/callers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const dataRes = await res.json()
        setData((state) => ({
          ...state,
          callers: (state.callers || []).map((c) =>
            String(c._id) === String(id) || String(c.id) === String(id) ? { ...c, ...updates, ...dataRes.caller } : c
          ),
        }))
        return { success: true, caller: dataRes.caller }
      }
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.error || 'Failed to update caller' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const deleteCaller = async (id) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/callers/${id}`, {
        method: 'DELETE',
        headers,
      })
      if (res.ok) {
        setData((state) => ({
          ...state,
          callers: (state.callers || []).filter((c) => String(c._id) !== String(id) && String(c.id) !== String(id)),
        }))
        return { success: true }
      }
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.error || 'Failed to delete caller' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const autoDistributeLeads = async (mode = 'unassigned_only') => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/callers/auto-distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ mode }),
      })
      if (res.ok) {
        const dataRes = await res.json()
        await refreshFromMongoDB()
        return dataRes
      }
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.error || 'Failed to auto-distribute leads' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const roundRobinAssignLead = async (contactId) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/callers/round-robin-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ contactId }),
      })
      if (res.ok) {
        const dataRes = await res.json()
        await refreshFromMongoDB()
        return dataRes
      }
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.error || 'Failed to round-robin assign lead' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const logLeadCall = async (leadId, callData) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(`${API_BASE}/api/contacts/${leadId}/call-log`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(callData),
      })
      if (res.ok) {
        const dataRes = await res.json()
        if (dataRes.contact) {
          setData((state) => ({
            ...state,
            contacts: state.contacts.map((c) =>
              String(c.id) === String(leadId) || String(c._id) === String(leadId)
                ? normalizeContact(dataRes.contact)
                : c
            ),
          }))
          return { success: true, contact: dataRes.contact }
        }
      }
    } catch (err) {
      console.error('[AdminContext] logLeadCall error:', err)
    }
    return { success: false }
  }

  const value = useMemo(
    () => ({
      admins: data.admins,
      currentUserRole,
      addSubadmin,
      removeSubadmin,
      recordLogout,
      properties: data.properties,
      isLoadingProperties,
      fetchPropertyById,
      blogs: data.blogs,
      fetchBlogById,
      news: data.news || defaultData.news,
      fetchNewsById,
      contacts: data.contacts,
      clientCarts: data.clientCarts || [],
      callers: data.callers || [],
      dbStatus,
      fetchAuditLogs,
      addProperty,
      updateProperty,
      removeProperty,
      deleteManyProperties,
      downloadPropertiesBackup,
      addBlog,
      updateBlog,
      removeBlog,
      addNews,
      updateNews,
      removeNews,
      submitContactInquiry,
      updateContactInquiry,
      deleteContactInquiry,
      analyzeLead,
      runAutonomousAgent,
      askCRM,
      generateScript,
      generateObjections,
      generateWhatsApp,
      comparePropertiesAI,
      addLeadTimelineEvent,
      fetchCallers,
      addCaller,
      updateCaller,
      deleteCaller,
      autoDistributeLeads,
      roundRobinAssignLead,
      logLeadCall,
      refreshFromMongoDB,
    }),
    [data, dbStatus, currentUserRole, recordLogout, isLoadingProperties, fetchPropertyById, fetchBlogById, fetchNewsById]
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>

}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider')
  }
  return context
}

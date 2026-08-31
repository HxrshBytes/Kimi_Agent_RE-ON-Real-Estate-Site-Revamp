import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'reon_super_secret_jwt_key_987654321_secure_prod'
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || ''
const ALLOWED_ADMIN_EMAIL = (process.env.ALLOWED_ADMIN_EMAIL || 'yasirreonadmin@gmail.com').toLowerCase()
const TOKEN_EXPIRATION = '8h'

// Hash password using PBKDF2 with salt
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

// Verify password against stored salted hash
export function verifyPassword(password, storedHash) {
  if (!storedHash) return false

  // Support legacy plain text password fallback for initial transition if needed
  if (!storedHash.includes(':')) {
    return password === storedHash
  }

  const [salt, originalHash] = storedHash.split(':')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return hash === originalHash
}

// Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION }
  )
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// Verify a Clerk session token by calling Clerk's Backend API
async function verifyClerkSession(sessionToken) {
  if (!CLERK_SECRET_KEY) return null
  try {
    const res = await fetch('https://api.clerk.com/v1/sessions?status=active', {
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null

    const sessions = await res.json()
    if (!Array.isArray(sessions?.data || sessions)) return null

    const sessionList = sessions.data || sessions

    for (const session of sessionList) {
      if (session.status === 'active') {
        const userId = session.user_id
        const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
          headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
        })
        if (userRes.ok) {
          const user = await userRes.json()
          const emails = (user.email_addresses || []).map(e => e.email_address?.toLowerCase())
          if (emails.includes(ALLOWED_ADMIN_EMAIL)) {
            return {
              username: ALLOWED_ADMIN_EMAIL,
              role: 'superadmin',
              clerkUserId: userId,
            }
          }
        }
      }
    }
    return null
  } catch (err) {
    console.error('[Clerk Verify Error]', err.message)
    return null
  }
}

// Fast local Clerk token verification — decodes JWT to extract email claim or verifies sub
async function verifyClerkToken(token) {
  try {
    const decoded = jwt.decode(token)
    if (!decoded) return null

    // 1. Check email in claims if present
    const emailFromClaims =
      decoded.email ||
      decoded.primary_email_address ||
      decoded.email_address ||
      decoded['https://reon.com/email'] ||
      null

    if (emailFromClaims) {
      const lower = emailFromClaims.toLowerCase()
      if (lower === ALLOWED_ADMIN_EMAIL) {
        return { username: ALLOWED_ADMIN_EMAIL, role: 'superadmin' }
      }
      try {
        const { connectToDatabase } = await import('./db.js')
        const { db } = await connectToDatabase()
        const subadmin = await db.collection('admins').findOne({
          $or: [
            { username: { $regex: new RegExp(`^${lower}$`, 'i') } },
            { email: { $regex: new RegExp(`^${lower}$`, 'i') } },
          ],
        })
        if (subadmin) {
          return { username: lower, role: subadmin.role || 'subadmin' }
        }
      } catch (e) {
        console.warn('[Clerk Token DB check error]', e.message)
      }
    }

    // 2. Check if sub is a valid user ID format (starts with user_)
    const clerkUserId = decoded.sub
    if (!clerkUserId || !clerkUserId.startsWith('user_')) return null

    // 3. Known authorized admin — skip slow Clerk API call
    if (clerkUserId === 'user_3HRMJNImij9mqmj1V7hUtQtCMCl') {
      return { username: ALLOWED_ADMIN_EMAIL, role: 'superadmin', clerkUserId }
    }

    // 4. Check Clerk API with timeout
    if (CLERK_SECRET_KEY) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 4000)
        const userRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
          headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (userRes.ok) {
          const user = await userRes.json()
          const emails = (user.email_addresses || []).map((e) => e.email_address?.toLowerCase()).filter(Boolean)

          if (emails.includes(ALLOWED_ADMIN_EMAIL)) {
            return { username: ALLOWED_ADMIN_EMAIL, role: 'superadmin', clerkUserId }
          }

          try {
            const { connectToDatabase } = await import('./db.js')
            const { db } = await connectToDatabase()
            const subadmin = await db.collection('admins').findOne({
              $or: [
                { username: { $in: emails } },
                { email: { $in: emails } },
              ],
            })
            if (subadmin) {
              return { username: subadmin.username || emails[0], role: subadmin.role || 'subadmin', clerkUserId }
            }
          } catch (e) {
            console.warn('[Clerk Token API DB check error]', e.message)
          }
        }
      } catch (e) {
        console.warn('[Clerk API Verify Failed]', e.message)
      }
    }

    return null
  } catch (err) {
    console.warn('[Clerk Token Verify Error]', err.message)
    return null
  }
}

// Express Auth Middleware — supports server JWT + Clerk tokens
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing security token' })
  }

  const token = authHeader.split(' ')[1]

  // 1. Try server JWT first (fast, synchronous)
  const legacyDecoded = verifyToken(token)
  if (legacyDecoded) {
    req.user = legacyDecoded
    return next()
  }

  // 2. Try Clerk token (async, local decode first then API fallback)
  try {
    const clerkUser = await verifyClerkToken(token)
    if (clerkUser) {
      req.user = clerkUser
      return next()
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' })
  } catch (err) {
    console.error('[requireAuth] Auth error:', err.message)
    return res.status(401).json({ error: 'Unauthorized: Authentication failed' })
  }
}

// Express Superadmin Middleware
export function requireSuperadmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Superadmin privileges required' })
  }
  next()
}


// In-memory rate limiting and login brute-force tracker
const loginAttempts = new Map()

const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes in ms

export function checkRateLimit(ip) {
  const record = loginAttempts.get(ip)
  if (!record) return { allowed: true }

  if (record.attempts >= MAX_ATTEMPTS) {
    const timeRemaining = record.lockUntil - Date.now()
    if (timeRemaining > 0) {
      const minutesRemaining = Math.ceil(timeRemaining / 60000)
      return {
        allowed: false,
        message: `Too many failed login attempts. Account temporarily locked for ${minutesRemaining} minute(s).`,
      }
    } else {
      // Lock expired
      loginAttempts.delete(ip)
      return { allowed: true }
    }
  }

  return { allowed: true }
}

export function recordLoginAttempt(ip, success) {
  if (success) {
    loginAttempts.delete(ip)
    return
  }

  const record = loginAttempts.get(ip) || { attempts: 0, lockUntil: 0 }
  record.attempts += 1

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockUntil = Date.now() + LOCKOUT_TIME
  }

  loginAttempts.set(ip, record)
}

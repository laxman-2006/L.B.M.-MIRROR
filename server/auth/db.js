import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function resolveDbFile() {
  const possibleDirs = []

  // 1. AppData Roaming (Standard writable path on Windows)
  if (process.env.APPDATA) {
    possibleDirs.push(path.join(process.env.APPDATA, 'LBM Mirror', 'data'))
  }
  // 2. LocalAppData
  if (process.env.LOCALAPPDATA) {
    possibleDirs.push(path.join(process.env.LOCALAPPDATA, 'LBM Mirror', 'data'))
  }
  // 3. User home directory
  try {
    possibleDirs.push(path.join(os.homedir(), '.lbm_mirror', 'data'))
  } catch {}
  // 4. Local workspace directory
  possibleDirs.push(path.join(__dirname, '../data'))

  for (const dir of possibleDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const testFile = path.join(dir, `.test_write_${Date.now()}.tmp`)
      fs.writeFileSync(testFile, '1', 'utf-8')
      fs.unlinkSync(testFile)
      return path.join(dir, 'lbm_auth.json')
    } catch {
      // Directory is read-only (e.g. inside C:\Program Files)
      continue
    }
  }

  // Fallback to OS temp
  return path.join(os.tmpdir(), 'lbm_auth.json')
}

const DB_FILE = resolveDbFile()
const DATA_DIR = path.dirname(DB_FILE)
const WORKSPACE_DB_FILE = path.join(__dirname, '../data/lbm_auth.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }) } catch {}
  }
}

export function loadData() {
  ensureDataDir()
  let primary = { users: [], otps: [], sessions: [] }

  // 1. Read primary DB file
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8').replace(/^\uFEFF/, '')
      const parsed = JSON.parse(raw)
      primary.users = Array.isArray(parsed.users) ? parsed.users : []
      primary.otps = Array.isArray(parsed.otps) ? parsed.otps : []
      primary.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : []
    } catch (err) {
      console.error('[LBM Auth DB] Error loading primary database:', err)
    }
  }

  // 2. Read workspace DB file if different and merge users
  if (WORKSPACE_DB_FILE !== DB_FILE && fs.existsSync(WORKSPACE_DB_FILE)) {
    try {
      const wsRaw = fs.readFileSync(WORKSPACE_DB_FILE, 'utf-8').replace(/^\uFEFF/, '')
      const wsParsed = JSON.parse(wsRaw)
      const wsUsers = Array.isArray(wsParsed.users) ? wsParsed.users : []

      for (const u of wsUsers) {
        const exists = primary.users.some(
          (pu) =>
            pu.id === u.id ||
            (u.email && pu.email && pu.email.toLowerCase() === u.email.toLowerCase()) ||
            (u.username && pu.username && pu.username.toLowerCase() === u.username.toLowerCase())
        )
        if (!exists) {
          primary.users.push(u)
        }
      }
    } catch (e) {
      console.error('[LBM Auth DB] Error checking workspace DB:', e)
    }
  }

  // If primary was completely empty, save the merged state
  if (!fs.existsSync(DB_FILE) && primary.users.length > 0) {
    saveData(primary)
  }

  return primary
}

export function saveData(data) {
  ensureDataDir()
  const payload = JSON.stringify(data, null, 2)

  // 1. Save to primary location (AppData / LocalAppData)
  try {
    fs.writeFileSync(DB_FILE, payload, 'utf-8')
  } catch (err) {
    console.error('[LBM Auth DB] Error saving data to DB_FILE:', err)
    try {
      const emergency = path.join(os.tmpdir(), 'lbm_auth.json')
      fs.writeFileSync(emergency, payload, 'utf-8')
    } catch (e2) {
      console.error('[LBM Auth DB] Emergency save failed:', e2)
    }
  }

  // 2. Also save to workspace DB file if writable and different
  if (WORKSPACE_DB_FILE !== DB_FILE) {
    try {
      const wsDir = path.dirname(WORKSPACE_DB_FILE)
      if (!fs.existsSync(wsDir)) {
        fs.mkdirSync(wsDir, { recursive: true })
      }
      fs.writeFileSync(WORKSPACE_DB_FILE, payload, 'utf-8')
    } catch {}
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export function countUsers() {
  const data = loadData()
  return data.users.length
}

export function findUserByUsername(username) {
  if (!username) return null
  const data = loadData()
  const norm = username.trim().toLowerCase()
  return data.users.find((u) => u.username && u.username.trim().toLowerCase() === norm) || null
}

export function findUserByEmail(email) {
  if (!email) return null
  const data = loadData()
  const norm = email.trim().toLowerCase()
  return data.users.find((u) => u.email && u.email.trim().toLowerCase() === norm) || null
}

export function findUserByIdentifier(identifier) {
  if (!identifier) return null
  const clean = identifier.trim()
  return findUserByEmail(clean) || findUserByUsername(clean)
}

export function findUserByMobile(mobile) {
  if (!mobile) return null
  const data = loadData()
  const norm = mobile.replace(/[^0-9]/g, '')
  return data.users.find((u) => u.mobile.replace(/[^0-9]/g, '') === norm) || null
}

export function createUser({ username, email, mobile, passwordHash }) {
  const data = loadData()
  const user = {
    id: crypto.randomUUID(),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    mobile: (mobile || '').trim(),
    passwordHash,
    createdAt: Date.now(),
  }
  data.users.push(user)
  saveData(data)
  return user
}

export function updateUserPassword(emailOrUsername, newPasswordHash) {
  const data = loadData()
  const norm = emailOrUsername.trim().toLowerCase()
  const user = data.users.find(
    (u) => u.email.toLowerCase() === norm || u.username.toLowerCase() === norm
  )
  if (!user) return null
  user.passwordHash = newPasswordHash
  user.updatedAt = Date.now()
  saveData(data)
  return user
}

// ─── OTPs ────────────────────────────────────────────────────────────────────

export function saveOtp({ target, type, code, maxAttempts = 5, ttlSeconds = 600 }) {
  const data = loadData()
  const now = Date.now()
  const normalizedTarget = type === 'email' ? target.trim().toLowerCase() : target.replace(/[^0-9+]/g, '')

  // Remove old unverified OTPs for this target & type
  data.otps = data.otps.filter(
    (o) => !(o.target === normalizedTarget && o.type === type && !o.verified && o.expiresAt < now)
  )

  const otp = {
    id: crypto.randomUUID(),
    target: normalizedTarget,
    type, // 'email' | 'mobile'
    code,
    attempts: 0,
    maxAttempts,
    verified: false,
    verifiedToken: null,
    createdAt: now,
    lastSentAt: now,
    expiresAt: now + ttlSeconds * 1000,
  }

  data.otps.push(otp)
  saveData(data)
  return otp
}

export function getLatestOtp(target, type) {
  const data = loadData()
  const normalizedTarget = type === 'email' ? target.trim().toLowerCase() : target.replace(/[^0-9+]/g, '')
  const matching = data.otps
    .filter((o) => o.target === normalizedTarget && o.type === type)
    .sort((a, b) => b.createdAt - a.createdAt)

  return matching[0] || null
}

export function recordOtpAttempt(otpId) {
  const data = loadData()
  const otp = data.otps.find((o) => o.id === otpId)
  if (!otp) return null
  otp.attempts += 1
  saveData(data)
  return otp
}

export function markOtpVerified(otpId) {
  const data = loadData()
  const otp = data.otps.find((o) => o.id === otpId)
  if (!otp) return null
  otp.verified = true
  // Issue a 1-hour verification token so signup endpoint can confirm verification proof
  otp.verifiedToken = crypto.randomBytes(24).toString('hex')
  otp.verifiedAt = Date.now()
  otp.verifiedExpiresAt = Date.now() + 3600 * 1000 // 1 hour validity
  saveData(data)
  return otp
}

export function checkVerifiedToken(target, type, verifiedToken) {
  if (!target || !verifiedToken) return false
  const data = loadData()
  const normalizedTarget = type === 'email' ? target.trim().toLowerCase() : target.replace(/[^0-9+]/g, '')
  const now = Date.now()

  const otp = data.otps.find(
    (o) =>
      o.target === normalizedTarget &&
      o.type === type &&
      o.verified &&
      o.verifiedToken === verifiedToken &&
      o.verifiedExpiresAt &&
      o.verifiedExpiresAt > now
  )

  return Boolean(otp)
}

export function consumeVerifiedToken(target, type, verifiedToken) {
  const data = loadData()
  const normalizedTarget = type === 'email' ? target.trim().toLowerCase() : target.replace(/[^0-9+]/g, '')
  const index = data.otps.findIndex(
    (o) => o.target === normalizedTarget && o.type === type && o.verifiedToken === verifiedToken
  )
  if (index !== -1) {
    data.otps.splice(index, 1)
    saveData(data)
  }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function createSession(userId, username) {
  const data = loadData()
  const token = crypto.randomBytes(32).toString('hex')
  const now = Date.now()
  const session = {
    token,
    userId,
    username,
    createdAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days
  }
  data.sessions.push(session)
  saveData(data)
  return session
}

export function getSession(token) {
  if (!token) return null
  const data = loadData()
  const now = Date.now()
  const session = data.sessions.find((s) => s.token === token && s.expiresAt > now)
  if (!session) return null
  const user = data.users.find((u) => u.id === session.userId)
  if (!user) return null
  return {
    session,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      createdAt: user.createdAt,
    },
  }
}

export function deleteSession(token) {
  if (!token) return
  const data = loadData()
  data.sessions = data.sessions.filter((s) => s.token !== token)
  saveData(data)
}

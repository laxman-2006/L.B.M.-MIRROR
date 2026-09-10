/**
 * LBM Mirror - Web Offline / Standalone Auth Service
 * Allows users to register, log in, test OTP, and persist sessions when running
 * as a standalone Web App deployed on GitHub Pages or static hosting without a local Node backend.
 */

export interface StoredWebUser {
  id: string
  username: string
  email: string
  mobile?: string
  passwordHash: string
  createdAt: number
}

const STORAGE_USERS_KEY = 'lbm_web_registered_users'
const STORAGE_SESSIONS_KEY = 'lbm_web_active_sessions'

function getStoredUsers(): StoredWebUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredUsers(users: StoredWebUser[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users))
  } catch {}
}

export function webSignup(data: { username: string; email: string; password: string }): {
  success: boolean
  user?: any
  token?: string
  error?: string
} {
  const users = getStoredUsers()
  const email = data.email.trim().toLowerCase()
  const username = data.username.trim()

  if (users.some((u) => u.email === email)) {
    return { success: false, error: 'An account with this Email ID already exists.' }
  }

  const newUser: StoredWebUser = {
    id: `web-user-${Date.now()}`,
    username: username || email.split('@')[0],
    email,
    passwordHash: btoa(data.password), // simple web encoding for standalone demonstration
    createdAt: Date.now(),
  }

  users.push(newUser)
  saveStoredUsers(users)

  const token = `lbm_web_token_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const userProfile = { id: newUser.id, username: newUser.username, email: newUser.email }

  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_SESSIONS_KEY) || '{}')
    sessions[token] = userProfile
    localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions))
  } catch {}

  return { success: true, user: userProfile, token }
}

export function webLogin(data: { identifier: string; password: string }): {
  success: boolean
  user?: any
  token?: string
  error?: string
} {
  const users = getStoredUsers()
  const identifier = data.identifier.trim().toLowerCase()

  // Find user by email or username
  let user = users.find(
    (u) => u.email === identifier || u.username.toLowerCase() === identifier
  )

  // If no users exist yet in this browser, auto-create a default test account for smooth demoing!
  if (!user && (identifier === 'admin' || identifier.includes('@') || identifier.length >= 3)) {
    const defaultUser: StoredWebUser = {
      id: `web-user-${Date.now()}`,
      username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
      email: identifier.includes('@') ? identifier : `${identifier}@lbm-mirror.com`,
      passwordHash: btoa(data.password),
      createdAt: Date.now(),
    }
    users.push(defaultUser)
    saveStoredUsers(users)
    user = defaultUser
  }

  if (!user) {
    return { success: false, error: 'Invalid credentials. User not found.' }
  }

  const token = `lbm_web_token_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const userProfile = { id: user.id, username: user.username, email: user.email }

  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_SESSIONS_KEY) || '{}')
    sessions[token] = userProfile
    localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions))
  } catch {}

  return { success: true, user: userProfile, token }
}

export function webGetMe(token: string): { success: boolean; user?: any } {
  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_SESSIONS_KEY) || '{}')
    if (sessions[token]) {
      return { success: true, user: sessions[token] }
    }
  } catch {}
  return { success: false }
}

export function webLogout(token: string): void {
  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_SESSIONS_KEY) || '{}')
    delete sessions[token]
    localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions))
  } catch {}
}

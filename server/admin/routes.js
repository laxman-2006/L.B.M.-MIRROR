import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const uploadsDir = path.join(__dirname, '../../public/uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const settingsFile = path.join(dataDir, 'app_settings.json')
const queriesFile = path.join(dataDir, 'queries.json')
const authDbFile = path.join(dataDir, 'lbm_auth.json')

// Default settings
const DEFAULT_SETTINGS = {
  appName: 'LBM Mirror',
  appTagline: 'Screen Mirroring',
  appLogo: '/logo.png',
  founderName: 'Laxman Choudhary',
  founderRole: 'Founder & CEO — LBM Mirror',
  founderQuote: 'Ideas To A More Connected World',
  founderBanner: '/founder_banner.jpg',
  email: 'contact@laxmanchoudhary.com',
  phone: '+91 98765 43210',
  whatsapp: '+91 98765 43210',
  instagramHandle: '@laxman_choudhary',
  instagramUrl: 'https://instagram.com/laxman_choudhary',
  youtubeHandle: 'LBM Mirror Official',
  youtubeUrl: 'https://youtube.com/@LBMMirror',
  facebookHandle: 'LBM Mirror Official',
  facebookUrl: 'https://facebook.com/LBMMirror',
  adminPin: '1229',
}

function getSettings() {
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8')
    return { ...DEFAULT_SETTINGS }
  }
  try {
    const raw = fs.readFileSync(settingsFile, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8')
}

function getQueries() {
  if (!fs.existsSync(queriesFile)) return []
  try {
    return JSON.parse(fs.readFileSync(queriesFile, 'utf-8'))
  } catch {
    return []
  }
}

function saveQueries(queries) {
  fs.writeFileSync(queriesFile, JSON.stringify(queries, null, 2), 'utf-8')
}

function getUsers() {
  if (!fs.existsSync(authDbFile)) return []
  try {
    const data = JSON.parse(fs.readFileSync(authDbFile, 'utf-8'))
    return data.users || []
  } catch {
    return []
  }
}

function saveUsers(users) {
  try {
    let data = { users: [], otps: [], sessions: [] }
    if (fs.existsSync(authDbFile)) {
      try {
        data = JSON.parse(fs.readFileSync(authDbFile, 'utf-8'))
      } catch {}
    }
    data.users = users
    fs.writeFileSync(authDbFile, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('[Admin Save Users Error]:', err)
  }
}

// Public endpoint for normal user app to fetch branding
router.get('/public/settings', (_req, res) => {
  const current = getSettings()
  // Exclude adminPin from public settings
  const { adminPin, ...publicSettings } = current
  res.json({ success: true, settings: publicSettings })
})

// Verify Admin PIN
router.post('/admin/verify-pin', (req, res) => {
  const { pin } = req.body || {}
  const settings = getSettings()
  if (String(pin).trim() === String(settings.adminPin).trim()) {
    res.json({ success: true, message: 'Admin authentication successful' })
  } else {
    res.status(401).json({ success: false, error: 'गलत एडमिन पिन (Invalid Admin PIN)' })
  }
})

// Get Admin Settings (includes adminPin for admin editing)
router.get('/admin/settings', (_req, res) => {
  res.json({ success: true, settings: getSettings() })
})

// Update Admin Settings
router.post('/admin/settings', (req, res) => {
  try {
    const updates = req.body || {}
    const current = getSettings()
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveSettings(updated)
    res.json({ success: true, settings: updated, message: 'सेटिंग्स सफलतापूर्वक सहेजी गईं (Settings saved successfully)!' })
  } catch (err) {
    console.error('[Admin Settings Update Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to update settings.' })
  }
})

// Scan Image Assets
function scanImages() {
  const images = []
  const publicDir = path.join(__dirname, '../../public')

  function walk(dir, relPath = '') {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const ent of entries) {
      const full = path.join(dir, ent.name)
      const rel = path.join(relPath, ent.name).replace(/\\/g, '/')
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== 'downloads') {
          walk(full, rel)
        }
      } else {
        const ext = path.extname(ent.name).toLowerCase()
        if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico'].includes(ext)) {
          try {
            const stat = fs.statSync(full)
            images.push({
              name: ent.name,
              path: `/${rel}`,
              sizeKb: (stat.size / 1024).toFixed(1),
              modifiedAt: stat.mtime.toISOString(),
            })
          } catch {}
        }
      }
    }
  }

  walk(publicDir)
  return images
}

// Get Images
router.get('/admin/images', (_req, res) => {
  try {
    const images = scanImages()
    res.json({ success: true, count: images.length, images })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to scan images.' })
  }
})

// Upload Image (Base64 or multipart-like JSON)
router.post('/admin/upload-image', (req, res) => {
  try {
    const { filename, base64Data, label } = req.body || {}
    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'No image data provided.' })
    }

    // Strip data prefix if present (e.g., data:image/png;base64,...)
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z0-9+-]+;base64,/, '')
    const buffer = Buffer.from(cleanBase64, 'base64')

    const safeName = (filename || `upload_${Date.now()}.png`).replace(/[^a-zA-Z0-9._-]/g, '_')
    const finalFilename = `${Date.now()}_${safeName}`
    const destPath = path.join(uploadsDir, finalFilename)

    fs.writeFileSync(destPath, buffer)
    const publicUrl = `/uploads/${finalFilename}`

    res.json({
      success: true,
      message: 'छवि सफलतापूर्वक अपलोड हो गई (Image uploaded successfully)!',
      url: publicUrl,
      filename: finalFilename,
      label,
    })
  } catch (err) {
    console.error('[Admin Upload Image Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to save image.' })
  }
})

// Get Ideas & Queries
router.get('/admin/queries', (_req, res) => {
  try {
    const queries = getQueries()
    res.json({ success: true, count: queries.length, queries })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to read queries.' })
  }
})

// Update query status (e.g., 'resolved' or 'read')
router.post('/admin/queries/:id/status', (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body || {}
    const queries = getQueries()
    const idx = queries.findIndex((q) => q.id === id)
    if (idx !== -1) {
      queries[idx].status = status || 'read'
      queries[idx].statusUpdatedAt = new Date().toISOString()
      saveQueries(queries)
      return res.json({ success: true, message: 'Status updated.' })
    }
    res.status(404).json({ success: false, error: 'Query not found.' })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update query status.' })
  }
})

// Delete query
router.delete('/admin/queries/:id', (req, res) => {
  try {
    const { id } = req.params
    const queries = getQueries()
    const filtered = queries.filter((q) => q.id !== id)
    saveQueries(filtered)
    res.json({ success: true, message: 'संदेश हटा दिया गया (Message deleted).' })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete query.' })
  }
})

// Get Registered Users (Comprehensive view for Admin Panel)
router.get('/admin/users', (_req, res) => {
  try {
    const users = getUsers().map((u) => {
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        mobile: u.mobile || '',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        hasPassword: Boolean(u.passwordHash),
        maskedPassword: u.passwordHash ? '••••••••' : 'Not Set',
      }
    })
    res.json({ success: true, count: users.length, users })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get users.' })
  }
})

// Create User from Admin Panel
router.post('/admin/users/create', async (req, res) => {
  try {
    const { username, email, mobile, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' })
    }
    const cleanEmail = email.trim().toLowerCase()
    const users = getUsers()
    if (users.some((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' })
    }
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)
    const newUser = {
      id: randomUUID(),
      username: (username || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      mobile: (mobile || '').trim(),
      passwordHash,
      createdAt: Date.now(),
    }
    users.push(newUser)
    saveUsers(users)
    res.json({ success: true, message: 'यूज़र सफलतापूर्वक बनाया गया (User created successfully)!', user: newUser })
  } catch (err) {
    console.error('[Admin User Create Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to create user.' })
  }
})

// Reset Password for User directly by Admin
router.post('/admin/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body || {}
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'New password must be at least 4 characters.' })
    }
    const users = getUsers()
    const idx = users.findIndex((u) => u.id === id)
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'User not found.' })
    }
    const saltRounds = 10
    users[idx].passwordHash = await bcrypt.hash(newPassword, saltRounds)
    users[idx].updatedAt = Date.now()
    saveUsers(users)
    res.json({ success: true, message: `पासवर्ड सफलतापूर्वक अपडेट किया गया (Password updated for ${users[idx].username})!` })
  } catch (err) {
    console.error('[Admin Reset Password Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to reset password.' })
  }
})

// Delete User by Admin
router.delete('/admin/users/:id', (req, res) => {
  try {
    const { id } = req.params
    const users = getUsers()
    const filtered = users.filter((u) => u.id !== id)
    saveUsers(filtered)
    res.json({ success: true, message: 'यूज़र सफलतापूर्वक हटा दिया गया (User deleted).' })
  } catch (err) {
    console.error('[Admin Delete User Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to delete user.' })
  }
})

// Get Comprehensive Admin Stats
export function getStatsAggregator(activeSessionsMap) {
  return (_req, res) => {
    try {
      const users = getUsers()
      const queries = getQueries()
      const images = scanImages()

      const activeSessions = []
      if (activeSessionsMap && activeSessionsMap instanceof Map) {
        for (const [sId, sess] of activeSessionsMap.entries()) {
          activeSessions.push({
            sessionId: sId,
            pin: sess.pin,
            status: sess.status,
            clientName: sess.clientName,
            clientPlatform: sess.clientPlatform,
            connectionMethod: sess.connectionMethod,
            createdAt: sess.createdAt,
          })
        }
      }

      res.json({
        success: true,
        stats: {
          totalUsers: users.length,
          activeSessionsCount: activeSessions.length,
          totalQueries: queries.length,
          totalImages: images.length,
          uptimeSeconds: Math.floor(process.uptime()),
          activeSessions,
          recentQueries: queries.slice(0, 5),
          users: users.slice(-10).map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            mobile: u.mobile,
            createdAt: u.createdAt,
          })),
        },
      })
    } catch (err) {
      console.error('[Admin Stats Error]:', err)
      res.status(500).json({ success: false, error: 'Failed to compile stats.' })
    }
  }
}

export default router

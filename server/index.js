import 'dotenv/config'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { randomUUID } from 'crypto'

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './auth/routes.js'
import adminRoutes, { getStatsAggregator } from './admin/routes.js'
import { defaultRemoteInputBridge } from '../electron/bridge/remoteInputBridge.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*' },
})

// Enable JSON body parsing for authentication and admin REST API (with support for image uploads)
app.use(express.json({ limit: '30mb' }))
app.use(express.urlencoded({ extended: true, limit: '30mb' }))

// Auto-start Windows native input bridge if running on Windows
if (process.platform === 'win32') {
  defaultRemoteInputBridge.start().catch((err) => {
    console.warn('[Server] Could not auto-start remote input bridge:', err?.message)
  })
}

// REST API for remote input (allows browser/PWA on host to execute Windows mouse/keyboard events)
app.post('/api/remote-input', (req, res) => {
  const event = req.body
  if (event && event.type && process.platform === 'win32') {
    defaultRemoteInputBridge.handleEvent(event)
    return res.json({ success: true })
  }
  res.status(400).json({ error: 'Invalid input event' })
})

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// sessionId -> session object
const sessions = new Map()
// socketId -> sessionId (host sessions)
const hostSessions = new Map()

// LBM Remote Desktop Control Registry
// cleanHostId (e.g. '839201') -> { socketId, passcode, hostName, lastSeen }
const uvHosts = new Map()
// socketId -> cleanHostId
const uvSocketToHost = new Map()

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function buildSession(socketId, customPin) {
  const sessionId = randomUUID()
  const pin = customPin ? String(customPin).replace(/\s+/g, '').trim() : generatePin()
  const now = Date.now()

  const session = {
    sessionId,
    pin,
    status: 'WAITING',
    connectionMethod: 'Same Wi\u2011Fi',
    permissions: {
      screenShare: true,
      audioShare: false,
      remoteControl: false,
      clipboard: false,
      fileTransfer: false,
    },
    createdAt: now,
    qrLink: `lbm-mirror://session/${sessionId}?pin=${pin}`,
    hostSocketId: socketId,
    clientSocketId: null,
    clientName: null,
    clientPlatform: null,
  }

  sessions.set(sessionId, session)
  return session
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'LBM Mirror',
    version: '1.0.0',
    sessions: sessions.size,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

// Mount authentication API
app.use('/api/auth', authRoutes)

// Mount Admin & Public Branding API
app.get('/api/admin/stats', getStatsAggregator(sessions))
app.use('/api', adminRoutes)

// Support query endpoint for Founder & CEO Modal and User Problem Reporting Desk
app.post('/api/support/query', (req, res) => {
  try {
    const { userId, name, contact, message, category, deviceInfo, priority, timestamp } = req.body || {}
    const queryEntry = {
      id: randomUUID(),
      userId: userId || `LBM-USR-${Math.floor(10000 + Math.random() * 90000)}`,
      name: name || 'Anonymous User',
      contact: contact || 'Not Provided',
      category: category || 'General Support',
      deviceInfo: deviceInfo || 'Windows / Web',
      priority: priority || 'Normal',
      status: 'new',
      message: message || '',
      timestamp: timestamp || new Date().toISOString(),
    }
    const dataDir = path.join(__dirname, 'data')
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    const queriesFile = path.join(dataDir, 'queries.json')
    let queries = []
    if (fs.existsSync(queriesFile)) {
      try {
        queries = JSON.parse(fs.readFileSync(queriesFile, 'utf-8'))
      } catch {}
    }
    queries.unshift(queryEntry)
    fs.writeFileSync(queriesFile, JSON.stringify(queries, null, 2), 'utf-8')
    console.log('[LBM Support Problem/Query Received]:', queryEntry)
    res.json({ success: true, message: 'Message sent successfully to Founder & CEO!', ticketId: queryEntry.id, userId: queryEntry.userId })
  } catch (err) {
    console.error('[Support Query Error]:', err)
    res.status(500).json({ success: false, error: 'Internal server error saving query.' })
  }
})

import os from 'os'

function getNetworkInterfacesList() {
  const interfaces = os.networkInterfaces()
  const candidates = []

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        if (!net.address.startsWith('169.254.') && !net.address.startsWith('127.')) {
          const isWifi = /wi-fi|wifi|wlan|wireless/i.test(name)
          const isEthernet = /ethernet|eth|lan/i.test(name) && !/vEthernet|virtual|hyper-v|wsl/i.test(name)
          const isLan = net.address.startsWith('192.168.') || net.address.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(net.address)

          let priority = 1
          if (isWifi && isLan) priority = 10
          else if (isEthernet && isLan) priority = 8
          else if (isLan) priority = 6
          else if (isWifi) priority = 5
          else if (isEthernet) priority = 4

          candidates.push({
            name,
            ip: net.address,
            priority,
            isWifi,
            isEthernet,
          })
        }
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority)
  return candidates
}

function getLocalIp() {
  const list = getNetworkInterfacesList()
  if (list.length > 0) {
    return list[0].ip
  }
  return '192.168.137.218'
}

app.get('/api/network-info', (_req, res) => {
  const ip = getLocalIp()
  const allIps = getNetworkInterfacesList()
  res.json({
    success: true,
    ip,
    allIps,
    downloadUrl: `http://${ip}:3001/download`,
    apkUrl: `http://${ip}:3001/api/download/android`,
  })
})

// Direct APK download endpoint
function getApkPath() {
  const possiblePaths = [
    path.join(__dirname, 'downloads/LBMMirror.apk'),
    path.join(__dirname, '../public/downloads/LBMMirror.apk'),
    path.join(__dirname, '../dist/downloads/LBMMirror.apk'),
    path.join(__dirname, '../android/app/build/outputs/apk/debug/app-debug.apk'),
    path.join(process.cwd(), 'server/downloads/LBMMirror.apk'),
    path.join(process.cwd(), 'public/downloads/LBMMirror.apk'),
    path.join(process.cwd(), 'android/app/build/outputs/apk/debug/app-debug.apk'),
  ]
  return possiblePaths.find((p) => fs.existsSync(p))
}

const sendAndroidApk = (_req, res) => {
  const apkPath = getApkPath()
  if (apkPath) {
    const stat = fs.statSync(apkPath)
    res.setHeader('Content-Type', 'application/vnd.android.package-archive')
    res.setHeader('Content-Disposition', 'attachment; filename="LBMMirror.apk"')
    res.setHeader('Content-Length', stat.size)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.download(apkPath, 'LBMMirror.apk')
  }
  res.status(404).send('APK file not found on server.')
}

app.get([
  '/api/download/android',
  '/api/download/apk',
  '/downloads/LBMMirror.apk',
  '/LBMMirror.apk',
  '/download/android',
  '/download/apk',
], sendAndroidApk)

// Static downloads directory mounting
app.use('/downloads', express.static(path.join(__dirname, 'downloads')))
app.use('/downloads', express.static(path.join(__dirname, '../public/downloads')))
app.use('/downloads', express.static(path.join(process.cwd(), 'public/downloads')))


function getWindowsInstallerPath() {
  const possiblePaths = [
    path.join(__dirname, '../release/LBM_Mirror_Setup.exe'),
    path.join(process.cwd(), 'release/LBM_Mirror_Setup.exe'),
    path.join(__dirname, '../public/downloads/LBM_Mirror_Setup.exe'),
    path.join(process.cwd(), 'public/downloads/LBM_Mirror_Setup.exe'),
    path.join(__dirname, '../release/LBM Mirror Setup 1.0.0.exe'),
    path.join(process.cwd(), 'release/LBM Mirror Setup 1.0.0.exe'),
    path.join(__dirname, 'downloads/LBM_Mirror_Setup.exe'),
    path.join(process.cwd(), 'server/downloads/LBM_Mirror_Setup.exe'),
  ]
  return possiblePaths.find((p) => fs.existsSync(p))
}

const sendWindowsInstaller = (req, res, customFileName) => {
  const exePath = getWindowsInstallerPath()
  if (exePath) {
    const filename = customFileName || 'LBM_Mirror_Setup.exe'
    const stat = fs.statSync(exePath)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    return res.download(exePath, filename)
  }
  res.status(404).send('Windows setup installer not found on server.')
}

app.get([
  '/api/download/windows',
  '/api/download/exe',
  '/download/setup.exe',
  '/download/windows',
  '/LBM_Mirror_Setup.exe',
  '/LBM-Mirror-Setup.exe',
  '/setup.exe',
  '/AEROMEN_SETUP.exe',
], (req, res) => {
  sendWindowsInstaller(req, res, 'LBM_Mirror_Setup.exe')
})

// Mobile & Desktop download route
app.get('/download', (req, res) => {
  // If user requests direct Windows EXE download, immediately send the installer file
  if (req.query.type === 'exe' || req.query.download === 'windows' || req.query.format === 'exe' || req.query.platform === 'windows') {
    return sendWindowsInstaller(req, res, 'LBM_Mirror_Setup.exe')
  }

  const joinPin = req.query.pin || ''
  const directControlUrl = joinPin ? `/?join=${joinPin}&mode=controller` : '/?mode=controller'
  const directCastUrl = joinPin ? `/?join=${joinPin}&mode=sender` : '/?mode=sender'

  res.send(`<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>LBM Mirror — Mobile Remote Control &amp; Screen Mirroring</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #070d1e; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; text-align: center; }
    .card { background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(255,255,255,0.14); border-radius: 24px; max-width: 460px; width: 100%; padding: 28px 20px; box-shadow: 0 24px 50px rgba(0,0,0,0.6); }
    .logo { width: 80px; height: 80px; border-radius: 50%; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4); margin: 0 auto 12px; display: block; border: 3px solid #3b82f6; background: #0f172a; object-fit: contain; }
    h1 { font-size: 1.55rem; font-weight: 800; margin-bottom: 4px; color: #ffffff; }
    .founder-tag { font-size: 0.85rem; color: #94a3b8; margin-bottom: 18px; }
    .founder-name { color: #60a5fa; font-weight: 700; }
    
    .btn-controller { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-size: 1.05rem; font-weight: 700; padding: 15px 18px; border-radius: 14px; text-decoration: none; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); margin-bottom: 10px; }
    .btn-controller:active { transform: scale(0.98); }

    .btn-download { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; font-size: 1.05rem; font-weight: 700; padding: 15px 18px; border-radius: 14px; text-decoration: none; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); margin-bottom: 10px; }
    .btn-download:active { transform: scale(0.98); }

    .btn-cast-direct { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: rgba(37, 99, 235, 0.12); color: #60a5fa; border: 1.5px solid rgba(59, 130, 246, 0.4); font-size: 0.95rem; font-weight: 600; padding: 12px 18px; border-radius: 12px; text-decoration: none; margin-bottom: 16px; }
    .btn-cast-direct:active { background: rgba(37, 99, 235, 0.25); }

    .steps { text-align: left; background: rgba(15, 23, 42, 0.7); border-radius: 14px; padding: 14px 16px; border: 1px solid rgba(255,255,255,0.06); }
    .step { font-size: 0.82rem; color: #cbd5e1; margin-bottom: 9px; display: flex; gap: 10px; align-items: flex-start; line-height: 1.4; }
    .step:last-child { margin-bottom: 0; }
    .num { background: #2563eb; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .footer-link { margin-top: 16px; font-size: 0.8rem; color: #64748b; }
    .footer-link a { color: #60a5fa; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/logo.png" alt="LBM Mirror Logo" class="logo" />
    <h1>LBM Mirror</h1>
    <p class="founder-tag">Founder &amp; CEO: <span class="founder-name">Laxman Choudhary</span></p>

    <!-- 1. Instant Mobile Remote Controller (No Install Needed!) -->
    <a href="${directControlUrl}" class="btn-controller">
      <span>📱 फोन से कंप्यूटर चलाएं (Instant Mobile Control)</span>
    </a>

    <!-- 2. Direct Android APK Download -->
    <a href="/downloads/LBMMirror.apk" download="LBMMirror.apk" class="btn-download" id="dl-apk-btn" style="background: linear-gradient(135deg, #10b981, #059669); margin-bottom: 8px;">
      <span>🤖 डाउनलोड फॉर एंड्रॉइड APK (LBMMirror.apk)</span>
    </a>

    <!-- 3. Direct Windows .EXE Download -->
    <a href="/api/download/windows" download="LBM_Mirror_Setup.exe" class="btn-download" id="dl-win-btn" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); margin-bottom: 8px;">
      <span>💻 डाउनलोड फॉर विंडोज (LBM_Mirror_Setup.exe)</span>
    </a>

    <!-- 4. iOS AirPlay & Web App -->
    <a href="${directControlUrl}" class="btn-cast-direct" style="background: rgba(255,255,255,0.08); color: #f8fafc; margin-bottom: 8px;">
      <span>🍎 डाउनलोड फॉर iOS (iPhone / iPad Web App)</span>
    </a>

    <!-- 5. Mirror Phone to PC Screen -->
    <a href="${directCastUrl}" class="btn-cast-direct">
      <span>📺 फोन स्क्रीन कंप्यूटर पर दिखाएं (60 FPS Cast)</span>
    </a>

    <div class="steps">
      <div class="step">
        <span class="num">1</span>
        <span>बिना किसी ऐप डाउनलोड के सीधे कंप्यूटर चलाने के लिए ऊपर हरे बटन <strong>"फोन से कंप्यूटर चलाएं"</strong> पर टैप करें।</span>
      </div>
      <div class="step">
        <span class="num">2</span>
        <span>स्थायी ऐप के लिए <strong>LBMMirror.apk</strong> डाउनलोड करें और इंस्टॉल करें।</span>
      </div>
      <div class="step">
        <span class="num">3</span>
        <span>कंप्यूटर का ID और Password दर्ज करके 1-क्लिक में पूरा कंप्यूटर चलाएं!</span>
      </div>
    </div>

    <div class="footer-link">
      Need Help? <a href="/#support">Contact Founder: Laxman Choudhary</a>
    </div>
  </div>
</body>
</html>`)
})

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')))
app.use(express.static(path.join(__dirname, '../public')))
app.use(express.static(path.join(__dirname, '../dist')))

app.use((req, res, next) => {
  if (req.path.startsWith('/socket.io') || req.path === '/health' || req.path.startsWith('/api')) return next()
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

io.on('connection', (socket) => {
  // ─── Session Management ────────────────────────────────────────────

  socket.on('session:create', (payload) => {
    // Purana session cleanup
    const existingSessionId = hostSessions.get(socket.id)
    if (existingSessionId) {
      sessions.delete(existingSessionId)
    }

    const session = buildSession(socket.id, payload?.pin)
    hostSessions.set(socket.id, session.sessionId)

    if (payload?.hostName) session.hostName = payload.hostName

    socket.join(session.sessionId)
    socket.emit('session:created', { session })
    socket.emit('session:updated', { session })
  })

  socket.on('session:regenerate', () => {
    const sessionId = hostSessions.get(socket.id)
    const activeSession = sessionId ? sessions.get(sessionId) : null

    if (!activeSession) {
      socket.emit('signal:error', { message: 'No active host session found.' })
      return
    }

    activeSession.pin = generatePin()
    activeSession.qrLink = `lbm-mirror://session/${activeSession.sessionId}?pin=${activeSession.pin}`
    io.to(activeSession.sessionId).emit('session:updated', { session: activeSession })
  })

  socket.on('session:join', ({ pin, clientInfo }) => {
    const session = [...sessions.values()].find((entry) => entry.pin === String(pin))
    if (!session) {
      socket.emit('signal:error', { message: 'That PIN is invalid or has expired.' })
      return
    }

    // Client ko room mein join karwao
    socket.join(session.sessionId)

    session.status = 'REQUESTED'
    session.clientSocketId = socket.id
    session.clientName = clientInfo?.name ?? 'Unknown device'
    session.clientPlatform = clientInfo?.platform ?? 'Unknown platform'

    socket.emit('session:join-success', { session })
    io.to(session.sessionId).emit('device:request', {
      request: {
        sessionId: session.sessionId,
        deviceName: session.clientName,
        platform: session.clientPlatform,
      },
    })
  })

  socket.on('session:approve', ({ sessionId }) => {
    const session = sessions.get(sessionId)
    if (!session) {
      socket.emit('signal:error', { message: 'This session is no longer available.' })
      return
    }

    session.status = 'APPROVED'
    io.to(session.sessionId).emit('device:approved', { session })
  })

  socket.on('session:reject', ({ sessionId }) => {
    const session = sessions.get(sessionId)
    if (!session) return
    session.status = 'DISCONNECTED'
    io.to(session.sessionId).emit('session:ended', { sessionId })
    sessions.delete(sessionId)
  })

  socket.on('session:disconnect', ({ sessionId }) => {
    const session = sessions.get(sessionId)
    if (!session) return
    session.status = 'DISCONNECTED'
    io.to(session.sessionId).emit('session:ended', { sessionId })
    sessions.delete(sessionId)
    hostSessions.delete(socket.id)
  })

  socket.on('session:status', ({ sessionId, status }) => {
    const session = sessions.get(sessionId)
    if (!session) return
    session.status = status
    io.to(session.sessionId).emit('session:updated', { session })
  })

  socket.on('session:stats', ({ sessionId, stats }) => {
    const session = sessions.get(sessionId)
    if (!session) return
    io.to(session.sessionId).emit('session:stats', { stats })
  })

  // ─── WebRTC Signaling ─────────────────────────────────────────────
  // Har event ko room ke BAAKI members tak relay karo (sender ko nahi)

  socket.on('webrtc:offer', ({ sessionId, offer }) => {
    socket.to(sessionId).emit('webrtc:offer', { offer })
  })

  socket.on('webrtc:answer', ({ sessionId, answer }) => {
    socket.to(sessionId).emit('webrtc:answer', { answer })
  })

  socket.on('webrtc:ice', ({ sessionId, candidate }) => {
    socket.to(sessionId).emit('webrtc:ice', { candidate })
  })

  // ─── LBM Remote Desktop Direct Signaling ────────────────────────
  const registerHostHandler = ({ hostId, passcode, hostName }) => {
    const cleanId = String(hostId || '').replace(/\s+/g, '').trim()
    if (!cleanId) return
    const room = `uv_${cleanId}`
    socket.join(room)
    uvHosts.set(cleanId, {
      socketId: socket.id,
      passcode: String(passcode || '').trim(),
      hostName: hostName || 'LBM Host PC',
      lastSeen: Date.now(),
    })
    uvSocketToHost.set(socket.id, cleanId)
    console.log(`[LBM Remote Desktop] Host registered: ID=${cleanId} (Room: ${room})`)
    socket.emit('lbm_remote:registered', { success: true, hostId: cleanId })
    socket.emit('ultraviewer:registered', { success: true, hostId: cleanId })
  }
  socket.on('lbm_remote:host:register', registerHostHandler)
  socket.on('ultraviewer:host:register', registerHostHandler)

  const clientConnectHandler = ({ partnerId, passcode, clientName }) => {
    const cleanId = String(partnerId || '').replace(/\s+/g, '').trim()
    console.log(`[LBM Remote Desktop] Client requesting connection to Partner ID: ${cleanId}`)
    const host = uvHosts.get(cleanId)

    if (!host) {
      const errMsg = `Partner PC (${cleanId}) ऑफ़लाइन है या शेयरिंग चालू नहीं है। कृपया Partner PC पर चेक करें।`
      socket.emit('lbm_remote:error', { message: errMsg })
      socket.emit('ultraviewer:error', { message: errMsg })
      return
    }

    const expectedPass = host.passcode
    const givenPass = String(passcode || '').trim()
    if (expectedPass && givenPass !== expectedPass) {
      const errMsg = 'गलत पासवर्ड (Invalid Passcode). कृपया Partner PC पर प्रदर्शित पासवर्ड दर्ज करें।'
      socket.emit('lbm_remote:error', { message: errMsg })
      socket.emit('ultraviewer:error', { message: errMsg })
      return
    }

    const room = `uv_${cleanId}`
    socket.join(room)
    const authPayload = {
      hostId: cleanId,
      hostName: host.hostName,
    }
    socket.emit('lbm_remote:auth_success', authPayload)
    socket.emit('ultraviewer:auth_success', authPayload)

    const incomingPayload = {
      clientId: socket.id,
      clientName: clientName || 'Remote Operator',
    }
    io.to(host.socketId).emit('lbm_remote:incoming_partner', incomingPayload)
    io.to(host.socketId).emit('ultraviewer:incoming_partner', incomingPayload)
    console.log(`[LBM Remote Desktop] Partner authenticated successfully into room ${room}`)
  }
  socket.on('lbm_remote:client:connect', clientConnectHandler)
  socket.on('ultraviewer:client:connect', clientConnectHandler)

  // Relay WebRTC Offer/Answer/ICE
  const signalHandler = ({ targetRoom, signal, type }) => {
    const room = targetRoom || (socket.rooms ? [...socket.rooms].find(r => r.startsWith('uv_')) : null)
    if (room) {
      socket.to(room).emit('lbm_remote:signal', { signal, type, senderId: socket.id })
      socket.to(room).emit('ultraviewer:signal', { signal, type, senderId: socket.id })
    }
  }
  socket.on('lbm_remote:signal', signalHandler)
  socket.on('ultraviewer:signal', signalHandler)

  // Relay Remote Mouse/Keyboard Input & execute on Windows host
  const inputHandler = ({ targetRoom, event }) => {
    const room = targetRoom || (socket.rooms ? [...socket.rooms].find(r => r.startsWith('uv_')) : null)
    if (room && event) {
      socket.to(room).emit('lbm_remote:input', { event })
      socket.to(room).emit('ultraviewer:input', { event })

      // If running on Windows host, execute input directly on desktop!
      if (process.platform === 'win32') {
        defaultRemoteInputBridge.handleEvent(event)
      }
    }
  }
  socket.on('lbm_remote:input', inputHandler)
  socket.on('ultraviewer:input', inputHandler)

  socket.on('ultraviewer:host:execute_input', ({ event }) => {
    if (event && process.platform === 'win32') {
      defaultRemoteInputBridge.handleEvent(event)
    }
  })

  // Relay Live Chat
  const chatHandler = ({ targetRoom, message }) => {
    const room = targetRoom || (socket.rooms ? [...socket.rooms].find(r => r.startsWith('uv_')) : null)
    if (room && message) {
      socket.to(room).emit('lbm_remote:chat', { message })
      socket.to(room).emit('ultraviewer:chat', { message })
    }
  }
  socket.on('lbm_remote:chat', chatHandler)
  socket.on('ultraviewer:chat', chatHandler)

  // Relay Clipboard Sync
  const clipboardHandler = ({ targetRoom, text }) => {
    const room = targetRoom || (socket.rooms ? [...socket.rooms].find(r => r.startsWith('uv_')) : null)
    if (room && text) {
      socket.to(room).emit('lbm_remote:clipboard', { text })
      socket.to(room).emit('ultraviewer:clipboard', { text })
    }
  }
  socket.on('lbm_remote:clipboard', clipboardHandler)
  socket.on('ultraviewer:clipboard', clipboardHandler)

  // ─── Cleanup on disconnect ────────────────────────────────────────

  socket.on('disconnect', () => {
    const uvId = uvSocketToHost.get(socket.id)
    if (uvId) {
      uvHosts.delete(uvId)
      uvSocketToHost.delete(socket.id)
      io.to(`uv_${uvId}`).emit('lbm_remote:partner_disconnected', { hostId: uvId })
      io.to(`uv_${uvId}`).emit('ultraviewer:partner_disconnected', { hostId: uvId })
      console.log(`[LBM Remote Desktop] Host disconnected: ID=${uvId}`)
    }

    const sessionId = hostSessions.get(socket.id)
    if (sessionId) {
      const session = sessions.get(sessionId)
      if (session) {
        io.to(sessionId).emit('session:ended', { sessionId })
        sessions.delete(sessionId)
      }
      hostSessions.delete(socket.id)
    }
  })
})

const port = Number(process.env.PORT || 3001)

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Signaling Server] Port ${port} is already in use by another instance. Reusing active signaling server.`)
  } else {
    console.error('[Signaling Server Error]:', err)
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`LBM Mirror signaling & auth server running on 0.0.0.0:${port} (Accessible to all LAN & Mobile devices)`)
})

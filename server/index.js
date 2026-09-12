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

// UltraViewer Remote Control Registry
// cleanHostId (e.g. '839201') -> { socketId, passcode, hostName, lastSeen }
const uvHosts = new Map()
// socketId -> cleanHostId
const uvSocketToHost = new Map()

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function buildSession(socketId) {
  const sessionId = randomUUID()
  const pin = generatePin()
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

// Support query endpoint for Founder & CEO Modal
app.post('/api/support/query', (req, res) => {
  try {
    const { name, contact, message, timestamp } = req.body || {}
    const queryEntry = {
      id: randomUUID(),
      name: name || 'Anonymous',
      contact: contact || 'Not Provided',
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
    console.log('[LBM Support Query Received]:', queryEntry)
    res.json({ success: true, message: 'Message sent successfully to Founder & CEO!' })
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

app.get('/api/download/android', (_req, res) => {
  const apkPath = getApkPath()
  if (apkPath) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive')
    res.setHeader('Content-Disposition', 'attachment; filename="LBMMirror.apk"')
    return res.download(apkPath, 'LBMMirror.apk')
  }
  res.status(404).send('APK file not found on server.')
})

function getWindowsInstallerPath() {
  const possiblePaths = [
    path.join(__dirname, '../release/LBM_Mirror_Setup.exe'),
    path.join(process.cwd(), 'release/LBM_Mirror_Setup.exe'),
    path.join(__dirname, '../release/AEROMEN_SETUP.exe'),
    path.join(process.cwd(), 'release/AEROMEN_SETUP.exe'),
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
], (req, res) => {
  sendWindowsInstaller(req, res, 'LBM_Mirror_Setup.exe')
})

app.get('/AEROMEN_SETUP.exe', (req, res) => {
  sendWindowsInstaller(req, res, 'AEROMEN_SETUP.exe')
})

// Mobile & Desktop download route
app.get('/download', (req, res) => {
  // If user requests direct Windows EXE download, immediately send the installer file
  if (req.query.type === 'exe' || req.query.download === 'windows' || req.query.format === 'exe' || req.query.platform === 'windows') {
    return sendWindowsInstaller(req, res, 'LBM_Mirror_Setup.exe')
  }

  const joinPin = req.query.pin || ''
  const directCastUrl = joinPin ? `/?join=${joinPin}&mode=sender` : '/?mode=sender'

  res.send(`<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Download LBM Mirror App — Android</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #070d1e; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; text-align: center; }
    .card { background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(255,255,255,0.14); border-radius: 24px; max-width: 440px; width: 100%; padding: 32px 20px; box-shadow: 0 24px 50px rgba(0,0,0,0.6); }
    .logo { width: 84px; height: 84px; border-radius: 50%; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4); margin: 0 auto 14px; display: block; border: 3px solid #3b82f6; background: #0f172a; }
    h1 { font-size: 1.55rem; font-weight: 800; margin-bottom: 4px; color: #ffffff; }
    .founder-tag { font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; }
    .founder-name { color: #60a5fa; font-weight: 700; }
    
    .btn-download { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; font-size: 1.1rem; font-weight: 700; padding: 16px 20px; border-radius: 14px; text-decoration: none; box-shadow: 0 6px 22px rgba(37, 99, 235, 0.45); margin-bottom: 12px; transition: transform 0.15s ease; }
    .btn-download:active { transform: scale(0.98); }

    .btn-cast-direct { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: rgba(37, 99, 235, 0.12); color: #60a5fa; border: 1.5px solid rgba(59, 130, 246, 0.4); font-size: 0.96rem; font-weight: 600; padding: 13px 18px; border-radius: 12px; text-decoration: none; margin-bottom: 18px; }
    .btn-cast-direct:active { background: rgba(37, 99, 235, 0.25); }

    .auto-notice { font-size: 0.82rem; color: #93c5fd; margin-bottom: 18px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); padding: 10px 14px; border-radius: 10px; }
    .steps { text-align: left; background: rgba(15, 23, 42, 0.7); border-radius: 14px; padding: 16px; border: 1px solid rgba(255,255,255,0.06); }
    .step { font-size: 0.83rem; color: #cbd5e1; margin-bottom: 11px; display: flex; gap: 10px; align-items: flex-start; line-height: 1.4; }
    .step:last-child { margin-bottom: 0; }
    .num { background: #2563eb; color: #fff; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.74rem; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .footer-link { margin-top: 18px; font-size: 0.8rem; color: #64748b; }
    .footer-link a { color: #60a5fa; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/logo.png" alt="LBM Mirror Logo" class="logo" onerror="this.src='/downloads/LBMMirror.apk'" />
    <h1>LBM Mirror</h1>
    <p class="founder-tag">Founder &amp; CEO: <span class="founder-name">Laxman Choudhary</span></p>

    <div class="auto-notice" id="notice">
      ⏳ Downloading APK automatically... Click below if not started.
    </div>

    <a href="/api/download/android" download="LBMMirror.apk" class="btn-download" id="dl-btn">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Download LBMMirror.apk</span>
    </a>

    <a href="${directCastUrl}" class="btn-cast-direct">
      <span>🚀 Cast Directly in Browser (Zero Install)</span>
    </a>

    <div class="steps">
      <div class="step">
        <span class="num">1</span>
        <span>डाउनलोड पूरा होने के बाद <strong>LBMMirror.apk</strong> पर टैप करें।</span>
      </div>
      <div class="step">
        <span class="num">2</span>
        <span>यदि "File might be harmful" या "Unknown Sources" का विकल्प आए तो <strong>Download anyway / Allow</strong> करें।</span>
      </div>
      <div class="step">
        <span class="num">3</span>
        <span>ऐप खोलें और तुरंत कंप्यूटर स्क्रीन पर 60 FPS पर मिररिंग शुरू करें!</span>
      </div>
    </div>

    <div class="footer-link">
      Need Help? <a href="/#support">Contact Founder: Laxman Choudhary</a>
    </div>
  </div>

  <script>
    // Trigger direct APK download automatically
    setTimeout(function() {
      try {
        var link = document.createElement('a');
        link.href = '/api/download/android';
        link.setAttribute('download', 'LBMMirror.apk');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        var notice = document.getElementById('notice');
        if (notice) notice.innerHTML = '✅ Download started! Notification bar check karein.';
      } catch (err) {
        // user can tap button directly
      }
    }, 500);
  </script>
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

    const session = buildSession(socket.id)
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

  // ─── UltraViewer Remote PC Direct Signaling ────────────────────────
  socket.on('ultraviewer:host:register', ({ hostId, passcode, hostName }) => {
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
    console.log(`[UltraViewer] Host registered: ID=${cleanId} (Room: ${room})`)
    socket.emit('ultraviewer:registered', { success: true, hostId: cleanId })
  })

  socket.on('ultraviewer:client:connect', ({ partnerId, passcode, clientName }) => {
    const cleanId = String(partnerId || '').replace(/\s+/g, '').trim()
    console.log(`[UltraViewer] Client requesting connection to Partner ID: ${cleanId}`)
    const host = uvHosts.get(cleanId)

    if (!host) {
      socket.emit('ultraviewer:error', {
        message: `Partner PC (${cleanId}) ऑफ़लाइन है या शेयरिंग चालू नहीं है। कृपया Partner PC पर चेक करें।`,
      })
      return
    }

    const expectedPass = host.passcode
    const givenPass = String(passcode || '').trim()
    if (expectedPass && givenPass !== expectedPass) {
      socket.emit('ultraviewer:error', {
        message: 'गलत पासवर्ड (Invalid Passcode). कृपया Partner PC पर प्रदर्शित पासवर्ड दर्ज करें।',
      })
      return
    }

    const room = `uv_${cleanId}`
    socket.join(room)
    socket.emit('ultraviewer:auth_success', {
      hostId: cleanId,
      hostName: host.hostName,
    })
    io.to(host.socketId).emit('ultraviewer:incoming_partner', {
      clientId: socket.id,
      clientName: clientName || 'Remote Operator',
    })
    console.log(`[UltraViewer] Partner authenticated successfully into room ${room}`)
  })

  // Relay UltraViewer WebRTC Offer/Answer/ICE
  socket.on('ultraviewer:signal', ({ targetRoom, signal, type }) => {
    const room = targetRoom || (socket.rooms ? [...socket.rooms].find(r => r.startsWith('uv_')) : null)
    if (room) {
      socket.to(room).emit('ultraviewer:signal', { signal, type, senderId: socket.id })
    }
  })

  // Relay UltraViewer Remote Mouse/Keyboard Input
  socket.on('ultraviewer:input', ({ targetRoom, event }) => {
    const room = targetRoom || (socket.rooms ? [...socket.rooms].find(r => r.startsWith('uv_')) : null)
    if (room && event) {
      socket.to(room).emit('ultraviewer:input', { event })
    }
  })

  // Relay UltraViewer Live Chat
  socket.on('ultraviewer:chat', ({ targetRoom, message }) => {
    const room = targetRoom || (socket.rooms ? [...socket.rooms].find(r => r.startsWith('uv_')) : null)
    if (room && message) {
      socket.to(room).emit('ultraviewer:chat', { message })
    }
  })

  // Relay UltraViewer Clipboard Sync
  socket.on('ultraviewer:clipboard', ({ targetRoom, text }) => {
    const room = targetRoom || (socket.rooms ? [...socket.rooms].find(r => r.startsWith('uv_')) : null)
    if (room && text) {
      socket.to(room).emit('ultraviewer:clipboard', { text })
    }
  })

  // ─── Cleanup on disconnect ────────────────────────────────────────

  socket.on('disconnect', () => {
    const uvId = uvSocketToHost.get(socket.id)
    if (uvId) {
      uvHosts.delete(uvId)
      uvSocketToHost.delete(socket.id)
      io.to(`uv_${uvId}`).emit('ultraviewer:partner_disconnected', { hostId: uvId })
      console.log(`[UltraViewer] Host disconnected: ID=${uvId}`)
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

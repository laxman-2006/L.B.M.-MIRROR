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

// Direct APK download endpoint
function getApkPath() {
  const possiblePaths = [
    path.join(__dirname, 'downloads/LBMMirror.apk'),
    path.join(__dirname, '../public/downloads/LBMMirror.apk'),
    path.join(__dirname, '../android/app/build/outputs/apk/debug/app-debug.apk'),
  ]
  return possiblePaths.find((p) => fs.existsSync(p))
}

app.get('/api/download/android', (_req, res) => {
  const apkPath = getApkPath()
  if (apkPath) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive')
    return res.download(apkPath, 'LBMMirror.apk')
  }
  res.status(404).send('APK file not found on server.')
})

// Mobile-friendly download landing page (auto-downloads when scanned)
app.get('/download', (_req, res) => {
  const apkPath = getApkPath()
  const hasApk = !!apkPath
  res.send(`<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download LBM Mirror App — Android</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #0b132b; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; }
    .card { background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; max-width: 440px; width: 100%; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { width: 90px; height: 90px; border-radius: 50%; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4); margin: 0 auto 16px; display: block; border: 3px solid #3b82f6; }
    h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 6px; color: #ffffff; }
    .founder-tag { font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; }
    .founder-name { color: #60a5fa; font-weight: 600; }
    .btn-download { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; font-size: 1.1rem; font-weight: 700; padding: 16px 20px; border-radius: 12px; text-decoration: none; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); margin-bottom: 16px; transition: transform 0.15s ease; }
    .btn-download:active { transform: scale(0.98); }
    .auto-notice { font-size: 0.8rem; color: #a5b4fc; margin-bottom: 24px; background: rgba(99, 102, 241, 0.15); padding: 10px; border-radius: 8px; }
    .steps { text-align: left; background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 16px; margin-top: 10px; }
    .step { font-size: 0.82rem; color: #cbd5e1; margin-bottom: 10px; display: flex; gap: 10px; align-items: flex-start; }
    .step:last-child { margin-bottom: 0; }
    .num { background: #2563eb; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .footer-link { margin-top: 20px; font-size: 0.82rem; color: #64748b; }
    .footer-link a { color: #60a5fa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/logo.png" alt="LBM Mirror Logo" class="logo" />
    <h1>LBM Mirror</h1>
    <p class="founder-tag">Founder &amp; CEO: <span class="founder-name">Laxman Choudhary</span></p>

    <div class="auto-notice" id="notice">
      ⏳ Downloading APK automatically... Click below if not started.
    </div>

    <a href="/api/download/android" download="LBMMirror.apk" class="btn-download" id="dl-btn">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Download LBMMirror.apk</span>
    </a>

    <div class="steps">
      <div class="step">
        <span class="num">1</span>
        <span>डाउनलोड पूरा होने के बाद <strong>LBMMirror.apk</strong> पर टैप करें।</span>
      </div>
      <div class="step">
        <span class="num">2</span>
        <span>यदि "Unknown Sources" का विकल्प आए तो Allow/Permit करें।</span>
      </div>
      <div class="step">
        <span class="num">3</span>
        <span>ऐप खोलें और तुरंत पीसी पर स्क्रीन मिररिंग शुरू करें!</span>
      </div>
    </div>

    <div class="footer-link">
      Need Help? <a href="/#support">Contact Founder: Laxman Choudhary</a>
    </div>
  </div>

  <script>
    // Automatically trigger APK download 500ms after page opens
    setTimeout(function() {
      window.location.href = '/api/download/android';
      var notice = document.getElementById('notice');
      if (notice) notice.innerHTML = '✅ Download started! Check your notification bar.';
    }, 600);
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

  // ─── Cleanup on disconnect ────────────────────────────────────────

  socket.on('disconnect', () => {
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

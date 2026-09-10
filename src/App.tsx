import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import logoImg from './assets/logo.png'
import { MirrorViewer } from './components/MirrorViewer'
import { AuthModal, type UserProfile } from './components/AuthModal'
import { AppDownloadModal } from './components/AppDownloadModal'
import { FAQsModal } from './components/FAQsModal'
import { FounderModal } from './components/FounderModal'
import { AdminPanel } from './components/AdminPanel'
import { CastScreenStage } from './components/CastScreenStage'
import { MobileSenderView } from './components/MobileSenderView'
import { useAppSettings } from './context/AppSettingsContext'
import { LaptopPhoneIllustration, SleepingDeviceIllustration } from './components/IllustrationSVGs'
import { isMobileBrowser, getJoinUrl } from './utils/env'
import { defaultWebRtcService } from './services/webrtcService'
import { defaultPeerService } from './services/peerService'
import { defaultWebUsbService, isWebUsbSupported, type WebUsbDevice } from './services/webUsbService'
import { webGetMe } from './services/webAuthFallback'
import QRCode from 'qrcode'
import type {
  Platform,
  SessionStatus,
  SessionState,
  StatsState,
  AdbDevice,
  DeviceRequest,
} from './types'
import './App.css'

const shouldConnectSocket =
  Boolean(import.meta.env.VITE_SIGNALING_SERVER) ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))

const signalUrl =
  import.meta.env.VITE_SIGNALING_SERVER ||
  (shouldConnectSocket ? 'http://localhost:3001' : '')

const DEFAULT_STATS: StatsState = {
  fps: '60 FPS',
  latency: '15 ms',
  resolution: '1080p',
  bitrate: '16 Mbps',
  packetLoss: '0%',
  connectionType: 'LBM High-Speed Mirror',
  webrtcState: 'Idle',
  networkQuality: 'Excellent',
}

export default function App() {
  // ─── Desktop / System State ────────────────────────────────────────────────
  const isElectron = Boolean(window.electronAPI?.isElectron)
  const [networkInfo, setNetworkInfo] = useState<{ ip: string; hostname: string } | null>(null)

  // ─── Platform & Navigation State (Photo 1 Reference) ───────────────────────
  const [platform, setPlatform] = useState<Platform>('ios')
  const [activeNav, setActiveNav] = useState<'receive' | 'cast' | 'management'>('receive')

  // ─── Collapsible Cards State ───────────────────────────────────────────────
  const [expandedCards, setExpandedCards] = useState({
    screenMirroring: true,
    usbMirroring: false,
    videoCasting: false,
  })

  const toggleCard = (card: 'screenMirroring' | 'usbMirroring' | 'videoCasting') => {
    setExpandedCards((prev) => ({ ...prev, [card]: !prev[card] }))
  }

  // ─── Modals State ──────────────────────────────────────────────────────────
  const [showAuthDialog, setShowAuthDialog] = useState<boolean>(false)
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login')
  const [authGateMessage, setAuthGateMessage] = useState<string>('')
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false)
  const [showFaqsModal, setShowFaqsModal] = useState<boolean>(false)
  const [showViewerModal, setShowViewerModal] = useState<boolean>(false)
  const [showFounderModal, setShowFounderModal] = useState<boolean>(false)

  // ─── App Settings & Admin State ───────────────────────────────────────────
  const { settings } = useAppSettings()
  const [isAdminView, setIsAdminView] = useState<boolean>(false)
  const [showAdminPinDialog, setShowAdminPinDialog] = useState<boolean>(false)
  const [adminPinInput, setAdminPinInput] = useState<string>('')
  const [adminPinError, setAdminPinError] = useState<string | null>(null)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('lbm_admin_unlocked') === 'true'
  })

  const handleOpenAdminPanel = () => {
    if (isAdminUnlocked) {
      setIsAdminView(true)
      setActiveNav('management')
    } else {
      setAdminPinInput('')
      setAdminPinError(null)
      setShowAdminPinDialog(true)
    }
  }

  const handleVerifyAdminPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!adminPinInput.trim()) return

    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setIsAdminUnlocked(true)
        sessionStorage.setItem('lbm_admin_unlocked', 'true')
        setShowAdminPinDialog(false)
        setIsAdminView(true)
        setActiveNav('management')
      } else {
        setAdminPinError(data.error || 'गलत एडमिन पिन (Invalid PIN)')
      }
    } catch {
      if (adminPinInput.trim() === (settings.adminPin || '1229')) {
        setIsAdminUnlocked(true)
        sessionStorage.setItem('lbm_admin_unlocked', 'true')
        setShowAdminPinDialog(false)
        setIsAdminView(true)
        setActiveNav('management')
      } else {
        setAdminPinError('गलत एडमिन पिन (Invalid PIN)')
      }
    }
  }

  // ─── Authentication State ──────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('lbm_auth_token'))
  const pendingActionRef = useRef<(() => void) | null>(null)

  // ─── Session / Mirroring State ─────────────────────────────────────────────
  const [, setSession] = useState<SessionState | null>(null)
  const [status, setStatus] = useState<SessionStatus>('WAITING')
  const [, setPendingRequest] = useState<DeviceRequest | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [stats, setStats] = useState<StatsState>(DEFAULT_STATS)
  const [quality, setQuality] = useState<'Low' | 'Balanced' | 'High'>('High')

  // ─── Web App Session & Pairing State ───────────────────────────────────────
  const [currentPin, setCurrentPin] = useState<string>(() => {
    return String(Math.floor(100000 + Math.random() * 900000))
  })
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return 'lbm-' + Math.random().toString(36).substring(2, 9)
  })
  const [receiveQrUrl, setReceiveQrUrl] = useState<string>('')
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null)
  const [webUsbDevice, setWebUsbDevice] = useState<WebUsbDevice | null>(null)
  const [isConnectingWebUsb, setIsConnectingWebUsb] = useState<boolean>(false)

  // ─── Mobile Web View Detection ─────────────────────────────────────────────
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.has('join') || params.get('mode') === 'sender' || isMobileBrowser()
    }
    return false
  })

  // ─── Active Casting Device State ───────────────────────────────────────────
  const [activeConnectedDevice, setActiveConnectedDevice] = useState<{
    name: string
    platform: 'iOS' | 'Android' | 'Windows'
    type: 'AirPlay' | 'USB ADB' | 'Wi-Fi'
    ip?: string
    resolution: string
    fps: string
  } | null>(null)

  // ─── Native ADB & USB State ────────────────────────────────────────────────
  const [adbInstalled, setAdbInstalled] = useState<boolean | null>(null)
  const [adbDevices, setAdbDevices] = useState<AdbDevice[]>([])
  const [selectedAdbSerial, setSelectedAdbSerial] = useState<string>('')
  const [selectedUsbFps, setSelectedUsbFps] = useState<number>(60)
  const [selectedUsbRes, setSelectedUsbRes] = useState<string>('1080p')
  const [adbFrameImage, setAdbFrameImage] = useState<string | null>(null)
  const [isRefreshingAdb, setIsRefreshingAdb] = useState<boolean>(false)

  // ─── Screen Mirroring / AirPlay State ─────────────────────────────────────
  const [, setAirplayStatus] = useState<string | null>(null)
  const [isRestartingAirplay, setIsRestartingAirplay] = useState<boolean>(false)

  // ─── iOS USB Device State ──────────────────────────────────────────────────
  const [iosUsbConnected, setIosUsbConnected] = useState<boolean>(true)
  const [iosUsbDeviceName, setIosUsbDeviceName] = useState<string>('Apple iPhone')
  const [isCheckingIosUsb, setIsCheckingIosUsb] = useState<boolean>(false)

  const checkIosUsbConnection = useCallback(async () => {
    if (window.electronAPI?.airplay?.checkIosUsb) {
      setIsCheckingIosUsb(true)
      try {
        const res = await window.electronAPI.airplay.checkIosUsb()
        setIosUsbConnected(Boolean(res.connected))
        if (res.deviceName) setIosUsbDeviceName(res.deviceName)
        if (res.connected) {
          showToast(`⚡ iPhone detected via USB: ${res.deviceName || 'Apple iPhone'}`)
        } else {
          showToast('No iPhone detected on USB. Please plug in USB cable and tap Trust.')
        }
      } catch {
        // silent
      } finally {
        setIsCheckingIosUsb(false)
      }
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI?.airplay?.checkIosUsb) {
      window.electronAPI.airplay.checkIosUsb().then((res) => {
        setIosUsbConnected(Boolean(res.connected))
        if (res.deviceName) setIosUsbDeviceName(res.deviceName)
      }).catch(() => {})
    }
  }, [])

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const socketRef = useRef<Socket | null>(null)

  // ─── Toast Helper ──────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3000)
  }

  // ─── Generate Receive QR Code for Wireless Mirroring ───────────────────────
  useEffect(() => {
    const shareUrl = getJoinUrl(currentPin, currentSessionId)
    QRCode.toDataURL(shareUrl, {
      width: 180,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setReceiveQrUrl(url))
      .catch(() => {})
  }, [currentPin, currentSessionId])

  // ─── Listen for WebRTC Remote Video Stream (Socket & PeerJS) ───────────────
  useEffect(() => {
    const handleRemoteStream = (stream: MediaStream) => {
      setRemoteMediaStream(stream)
      setStatus('MIRRORING')
      setActiveConnectedDevice({
        name: 'Wireless Screen Client (WebRTC)',
        platform: 'Android',
        type: 'Wi-Fi',
        resolution: '1080p',
        fps: '60 FPS',
      })
      setShowViewerModal(true)
      showToast('🟢 Wireless screen stream connected at 60 FPS!')
    }

    defaultWebRtcService.setOnRemoteStream(handleRemoteStream)
    defaultPeerService.setOnRemoteStream(handleRemoteStream)

    defaultWebRtcService.setOnStats((st) => {
      setStats((prev) => ({ ...prev, ...st }))
    })
  }, [])

  // ─── Initialize Host Peer for Cross-Device WebRTC Mirroring ────────────────
  useEffect(() => {
    if (currentPin) {
      defaultPeerService.initHost(currentPin).catch(() => {})
    }
  }, [currentPin])

  // ─── Silent Auth Verification on Mount (Never opens login modal!) ──────────
  useEffect(() => {
    const token = localStorage.getItem('lbm_auth_token')
    if (token) {
      const verifyToken = async () => {
        try {
          let data: any
          if (window.electronAPI?.auth) {
            data = await window.electronAPI.auth.getMe(token)
          } else {
            try {
              const res = await fetch(`${signalUrl}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              data = await res.json()
            } catch {
              data = webGetMe(token)
            }
          }
          if (data && data.success && data.user) {
            setCurrentUser(data.user)
          } else {
            localStorage.removeItem('lbm_auth_token')
            setAuthToken(null)
          }
        } catch {
          // Silent catch — user can browse and use app freely
        }
      }
      verifyToken()
    }
  }, [])

  // ─── System / Electron Init & AirPlay Receiver Auto-start ──────────────────
  useEffect(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.getNetworkInfo().then((info) => {
        setNetworkInfo(info)
      }).catch(() => {})

      window.electronAPI.adb.checkInstalled().then((res) => {
        setAdbInstalled(Boolean(res?.installed))
      }).catch(() => { setAdbInstalled(false) })

      const unsubDevices = window.electronAPI.adb.onDeviceList((devices) => {
        setAdbDevices(devices)
        if (devices.length > 0 && !selectedAdbSerial) {
          setSelectedAdbSerial(devices[0].serial)
        }
      })

      const unsubFrames = window.electronAPI.adb.onFrame((frame) => {
        setAdbFrameImage(frame.image)
      })

      const unsubAdbStats = window.electronAPI.adb.onStats((st) => {
        setStats((prev) => ({ ...prev, ...st }))
      })

      const unsubAirplayClient = window.electronAPI.airplay.onClientConnected((client) => {
        setStatus('MIRRORING')
        setActiveConnectedDevice({
          name: client.name || 'iPhone / iPad',
          platform: 'iOS',
          type: 'AirPlay',
          ip: client.ip,
          resolution: '1080p',
          fps: '60 FPS',
        })
        showToast(`📱 iPhone Connected: ${client.name || 'iOS Device'}`)
      })

      const unsubAirplayStats = window.electronAPI.airplay.onStats((st) => {
        setStats((prev) => ({ ...prev, ...st }))
      })

      // Auto start AirPlay receiver in background so iPhone detects PC immediately
      window.electronAPI.airplay.startReceiver().then((res) => {
        if (res.running) {
          setAirplayStatus(res.serviceName || 'LBM Mirror AirPlay')
        }
      }).catch(() => {})

      return () => {
        unsubDevices()
        unsubFrames()
        unsubAdbStats()
        unsubAirplayClient()
        unsubAirplayStats()
      }
    }
  }, [isElectron, selectedAdbSerial])

  // ─── Protected Cast Action Gate Helper ─────────────────────────────────────
  /**
   * User's Key Requirement:
   * "जब मैं स्क्रीनकास्ट ऑन करूँ, तो क्लिक करूँ, तब लिखा आना चाहिए लॉगिन करें...
   * वो ID मैं जब मैं कास्ट पर स्क्रीनकास्ट ऑन करूँ, तो क्लिक करूँ, तब लिखा आना चाहिए लॉगिन करें."
   */
  const requireAuthForCasting = useCallback((action: () => void, message?: string) => {
    if (currentUser) {
      action()
    } else {
      pendingActionRef.current = action
      setAuthGateMessage(message || 'कृपया पहले लॉगिन करें (Please log in with your ID to start casting).')
      setAuthMode('login')
      setShowAuthDialog(true)
    }
  }, [currentUser])

  const handleAuthSuccess = (user: UserProfile, token: string) => {
    localStorage.setItem('lbm_auth_token', token)
    setAuthToken(token)
    setCurrentUser(user)
    setShowAuthDialog(false)
    setAuthGateMessage('')
    showToast(`Welcome back, ${user.username}! Your ID is active.`)
    if (pendingActionRef.current) {
      const act = pendingActionRef.current
      pendingActionRef.current = null
      setTimeout(act, 300)
    }
  }

  const handleSignOut = async () => {
    const token = authToken || localStorage.getItem('lbm_auth_token')
    if (token) {
      try {
        if (window.electronAPI?.auth) {
          await window.electronAPI.auth.logout(token)
        } else {
          await fetch(`${signalUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ token }),
          })
        }
      } catch {}
    }
    localStorage.removeItem('lbm_auth_token')
    setAuthToken(null)
    setCurrentUser(null)
    showToast('Signed out successfully.')
  }

  // ─── Socket.io Connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldConnectSocket || !signalUrl) return

    const s = io(signalUrl, { transports: ['websocket', 'polling'] })
    socketRef.current = s

    s.on('connect', () => {
      s.emit('session:create', { hostName: 'LBM Mirror' })
    })

    s.on('session:created', (payload: any) => {
      const newSession = payload?.session || payload
      if (newSession) {
        setSession(newSession)
        if (newSession.pin) setCurrentPin(newSession.pin)
        if (newSession.sessionId) {
          setCurrentSessionId(newSession.sessionId)
          defaultWebRtcService.setSessionId(newSession.sessionId)
        }
        if (newSession.status) setStatus(newSession.status)
      }
    })

    s.on('session:request', (req: DeviceRequest) => {
      setPendingRequest(req)
      setStatus('REQUESTED')
    })

    s.on('session:approved', () => {
      setStatus('CONNECTING')
    })

    s.on('session:client-joined', () => {
      setStatus('CONNECTED')
    })

    s.on('session:ended', () => {
      setStatus('DISCONNECTED')
      setActiveConnectedDevice(null)
    })

    defaultWebRtcService.setSocket(s)
    defaultWebRtcService.setSessionId(currentSessionId)

    return () => {
      s.disconnect()
    }
  }, [currentSessionId])

  // ─── AirPlay Restart Helper ────────────────────────────────────────────────
  const handleRestartAirplay = async () => {
    if (!window.electronAPI) return
    setIsRestartingAirplay(true)
    try {
      await window.electronAPI.airplay.stopReceiver()
      const res = await window.electronAPI.airplay.startReceiver({ fps: 60 })
      if (res.running) {
        setAirplayStatus(res.serviceName || 'LBM Mirror AirPlay')
        showToast('AirPlay service restarted successfully!')
      } else {
        setErrorText('Could not start AirPlay receiver.')
      }
    } catch {
      setErrorText('Error restarting AirPlay service.')
    } finally {
      setIsRestartingAirplay(false)
    }
  }

  // ─── Native ADB Actions ────────────────────────────────────────────────────
  const handleRefreshAdb = async () => {
    if (!window.electronAPI) return
    setIsRefreshingAdb(true)
    try {
      const devs = await window.electronAPI.adb.getDevices()
      setAdbDevices(devs || [])
      showToast(`Found ${devs?.length || 0} ADB device(s)`)
    } catch {
      setErrorText('Failed to refresh ADB devices.')
    } finally {
      setIsRefreshingAdb(false)
    }
  }

  const handleStartAdbMirroring = async (serial: string) => {
    requireAuthForCasting(async () => {
      if (!window.electronAPI) return
      try {
        setErrorText(null)
        const res = await window.electronAPI.adb.startMirroring(serial, {
          fps: selectedUsbFps,
          resolution: selectedUsbRes,
          bitrate: 16,
          stayAwake: true,
        })
        if (res.success) {
          setStatus('MIRRORING')
          const dev = adbDevices.find((d) => d.serial === serial)
          setActiveConnectedDevice({
            name: dev?.model || 'Android USB Device',
            platform: 'Android',
            type: 'USB ADB',
            resolution: selectedUsbRes,
            fps: `${selectedUsbFps} FPS`,
          })
          showToast(`⚡ USB Mirroring started: ${selectedUsbRes} @ ${selectedUsbFps} FPS`)
        } else {
          setErrorText(res.error || 'Failed to start USB mirroring.')
        }
      } catch (err: unknown) {
        setErrorText(err instanceof Error ? err.message : 'Error starting USB mirroring')
      }
    }, 'कृपया स्क्रीनकास्ट शुरू करने के लिए लॉगिन करें (Please log in to start casting).')
  }

  const handleDisconnectDevice = async () => {
    if (window.electronAPI) {
      window.electronAPI.adb.stopMirroring().catch(() => {})
    }
    defaultWebRtcService.close()
    setRemoteMediaStream(null)
    setActiveConnectedDevice(null)
    setStatus('WAITING')
    setAdbFrameImage(null)
    setWebUsbDevice(null)
    showToast('Device disconnected.')
  }

  const handleConnectWebUsb = async () => {
    setIsConnectingWebUsb(true)
    try {
      const dev = await defaultWebUsbService.requestAndroidDevice()
      if (dev) {
        setWebUsbDevice(dev)
        setActiveConnectedDevice({
          name: `${dev.manufacturerName} ${dev.productName}`,
          platform: 'Android',
          type: 'USB ADB',
          resolution: '1080p',
          fps: '60 FPS',
        })
        showToast(`⚡ WebUSB Connected: ${dev.manufacturerName} ${dev.productName}`)
      }
    } catch (err: any) {
      setErrorText(err.message || 'WebUSB connection was cancelled or failed.')
    } finally {
      setIsConnectingWebUsb(false)
    }
  }

  // ─── Nav Click Handlers ────────────────────────────────────────────────────
  const handleNavClick = (nav: 'receive' | 'cast' | 'management') => {
    if (nav === 'cast') {
      setIsAdminView(false)
      requireAuthForCasting(() => {
        setActiveNav('cast')
      }, 'कृपया स्क्रीनकास्ट ऑन करने के लिए पहले लॉगिन करें (Please log in to start casting).')
    } else if (nav === 'management') {
      handleOpenAdminPanel()
    } else {
      setIsAdminView(false)
      setActiveNav(nav)
    }
  }

  const currentHostIp = networkInfo?.ip || '192.168.137.167'
  const currentHostName = networkInfo?.hostname || 'LAXMAN'

  // If Admin View is active, render full-featured Admin Panel
  if (isAdminView) {
    return (
      <AdminPanel
        onSwitchToUserView={() => {
          setIsAdminView(false)
          setActiveNav('receive')
        }}
      />
    )
  }

  // If Mobile browser or ?mode=sender or ?join=PIN parameter, render MobileSenderView
  if (isMobileMode && !isElectron) {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    return (
      <MobileSenderView
        socket={socketRef.current}
        initialPin={params?.get('join') || ''}
        onSwitchToFullView={() => setIsMobileMode(false)}
      />
    )
  }

  return (
    <div className="airplayer-shell">
      {/* ════════════════════════════════════════════════════════════════════
          1. LEFT NAVIGATION SIDEBAR (Photo 1 Reference)
      ════════════════════════════════════════════════════════════════════ */}
      <aside className="airplayer-sidebar">
        {/* Brand Header: Dynamic App Logo + App Name */}
        {/* Brand / App Logo Block (Click opens Founder & CEO Modal) */}
        <div
          className="sidebar-brand-block clickable-brand-trigger"
          onClick={() => setShowFounderModal(true)}
          title={`Click to view Founder & CEO Profile: ${settings.founderName || 'Laxman Choudhary'}`}
          role="button"
          tabIndex={0}
        >
          <div className="sidebar-logo-circle">
            <img
              src={settings.appLogo || logoImg}
              alt={settings.appName}
              className="sidebar-logo-image"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = logoImg
              }}
            />
          </div>
          <div className="sidebar-brand-text">
            <h1 className="sidebar-app-name">{settings.appName}</h1>
            <span className="sidebar-app-tagline">{settings.appTagline}</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-navigation">
          <button
            type="button"
            className={`nav-btn ${activeNav === 'receive' ? 'active' : ''}`}
            onClick={() => handleNavClick('receive')}
          >
            <span className="nav-btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
                <polyline points="10 9 12 11 14 9"/>
                <line x1="12" y1="6" x2="12" y2="11"/>
              </svg>
            </span>
            <span className="nav-btn-label">Receive Screen</span>
          </button>

          <button
            type="button"
            className={`nav-btn ${activeNav === 'cast' ? 'active' : ''}`}
            onClick={() => handleNavClick('cast')}
          >
            <span className="nav-btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>
                <line x1="2" y1="20" x2="2.01" y2="20"/>
              </svg>
            </span>
            <span className="nav-btn-label">Cast Screen</span>
          </button>

          <button
            type="button"
            className={`nav-btn ${activeNav === 'management' ? 'active' : ''}`}
            onClick={() => handleNavClick('management')}
            title="एडमिन पैनल — ऐप नाम, लोगो, व्हाट्सएप, इंस्टाग्राम और यूज़र्स प्रबंधित करें"
          >
            <span className="nav-btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="6" rx="2"/>
                <rect x="4" y="14" width="16" height="6" rx="2"/>
                <line x1="8" y1="7" x2="8.01" y2="7"/>
                <line x1="8" y1="17" x2="8.01" y2="17"/>
              </svg>
            </span>
            <span className="nav-btn-label">Admin Panel ⚙️</span>
          </button>

          <div className="nav-menu-divider" />

          <button
            type="button"
            className="nav-btn secondary-nav-btn"
            onClick={() => setShowDownloadModal(true)}
          >
            <span className="nav-btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
                <polyline points="9 11 12 14 15 11"/>
                <line x1="12" y1="7" x2="12" y2="14"/>
              </svg>
            </span>
            <span className="nav-btn-label">Download App</span>
          </button>

          <button
            type="button"
            className="nav-btn secondary-nav-btn"
            onClick={() => setShowFaqsModal(true)}
          >
            <span className="nav-btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </span>
            <span className="nav-btn-label">FAQs</span>
          </button>

          {/* Founder & CEO Button as requested */}
          <button
            type="button"
            className="nav-btn secondary-nav-btn founder-nav-item"
            onClick={() => setShowFounderModal(true)}
            title={`Founder & CEO — ${settings.founderName || 'Laxman Choudhary'}`}
          >
            <span className="nav-btn-icon round-logo-nav-icon">
              <img
                src={settings.appLogo || logoImg}
                alt="Logo"
                className="founder-round-btn-img"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = logoImg
                }}
              />
            </span>
            <span className="nav-btn-label">Founder &amp; CEO</span>
          </button>
        </nav>

        {/* Bottom Promo Card (Photo 1 Reference) */}
        <div className="sidebar-promo-card">
          <div className="promo-tag-badge">VIP Offer</div>
          <h4 className="promo-title">Black Friday Deal!</h4>
          <p className="promo-desc">50% Off Annual Membership</p>
          <button
            type="button"
            className="promo-action-btn"
            onClick={() => showToast('VIP Mirroring: Ultra HD 60 FPS Unlocked!')}
          >
            <span>Purchase &gt;</span>
          </button>
          <div className="promo-megaphone-icon">📢</div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          2. CENTER MAIN STAGE (Photo 1 Reference)
      ════════════════════════════════════════════════════════════════════ */}
      <main className="airplayer-center-stage">
        {/* Top Header Bar */}
        <header className="stage-top-bar">
          {/* Center: Platform Tabs (iOS, Android, Windows) */}
          <div className="platform-pills-wrap">
            <button
              type="button"
              className={`platform-pill ${platform === 'ios' ? 'active' : ''}`}
              onClick={() => setPlatform('ios')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.68-.9 2.71.99.08 2.01-.5 2.59-1.2z"/>
              </svg>
              <span>iOS</span>
            </button>

            <button
              type="button"
              className={`platform-pill ${platform === 'android' ? 'active' : ''}`}
              onClick={() => setPlatform('android')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4111 13.8563 8.0838 12 8.0838s-3.5902.3273-5.1368.8658L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
              </svg>
              <span>Android</span>
            </button>

            <button
              type="button"
              className={`platform-pill ${platform === 'windows' ? 'active' : ''}`}
              onClick={() => setPlatform('windows')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.8"/>
              </svg>
              <span>Windows</span>
            </button>
          </div>

          {/* Right: "Your ID / Log in" profile widget + Window controls */}
          <div className="header-right-group">
            {/* Runtime Mode Pill */}
            <div className={`runtime-status-pill ${isElectron ? 'electron-mode' : 'web-mode'}`}>
              <span className="runtime-dot" />
              <span>{isElectron ? '🖥️ Desktop EXE' : '🌐 Web App'}</span>
            </div>

            {/* Quick Admin Panel Trigger */}
            <button
              type="button"
              className="header-admin-quick-btn"
              onClick={handleOpenAdminPanel}
              title="एडमिन पैनल खोलें (Admin Control Panel)"
            >
              <span className="admin-lock-icon">🛡️</span>
              <span className="admin-btn-text">Admin Panel</span>
            </button>

            {currentUser ? (
              <div className="header-user-widget">
                <div className="user-avatar-circle">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-text-info">
                  <span className="user-id-prefix">Your ID:</span>
                  <strong className="user-id-name" title={currentUser.email}>{currentUser.username}</strong>
                </div>
                <button
                  type="button"
                  className="user-signout-btn"
                  onClick={handleSignOut}
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="header-login-btn"
                onClick={() => {
                  setAuthMode('login')
                  setAuthGateMessage('')
                  setShowAuthDialog(true)
                }}
                title="Log in with your ID"
              >
                <div className="login-avatar-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <span className="login-label">Log in</span>
              </button>
            )}

            {/* Electron Window Controls */}
            {isElectron && window.electronAPI && (
              <div className="window-action-buttons">
                <button
                  type="button"
                  className="win-action-btn"
                  onClick={() => window.electronAPI?.window.minimize()}
                  title="Minimize"
                >
                  ─
                </button>
                <button
                  type="button"
                  className="win-action-btn"
                  onClick={() => window.electronAPI?.window.maximize()}
                  title="Maximize"
                >
                  □
                </button>
                <button
                  type="button"
                  className="win-action-btn win-action-close"
                  onClick={() => window.electronAPI?.window.close()}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Toast Notification */}
        {toast && <div className="floating-toast-alert">{toast}</div>}
        {errorText && (
          <div className="floating-error-banner">
            <span>⚠️ {errorText}</span>
            <button type="button" onClick={() => setErrorText(null)}>✕</button>
          </div>
        )}

        {/* ── Web Mode Guidance Banner ── */}
        {!isElectron && (
          <div className="web-runtime-banner">
            <div className="web-banner-left">
              <span className="web-pill-icon">🌐</span>
              <div className="web-banner-text">
                <strong>LBM Mirror Web App (Online Cloud Mode)</strong>
                <p>
                  Browser Screen Casting (60 FPS) &amp; Wireless Mobile Mirroring are active.
                  For hardware USB Cable (Scrcpy ADB) &amp; Apple AirPlay Bonjour, run the Windows Desktop EXE.
                </p>
              </div>
            </div>
            <div className="web-banner-actions">
              <button
                type="button"
                className={`web-cast-quick-btn ${activeNav === 'cast' ? 'active' : ''}`}
                onClick={() => setActiveNav('cast')}
              >
                🚀 Cast Screen (60 FPS)
              </button>
              <button
                type="button"
                className="web-download-quick-btn"
                onClick={() => setShowDownloadModal(true)}
              >
                ⬇️ Download Desktop EXE
              </button>
            </div>
          </div>
        )}

        {/* ── Center Stage Content Cards ── */}
        {activeNav === 'cast' ? (
          <CastScreenStage
            socket={socketRef.current}
            currentPin={currentPin}
            currentSessionId={currentSessionId}
            onRequireAuth={requireAuthForCasting}
            showToast={showToast}
          />
        ) : (
          <div className="stage-cards-container">
          {/* ═══════════════ IOS VIEW (Photo 1 Reference) ═══════════════ */}
          {platform === 'ios' && (
            <>
              {/* Card 1: Screen Mirroring (Recommended) */}
              <section className="airplayer-card primary-card">
                <div className="card-top-header" onClick={() => toggleCard('screenMirroring')}>
                  <div className="card-header-left">
                    <span className="card-indicator-icon green-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    </span>
                    <h3 className="card-title-text">Screen Mirroring</h3>
                    <span className="badge-recommended">Recommended</span>
                  </div>
                  <button type="button" className="card-toggle-arrow">
                    {expandedCards.screenMirroring ? 'Collapse ▲' : 'Expand ▼'}
                  </button>
                </div>

                {expandedCards.screenMirroring && (
                  <div className="card-inner-content">
                    <p className="highlight-subtitle-orange">
                      Mirror via AirPlay and start casting instantly on the same network.
                    </p>

                    <div className="card-methods-split">
                      {/* Left: Instruction steps */}
                      <div className="methods-instructions">
                        <h4 className="methods-heading">Screen Mirroring Methods:</h4>
                        <ol className="methods-numbered-list">
                          <li>
                            <span>1. On your iOS device, open Screen Mirroring and select this PC.</span>{' '}
                            <button
                              type="button"
                              className="inline-guide-link"
                              onClick={() => setShowFaqsModal(true)}
                            >
                              View guide
                            </button>
                          </li>
                          <li>
                            <span>2. If not found, try</span>{' '}
                            <button
                              type="button"
                              className="inline-action-link"
                              onClick={handleRestartAirplay}
                              disabled={isRestartingAirplay}
                            >
                              {isRestartingAirplay ? 'restarting AirPlay…' : 'restart the AirPlay service.'}
                            </button>
                          </li>
                        </ol>

                        <div className="methods-extra-actions">
                          <button
                            type="button"
                            className="tutorial-link-btn"
                            onClick={() => setShowFaqsModal(true)}
                          >
                            View Animated Tutorials
                          </button>
                        </div>
                      </div>

                      {/* Right: Laptop & iPhone Illustration */}
                      <div className="methods-graphic-wrap">
                        <LaptopPhoneIllustration width={260} height={145} />
                      </div>
                    </div>

                    {/* Bottom Device Info Pill */}
                    <div className="device-info-pill-bar">
                      <span className="info-label">Device info:</span>
                      <span className="info-item">
                        <strong>Name:</strong> 3uAirPlayer-{currentHostName}
                      </span>
                      <span className="info-separator">|</span>
                      <span className="info-item">
                        <strong>IP:</strong> {currentHostIp}
                      </span>
                      <span className="info-separator">|</span>
                      <span className="info-item">
                        <strong>Wi-Fi:</strong> MAX CLOTHI...
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {/* Card 2: USB Screen Mirroring */}
              <section className="airplayer-card">
                <div className="card-top-header" onClick={() => toggleCard('usbMirroring')}>
                  <div className="card-header-left">
                    <span className="card-indicator-icon teal-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v8M8 6h8M9 22v-4a3 3 0 0 1 3-3 3 3 0 0 1 3 3v4"/>
                        <circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/>
                      </svg>
                    </span>
                    <h3 className="card-title-text">USB Screen Mirroring (Lightning / Type-C)</h3>
                    {iosUsbConnected ? (
                      <span className="badge-connected-usb">🟢 {iosUsbDeviceName} Connected</span>
                    ) : (
                      <span className="badge-waiting-usb">Connect USB Cable</span>
                    )}
                  </div>
                  <button type="button" className="card-toggle-arrow">
                    {expandedCards.usbMirroring ? 'Collapse ▲' : 'Expand ▼'}
                  </button>
                </div>

                {expandedCards.usbMirroring && (
                  <div className="card-inner-content">
                    <p className="highlight-subtitle-blue">
                      Ultra-Fast 60 FPS Direct Cable Mirroring (Zero Lag &amp; Hardware Accelerated)
                    </p>

                    <div className="ios-usb-guide-box">
                      <div className="ios-usb-step-row">
                        <span className="step-badge">1</span>
                        <div>
                          <strong>USB Cable Connection:</strong>
                          <p>{iosUsbConnected ? `✅ ${iosUsbDeviceName} is plugged into this PC via USB cable.` : 'Plug your iPhone Lightning or Type-C cable into the computer.'}</p>
                        </div>
                      </div>

                      <div className="ios-usb-step-row">
                        <span className="step-badge">2</span>
                        <div>
                          <strong>Tap "Trust This Computer":</strong>
                          <p>Unlock your iPhone screen and tap "Trust" if prompted.</p>
                        </div>
                      </div>

                      <div className="ios-usb-step-row">
                        <span className="step-badge">3</span>
                        <div>
                          <strong>Turn ON USB Hotspot (For Direct 480 Mbps Cable Speed):</strong>
                          <p>On iPhone: Open <strong>Settings &gt; Personal Hotspot &gt; Turn ON</strong> ("USB Only" or "Allow Others"). This routes the screen mirror stream directly over the high-speed USB cable with zero Wi-Fi interference!</p>
                        </div>
                      </div>

                      <div className="ios-usb-step-row">
                        <span className="step-badge">4</span>
                        <div>
                          <strong>Start Screen Mirroring:</strong>
                          <p>Swipe down iPhone Control Center &gt; Tap <strong>Screen Mirroring</strong> &gt; Select <strong>LBM Mirror</strong>.</p>
                        </div>
                      </div>
                    </div>

                    <div className="card-action-bar usb-action-bar">
                      <button
                        type="button"
                        className="airplayer-blue-btn"
                        onClick={handleRestartAirplay}
                        disabled={isRestartingAirplay}
                      >
                        {isRestartingAirplay ? 'Starting 60 FPS Engine…' : '⚡ Start 60 FPS Zero-Lag USB Mirroring'}
                      </button>

                      <button
                        type="button"
                        className="refresh-btn"
                        onClick={checkIosUsbConnection}
                        disabled={isCheckingIosUsb}
                      >
                        {isCheckingIosUsb ? 'Checking USB…' : '🔄 Refresh USB Status'}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Card 3: Video App Casting */}
              <section className="airplayer-card">
                <div className="card-top-header" onClick={() => toggleCard('videoCasting')}>
                  <div className="card-header-left">
                    <span className="card-indicator-icon orange-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                        <polyline points="17 2 12 7 7 2"/>
                      </svg>
                    </span>
                    <h3 className="card-title-text">Video App Casting</h3>
                  </div>
                  <button type="button" className="card-toggle-arrow">
                    {expandedCards.videoCasting ? 'Collapse ▲' : 'Expand ▼'}
                  </button>
                </div>

                {expandedCards.videoCasting && (
                  <div className="card-inner-content">
                    <ul className="bullets-list">
                      <li>◇ Cast from third-party audio/video apps to this computer</li>
                      <li>◇ iOS device and PC must be on the same network (same router).</li>
                    </ul>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ═══════════════ ANDROID VIEW ═══════════════ */}
          {platform === 'android' && (
            <>
              {/* Card 1: USB Screen Mirroring (Recommended for Android) */}
              <section className="airplayer-card primary-card">
                <div className="card-top-header" onClick={() => toggleCard('usbMirroring')}>
                  <div className="card-header-left">
                    <span className="card-indicator-icon teal-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v8M8 6h8M9 22v-4a3 3 0 0 1 3-3 3 3 0 0 1 3 3v4"/>
                      </svg>
                    </span>
                    <h3 className="card-title-text">USB Screen Mirroring</h3>
                    <span className="badge-recommended">Recommended</span>
                  </div>
                  <button type="button" className="card-toggle-arrow">
                    {expandedCards.usbMirroring ? 'Collapse ▲' : 'Expand ▼'}
                  </button>
                </div>

                {expandedCards.usbMirroring && (
                  <div className="card-inner-content">
                    <p className="highlight-subtitle-blue">
                      Plug-and-cast via USB cable: Ultra-low latency 60 FPS Android screen casting.
                    </p>

                    {!isElectron ? (
                      /* Web App Mode: WebUSB Direct Cable Mirroring */
                      <div className="webusb-controls-container">
                        <div className="webusb-info-box">
                          <span className="webusb-badge">
                            {isWebUsbSupported() ? '🟢 WebUSB Supported' : '⚠️ WebUSB Requires Chrome / Edge / Opera'}
                          </span>
                          <p className="webusb-desc">
                            Connect your Android phone directly via USB cable to this browser using WebUSB.
                          </p>
                        </div>

                        <div className="webusb-device-status-row">
                          <label>USB Device:</label>
                          {webUsbDevice ? (
                            <span className="webusb-dev-name">
                              📱 {webUsbDevice.manufacturerName} {webUsbDevice.productName} (Connected)
                            </span>
                          ) : (
                            <span className="no-dev-text">No device connected via WebUSB</span>
                          )}

                          <button
                            type="button"
                            className="airplayer-blue-btn"
                            onClick={handleConnectWebUsb}
                            disabled={isConnectingWebUsb || !isWebUsbSupported()}
                          >
                            {isConnectingWebUsb ? 'Connecting…' : '⚡ Connect Android Phone via WebUSB'}
                          </button>
                        </div>

                        <div className="ios-usb-guide-box">
                          <div className="ios-usb-step-row">
                            <span className="step-badge">1</span>
                            <div>
                              <strong>Connect USB Cable &amp; Enable USB Debugging:</strong>
                              <p>On Android: Settings &gt; Developer Options &gt; Turn ON <strong>USB Debugging</strong>.</p>
                            </div>
                          </div>
                          <div className="ios-usb-step-row">
                            <span className="step-badge">2</span>
                            <div>
                              <strong>Grant Browser Permission:</strong>
                              <p>Click "Connect Android Phone" above and select your device from the browser popup.</p>
                            </div>
                          </div>
                        </div>

                        <div className="device-info-pill-bar">
                          <span className="info-label">Device info:</span>
                          <span className="info-item"><strong>Mode:</strong> WebUSB</span>
                          <span className="info-separator">|</span>
                          <span className="info-item"><strong>Status:</strong> {webUsbDevice ? 'Connected' : 'Waiting for USB'}</span>
                        </div>
                      </div>
                    ) : (
                      /* Desktop Electron Mode: Native ADB */
                      <div className="android-usb-controls">
                        {/* Detected ADB devices */}
                        <div className="adb-devices-bar">
                          <label>Detected Phone:</label>
                          {adbDevices.length > 0 ? (
                            <select
                              className="adb-select"
                              value={selectedAdbSerial}
                              onChange={(e) => setSelectedAdbSerial(e.target.value)}
                            >
                              {adbDevices.map((d) => (
                                <option key={d.serial} value={d.serial}>
                                  {d.model || d.serial} ({d.status})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="no-dev-text">No USB device detected yet</span>
                          )}

                          <button
                            type="button"
                            className="refresh-btn"
                            onClick={handleRefreshAdb}
                            disabled={isRefreshingAdb}
                          >
                            {isRefreshingAdb ? 'Scanning…' : '🔄 Scan USB'}
                          </button>
                        </div>

                        {/* Settings Row */}
                        <div className="usb-options-row">
                          <div className="opt-item">
                            <label>Resolution:</label>
                            <select
                              value={selectedUsbRes}
                              onChange={(e) => setSelectedUsbRes(e.target.value)}
                            >
                              <option value="1080p">1080p (Full HD)</option>
                              <option value="720p">720p (Fast)</option>
                              <option value="original">Original Screen</option>
                            </select>
                          </div>
                          <div className="opt-item">
                            <label>Frame Rate:</label>
                            <select
                              value={selectedUsbFps}
                              onChange={(e) => setSelectedUsbFps(Number(e.target.value))}
                            >
                              <option value={60}>60 FPS (Ultra Smooth)</option>
                              <option value={30}>30 FPS (Standard)</option>
                            </select>
                          </div>
                        </div>

                        <div className="usb-start-action">
                          <button
                            type="button"
                            className="airplayer-blue-btn large"
                            onClick={() => {
                              if (selectedAdbSerial) {
                                handleStartAdbMirroring(selectedAdbSerial)
                              } else if (adbDevices.length > 0) {
                                handleStartAdbMirroring(adbDevices[0].serial)
                              } else {
                                showToast('Please connect Android phone via USB cable and enable USB Debugging.')
                              }
                            }}
                          >
                            ⚡ Start USB Mirroring (Scrcpy 60 FPS)
                          </button>
                        </div>

                        <div className="device-info-pill-bar">
                          <span className="info-label">Device info:</span>
                          <span className="info-item"><strong>Name:</strong> LBM-{currentHostName}</span>
                          <span className="info-separator">|</span>
                          <span className="info-item"><strong>IP:</strong> {currentHostIp}</span>
                          <span className="info-separator">|</span>
                          <span className="info-item"><strong>ADB:</strong> {adbInstalled ? 'Ready' : 'Not Detected'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Card 2: Wireless Screen Mirroring */}
              <section className="airplayer-card">
                <div className="card-top-header" onClick={() => toggleCard('screenMirroring')}>
                  <div className="card-header-left">
                    <span className="card-indicator-icon green-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                        <circle cx="12" cy="20" r="1"/>
                      </svg>
                    </span>
                    <h3 className="card-title-text">Wireless Screen Mirroring</h3>
                  </div>
                  <button type="button" className="card-toggle-arrow">
                    {expandedCards.screenMirroring ? 'Collapse ▲' : 'Expand ▼'}
                  </button>
                </div>

                {expandedCards.screenMirroring && (
                  <div className="card-inner-content">
                    <p className="highlight-subtitle-orange">
                      Cast wirelessly over local Wi-Fi or WebRTC Internet using the LBM Mobile App or Mobile Web Browser.
                    </p>

                    <div className="wireless-receive-hub">
                      <div className="wireless-pin-qr-split">
                        <div className="wireless-qr-box">
                          {receiveQrUrl ? (
                            <img src={receiveQrUrl} alt="Receive QR Code" className="receive-qr-img" />
                          ) : (
                            <div className="qr-placeholder">Generating QR...</div>
                          )}
                          <span className="qr-scan-label">Scan with Mobile Camera</span>
                        </div>

                        <div className="wireless-pin-col">
                          <span className="pin-title-label">SESSION 6-DIGIT PAIRING PIN</span>
                          <div className="pin-digits-row">
                            {currentPin.split('').map((d, i) => (
                              <span key={i} className="pin-digit-box">{d}</span>
                            ))}
                          </div>
                          <p className="wireless-instruction-text">
                            On your phone, open <strong>{typeof window !== 'undefined' ? window.location.host : 'LBM Web'}</strong> and enter this PIN to mirror your phone screen to this PC instantly.
                          </p>
                        </div>
                      </div>

                      <div className="card-action-bar">
                        <button
                          type="button"
                          className="airplayer-blue-btn"
                          onClick={() => setShowDownloadModal(true)}
                        >
                          📱 Download Mobile App &amp; Scan QR
                        </button>
                        <a
                          href={getJoinUrl(currentPin, currentSessionId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="web-test-link-btn"
                        >
                          🌐 Test Mobile Web Cast in New Tab
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ═══════════════ WINDOWS VIEW ═══════════════ */}
          {platform === 'windows' && (
            <section className="airplayer-card primary-card">
              <div className="card-top-header">
                <div className="card-header-left">
                  <span className="card-indicator-icon blue-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                    </svg>
                  </span>
                  <h3 className="card-title-text">Windows PC Mirroring</h3>
                  <span className="badge-recommended">Recommended</span>
                </div>
              </div>
              <div className="card-inner-content">
                <p className="highlight-subtitle-blue">
                  Stream PC screen or receive remote Windows screen over local Wi-Fi.
                </p>
                <div className="card-action-bar">
                  <button
                    type="button"
                    className="airplayer-blue-btn"
                    onClick={() => handleNavClick('cast')}
                  >
                    🖥️ Start Windows Screen Cast
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
      </main>

      {/* ════════════════════════════════════════════════════════════════════
          3. RIGHT SIDEBAR: Mirroring Device List (Photo 1 Reference)
      ════════════════════════════════════════════════════════════════════ */}
      <aside className="airplayer-device-list-pane">
        <div className="device-list-header">
          <h3 className="pane-title">
            Mirroring Device List{' '}
            <span className="count-tag">({activeConnectedDevice ? 1 : 0}/1)</span>
          </h3>
        </div>

        <div className="device-list-content">
          {activeConnectedDevice ? (
            /* Connected Device Card */
            <div className="connected-device-card">
              <div className="connected-device-top">
                <div className="dev-icon-badge">
                  {activeConnectedDevice.platform === 'iOS' ? '🍎' : '🤖'}
                </div>
                <div className="dev-name-col">
                  <h4 className="dev-name">{activeConnectedDevice.name}</h4>
                  <span className="dev-type-badge">{activeConnectedDevice.type}</span>
                </div>
              </div>

              <div className="dev-stats-row">
                <div className="stat-bubble">
                  <span>FPS</span>
                  <strong>{activeConnectedDevice.fps}</strong>
                </div>
                <div className="stat-bubble">
                  <span>RES</span>
                  <strong>{activeConnectedDevice.resolution}</strong>
                </div>
                <div className="stat-bubble">
                  <span>LATENCY</span>
                  <strong>{stats.latency}</strong>
                </div>
              </div>

              {/* Scrcpy live frame preview if available */}
              {adbFrameImage && (
                <div className="live-mini-preview" onClick={() => setShowViewerModal(true)}>
                  <img src={adbFrameImage} alt="Screen Preview" />
                  <span className="preview-overlay-btn">Click to Expand</span>
                </div>
              )}

              <div className="connected-device-actions">
                <button
                  type="button"
                  className="device-ctl-btn primary"
                  onClick={() => setShowViewerModal(true)}
                >
                  View Screen
                </button>
                <button
                  type="button"
                  className="device-ctl-btn disconnect"
                  onClick={handleDisconnectDevice}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            /* Empty State Illustration (Photo 1 Reference) */
            <div className="device-list-empty-state">
              <div className="sleeping-illustration-wrap">
                <SleepingDeviceIllustration width={180} height={150} />
              </div>
              <p className="empty-state-label">No devices currently casting.</p>
            </div>
          )}
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          4. ALL MODALS
      ════════════════════════════════════════════════════════════════════ */}
      {/* 1. Photo 2 Reference Login Modal (Dual-panel, clean, dismissible) */}
      {showAuthDialog && (
        <AuthModal
          apiBaseUrl={signalUrl}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
          gateMessage={authGateMessage || undefined}
          onClose={() => {
            setShowAuthDialog(false)
            setAuthGateMessage('')
          }}
        />
      )}

      {/* 2. Download App Modal (QR Code Scanner & Direct Link) */}
      {showDownloadModal && (
        <AppDownloadModal
          localIp={currentHostIp}
          currentPin={currentPin}
          onClose={() => setShowDownloadModal(false)}
        />
      )}

      {/* 3. FAQs / Guide Modal */}
      {showFaqsModal && (
        <FAQsModal onClose={() => setShowFaqsModal(false)} />
      )}

      {/* 4. Founder & CEO Profile Modal */}
      {showFounderModal && (
        <FounderModal
          isOpen={showFounderModal}
          onClose={() => setShowFounderModal(false)}
        />
      )}

      {/* 4. Live Mirror Viewer */}
      {showViewerModal && (
        <div className="auth-modal-overlay" onClick={() => setShowViewerModal(false)}>
          <div className="mirror-viewer-window-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="download-close-btn"
              onClick={() => setShowViewerModal(false)}
            >
              ✕
            </button>
            <MirrorViewer
              frameImage={adbFrameImage}
              stream={remoteMediaStream}
              deviceName={activeConnectedDevice?.name || 'Casting Device'}
              status={status}
              quality={quality}
              stats={stats}
              onDisconnect={() => {
                handleDisconnectDevice()
                setShowViewerModal(false)
              }}
              onQualityChange={(q) => setQuality(q)}
            />
          </div>
        </div>
      )}

      {/* 5. Admin Passcode / PIN Verification Modal */}
      {showAdminPinDialog && (
        <div className="auth-modal-overlay" onClick={() => setShowAdminPinDialog(false)}>
          <div className="admin-pin-dialog-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="download-close-btn"
              onClick={() => setShowAdminPinDialog(false)}
            >
              ✕
            </button>
            <div className="pin-dialog-header">
              <span className="pin-shield-badge">🛡️</span>
              <h3 className="pin-dialog-title">Admin Panel Access</h3>
              <p className="pin-dialog-desc">
                कृपया एडमिन पैनल खोलने के लिए अपना 4-अंकीय एक्सेस पिन दर्ज करें।
              </p>
            </div>

            <form onSubmit={handleVerifyAdminPin} className="pin-form">
              <input
                type="password"
                autoFocus
                maxLength={10}
                placeholder="Enter PIN (Default: 1229)"
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value)
                  setAdminPinError(null)
                }}
                className="admin-pin-input-field"
              />

              {adminPinError && (
                <div className="pin-error-alert">
                  ⚠️ {adminPinError}
                </div>
              )}

              <div className="pin-dialog-actions-row">
                <button
                  type="button"
                  className="pin-cancel-action-btn"
                  onClick={() => setShowAdminPinDialog(false)}
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="submit"
                  className="pin-unlock-action-btn"
                >
                  🔓 अनलॉक करें (Unlock Admin)
                </button>
              </div>

              <span className="pin-hint-footnote">
                💡 डिफ़ॉल्ट पिन <strong>1229</strong> है। एडमिन पैनल खुलने के बाद आप इसे कभी भी बदल सकते हैं।
              </span>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

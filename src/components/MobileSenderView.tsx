import React, { useState, useEffect, useRef, useCallback } from 'react'
import logoImg from '../assets/logo.png'
import { defaultPeerService, createFallbackVideoStream } from '../services/peerService'
import { useAppSettings } from '../context/AppSettingsContext'
import { triggerDirectExeDownload, triggerDirectApkDownload } from '../utils/directDownload'
import type { Socket } from 'socket.io-client'

interface MobileSenderViewProps {
  socket?: Socket | null
  initialPin?: string
  onSwitchToFullView: () => void
}

export const MobileSenderView: React.FC<MobileSenderViewProps> = ({
  socket: _socket,
  initialPin = '',
  onSwitchToFullView,
}) => {
  const { settings } = useAppSettings()

  // 3 Primary modes on mobile:
  // 1. 'controller' -> Enter Partner ID to control PC or another Phone
  // 2. 'host' -> Generate My Phone ID & Password to share this phone's screen
  // 3. 'sender' -> Quick 1-click Screen Cast to PC monitor
  const [mobileMode, setMobileMode] = useState<'controller' | 'host' | 'sender'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const m = params.get('mode')
      if (m === 'controller') return 'controller'
      if (m === 'host') return 'host'
      if (m === 'sender') return 'sender'
    }
    return 'controller'
  })

  // ─── Connection & Controller State ─────────────────────────────────────────
  const [pin, setPin] = useState(initialPin)
  const [passcode, setPasscode] = useState('')
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('Enter Partner ID & Password to connect')
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  // ─── My Phone Host (Share This Phone) State ────────────────────────────────
  const [myMobilePin, setMyMobilePin] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('lbm_my_mobile_id') : null
    if (saved) return saved
    const gen = String(Math.floor(100000 + Math.random() * 900000))
    if (typeof window !== 'undefined') sessionStorage.setItem('lbm_my_mobile_id', gen)
    return gen
  })
  const [myMobilePasscode, setMyMobilePasscode] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('lbm_my_mobile_pass') : null
    if (saved) return saved
    const gen = String(Math.floor(1000 + Math.random() * 9000))
    if (typeof window !== 'undefined') sessionStorage.setItem('lbm_my_mobile_pass', gen)
    return gen
  })
  const [isSharingMyScreen, setIsSharingMyScreen] = useState(false)
  const [copiedPin, setCopiedPin] = useState(false)

  // ─── Sender Mode (Legacy Cast) ─────────────────────────────────────────────
  const [isCasting, setIsCasting] = useState(false)

  // ─── Stream Orientation & Responsive Viewport State ────────────────────────
  const [isVideoPortrait, setIsVideoPortrait] = useState<boolean>(false)
  const [fitMode, setFitMode] = useState<'fit' | 'pan' | 'stretch'>('fit')
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [interactionMode, setInteractionMode] = useState<'control' | 'pan'>('control')
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // ─── Controls & Modal Popups ──────────────────────────────────────────────
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [virtualText, setVirtualText] = useState('')
  const [showUrlPrompt, setShowUrlPrompt] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showTextPrompt, setShowTextPrompt] = useState(false)
  const [customTextInput, setCustomTextInput] = useState('')
  const [mobileToast, setMobileToast] = useState<string | null>(null)

  const showToastMsg = (msg: string) => {
    setMobileToast(msg)
    setTimeout(() => setMobileToast(null), 3000)
  }

  // ─── Gesture & Throttling Refs (Smooth 60 FPS Engine) ───────────────────────
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const hiddenInputRef = useRef<HTMLInputElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTapTimeRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)
  const longPressTimerRef = useRef<any>(null)
  const lastTwoTouchYRef = useRef<number | null>(null)
  const lastMoveSentTimeRef = useRef<number>(0)
  const pendingMoveRef = useRef<{ normX: number; normY: number } | null>(null)
  const moveAnimFrameRef = useRef<number | null>(null)
  const initialPanOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Listen for native PWA Add to Home Screen event
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        showToastMsg('✅ LBM Mirror आपके फोन स्क्रीन पर इंस्टॉल हो गया!')
      }
      setDeferredPrompt(null)
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIos) {
        alert(
          '🍎 iPhone / iPad पर इंस्टॉल करने के लिए:\n1. Safari में नीचे Share (साझा) बटन दबाएं\n2. "Add to Home Screen (होम स्क्रीन में जोड़ें)" चुनें।\nइसके बाद LBM Mirror का लोगो आपकी स्क्रीन पर आ जाएगा!'
        )
      } else {
        alert(
          '📱 फोन स्क्रीन पर ऐप इंस्टॉल करने के लिए:\nब्राउज़र के 3 डॉट्स (⋮) मेनू पर टैप करें और "Install App" या "Add to Home screen" चुनें।'
        )
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const resetView = () => {
    setPanOffset({ x: 0, y: 0 })
    setFitMode('fit')
    setInteractionMode('control')
    showToastMsg('🔄 View Reset: 100% Fit')
  }

  // Handle stream assignment to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(() => {})
    }
  }, [remoteStream])

  // Detect orientation (Portrait mobile vs Landscape PC) when video loads
  const handleLoadedMetadata = () => {
    const v = remoteVideoRef.current
    if (v && v.videoHeight && v.videoWidth) {
      const isPortrait = v.videoHeight > v.videoWidth
      setIsVideoPortrait(isPortrait)
      if (isPortrait) {
        setFitMode('fit')
      }
    }
  }

  // Setup Peer Service callbacks
  useEffect(() => {
    defaultPeerService.setOnRemoteStream((stream) => {
      setRemoteStream(stream)
      setConnected(true)
      setConnecting(false)
      setStatusText('🟢 Live Screen Stream Active (60 FPS Ultra-Smooth)')
      showToastMsg('🟢 Live Screen Connected at 60 FPS!')
    })

    defaultPeerService.setOnConnectionState((state, detail) => {
      if (state === 'connected') {
        setConnected(true)
        setConnecting(false)
        if (detail) setStatusText(`🟢 ${detail}`)
      } else if (state === 'connecting') {
        setConnecting(true)
        if (detail) setStatusText(detail)
      } else if (state === 'error') {
        setConnecting(false)
        setConnectError(detail || 'Connection failed.')
        if (detail) setStatusText(`⚠️ ${detail}`)
      } else if (state === 'disconnected') {
        setConnecting(false)
        setConnected(false)
        setRemoteStream(null)
        setStatusText(detail || 'Disconnected.')
      }
    })

    if (initialPin && initialPin.length >= 5) {
      setPin(initialPin)
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [initialPin])

  // ─── 1. Connect to Remote Partner (PC or Another Mobile) ────────────────────
  const handleConnectToPartner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setConnectError(null)

    const cleanPin = pin.replace(/\s+/g, '').trim()
    if (!cleanPin || cleanPin.length < 5) {
      setConnectError('कृपया मान्य 6-डिजिट Partner ID दर्ज करें (Please enter valid 6-digit ID)')
      return
    }

    setConnecting(true)
    setStatusText(`Connecting to Partner (${cleanPin}) at 60 FPS...`)

    try {
      const dummyStream = createFallbackVideoStream('LBM Mobile Controller')
      await defaultPeerService.connectToPartner(cleanPin, passcode.trim(), dummyStream)
    } catch (err: any) {
      setConnecting(false)
      setConnectError(err.message || 'Could not connect to partner.')
    }
  }

  // ─── 2. Share My Phone Screen (Host Mode) ──────────────────────────────────
  const handleStartMyMobileShare = async () => {
    try {
      let stream: MediaStream | null = null

      if (navigator.mediaDevices?.getDisplayMedia) {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 60, max: 60 } } as any,
          audio: true,
        })
      } else if (navigator.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        })
      }

      if (!stream) {
        showToastMsg('⚠️ Screen capture cancelled.')
        return
      }

      localStreamRef.current = stream
      setIsSharingMyScreen(true)
      setStatusText(`🟢 Live Phone Screen Share Active! Share ID ${myMobilePin} with partner.`)
      showToastMsg(`🟢 Phone Screen Share Active! Share ID: ${myMobilePin}`)

      stream.getVideoTracks()[0].onended = () => {
        handleStopMyMobileShare()
      }

      await defaultPeerService.initHost(myMobilePin, stream, myMobilePasscode)
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        showToastMsg('⚠️ ' + (err.message || 'Permission denied'))
      }
    }
  }

  const handleStopMyMobileShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    defaultPeerService.destroyPeer()
    setIsSharingMyScreen(false)
    setStatusText('Screen sharing stopped.')
    showToastMsg('🛑 Screen sharing stopped')
  }

  const handleRegenerateMyMobilePin = () => {
    const gen = String(Math.floor(100000 + Math.random() * 900000))
    const genPass = String(Math.floor(1000 + Math.random() * 9000))
    setMyMobilePin(gen)
    setMyMobilePasscode(genPass)
    sessionStorage.setItem('lbm_my_mobile_id', gen)
    sessionStorage.setItem('lbm_my_mobile_pass', genPass)
    showToastMsg('🔄 नया Phone ID और Password जनरेट हुआ: ' + gen)
  }

  const handleCopyMyMobilePin = () => {
    const text = `LBM Mirror Phone ID: ${myMobilePin}\nPassword: ${myMobilePasscode}\nDirect Link: https://l-b-m-mirror.vercel.app/?join=${myMobilePin}&mode=controller`
    navigator.clipboard.writeText(text)
    setCopiedPin(true)
    showToastMsg('📋 Phone ID और Password कॉपी हो गया!')
    setTimeout(() => setCopiedPin(false), 2000)
  }

  // ─── 3. Legacy Phone Screen Cast to PC ─────────────────────────────────────
  const handleStartPhoneCast = async () => {
    const cleanPin = pin.trim()
    if (!cleanPin || cleanPin.length < 5) {
      alert('Please enter a valid PC ID first.')
      return
    }

    try {
      let stream: MediaStream | null = null

      if (navigator.mediaDevices?.getDisplayMedia) {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 60, max: 60 } } as any,
          audio: true,
        })
      } else if (navigator.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        })
      }

      if (!stream) {
        alert('Could not access screen media.')
        return
      }

      localStreamRef.current = stream
      setIsCasting(true)
      setStatusText('🚀 Transmitting phone stream to PC at 60 FPS...')

      stream.getVideoTracks()[0].onended = () => {
        handleStopPhoneCast()
      }

      await defaultPeerService.joinAndCast(cleanPin, stream)
      setStatusText('🟢 Live 60 FPS mirror active on your PC!')
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setStatusText(`Screen capture error: ${err.message || 'Permission denied'}`)
      }
    }
  }

  const handleStopPhoneCast = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    defaultPeerService.destroyPeer()
    setIsCasting(false)
    setStatusText('Screen cast stopped.')
  }

  // ─── Touch to Normalized Coordinates Calculator (Zero Offset) ─────────────
  const getNormalizedTouchCoordinates = useCallback((touch: React.Touch) => {
    const video = remoteVideoRef.current
    if (!video) return null

    const rect = video.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    const clientX = touch.clientX
    const clientY = touch.clientY

    const relX = clientX - rect.left
    const relY = clientY - rect.top

    if (relX < 0 || relX > rect.width || relY < 0 || relY > rect.height) {
      return null
    }

    return {
      normX: Math.max(0, Math.min(1, relX / rect.width)),
      normY: Math.max(0, Math.min(1, relY / rect.height)),
    }
  }, [])

  // ─── Touch Gestures (Throttled for Zero Stuttering) ─────────────────────────
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (interactionMode === 'pan' || e.touches.length === 2) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: performance.now() }
      initialPanOffsetRef.current = { ...panOffset }
      return
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const coords = getNormalizedTouchCoordinates(touch)
      if (!coords) return

      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() }
      isDraggingRef.current = false

      defaultPeerService.sendInputEvent({
        type: 'mouse:move',
        x: coords.normX,
        y: coords.normY,
      })

      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = setTimeout(() => {
        if (!isDraggingRef.current) {
          defaultPeerService.sendInputEvent({
            type: 'mouse:down',
            button: 'right',
            x: coords.normX,
            y: coords.normY,
          })
          defaultPeerService.sendInputEvent({
            type: 'mouse:up',
            button: 'right',
            x: coords.normX,
            y: coords.normY,
          })
          defaultPeerService.sendInputEvent({
            type: 'mouse:click',
            button: 'right',
            x: coords.normX,
            y: coords.normY,
          })
          showToastMsg('🖱️ Right Click')
          if (navigator.vibrate) navigator.vibrate(35)
        }
      }, 550)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (interactionMode === 'pan' || e.touches.length === 2) {
      if (touchStartRef.current && e.touches[0]) {
        const deltaX = e.touches[0].clientX - touchStartRef.current.x
        const deltaY = e.touches[0].clientY - touchStartRef.current.y
        setPanOffset({
          x: initialPanOffsetRef.current.x + deltaX,
          y: initialPanOffsetRef.current.y + deltaY,
        })
      }
      return
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const coords = getNormalizedTouchCoordinates(touch)
      if (!coords) return

      if (touchStartRef.current) {
        const dist = Math.hypot(touch.clientX - touchStartRef.current.x, touch.clientY - touchStartRef.current.y)
        if (dist > 8) {
          isDraggingRef.current = true
          if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
        }
      }

      const now = performance.now()
      pendingMoveRef.current = coords
      if (now - lastMoveSentTimeRef.current >= 30) {
        lastMoveSentTimeRef.current = now
        defaultPeerService.sendInputEvent({
          type: 'mouse:move',
          x: coords.normX,
          y: coords.normY,
        })
      } else if (!moveAnimFrameRef.current) {
        moveAnimFrameRef.current = requestAnimationFrame(() => {
          moveAnimFrameRef.current = null
          const curr = performance.now()
          if (pendingMoveRef.current && curr - lastMoveSentTimeRef.current >= 28) {
            lastMoveSentTimeRef.current = curr
            defaultPeerService.sendInputEvent({
              type: 'mouse:move',
              x: pendingMoveRef.current.normX,
              y: pendingMoveRef.current.normY,
            })
          }
        })
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    lastTwoTouchYRef.current = null

    if (interactionMode === 'pan') {
      touchStartRef.current = null
      return
    }

    if (e.changedTouches.length === 1 && touchStartRef.current && !isDraggingRef.current) {
      const touch = e.changedTouches[0]
      const coords = getNormalizedTouchCoordinates(touch)
      if (!coords) {
        touchStartRef.current = null
        return
      }

      const now = performance.now()
      const timeSinceLastTap = now - lastTapTimeRef.current
      lastTapTimeRef.current = now

      if (timeSinceLastTap < 300) {
        defaultPeerService.sendInputEvent({
          type: 'mouse:dblclick',
          x: coords.normX,
          y: coords.normY,
        })
        showToastMsg('⚡ Double Click')
        if (navigator.vibrate) navigator.vibrate(25)
      } else {
        defaultPeerService.sendInputEvent({
          type: 'mouse:down',
          button: 'left',
          x: coords.normX,
          y: coords.normY,
        })
        defaultPeerService.sendInputEvent({
          type: 'mouse:up',
          button: 'left',
          x: coords.normX,
          y: coords.normY,
        })
        defaultPeerService.sendInputEvent({
          type: 'mouse:click',
          button: 'left',
          x: coords.normX,
          y: coords.normY,
        })
      }
    }
    touchStartRef.current = null
  }

  // ─── Remote Desktop Shortcuts & App Actions ───────────────────────────────
  const handleLaunchApp = (app: string) => {
    defaultPeerService.launchApp(app)
    showToastMsg(`🚀 Opening ${app.toUpperCase()}...`)
  }

  const handleOpenUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!urlInput.trim()) return
    defaultPeerService.openUrl(urlInput.trim())
    showToastMsg(`🌐 Opening ${urlInput.trim()}...`)
    setShowUrlPrompt(false)
    setUrlInput('')
  }

  const handleSendCustomText = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!customTextInput.trim()) return
    defaultPeerService.sendInputEvent({
      type: 'key:text',
      text: customTextInput,
    })
    showToastMsg('⌨️ Text typed!')
    setShowTextPrompt(false)
    setCustomTextInput('')
  }

  const handleSendShortcut = (name: string) => {
    defaultPeerService.sendInputEvent({
      type: 'shortcut',
      name,
    })
    if (navigator.vibrate) navigator.vibrate(25)
  }

  const handleVirtualKeyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) return
    const newChar = val.slice(-1)
    defaultPeerService.sendInputEvent({
      type: 'key:text',
      text: newChar,
    })
    setVirtualText('')
  }

  const handleVirtualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      defaultPeerService.sendInputEvent({ type: 'key:down', code: 'Backspace', key: 'Backspace' })
      defaultPeerService.sendInputEvent({ type: 'key:up', code: 'Backspace', key: 'Backspace' })
    } else if (e.key === 'Enter') {
      defaultPeerService.sendInputEvent({ type: 'key:down', code: 'Enter', key: 'Enter' })
      defaultPeerService.sendInputEvent({ type: 'key:up', code: 'Enter', key: 'Enter' })
    }
  }

  const handleDisconnect = () => {
    defaultPeerService.destroyPeer()
    setConnected(false)
    setRemoteStream(null)
    setStatusText('Disconnected.')
  }

  return (
    <div className="mobile-sender-shell">
      {/* Hidden input for triggering mobile native keyboard */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={virtualText}
        onChange={handleVirtualKeyInput}
        onKeyDown={handleVirtualKeyDown}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}
      />

      {/* Mobile Top Bar */}
      <header className="mobile-header-bar">
        <div className="mobile-brand-group">
          <img src={settings.appLogo || logoImg} alt="LBM Logo" className="mobile-logo-thumb" />
          <div className="mobile-brand-info">
            <h1 className="mobile-app-title">{settings.appName}</h1>
            <span className="mobile-tagline">
              {mobileMode === 'controller'
                ? '🎮 Partner Remote Control'
                : mobileMode === 'host'
                ? '📱 Share This Phone Screen'
                : '📺 Cast Phone to PC'}
            </span>
          </div>
        </div>

        <div className="mobile-header-actions">
          <button
            type="button"
            className="desktop-switch-btn"
            onClick={onSwitchToFullView}
            title="Switch to full desktop dashboard"
          >
            🖥️ Full App
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="mobile-main-stage">
        {!connected ? (
          <div className="mobile-connect-card">
            {/* 3 Tab Mode Switcher on Mobile */}
            <div className="mobile-tabs-pill-row">
              <button
                type="button"
                className={`mobile-tab-pill ${mobileMode === 'controller' ? 'active' : ''}`}
                onClick={() => setMobileMode('controller')}
              >
                🎮 Remote Control
              </button>
              <button
                type="button"
                className={`mobile-tab-pill ${mobileMode === 'host' ? 'active' : ''}`}
                onClick={() => setMobileMode('host')}
              >
                📱 Share Phone
              </button>
              <button
                type="button"
                className={`mobile-tab-pill ${mobileMode === 'sender' ? 'active' : ''}`}
                onClick={() => setMobileMode('sender')}
              >
                📺 Cast to PC
              </button>
            </div>

            {/* ══════════ TAB 1: REMOTE CONTROL (Mobile-to-Mobile & Mobile-to-PC) ══════════ */}
            {mobileMode === 'controller' && (
              <div className="mobile-tab-pane-content">
                <div className="mobile-icon-circle">🎮 ➔ 📱/💻</div>
                <h2 className="mobile-card-title">Control Partner Phone or PC</h2>
                <p className="mobile-card-desc">
                  सामने वाले फोन या कंप्यूटर की <strong>Remote ID</strong> और <strong>Password</strong> दर्ज करें। आप उनका पूरा फोन या PC यहाँ से चला सकेंगे!
                </p>

                <form onSubmit={handleConnectToPartner} className="mobile-form-wrap">
                  <div className="mobile-input-row">
                    <label>Partner Remote ID (फोन या PC की ID):</label>
                    <input
                      type="number"
                      pattern="[0-9]*"
                      placeholder="e.g. 806293"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.slice(0, 8))}
                      className="mobile-pin-field"
                      disabled={connecting}
                    />
                  </div>

                  <div className="mobile-input-row">
                    <label>Access Password (पासवर्ड):</label>
                    <input
                      type="password"
                      placeholder="e.g. 1229"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="mobile-pin-field"
                      disabled={connecting}
                    />
                  </div>

                  {connectError && (
                    <div className="mobile-error-banner">⚠️ {connectError}</div>
                  )}

                  <button
                    type="submit"
                    className="mobile-connect-btn"
                    disabled={connecting || pin.trim().length < 5}
                  >
                    {connecting ? 'Connecting to Partner…' : '⚡ Connect & Remote Control (60 FPS)'}
                  </button>
                </form>
              </div>
            )}

            {/* ══════════ TAB 2: SHARE THIS PHONE SCREEN (Host Mode) ══════════ */}
            {mobileMode === 'host' && (
              <div className="mobile-tab-pane-content">
                <div className="mobile-icon-circle">📱 ➔ 🌐</div>
                <h2 className="mobile-card-title">Share My Phone Screen</h2>
                <p className="mobile-card-desc">
                  यह आपके फोन की ID और पासवर्ड है। दूसरा मोबाइल या PC यह ID डालकर आपका फोन देख और चला सकता है:
                </p>

                <div className="mobile-my-credentials-box">
                  <div className="cred-tile">
                    <span className="cred-label">My Phone Remote ID:</span>
                    <strong className="cred-value">{myMobilePin}</strong>
                  </div>
                  <div className="cred-tile">
                    <span className="cred-label">Access Password:</span>
                    <strong className="cred-value">{myMobilePasscode}</strong>
                  </div>

                  <div className="cred-actions-row">
                    <button
                      type="button"
                      className="cred-action-btn"
                      onClick={handleCopyMyMobilePin}
                    >
                      {copiedPin ? '✓ Copied!' : '📋 Copy ID & Link'}
                    </button>
                    <button
                      type="button"
                      className="cred-action-btn secondary"
                      onClick={handleRegenerateMyMobilePin}
                      disabled={isSharingMyScreen}
                    >
                      🔄 New ID
                    </button>
                  </div>
                </div>

                <div className="mobile-host-action-box">
                  {!isSharingMyScreen ? (
                    <button
                      type="button"
                      className="mobile-connect-btn host-start-btn"
                      onClick={handleStartMyMobileShare}
                    >
                      🚀 Start Sharing My Phone Screen (60 FPS)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mobile-connect-btn host-stop-btn"
                      onClick={handleStopMyMobileShare}
                    >
                      ⏹ Stop Sharing Phone Screen
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ TAB 3: CAST PHONE TO PC ══════════ */}
            {mobileMode === 'sender' && (
              <div className="mobile-tab-pane-content">
                <div className="mobile-icon-circle">📱 ➔ 📺</div>
                <h2 className="mobile-card-title">Cast Phone to PC Screen</h2>
                <p className="mobile-card-desc">
                  कंप्यूटर स्क्रीन पर दिख रहा 6-डिजिट PIN दर्ज करके अपने फोन की स्क्रीन सीधे कंप्यूटर पर गेमिंग व प्रेजेंटेशन के लिए दिखाएं:
                </p>

                <div className="mobile-input-row">
                  <label>PC Remote PIN:</label>
                  <input
                    type="number"
                    pattern="[0-9]*"
                    placeholder="e.g. 839201"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.slice(0, 8))}
                    className="mobile-pin-field"
                  />
                </div>

                <div className="mobile-host-action-box">
                  {!isCasting ? (
                    <button
                      type="button"
                      className="mobile-connect-btn"
                      onClick={handleStartPhoneCast}
                      disabled={pin.trim().length < 5}
                    >
                      📺 Start 60 FPS Mirror to PC
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mobile-connect-btn host-stop-btn"
                      onClick={handleStopPhoneCast}
                    >
                      ⏹ Stop Screen Cast
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mobile-status-pill">{statusText}</div>

            {/* Official Downloads Suite */}
            <div className="mobile-app-download-suite">
              <div className="suite-title">📥 डाउनलोड आधिकारिक ऐप्स (Official Downloads):</div>
              <div className="suite-btn-grid">
                <button
                  type="button"
                  onClick={() => triggerDirectApkDownload('LBMMirror.apk')}
                  className="suite-dl-btn apk-btn"
                >
                  <span className="btn-icon">🤖</span>
                  <div className="btn-text-block">
                    <strong>डाउनलोड फॉर एंड्रॉइड APK</strong>
                    <small>Official LBMMirror.apk (Fast)</small>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="suite-dl-btn pwa-btn"
                >
                  <span className="btn-icon">📱</span>
                  <div className="btn-text-block">
                    <strong>फोन स्क्रीन में लगाएं (1-Tap)</strong>
                    <small>Instant Home Screen App</small>
                  </div>
                </button>
              </div>

              <div className="suite-extra-row">
                <button
                  type="button"
                  onClick={() => triggerDirectExeDownload('LBM_Mirror_Setup.exe')}
                  className="suite-mini-btn"
                >
                  💻 डाउनलोड फॉर विंडोज (LBM_Mirror_Setup.exe)
                </button>
                <span className="suite-sep">•</span>
                <span
                  className="suite-mini-link"
                  onClick={() =>
                    alert('🍎 iOS (iPhone/iPad): Safari में नीचे Share बटन दबाकर "Add to Home Screen" चुनें।')
                  }
                >
                  🍎 डाउनलोड फॉर iOS
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════ LIVE REMOTE STREAM VIEW (Edge-to-Edge, Zero Cutoff) ═══════════════ */
          <div className={`mobile-active-workspace ${isVideoPortrait ? 'stream-portrait' : 'stream-landscape'}`}>
            {/* Top Toolbar */}
            <div className="mobile-controller-topbar">
              <div className="mobile-topbar-left">
                <span className="mobile-live-badge">🟢 LIVE 60 FPS</span>
                {isVideoPortrait ? (
                  <span className="stream-type-pill">📱 Mobile</span>
                ) : (
                  <span className="stream-type-pill">💻 PC</span>
                )}

                <button
                  type="button"
                  className={`mobile-bar-btn ${fitMode === 'fit' ? 'active' : ''}`}
                  onClick={() => {
                    setFitMode('fit')
                    setPanOffset({ x: 0, y: 0 })
                    setInteractionMode('control')
                    showToastMsg('📐 Fit Mode: पूरा स्क्रीन बिना कटे')
                  }}
                  title="Fit Screen"
                >
                  📐 Fit
                </button>

                <button
                  type="button"
                  className={`mobile-bar-btn ${fitMode === 'pan' ? 'active' : ''}`}
                  onClick={() => {
                    setFitMode('pan')
                    setInteractionMode('pan')
                    showToastMsg('🔍 Zoom & Pan: स्क्रीन पर सरकाएं')
                  }}
                  title="Zoom & Pan"
                >
                  🔍 Zoom
                </button>
              </div>

              <div className="mobile-topbar-actions">
                <button
                  type="button"
                  className={`mobile-bar-btn ${isKeyboardOpen ? 'active' : ''}`}
                  onClick={() => {
                    setIsKeyboardOpen(!isKeyboardOpen)
                    if (hiddenInputRef.current) hiddenInputRef.current.focus()
                  }}
                  title="Toggle Keyboard"
                >
                  ⌨️
                </button>

                <button
                  type="button"
                  className="mobile-bar-btn"
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                >
                  {isFullscreen ? '⤦' : '⛶'}
                </button>

                <button
                  type="button"
                  className="mobile-bar-btn danger"
                  onClick={handleDisconnect}
                  title="Disconnect"
                >
                  ✕ Exit
                </button>
              </div>
            </div>

            {/* Interactive Screen Surface */}
            <div
              className={`mobile-interactive-surface mode-${fitMode}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {remoteStream ? (
                <div
                  className="mobile-video-pan-wrapper"
                  style={{
                    transform: fitMode === 'pan' ? `scale(1.45) translate(${panOffset.x}px, ${panOffset.y}px)` : undefined,
                    transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
                  }}
                >
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={handleLoadedMetadata}
                    className={`mobile-screen-video fit-${fitMode} ${
                      isVideoPortrait ? 'is-portrait-stream' : 'is-landscape-stream'
                    }`}
                  />
                </div>
              ) : (
                <div className="mobile-waiting-placeholder">
                  <div className="spinner-mini" />
                  <p>Receiving 60 FPS live video...</p>
                </div>
              )}

              {/* Reset View Pill */}
              {(fitMode === 'pan' || panOffset.x !== 0 || panOffset.y !== 0) && (
                <button
                  type="button"
                  className="mobile-reset-view-pill"
                  onClick={resetView}
                  title="Reset screen position"
                >
                  ↺ Reset View
                </button>
              )}
            </div>

            {/* Quick Virtual Mouse Bar */}
            <div className="mobile-mouse-actions-bar">
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:click', button: 'left' })
                  showToastMsg('🖱️ Left Click')
                }}
              >
                🖱️ Left
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:click', button: 'right' })
                  showToastMsg('🖱️ Right Click')
                }}
              >
                🖱️ Right
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:dblclick' })
                  showToastMsg('👆 Double Click')
                }}
              >
                👆 2x Click
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:wheel', deltaY: -120 })
                  showToastMsg('⬆️ Scroll Up')
                }}
              >
                ⬆️ Up
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:wheel', deltaY: 120 })
                  showToastMsg('⬇️ Scroll Down')
                }}
              >
                ⬇️ Down
              </button>
            </div>

            {/* Quick Shortcuts & Launcher Dock */}
            <div className="mobile-shortcuts-dock">
              <button
                type="button"
                className="mobile-dock-pill primary-pill"
                onClick={() => handleLaunchApp('chrome')}
              >
                🌐 Chrome
              </button>
              <button
                type="button"
                className="mobile-dock-pill purple-pill"
                onClick={() => setShowUrlPrompt(true)}
              >
                🌍 Open URL
              </button>
              <button
                type="button"
                className="mobile-dock-pill cyan-pill"
                onClick={() => setShowTextPrompt(true)}
              >
                ⌨️ Type Text
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => handleSendShortcut('WIN')}
              >
                🪟 Start
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => handleSendShortcut('ALTTAB')}
              >
                📑 Alt+Tab
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => handleSendShortcut('WIN_D')}
              >
                🖥️ Desktop
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => handleSendShortcut('TASKMGR')}
              >
                📊 TaskMgr
              </button>
            </div>

            {/* Touch gestures helper hint */}
            <div className="mobile-gesture-helper">
              <span>👆 Tap = Left Click</span>
              <span>•</span>
              <span>✌️ Long Press = Right Click</span>
              <span>•</span>
              <span>👆 Double Tap = Open</span>
            </div>
          </div>
        )}

        {/* Floating Mobile Toast Banner */}
        {mobileToast && (
          <div className="mobile-toast-popup">
            {mobileToast}
          </div>
        )}

        {/* Open URL Modal */}
        {showUrlPrompt && (
          <div className="auth-modal-overlay" style={{ zIndex: 99999 }} onClick={() => setShowUrlPrompt(false)}>
            <div className="admin-pin-dialog-card" style={{ maxWidth: '340px' }} onClick={(e) => e.stopPropagation()}>
              <button type="button" className="download-close-btn" onClick={() => setShowUrlPrompt(false)}>✕</button>
              <div className="pin-dialog-header">
                <span className="pin-shield-badge">🌐</span>
                <h3 className="pin-dialog-title">Open Website on Remote Partner</h3>
                <p className="pin-dialog-desc">वेबसाइट का नाम लिखें:</p>
              </div>
              <form onSubmit={handleOpenUrl} style={{ marginTop: '12px' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. youtube.com, google.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="admin-pin-input-field"
                  style={{ fontSize: '14px', textAlign: 'left', padding: '10px 12px' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="submit"
                    className="primary-button"
                    style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                  >
                    🚀 Open
                  </button>
                  <button type="button" className="toolbar-pill" onClick={() => setShowUrlPrompt(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Type Text Modal */}
        {showTextPrompt && (
          <div className="auth-modal-overlay" style={{ zIndex: 99999 }} onClick={() => setShowTextPrompt(false)}>
            <div className="admin-pin-dialog-card" style={{ maxWidth: '340px' }} onClick={(e) => e.stopPropagation()}>
              <button type="button" className="download-close-btn" onClick={() => setShowTextPrompt(false)}>✕</button>
              <div className="pin-dialog-header">
                <span className="pin-shield-badge">⌨️</span>
                <h3 className="pin-dialog-title">Type Text on Partner Screen</h3>
                <p className="pin-dialog-desc">यहाँ लिखें, वो सामने टाइप हो जाएगा:</p>
              </div>
              <form onSubmit={handleSendCustomText} style={{ marginTop: '12px' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Type text or query..."
                  value={customTextInput}
                  onChange={(e) => setCustomTextInput(e.target.value)}
                  className="admin-pin-input-field"
                  style={{ fontSize: '14px', textAlign: 'left', padding: '10px 12px' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="submit"
                    className="primary-button"
                    style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                  >
                    ⌨️ Send
                  </button>
                  <button type="button" className="toolbar-pill" onClick={() => setShowTextPrompt(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mobile-footer">
          <p className="mobile-founder-credit">
            LBM Mirror • Founder &amp; CEO: <strong>{settings.founderName || 'Laxman Choudhary'}</strong>
          </p>
        </footer>
      </main>
    </div>
  )
}

import React, { useState, useEffect, useRef, useCallback } from 'react'
import logoImg from '../assets/logo.png'
import { defaultPeerService, createFallbackVideoStream } from '../services/peerService'
import { useAppSettings } from '../context/AppSettingsContext'
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

  // Primary mode on mobile: 'controller' (Control PC from Phone) vs 'sender' (Cast Phone to PC)
  const [mobileMode, setMobileMode] = useState<'controller' | 'sender'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('mode') === 'controller') return 'controller'
    }
    return 'controller'
  })

  // ─── Connection & State ───────────────────────────────────────────────────
  const [pin, setPin] = useState(initialPin)
  const [passcode, setPasscode] = useState('')
  const [connected, setConnected] = useState(false)
  const [isCasting, setIsCasting] = useState(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [statusText, setStatusText] = useState('Enter PC Remote ID & Password to connect')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
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

  // Gesture refs
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const hiddenInputRef = useRef<HTMLInputElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTapTimeRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)
  const longPressTimerRef = useRef<any>(null)
  const lastTwoTouchYRef = useRef<number | null>(null)

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(() => {})
    }
  }, [remoteStream])

  // Setup Peer Service callbacks
  useEffect(() => {
    defaultPeerService.setOnRemoteStream((stream) => {
      setRemoteStream(stream)
      setConnected(true)
      setConnecting(false)
      setStatusText('🟢 Live PC Desktop Active (Touch & Keyboard Ready)')
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
        setStatusText(detail || 'Disconnected from PC.')
      }
    })

    // If initialPin was provided in URL (e.g. ?join=839201), auto-set
    if (initialPin && initialPin.length >= 5) {
      setPin(initialPin)
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [initialPin])

  // ─── Connect to PC Remote Desktop ─────────────────────────────────────────
  const handleConnectToPc = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setConnectError(null)

    const cleanPin = pin.replace(/\s+/g, '').trim()
    if (!cleanPin || cleanPin.length < 5) {
      setConnectError('Please enter valid 6-digit PC ID')
      return
    }

    setConnecting(true)
    setStatusText(`Connecting to PC (${cleanPin})...`)

    try {
      const dummyStream = createFallbackVideoStream('LBM Mobile Controller')
      await defaultPeerService.connectToPartner(cleanPin, passcode.trim(), dummyStream)
    } catch (err: any) {
      setConnecting(false)
      setConnectError(err.message || 'Could not connect to PC.')
    }
  }

  // ─── Touch to Mouse Coordinate Calculator ─────────────────────────────────
  const getNormalizedTouchCoordinates = useCallback((touch: React.Touch) => {
    const video = remoteVideoRef.current
    if (!video) return null

    const rect = video.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    const videoW = video.videoWidth || 1920
    const videoH = video.videoHeight || 1080
    const containerW = rect.width
    const containerH = rect.height

    const videoAspect = videoW / videoH
    const containerAspect = containerW / containerH

    let renderW = containerW
    let renderH = containerH
    let offsetX = 0
    let offsetY = 0

    if (containerAspect > videoAspect) {
      // Pillarbox (black bars on left/right)
      renderW = containerH * videoAspect
      offsetX = (containerW - renderW) / 2
    } else {
      // Letterbox (black bars on top/bottom)
      renderH = containerW / videoAspect
      offsetY = (containerH - renderH) / 2
    }

    const clientX = touch.clientX
    const clientY = touch.clientY

    const relX = clientX - rect.left - offsetX
    const relY = clientY - rect.top - offsetY

    if (relX < 0 || relX > renderW || relY < 0 || relY > renderH) {
      return null
    }

    return {
      normX: Math.max(0, Math.min(1, relX / renderW)),
      normY: Math.max(0, Math.min(1, relY / renderH)),
    }
  }, [])

  // ─── Touch Gesture Handlers for Operating PC Screen ───────────────────────
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const coords = getNormalizedTouchCoordinates(touch)
      if (!coords) return

      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() }
      isDraggingRef.current = false

      // Send mouse move
      defaultPeerService.sendInputEvent({
        type: 'mouse:move',
        x: coords.normX,
        y: coords.normY,
      })

      // Setup long-press for Right Click (550ms)
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
          showToastMsg('🖱️ Right Click Triggered')
          if (navigator.vibrate) navigator.vibrate(40)
        }
      }, 550)
    } else if (e.touches.length === 2) {
      // Two fingers: initialize scroll
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      const avgY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      lastTwoTouchYRef.current = avgY
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
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

      defaultPeerService.sendInputEvent({
        type: 'mouse:move',
        x: coords.normX,
        y: coords.normY,
      })
    } else if (e.touches.length === 2 && lastTwoTouchYRef.current !== null) {
      // Two finger vertical scroll
      const avgY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const deltaY = lastTwoTouchYRef.current - avgY
      lastTwoTouchYRef.current = avgY

      if (Math.abs(deltaY) > 2) {
        defaultPeerService.sendInputEvent({
          type: 'mouse:wheel',
          deltaY: -deltaY * 3,
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

    if (e.changedTouches.length === 1 && touchStartRef.current && !isDraggingRef.current) {
      const touch = e.changedTouches[0]
      const coords = getNormalizedTouchCoordinates(touch)
      if (!coords) return

      const now = performance.now()
      const timeSinceLastTap = now - lastTapTimeRef.current
      lastTapTimeRef.current = now

      if (timeSinceLastTap < 300) {
        // Double Click (Opens Desktop Apps & Folders)
        defaultPeerService.sendInputEvent({
          type: 'mouse:dblclick',
          x: coords.normX,
          y: coords.normY,
        })
        showToastMsg('⚡ Double Click (Open App)')
      } else {
        // Single Click
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
  }

  // ─── Remote App Launch & Web Navigation ────────────────────────────────────
  const handleLaunchApp = (app: string) => {
    defaultPeerService.launchApp(app)
    showToastMsg(`🚀 Opening ${app.toUpperCase()} on PC...`)
  }

  const handleOpenUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!urlInput.trim()) return
    defaultPeerService.openUrl(urlInput.trim())
    showToastMsg(`🌐 Opening ${urlInput.trim()} on PC...`)
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
    showToastMsg('⌨️ Text typed on PC!')
    setShowTextPrompt(false)
    setCustomTextInput('')
  }

  // ─── Send Windows Shortcut ────────────────────────────────────────────────
  const handleSendShortcut = (name: string) => {
    defaultPeerService.sendInputEvent({
      type: 'shortcut',
      name,
    })
    if (navigator.vibrate) navigator.vibrate(30)
  }

  // ─── Virtual Keyboard Typing ──────────────────────────────────────────────
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
      defaultPeerService.sendInputEvent({
        type: 'key:down',
        code: 'Backspace',
        key: 'Backspace',
      })
      defaultPeerService.sendInputEvent({
        type: 'key:up',
        code: 'Backspace',
        key: 'Backspace',
      })
    } else if (e.key === 'Enter') {
      defaultPeerService.sendInputEvent({
        type: 'key:down',
        code: 'Enter',
        key: 'Enter',
      })
      defaultPeerService.sendInputEvent({
        type: 'key:up',
        code: 'Enter',
        key: 'Enter',
      })
    }
  }

  const handleDisconnect = () => {
    defaultPeerService.destroyPeer()
    setConnected(false)
    setRemoteStream(null)
    setStatusText('Disconnected from PC.')
  }

  // ─── Cast Phone to PC (Mode 2) ────────────────────────────────────────────
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
          <div>
            <h1 className="mobile-app-title">{settings.appName}</h1>
            <span className="mobile-tagline">
              {mobileMode === 'controller' ? '📱 ➔ 💻 PC Remote Desktop' : '📱 ➔ 💻 Phone Screen Cast'}
            </span>
          </div>
        </div>

        <div className="mobile-header-actions">
          {/* Mode Switcher */}
          <button
            type="button"
            className="mobile-mode-pill-btn"
            onClick={() => setMobileMode(mobileMode === 'controller' ? 'sender' : 'controller')}
          >
            {mobileMode === 'controller' ? '🔁 Cast Mode' : '🎮 Controller'}
          </button>

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
          /* Connect Form Card */
          <div className="mobile-connect-card">
            <div className="mobile-icon-circle">
              {mobileMode === 'controller' ? '🎮 ➔ 💻' : '📱 ➔ 💻'}
            </div>
            <h2 className="mobile-card-title">
              {mobileMode === 'controller' ? 'Control Your PC from Anywhere' : 'Cast Phone to PC'}
            </h2>
            <p className="mobile-card-desc">
              {mobileMode === 'controller'
                ? 'अपने कंप्यूटर पर दिख रही Remote ID और Password यहाँ दर्ज करें। आपका पूरा कंप्यूटर यहाँ से चलेगा!'
                : 'Enter the 6-digit PIN displayed on your PC screen to start mirroring.'}
            </p>

            <form onSubmit={handleConnectToPc} className="mobile-form-wrap">
              <div className="mobile-input-row">
                <label>PC Remote ID:</label>
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

              {mobileMode === 'controller' && (
                <div className="mobile-input-row">
                  <label>Access Password:</label>
                  <input
                    type="password"
                    placeholder="e.g. 4821"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="mobile-pin-field"
                    disabled={connecting}
                  />
                </div>
              )}

              {connectError && (
                <div className="mobile-error-banner">
                  ⚠️ {connectError}
                </div>
              )}

              <button
                type="submit"
                className="mobile-connect-btn"
                disabled={connecting || pin.trim().length < 5}
              >
                {connecting
                  ? 'Connecting to PC…'
                  : mobileMode === 'controller'
                  ? '⚡ Connect & Control Laptop'
                  : 'Connect to PC'}
              </button>
            </form>

            <div className="mobile-status-pill">{statusText}</div>
          </div>
        ) : (
          /* Live Remote Interactive Workspace */
          <div className="mobile-active-workspace">
            {/* Top Toolbar over video */}
            <div className="mobile-controller-topbar">
              <span className="mobile-live-badge">🟢 LIVE • PC Desktop</span>

              <div className="mobile-topbar-actions">
                <button
                  type="button"
                  className={`mobile-bar-btn ${isKeyboardOpen ? 'active' : ''}`}
                  onClick={() => {
                    setIsKeyboardOpen(!isKeyboardOpen)
                    if (hiddenInputRef.current) {
                      hiddenInputRef.current.focus()
                    }
                  }}
                  title="Toggle Keyboard"
                >
                  ⌨️ Keyboard
                </button>

                <button
                  type="button"
                  className="mobile-bar-btn"
                  onClick={() => {
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.requestFullscreen().catch(() => {})
                    }
                  }}
                  title="Fullscreen"
                >
                  ⛶ Fullscreen
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

            {/* Interactive PC Screen Surface */}
            <div
              className="mobile-interactive-surface"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="mobile-screen-video"
                />
              ) : (
                <div className="mobile-waiting-placeholder">
                  <div className="spinner-mini" />
                  <p>Streaming PC Desktop...</p>
                </div>
              )}
            </div>

            {/* Quick Virtual Mouse Bar for Precision Taps */}
            <div className="mobile-mouse-actions-bar" style={{
              display: 'flex',
              gap: '6px',
              padding: '6px 10px',
              background: 'rgba(15, 23, 42, 0.85)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              overflowX: 'auto',
              justifyContent: 'center'
            }}>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:click', button: 'left' })
                  showToastMsg('🖱️ Left Click')
                }}
              >
                🖱️ Left Click
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:click', button: 'right' })
                  showToastMsg('🖱️ Right Click')
                }}
              >
                🖱️ Right Click
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:dblclick' })
                  showToastMsg('👆 Double Click')
                }}
              >
                👆 Double Click
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:wheel', deltaY: -120 })
                  showToastMsg('⬆️ Scroll Up')
                }}
              >
                ⬆️ Scroll Up
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => {
                  defaultPeerService.sendInputEvent({ type: 'mouse:wheel', deltaY: 120 })
                  showToastMsg('⬇️ Scroll Down')
                }}
              >
                ⬇️ Scroll Down
              </button>
            </div>

            {/* Quick Windows Shortcut & App Launcher Bar for Phones */}
            <div className="mobile-shortcuts-dock">
              <button
                type="button"
                className="mobile-dock-pill"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 'bold' }}
                onClick={() => handleLaunchApp('chrome')}
              >
                🌐 Chrome
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', fontWeight: 'bold' }}
                onClick={() => setShowUrlPrompt(true)}
              >
                🌍 Open URL
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8' }}
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
                onClick={() => handleSendShortcut('EXPLORER')}
              >
                📁 Explorer
              </button>
              <button
                type="button"
                className="mobile-dock-pill"
                onClick={() => handleSendShortcut('WIN_R')}
              >
                🚀 Run
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

            {/* Floating Mobile Toast Banner */}
            {mobileToast && (
              <div style={{
                position: 'fixed',
                top: '70px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #38bdf8',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '30px',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 99999,
                pointerEvents: 'none'
              }}>
                {mobileToast}
              </div>
            )}

            {/* Mobile Open URL Prompt Modal */}
            {showUrlPrompt && (
              <div className="auth-modal-overlay" style={{ zIndex: 99999 }} onClick={() => setShowUrlPrompt(false)}>
                <div className="admin-pin-dialog-card" style={{ maxWidth: '340px' }} onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="download-close-btn" onClick={() => setShowUrlPrompt(false)}>✕</button>
                  <div className="pin-dialog-header">
                    <span className="pin-shield-badge">🌐</span>
                    <h3 className="pin-dialog-title">Open Website on PC</h3>
                    <p className="pin-dialog-desc">
                      कंप्यूटर पर जो वेबसाइट खोलनी है उसका नाम लिखें:
                    </p>
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
                        🚀 Open on PC
                      </button>
                      <button
                        type="button"
                        className="toolbar-pill"
                        onClick={() => setShowUrlPrompt(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Mobile Type Text Modal */}
            {showTextPrompt && (
              <div className="auth-modal-overlay" style={{ zIndex: 99999 }} onClick={() => setShowTextPrompt(false)}>
                <div className="admin-pin-dialog-card" style={{ maxWidth: '340px' }} onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="download-close-btn" onClick={() => setShowTextPrompt(false)}>✕</button>
                  <div className="pin-dialog-header">
                    <span className="pin-shield-badge">⌨️</span>
                    <h3 className="pin-dialog-title">Type into PC</h3>
                    <p className="pin-dialog-desc">
                      यहाँ लिखें, वो कंप्यूटर में टाइप हो जाएगा:
                    </p>
                  </div>
                  <form onSubmit={handleSendCustomText} style={{ marginTop: '12px' }}>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type text or search query..."
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
                        ⌨️ Send to PC
                      </button>
                      <button
                        type="button"
                        className="toolbar-pill"
                        onClick={() => setShowTextPrompt(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Touch gestures helper hint */}
            <div className="mobile-gesture-helper">
              <span>👆 Tap = Left Click</span>
              <span>•</span>
              <span>✌️ Long Press = Right Click</span>
              <span>•</span>
              <span>✌️ Two-Finger = Scroll</span>
            </div>

            {/* If casting phone to PC fallback button */}
            {mobileMode === 'sender' && (
              <div className="mobile-cast-actions">
                {!isCasting ? (
                  <button
                    type="button"
                    className="mobile-cast-hero-btn"
                    onClick={handleStartPhoneCast}
                  >
                    🚀 Cast This Phone's Screen to PC
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mobile-stop-cast-btn"
                    onClick={handleStopPhoneCast}
                  >
                    ⏹ Stop Screen Cast
                  </button>
                )}
              </div>
            )}
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


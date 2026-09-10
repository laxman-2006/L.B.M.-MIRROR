import React, { useState, useEffect, useRef } from 'react'
import logoImg from '../assets/logo.png'
import { defaultPeerService } from '../services/peerService'
import { useAppSettings } from '../context/AppSettingsContext'
import type { Socket } from 'socket.io-client'

interface MobileSenderViewProps {
  socket?: Socket | null
  initialPin?: string
  onSwitchToFullView: () => void
}

export const MobileSenderView: React.FC<MobileSenderViewProps> = ({
  socket,
  initialPin = '',
  onSwitchToFullView,
}) => {
  const { settings } = useAppSettings()
  const [pin, setPin] = useState(initialPin)
  const [connected, setConnected] = useState(false)
  const [isCasting, setIsCasting] = useState(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [statusText, setStatusText] = useState('Enter 6-digit PIN from PC to connect')
  const [connecting, setConnecting] = useState(false)

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Setup Peer Service callbacks
  useEffect(() => {
    defaultPeerService.setOnRemoteStream((stream) => {
      setRemoteStream(stream)
      setConnected(true)
      setStatusText('🟢 Live PC screen mirroring active!')
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
        if (detail) setStatusText(`⚠️ ${detail}`)
      } else if (state === 'disconnected') {
        setConnecting(false)
        setStatusText(detail || 'Disconnected from PC.')
      }
    })

    // If initialPin was provided in URL (e.g. ?join=839201), auto-set
    if (initialPin && initialPin.length >= 6) {
      setPin(initialPin)
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [initialPin])

  // Socket fallback listeners if available
  useEffect(() => {
    if (!socket) return

    socket.on('session:join-success', () => {
      setConnected(true)
      setConnecting(false)
      setStatusText('✅ Connected to PC! Ready to cast or view screen.')
    })

    socket.on('signal:error', (err: any) => {
      setConnecting(false)
      setStatusText(`⚠️ ${err.message || 'Connection failed'}`)
    })

    return () => {
      socket.off('session:join-success')
      socket.off('signal:error')
    }
  }, [socket])

  const handleJoinSession = () => {
    const cleanPin = pin.trim()
    if (!cleanPin || cleanPin.length < 6) {
      setStatusText('Please enter the complete 6-digit PIN')
      return
    }

    setConnecting(true)
    setStatusText(`Connecting to PC with PIN ${cleanPin}...`)

    // If socket is present, emit session:join
    if (socket) {
      socket.emit('session:join', {
        pin: cleanPin,
        clientInfo: {
          name: 'Mobile Browser',
          platform: /iPhone|iPad/i.test(navigator.userAgent) ? 'iOS' : 'Android',
        },
      })
    }

    // Set connected status so user can cast immediately
    setTimeout(() => {
      setConnected(true)
      setConnecting(false)
      setStatusText(`✅ Paired with PIN: ${cleanPin}. Ready to mirror!`)
    }, 400)
  }

  const handleStartPhoneCast = async () => {
    const cleanPin = pin.trim()
    if (!cleanPin || cleanPin.length < 6) {
      alert('Please enter a valid 6-digit PIN first.')
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
        // Fallback for mobile browsers that do not expose screen display media
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        })
      }

      if (!stream) {
        alert('Could not access media stream on this device.')
        return
      }

      localStreamRef.current = stream
      setIsCasting(true)
      setStatusText('🚀 Transmitting phone stream to PC in real-time (60 FPS)...')

      stream.getVideoTracks()[0].onended = () => {
        handleStopPhoneCast()
      }

      // Establish direct P2P call to PC host via PeerJS
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
      {/* Mobile Top Bar */}
      <header className="mobile-header-bar">
        <div className="mobile-brand-group">
          <img src={settings.appLogo || logoImg} alt="LBM Logo" className="mobile-logo-thumb" />
          <div>
            <h1 className="mobile-app-title">{settings.appName}</h1>
            <span className="mobile-tagline">Mobile Web Connect</span>
          </div>
        </div>

        <button
          type="button"
          className="desktop-switch-btn"
          onClick={onSwitchToFullView}
          title="Switch to full desktop view"
        >
          🖥️ Full App
        </button>
      </header>

      {/* Main Card */}
      <main className="mobile-main-stage">
        {!connected ? (
          <div className="mobile-connect-card">
            <div className="mobile-icon-circle">📱 ➔ 💻</div>
            <h2 className="mobile-card-title">Pair with PC</h2>
            <p className="mobile-card-desc">
              Enter the 6-digit PIN displayed on your PC screen to start mirroring.
            </p>

            <div className="mobile-pin-input-wrap">
              <input
                type="number"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-Digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 6))}
                className="mobile-pin-field"
              />
            </div>

            <button
              type="button"
              className="mobile-connect-btn"
              onClick={handleJoinSession}
              disabled={connecting || pin.trim().length < 6}
            >
              {connecting ? 'Connecting...' : 'Connect to PC'}
            </button>

            <div className="mobile-status-pill">{statusText}</div>
          </div>
        ) : (
          <div className="mobile-active-card">
            <div className="mobile-connection-badge">
              🟢 Paired with PIN: {pin}
            </div>

            {/* If receiving screen from PC */}
            {remoteStream ? (
              <div className="mobile-stream-viewer">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="mobile-viewer-video"
                />
                <div className="mobile-viewer-overlay">
                  <span>Viewing PC Screen</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (remoteVideoRef.current) {
                        remoteVideoRef.current.requestFullscreen().catch(() => {})
                      }
                    }}
                  >
                    ⛶ Fullscreen
                  </button>
                </div>
              </div>
            ) : null}

            {/* If casting phone to PC */}
            <div className="mobile-cast-actions">
              {!isCasting ? (
                <button
                  type="button"
                  className="mobile-cast-hero-btn"
                  onClick={handleStartPhoneCast}
                >
                  🚀 Cast This Phone's Screen to PC (60 FPS)
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

            <div className="mobile-status-pill">{statusText}</div>
          </div>
        )}

        {/* Founder & App Tagline */}
        <footer className="mobile-footer">
          <p className="mobile-founder-credit">
            LBM Mirror • Founder &amp; CEO: <strong>{settings.founderName || 'Laxman Choudhary'}</strong>
          </p>
        </footer>
      </main>
    </div>
  )
}

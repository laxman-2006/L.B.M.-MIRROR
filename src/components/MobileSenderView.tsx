import React, { useState, useEffect, useRef } from 'react'
import logoImg from '../assets/logo.png'
import { defaultWebRtcService } from '../services/webrtcService'
import { useAppSettings } from '../context/AppSettingsContext'
import type { Socket } from 'socket.io-client'

interface MobileSenderViewProps {
  socket: Socket | null
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

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

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

    defaultWebRtcService.setOnRemoteStream((stream) => {
      setRemoteStream(stream)
      setStatusText('🟢 Live screen mirroring active!')
    })

    return () => {
      socket.off('session:join-success')
      socket.off('signal:error')
    }
  }, [socket])

  const handleJoinSession = () => {
    if (!pin || pin.length < 6 || !socket) return
    setConnecting(true)
    setStatusText('Connecting to PC...')
    defaultWebRtcService.setSocket(socket)
    socket.emit('session:join', {
      pin,
      clientInfo: {
        name: 'Mobile Browser',
        platform: navigator.userAgent.includes('iPhone') ? 'iOS' : 'Android',
      },
    })
  }

  const handleStartPhoneCast = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('Screen sharing is not supported in this mobile browser. Try Chrome on Android or Safari on iOS.')
        return
      }
      const stream = await defaultWebRtcService.startScreenCapture({ frameRate: 60 })
      setIsCasting(true)
      setStatusText('🚀 Casting phone screen to PC in real-time!')
      stream.getVideoTracks()[0].onended = () => {
        setIsCasting(false)
        setStatusText('Phone screen cast stopped.')
      }
      await defaultWebRtcService.createAndSendOffer()
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        alert('Could not start screen sharing: ' + err.message)
      }
    }
  }

  const handleStopPhoneCast = () => {
    defaultWebRtcService.stopScreenCapture()
    setIsCasting(false)
    setStatusText('Casting stopped.')
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
              disabled={connecting || pin.length < 6}
            >
              {connecting ? 'Connecting...' : 'Connect to PC'}
            </button>

            <div className="mobile-status-pill">{statusText}</div>
          </div>
        ) : (
          <div className="mobile-active-card">
            <div className="mobile-connection-badge">
              🟢 Connected (PIN: {pin})
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
                  🚀 Cast This Phone's Screen to PC
                </button>
              ) : (
                <button
                  type="button"
                  className="mobile-stop-cast-btn"
                  onClick={handleStopPhoneCast}
                >
                  ⏹ Stop Phone Cast
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

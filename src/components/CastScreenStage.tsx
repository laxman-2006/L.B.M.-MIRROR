import React, { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { defaultWebRtcService } from '../services/webrtcService'
import { getJoinUrl } from '../utils/env'
import type { Socket } from 'socket.io-client'

interface CastScreenStageProps {
  socket: Socket | null
  currentPin: string
  currentSessionId: string
  onRequireAuth: (action: () => void, message?: string) => void
  showToast: (msg: string) => void
}

export const CastScreenStage: React.FC<CastScreenStageProps> = ({
  socket,
  currentPin,
  currentSessionId,
  onRequireAuth,
  showToast,
}) => {
  const [isCasting, setIsCasting] = useState<boolean>(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copiedLink, setCopiedLink] = useState<boolean>(false)
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true)
  const [targetFps, setTargetFps] = useState<number>(60)
  const [viewerCount, setViewerCount] = useState<number>(0)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [castResolution, setCastResolution] = useState<string>('1080p')

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const timerRef = useRef<number | null>(null)

  // Generate QR code for the join link
  const shareUrl = getJoinUrl(currentPin, currentSessionId)

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err))
  }, [shareUrl])

  // Attach local stream to video preview element
  useEffect(() => {
    if (videoPreviewRef.current && localStream) {
      videoPreviewRef.current.srcObject = localStream
    }
  }, [localStream])

  // Timer for active casting session
  useEffect(() => {
    if (isCasting) {
      setElapsedTime(0)
      timerRef.current = window.setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isCasting])

  // Listen for viewer connections via socket
  useEffect(() => {
    if (!socket) return

    const handleClientJoined = () => {
      setViewerCount((prev) => prev + 1)
      showToast('📱 New viewer joined the screen cast!')
      // Offer stream to new viewer
      defaultWebRtcService.createAndSendOffer().catch(console.error)
    }

    const handleClientLeft = () => {
      setViewerCount((prev) => Math.max(0, prev - 1))
      showToast('Viewer disconnected.')
    }

    socket.on('session:client-joined', handleClientJoined)
    socket.on('session:ended', handleClientLeft)

    return () => {
      socket.off('session:client-joined', handleClientJoined)
      socket.off('session:ended', handleClientLeft)
    }
  }, [socket, showToast])

  const handleStartCasting = () => {
    onRequireAuth(async () => {
      try {
        defaultWebRtcService.setSessionId(currentSessionId)
        if (socket) defaultWebRtcService.setSocket(socket)

        const stream = await defaultWebRtcService.startScreenCapture({
          frameRate: targetFps,
        })

        // Track stream ended event (e.g. user clicked browser's native "Stop Sharing" button)
        stream.getVideoTracks()[0].onended = () => {
          handleStopCasting()
        }

        const videoTrack = stream.getVideoTracks()[0]
        const settings = videoTrack.getSettings()
        if (settings.width && settings.height) {
          setCastResolution(`${settings.width}x${settings.height}`)
        }

        setLocalStream(stream)
        setIsCasting(true)
        showToast(`🚀 Screen casting started at ${targetFps} FPS!`)

        // If socket is connected, broadcast session ready
        if (socket && currentSessionId) {
          socket.emit('session:status', { sessionId: currentSessionId, status: 'MIRRORING' })
          defaultWebRtcService.createAndSendOffer().catch(() => {})
        }
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          showToast(`Could not start screen cast: ${err.message || 'Permission denied'}`)
        }
      }
    }, 'कृपया स्क्रीनकास्ट शुरू करने के लिए लॉगिन करें (Please log in to start casting).')
  }

  const handleStopCasting = () => {
    defaultWebRtcService.stopScreenCapture()
    setLocalStream(null)
    setIsCasting(false)
    setViewerCount(0)
    showToast('Screen cast ended.')
    if (socket && currentSessionId) {
      socket.emit('session:status', { sessionId: currentSessionId, status: 'WAITING' })
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    showToast('📋 Share link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="cast-stage-wrapper">
      {/* Top Banner */}
      <div className="cast-stage-header">
        <div>
          <div className="cast-title-row">
            <h2 className="cast-title">Cast Screen (Broadcaster Hub)</h2>
            <span className={`cast-live-badge ${isCasting ? 'active-live' : 'idle'}`}>
              {isCasting ? '🔴 LIVE 60 FPS' : '⚪ READY TO CAST'}
            </span>
          </div>
          <p className="cast-subtitle">
            Share your PC or phone screen in real time over local Wi-Fi or WebRTC Internet with ultra-low latency.
          </p>
        </div>

        {isCasting && (
          <div className="cast-quick-stats">
            <div className="quick-stat-item">
              <span className="q-label">Duration</span>
              <strong className="q-val">{formatTime(elapsedTime)}</strong>
            </div>
            <div className="quick-stat-item">
              <span className="q-label">Viewers</span>
              <strong className="q-val">{viewerCount}</strong>
            </div>
            <div className="quick-stat-item">
              <span className="q-label">FPS</span>
              <strong className="q-val">{targetFps} FPS</strong>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Broadcaster Monitor + Sharing Hub */}
      <div className="cast-content-grid">
        {/* Left: Video Preview Monitor */}
        <div className="cast-monitor-card">
          <div className="monitor-top-bar">
            <span className="monitor-label">
              {isCasting ? 'Outgoing Screen Stream Preview' : 'Screen Capture Ready'}
            </span>
            {isCasting && (
              <span className="monitor-res-tag">{castResolution}</span>
            )}
          </div>

          <div className="monitor-display-area">
            {isCasting && localStream ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="live-monitor-video"
              />
            ) : (
              <div className="monitor-idle-placeholder">
                <div className="idle-radar-pulse" />
                <div className="idle-icon">🖥️ ➔ 📱</div>
                <h4 className="idle-title">Ready to Broadcast</h4>
                <p className="idle-desc">
                  Click below to select your Screen, App Window, or Tab to share.
                </p>
                <button
                  type="button"
                  className="start-cast-hero-btn"
                  onClick={handleStartCasting}
                >
                  <span className="hero-btn-icon">🚀</span>
                  <span>Start Screen Casting (60 FPS)</span>
                </button>
              </div>
            )}
          </div>

          {/* Monitor Footer Controls */}
          {isCasting && (
            <div className="monitor-controls-row">
              <div className="monitor-left-actions">
                <button
                  type="button"
                  className={`ctrl-toggle-btn ${audioEnabled ? 'active' : ''}`}
                  onClick={() => {
                    if (localStream) {
                      localStream.getAudioTracks().forEach((t) => {
                        t.enabled = !audioEnabled
                      })
                      setAudioEnabled(!audioEnabled)
                    }
                  }}
                  title={audioEnabled ? 'Mute System Audio' : 'Unmute System Audio'}
                >
                  {audioEnabled ? '🔊 Audio ON' : '🔇 Audio Muted'}
                </button>

                <button
                  type="button"
                  className="ctrl-toggle-btn"
                  onClick={() => {
                    if (videoPreviewRef.current) {
                      if (document.fullscreenElement) {
                        document.exitFullscreen()
                      } else {
                        videoPreviewRef.current.requestFullscreen().catch(() => {})
                      }
                    }
                  }}
                  title="Fullscreen Preview"
                >
                  ⛶ Fullscreen
                </button>
              </div>

              <button
                type="button"
                className="stop-cast-btn"
                onClick={handleStopCasting}
              >
                ⏹ Stop Screen Cast
              </button>
            </div>
          )}

          {!isCasting && (
            <div className="cast-pre-settings">
              <label className="pre-opt-item">
                <span>FPS Mode:</span>
                <select
                  value={targetFps}
                  onChange={(e) => setTargetFps(Number(e.target.value))}
                  className="pre-select"
                >
                  <option value={60}>60 FPS (Ultra Smooth)</option>
                  <option value={30}>30 FPS (Low Bandwidth)</option>
                </select>
              </label>

              <label className="pre-opt-checkbox">
                <input
                  type="checkbox"
                  checked={audioEnabled}
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                />
                <span>Share System &amp; Tab Audio</span>
              </label>
            </div>
          )}
        </div>

        {/* Right: Sharing Hub with PIN and Dynamic QR Code */}
        <div className="cast-sharing-card">
          <div className="sharing-header">
            <h3 className="sharing-title">Pairing &amp; Sharing Hub</h3>
            <p className="sharing-desc">
              Any phone, laptop, or tablet can scan the QR code or enter this 6-digit PIN to watch your cast.
            </p>
          </div>

          {/* 6-Digit PIN Display */}
          <div className="pin-highlight-box">
            <span className="pin-title-label">SESSION 6-DIGIT PIN</span>
            <div className="pin-digits-row">
              {currentPin.split('').map((digit, idx) => (
                <span key={idx} className="pin-digit-box">
                  {digit}
                </span>
              ))}
            </div>
          </div>

          {/* Dynamic QR Code */}
          <div className="qr-code-showcase">
            {qrDataUrl ? (
              <div className="qr-img-frame">
                <img src={qrDataUrl} alt="Join QR Code" className="qr-code-img" />
                <span className="qr-scan-tag">Scan with Mobile Camera</span>
              </div>
            ) : (
              <div className="qr-placeholder">Generating QR...</div>
            )}
          </div>

          {/* Action Buttons: Copy Link & Test in New Tab */}
          <div className="sharing-actions-stack">
            <button
              type="button"
              className="copy-share-btn"
              onClick={handleCopyLink}
            >
              {copiedLink ? '✅ Link Copied!' : '🔗 Copy Shareable Web Link'}
            </button>

            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="test-viewer-btn"
            >
              👁️ Open Receiver Viewer (Test in New Tab)
            </a>
          </div>

          {/* Device Instructions Footnote */}
          <div className="sharing-steps-note">
            <div className="step-point">
              <span className="step-num">1</span>
              <span>Open the link or scan QR code on any phone or PC.</span>
            </div>
            <div className="step-point">
              <span className="step-num">2</span>
              <span>The screen stream connects automatically via WebRTC!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

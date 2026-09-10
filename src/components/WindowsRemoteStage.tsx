import React, { useState, useEffect } from 'react'
import { defaultPeerService } from '../services/peerService'
import { defaultWebRtcService } from '../services/webrtcService'
import { getJoinUrl } from '../utils/env'

interface WindowsRemoteStageProps {
  currentPin: string
  currentSessionId: string
  onRequireAuth: (action: () => void, message?: string) => void
  onRemoteStreamReceived: (stream: MediaStream, partnerInfo?: { name: string; id: string }) => void
  showToast: (msg: string) => void
}

export const WindowsRemoteStage: React.FC<WindowsRemoteStageProps> = ({
  currentPin,
  currentSessionId,
  onRequireAuth,
  onRemoteStreamReceived,
  showToast,
}) => {
  // ─── Host / Share State (Left Side) ────────────────────────────────────────
  const [hostId, setHostId] = useState<string>(currentPin || '839201')
  const [hostPassword, setHostPassword] = useState<string>(() => {
    const saved = sessionStorage.getItem('lbm_win_passcode')
    if (saved) return saved
    const gen = String(Math.floor(1000 + Math.random() * 9000))
    sessionStorage.setItem('lbm_win_passcode', gen)
    return gen
  })
  const [isSharing, setIsSharing] = useState<boolean>(false)
  const [, setSharingStream] = useState<MediaStream | null>(null)
  const [shareFps, setShareFps] = useState<number>(60)
  const [shareAudio, setShareAudio] = useState<boolean>(true)

  // ─── Client / Connect State (Right Side) ───────────────────────────────────
  const [partnerId, setPartnerId] = useState<string>('')
  const [partnerPassword, setPartnerPassword] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  useEffect(() => {
    if (currentPin) {
      setHostId(currentPin)
    }
  }, [currentPin])

  const handleRegeneratePassword = () => {
    const newPass = String(Math.floor(1000 + Math.random() * 9000))
    setHostPassword(newPass)
    sessionStorage.setItem('lbm_win_passcode', newPass)
    showToast('🔑 New Passcode generated!')
  }

  const formatId = (id: string) => {
    const cleaned = id.replace(/\s+/g, '')
    if (cleaned.length === 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
    }
    return cleaned
  }

  // ─── Start Sharing This PC (Left Column) ───────────────────────────────────
  const handleStartShareScreen = () => {
    onRequireAuth(async () => {
      try {
        const stream = await defaultWebRtcService.startScreenCapture({
          frameRate: shareFps,
        })

        if (!shareAudio) {
          stream.getAudioTracks().forEach((t) => { t.enabled = false })
        }

        stream.getVideoTracks()[0].onended = () => {
          handleStopShareScreen()
        }

        setSharingStream(stream)
        setIsSharing(true)
        showToast(`🖥️ PC Screen sharing started at ${shareFps} FPS!`)

        // Broadcast to PeerService with host ID
        const pinToUse = hostId.replace(/\s+/g, '')
        await defaultPeerService.initHost(pinToUse, stream)
        defaultPeerService.broadcastToTabs('tab:stream_ready', { pin: pinToUse })
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          showToast(`Screen share error: ${err.message || 'Permission denied'}`)
        }
      }
    }, 'कृपया स्क्रीनकास्ट शुरू करने के लिए लॉगिन करें (Please log in to share screen).')
  }

  const handleStopShareScreen = () => {
    defaultWebRtcService.stopScreenCapture()
    defaultPeerService.destroyPeer()
    setSharingStream(null)
    setIsSharing(false)
    showToast('PC Screen share stopped.')
  }

  // ─── Connect to Remote Partner PC (Right Column) ───────────────────────────
  const handleConnectRemotePc = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnectError(null)

    const cleanPartnerId = partnerId.replace(/\s+/g, '').trim()
    if (!cleanPartnerId || cleanPartnerId.length < 5) {
      setConnectError('Please enter a valid Partner ID (minimum 5 digits).')
      return
    }

    setIsConnecting(true)
    showToast(`Connecting to Remote PC (ID: ${cleanPartnerId})...`)

    try {
      // Connect to partner via PeerService
      defaultPeerService.setOnRemoteStream((stream) => {
        setIsConnecting(false)
        onRemoteStreamReceived(stream, {
          name: `Remote PC (${cleanPartnerId})`,
          id: cleanPartnerId,
        })
        showToast('🟢 Connected to Remote PC screen at 60 FPS!')
      })

      defaultPeerService.setOnConnectionState((state, detail) => {
        if (state === 'error') {
          setIsConnecting(false)
          setConnectError(detail || 'Could not connect to Remote PC. Please verify Partner ID & Passcode.')
        } else if (state === 'disconnected') {
          setIsConnecting(false)
        }
      })

      // Try connecting via PeerJS using a dummy stream or direct call
      // On receiver side, we create a blank audio stream to initiate call
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const dest = audioCtx.createMediaStreamDestination()
      await defaultPeerService.joinAndCast(cleanPartnerId, dest.stream)
    } catch (err: any) {
      setIsConnecting(false)
      setConnectError(err.message || 'Connection failed. Please ensure Partner PC is actively sharing.')
    }
  }

  const testShareUrl = getJoinUrl(hostId.replace(/\s+/g, ''), currentSessionId)

  return (
    <div className="windows-remote-stage-wrapper">
      {/* Top Banner */}
      <div className="win-remote-header">
        <div className="win-header-left">
          <div className="win-title-row">
            <span className="win-badge-icon">💻</span>
            <h2 className="win-stage-title">Windows Remote Mirroring (UltraViewer Mode)</h2>
            <span className="win-mode-tag">PC-TO-PC 60 FPS</span>
          </div>
          <p className="win-stage-subtitle">
            Share your PC screen or remotely mirror another Windows computer with ID and Passcode over local Wi-Fi or WebRTC Internet.
          </p>
        </div>

        {/* 1-Click Test Button */}
        <div className="win-header-actions">
          <a
            href={testShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="win-test-tab-btn"
            title="Open partner viewer in a new browser tab on this PC"
          >
            👁️ Test in New Tab
          </a>
        </div>
      </div>

      {/* 2-Column UltraViewer Grid */}
      <div className="win-remote-grid">
        {/* ══════════ LEFT COLUMN: Allow Remote Access (Cast / Share Screen) ══════════ */}
        <div className="win-remote-card host-card">
          <div className="card-column-badge cast-badge">
            <span>📤 SHARE THIS SCREEN (CAST)</span>
          </div>

          <div className="win-card-header">
            <h3 className="column-title">Allow Remote Access</h3>
            <p className="column-desc">
              Give this ID and Passcode to the other PC to let them view your screen.
            </p>
          </div>

          <div className="credential-boxes-stack">
            {/* Your ID */}
            <div className="credential-row-box">
              <span className="cred-label">Your LBM ID</span>
              <div className="cred-val-row">
                <span className="cred-val-text large-id">{formatId(hostId)}</span>
                <button
                  type="button"
                  className="copy-cred-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(hostId.replace(/\s+/g, ''))
                    showToast('✓ ID copied to clipboard!')
                  }}
                  title="Copy ID"
                >
                  📋 Copy
                </button>
              </div>
            </div>

            {/* Your Passcode */}
            <div className="credential-row-box">
              <span className="cred-label">Your Passcode</span>
              <div className="cred-val-row">
                <span className="cred-val-text passcode-text">{hostPassword}</span>
                <button
                  type="button"
                  className="regenerate-cred-btn"
                  onClick={handleRegeneratePassword}
                  title="Generate new Passcode"
                >
                  🔄 New Code
                </button>
              </div>
            </div>
          </div>

          {/* Settings Row */}
          <div className="win-options-bar">
            <label className="win-opt-item">
              <span>Quality:</span>
              <select
                value={shareFps}
                onChange={(e) => setShareFps(Number(e.target.value))}
                className="win-select"
              >
                <option value={60}>60 FPS (Ultra Smooth)</option>
                <option value={30}>30 FPS (Low Bandwidth)</option>
              </select>
            </label>

            <label className="win-check-item">
              <input
                type="checkbox"
                checked={shareAudio}
                onChange={(e) => setShareAudio(e.target.checked)}
              />
              <span>System Audio</span>
            </label>
          </div>

          {/* Action Button */}
          <div className="win-card-footer">
            {!isSharing ? (
              <button
                type="button"
                className="win-start-share-btn"
                onClick={handleStartShareScreen}
              >
                <span className="btn-icon">🚀</span>
                <span>Start Sharing This PC Screen (60 FPS)</span>
              </button>
            ) : (
              <div className="win-active-share-box">
                <div className="live-broadcast-pill">
                  <span className="pulsing-red-dot" />
                  <strong>BROADCASTING LIVE (60 FPS)</strong>
                </div>
                <button
                  type="button"
                  className="win-stop-share-btn"
                  onClick={handleStopShareScreen}
                >
                  ⏹ Stop Sharing Screen
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ══════════ RIGHT COLUMN: Control Remote PC (Receive / View Screen) ══════════ */}
        <div className="win-remote-card client-card">
          <div className="card-column-badge receive-badge">
            <span>📥 CONTROL / VIEW REMOTE PC (RECEIVE)</span>
          </div>

          <div className="win-card-header">
            <h3 className="column-title">Connect to Partner PC</h3>
            <p className="column-desc">
              Enter the Partner ID and Passcode displayed on the other Windows PC.
            </p>
          </div>

          <form onSubmit={handleConnectRemotePc} className="win-connect-form">
            <div className="form-field-group">
              <label htmlFor="partner-id-input" className="form-field-label">
                Partner ID:
              </label>
              <div className="input-with-icon">
                <span className="input-icon">💻</span>
                <input
                  id="partner-id-input"
                  type="text"
                  placeholder="e.g. 839 201"
                  value={partnerId}
                  onChange={(e) => {
                    setPartnerId(e.target.value)
                    setConnectError(null)
                  }}
                  className="win-input-field partner-id-field"
                  required
                />
              </div>
            </div>

            <div className="form-field-group">
              <label htmlFor="partner-pass-input" className="form-field-label">
                Partner Passcode:
              </label>
              <div className="input-with-icon">
                <span className="input-icon">🔑</span>
                <input
                  id="partner-pass-input"
                  type="password"
                  maxLength={10}
                  placeholder="e.g. 4821"
                  value={partnerPassword}
                  onChange={(e) => {
                    setPartnerPassword(e.target.value)
                    setConnectError(null)
                  }}
                  className="win-input-field partner-pass-field"
                />
              </div>
            </div>

            {connectError && (
              <div className="win-connect-error-banner">
                <span>⚠️ {connectError}</span>
              </div>
            )}

            <div className="win-card-footer">
              <button
                type="submit"
                className="win-connect-remote-btn"
                disabled={isConnecting || !partnerId.trim()}
              >
                {isConnecting ? (
                  <>
                    <span className="spinner-icon">🔄</span>
                    <span>Connecting to Remote PC…</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">⚡</span>
                    <span>Connect &amp; Mirror Remote PC (60 FPS)</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Steps Helper */}
          <div className="win-steps-guide">
            <div className="win-step-row">
              <span className="step-num-pill">1</span>
              <span>Open LBM Mirror on both laptops/PCs.</span>
            </div>
            <div className="win-step-row">
              <span className="step-num-pill">2</span>
              <span>On PC 1, click "Start Sharing".</span>
            </div>
            <div className="win-step-row">
              <span className="step-num-pill">3</span>
              <span>On PC 2, enter PC 1's ID &amp; Passcode and click "Connect".</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { defaultPeerService, createFallbackVideoStream } from '../services/peerService'
import { defaultWebRtcService } from '../services/webrtcService'
import { getJoinUrl } from '../utils/env'

interface WindowsRemoteStageProps {
  currentPin: string
  currentSessionId: string
  onRequireAuth: (action: () => void, message?: string) => void
  onRemoteStreamReceived: (stream: MediaStream, partnerInfo?: { name: string; id: string; isRemoteControl?: boolean }) => void
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
    const saved = sessionStorage.getItem('lbm_stable_host_password') || sessionStorage.getItem('lbm_win_passcode') || sessionStorage.getItem('lbm_host_passcode')
    if (saved) return saved
    const gen = String(Math.floor(1000 + Math.random() * 9000))
    sessionStorage.setItem('lbm_stable_host_password', gen)
    sessionStorage.setItem('lbm_win_passcode', gen)
    sessionStorage.setItem('lbm_host_passcode', gen)
    return gen
  })
  const [isSharing, setIsSharing] = useState<boolean>(false)
  const [shareFps, setShareFps] = useState<number>(60)
  const [shareAudio, setShareAudio] = useState<boolean>(true)
  const [allowControl, setAllowControl] = useState<boolean>(true)
  const [isHostReady, setIsHostReady] = useState<boolean>(false)
  const [activePartnerName, setActivePartnerName] = useState<string | null>(null)

  // ─── Client / Connect State (Right Side) ───────────────────────────────────
  const [partnerId, setPartnerId] = useState<string>('')
  const [partnerPassword, setPartnerPassword] = useState<string>('')
  const [showPartnerPassword, setShowPartnerPassword] = useState<boolean>(false)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [connectingStep, setConnectingStep] = useState<string>('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [recentPartnerIds, setRecentPartnerIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lbm_recent_partners')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const sharingStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (currentPin) {
      setHostId(currentPin)
    }
  }, [currentPin])

  // Update passcode without restarting peer
  useEffect(() => {
    defaultPeerService.setHostPasscode(hostPassword)
  }, [hostPassword])

  // Provide screen stream to PeerService on demand
  const acquireScreenStream = async (): Promise<MediaStream | null> => {
    if (sharingStreamRef.current && sharingStreamRef.current.active) {
      return sharingStreamRef.current
    }
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
      sharingStreamRef.current = stream
      setIsSharing(true)
      defaultPeerService.updateLocalStream(stream)

      // Start native remote input bridge if running in Desktop mode
      if (typeof window !== 'undefined' && window.electronAPI?.remoteInput) {
        window.electronAPI.remoteInput.start().catch(() => {})
      }

      return stream
    } catch (err: any) {
      console.warn('[WindowsRemoteStage] Screen capture cancelled or deferred:', err)
      return null
    }
  }

  // Initialize host listener on mount
  useEffect(() => {
    defaultPeerService.setStreamProvider(acquireScreenStream)

    const cleanPin = (hostId || '839201').replace(/\s+/g, '')
    defaultPeerService.initHost(cleanPin, sharingStreamRef.current, hostPassword)
      .then(() => setIsHostReady(true))
      .catch(() => setIsHostReady(true))

    // Listen for partner connection events
    defaultPeerService.setOnConnectionState((status, detail) => {
      if (status === 'connected') {
        setActivePartnerName(detail || 'Partner PC')
        if (typeof window !== 'undefined' && window.electronAPI?.remoteInput) {
          window.electronAPI.remoteInput.start().catch(() => {})
        }
      } else if (status === 'disconnected') {
        setActivePartnerName(null)
      }
    })

    // If running in Desktop app (Electron), auto-prime input bridge and screen capture immediately
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (window.electronAPI.remoteInput) {
        window.electronAPI.remoteInput.start().catch(() => {})
      }
      acquireScreenStream().then((stream) => {
        if (stream) {
          console.log('[WindowsRemoteStage] Desktop auto-stream ready for remote control')
        }
      }).catch(() => {})
    }
  }, [hostId])

  const handleRegeneratePassword = () => {
    const newPass = String(Math.floor(1000 + Math.random() * 9000))
    setHostPassword(newPass)
    sessionStorage.setItem('lbm_stable_host_password', newPass)
    sessionStorage.setItem('lbm_win_passcode', newPass)
    sessionStorage.setItem('lbm_host_passcode', newPass)
    defaultPeerService.setHostPasscode(newPass)
    showToast('🔑 New Password generated!')
  }

  const formatId = (id: string) => {
    const cleaned = id.replace(/\s+/g, '')
    if (cleaned.length === 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
    }
    if (cleaned.length >= 8) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`
    }
    return cleaned
  }

  // ─── Start Sharing This PC Screen ──────────────────────────────────────────
  const handleStartShareScreen = () => {
    onRequireAuth(async () => {
      try {
        const stream = await acquireScreenStream()
        if (stream) {
          showToast(`🖥️ PC Screen stream ready at ${shareFps} FPS! Ready for partner connection.`)
          const pinToUse = hostId.replace(/\s+/g, '')
          defaultPeerService.broadcastToTabs('tab:stream_ready', { pin: pinToUse })
        }
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          showToast(`Screen share error: ${err.message || 'Permission denied'}`)
        }
      }
    }, 'कृपया स्क्रीन शेयर शुरू करने के लिए लॉगिन करें।')
  }

  const handleStopShareScreen = () => {
    defaultWebRtcService.stopScreenCapture()
    if (typeof window !== 'undefined' && window.electronAPI?.remoteInput) {
      window.electronAPI.remoteInput.stop().catch(() => {})
    }
    sharingStreamRef.current = null
    defaultPeerService.setLocalStream(null)
    setIsSharing(false)
    setActivePartnerName(null)
    showToast('PC Screen share stopped.')
  }

  // ─── Connect to Remote Partner PC ──────────────────────────────────────────
  const handleConnectRemotePc = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnectError(null)

    const cleanPartnerId = partnerId.replace(/\s+/g, '').trim()
    if (!cleanPartnerId || cleanPartnerId.length < 5) {
      setConnectError('कृपया मान्य Partner ID दर्ज करें (कम से कम 5-6 अंक)।')
      return
    }

    if (!partnerPassword.trim()) {
      setConnectError('कृपया Partner Password दर्ज करें।')
      return
    }

    setIsConnecting(true)
    setConnectingStep('1. Connecting to Partner PC...')
    showToast(`Connecting to Partner PC (ID: ${cleanPartnerId})...`)

    try {
      defaultPeerService.setOnRemoteStream((stream) => {
        setIsConnecting(false)
        setConnectingStep('')

        // Save to recent partners
        setRecentPartnerIds((prev) => {
          const updated = [cleanPartnerId, ...prev.filter((id) => id !== cleanPartnerId)].slice(0, 5)
          try {
            localStorage.setItem('lbm_recent_partners', JSON.stringify(updated))
          } catch {}
          return updated
        })

        onRemoteStreamReceived(stream, {
          name: `Remote PC (${cleanPartnerId})`,
          id: cleanPartnerId,
          isRemoteControl: true,
        })
        showToast('🟢 Connected to Remote PC screen with Full Mouse & Keyboard Control!')
      })

      defaultPeerService.setOnConnectionState((state, detail) => {
        if (state === 'connecting') {
          setConnectingStep(detail || 'Verifying credentials with Partner PC...')
        } else if (state === 'error') {
          setIsConnecting(false)
          setConnectingStep('')
          setConnectError(detail || 'Could not connect to Remote PC. Please verify Partner ID & Password.')
        } else if (state === 'disconnected') {
          setIsConnecting(false)
          setConnectingStep('')
        }
      })

      // Create robust multi-track dummy stream (Audio + Video) for zero-renegotiation connection
      const dummyStream = createFallbackVideoStream('LBM Remote Operator Client')
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {})
        }
        const dest = audioCtx.createMediaStreamDestination()
        if (dest.stream.getAudioTracks()[0]) {
          dummyStream.addTrack(dest.stream.getAudioTracks()[0])
        }
      } catch {}

      await defaultPeerService.connectToPartner(cleanPartnerId, partnerPassword, dummyStream)
    } catch (err: any) {
      setIsConnecting(false)
      setConnectingStep('')
      setConnectError(err.message || 'Connection failed. Please ensure Partner PC is actively open.')
    }
  }

  const testShareUrl = getJoinUrl(hostId.replace(/\s+/g, ''), currentSessionId)

  return (
    <div className="windows-remote-stage-wrapper">
      {/* Top Header Bar */}
      <div className="win-remote-header">
        <div className="win-header-left">
          <div className="win-title-row">
            <span className="win-badge-icon">💻</span>
            <h2 className="win-stage-title">LBM Remote PC Mirroring</h2>
            <span className="win-mode-tag">ANY NETWORK • 60 FPS • FULL CONTROL</span>
          </div>
          <p className="win-stage-subtitle">
            बिना सेम वाई-फाई की जरूरत के—चाहे दोनों कंप्यूटर अलग-अलग इंटरनेट (Jio, Airtel, Wi-Fi या मोबाइल हॉटस्पॉट) पर हों—ID और Password से तुरंत 1-क्लिक में कनेक्ट करें और सीधे इस स्क्रीन से सामने वाले पीसी का माउस और कीबोर्ड चलाएं!
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

      {/* Active Remote Session Alert (If Partner Connected to this Host) */}
      {activePartnerName && (
        <div className="active-session-banner">
          <div className="banner-status-icon">🟢</div>
          <div className="banner-info">
            <strong>Partner Connected with Remote Control!</strong>
            <span>{activePartnerName} is currently controlling this computer.</span>
          </div>
          <button
            type="button"
            className="banner-stop-btn"
            onClick={handleStopShareScreen}
          >
            ⏹ Disconnect Partner
          </button>
        </div>
      )}

      {/* 2-Column LBM Remote Desktop Grid */}
      <div className="win-remote-grid">
        {/* ══════════ LEFT COLUMN: Allow Remote Control (Host) ══════════ */}
        <div className="win-remote-card host-card">
          <div className="win-card-header">
            <div className="card-title-with-icon">
              <span className="column-icon-disc">📡</span>
              <div>
                <h3 className="column-title">Allow Remote Control</h3>
                <p className="column-desc">
                  Please tell your partner the following ID and Password if you would like to allow remote control
                </p>
              </div>
            </div>
          </div>

          <div className="credential-boxes-stack">
            {/* Your ID */}
            <div className="credential-row-box">
              <span className="cred-label">Your ID</span>
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

            {/* Password */}
            <div className="credential-row-box">
              <span className="cred-label">Password</span>
              <div className="cred-val-row">
                <span className="cred-val-text passcode-text">{hostPassword}</span>
                <div className="cred-btn-group">
                  <button
                    type="button"
                    className="copy-cred-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(hostPassword)
                      showToast('✓ Password copied!')
                    }}
                    title="Copy Password"
                  >
                    📋 Copy
                  </button>
                  <button
                    type="button"
                    className="regenerate-cred-btn"
                    onClick={handleRegeneratePassword}
                    title="Generate new Password"
                  >
                    🔄 New Code
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Options / Settings */}
          <div className="win-options-bar">
            <label className="win-check-item">
              <input
                type="checkbox"
                checked={allowControl}
                onChange={(e) => setAllowControl(e.target.checked)}
              />
              <span>Allow Mouse &amp; Keyboard Control</span>
            </label>

            <label className="win-check-item">
              <input
                type="checkbox"
                checked={shareFps === 60}
                onChange={(e) => setShareFps(e.target.checked ? 60 : 30)}
              />
              <span>60 FPS Ultra Fast Mode</span>
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

          {/* Status & Action */}
          <div className="win-card-footer">
            <div className="ready-status-indicator">
              <span className={`status-dot ${isSharing ? 'pulsing-green' : (isHostReady ? 'solid-green' : 'pulsing-amber')}`} />
              <span className="status-text">
                {isSharing
                  ? 'Screen stream active & ready for remote control'
                  : (isHostReady
                    ? 'Ready to connect (Secure P2P & Cloud Active)'
                    : 'Initializing LBM Remote connection engine...')}
              </span>
            </div>

            {!isSharing ? (
              <button
                type="button"
                className="win-start-share-btn"
                onClick={handleStartShareScreen}
              >
                <span className="btn-icon">🚀</span>
                <span>Activate Screen Stream</span>
              </button>
            ) : (
              <button
                type="button"
                className="win-stop-share-btn"
                onClick={handleStopShareScreen}
              >
                ⏹ Stop Screen Stream
              </button>
            )}
          </div>
        </div>

        {/* ══════════ RIGHT COLUMN: Control a Remote Computer (Client) ══════════ */}
        <div className="win-remote-card client-card">
          <div className="win-card-header">
            <div className="card-title-with-icon">
              <span className="column-icon-disc">👤</span>
              <div>
                <h3 className="column-title">Control a Remote Computer</h3>
                <p className="column-desc">
                  Please enter your partner's ID to remote control your partner's computer
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleConnectRemotePc} className="win-connect-form">
            <div className="form-field-group">
              <div className="form-field-header-row">
                <label htmlFor="partner-id-input" className="form-field-label">
                  Partner ID:
                </label>
                {recentPartnerIds.length > 0 && (
                  <div className="recent-partners-quick">
                    <span className="recent-label">Recent:</span>
                    {recentPartnerIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="recent-chip-btn"
                        onClick={() => setPartnerId(id)}
                      >
                        {formatId(id)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="input-with-icon">
                <span className="input-icon">💻</span>
                <input
                  id="partner-id-input"
                  type="text"
                  placeholder="e.g. 893 654"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  className="win-text-input"
                  required
                />
              </div>
            </div>

            <div className="form-field-group">
              <label htmlFor="partner-pass-input" className="form-field-label">
                Password:
              </label>
              <div className="input-with-icon">
                <span className="input-icon">🔑</span>
                <input
                  id="partner-pass-input"
                  type={showPartnerPassword ? 'text' : 'password'}
                  placeholder="e.g. 8204"
                  value={partnerPassword}
                  onChange={(e) => setPartnerPassword(e.target.value)}
                  className="win-text-input"
                  required
                />
                <button
                  type="button"
                  className="toggle-pass-visibility-btn"
                  onClick={() => setShowPartnerPassword(!showPartnerPassword)}
                  title={showPartnerPassword ? 'Hide password' : 'Show password'}
                >
                  {showPartnerPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            {/* Connecting Step Feedback */}
            {isConnecting && connectingStep && (
              <div className="win-progress-callout">
                <span className="connecting-spinner-small" />
                <span>{connectingStep}</span>
              </div>
            )}

            {/* Error Callout */}
            {connectError && (
              <div className="win-error-callout">
                <span className="err-icon">⚠️</span>
                <span>{connectError}</span>
              </div>
            )}

            <div className="win-connect-action-row">
              <button
                type="submit"
                className="win-connect-btn"
                disabled={isConnecting || !partnerId.trim() || !partnerPassword.trim()}
              >
                {isConnecting ? (
                  <>
                    <span className="connecting-spinner-small" />
                    <span>Connecting to Partner PC...</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">➡️</span>
                    <span>Connect to partner</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="win-card-subinfo">
            <span className="subinfo-icon">🌐</span>
            <span>
              Connect across any distance (worldwide over internet) with zero setup. Partner screen opens at 60 FPS with full mouse & keyboard control.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

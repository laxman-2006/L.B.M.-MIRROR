import React, { useState, useEffect } from 'react'
import { defaultPeerService, createFallbackVideoStream } from '../services/peerService'
import { getJoinUrl } from '../utils/env'
import QRCode from 'qrcode'

interface MobileRemoteCardProps {
  targetPlatform: 'Android' | 'iOS'
  currentPin: string
  currentSessionId: string
  isExpanded: boolean
  onToggleExpand: () => void
  onRequireAuth: (action: () => void, message?: string) => void
  onRemoteStreamReceived: (stream: MediaStream, partnerInfo?: { name: string; id: string; isRemoteControl?: boolean }) => void
  showToast: (msg: string) => void
}

export const MobileRemoteCard: React.FC<MobileRemoteCardProps> = ({
  targetPlatform,
  currentPin,
  currentSessionId,
  isExpanded,
  onToggleExpand,
  onRequireAuth,
  onRemoteStreamReceived,
  showToast,
}) => {
  // ─── Left Column: Your ID & Password (Allow Remote Control - Phone to PC) ───
  const [hostId] = useState<string>(currentPin || '839201')
  const [hostPassword, setHostPassword] = useState<string>(() => {
    const saved = sessionStorage.getItem('lbm_host_passcode') || sessionStorage.getItem(`lbm_${targetPlatform.toLowerCase()}_passcode`)
    if (saved) return saved
    const gen = String(Math.floor(1000 + Math.random() * 9000))
    sessionStorage.setItem('lbm_host_passcode', gen)
    return gen
  })
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [allowInputControl, setAllowInputControl] = useState<boolean>(true)
  const [fps60Mode, setFps60Mode] = useState<boolean>(true)

  // ─── Right Column: Partner ID & Password (Control Remote Device - PC to Phone) ─
  const [partnerId, setPartnerId] = useState<string>('')
  const [partnerPassword, setPartnerPassword] = useState<string>('')
  const [showPartnerPassword, setShowPartnerPassword] = useState<boolean>(false)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [connectingStep, setConnectingStep] = useState<string>('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [deviceType, setDeviceType] = useState<'mobile' | 'pc'>('mobile')

  // Generate QR Code for Phone ➔ PC connection
  useEffect(() => {
    const cleanPin = (currentPin || hostId).replace(/\s+/g, '')
    const directUrl = `${getJoinUrl(cleanPin, currentSessionId)}&mode=controller`
    QRCode.toDataURL(directUrl, {
      width: 150,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {})

    // Ensure host is initialized for incoming phone/partner connections
    defaultPeerService.initHost(cleanPin, null, hostPassword).catch(() => {})
  }, [currentPin, hostId, currentSessionId, hostPassword])

  // Sync passcode to PeerService
  useEffect(() => {
    defaultPeerService.setHostPasscode(hostPassword)
  }, [hostPassword])

  const handleRegeneratePassword = () => {
    const newPass = String(Math.floor(1000 + Math.random() * 9000))
    setHostPassword(newPass)
    sessionStorage.setItem('lbm_host_passcode', newPass)
    sessionStorage.setItem(`lbm_${targetPlatform.toLowerCase()}_passcode`, newPass)
    defaultPeerService.setHostPasscode(newPass)
    const cleanPin = (currentPin || hostId).replace(/\s+/g, '')
    defaultPeerService.initHost(cleanPin, null, newPass).catch(() => {})
    showToast('🔑 New Remote Access Password generated!')
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

  // Connect to Remote Partner (Phone or PC)
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()
    setConnectError(null)

    const cleanId = partnerId.replace(/\s+/g, '').trim()
    if (!cleanId || cleanId.length < 5) {
      setConnectError('कृपया मान्य Partner ID दर्ज करें (कम से कम 5-6 अंक)।')
      return
    }

    if (!partnerPassword.trim()) {
      setConnectError('कृपया Partner Password दर्ज करें।')
      return
    }

    onRequireAuth(async () => {
      setIsConnecting(true)
      const targetLabel = deviceType === 'mobile' ? `${targetPlatform} Mobile` : 'Remote PC'
      setConnectingStep(`1. Connecting to ${targetLabel} (${cleanId})...`)
      showToast(`Connecting to ${targetLabel} (${cleanId})...`)

      try {
        defaultPeerService.setOnRemoteStream((stream) => {
          setIsConnecting(false)
          setConnectingStep('')

          onRemoteStreamReceived(stream, {
            name: `${targetLabel} (${cleanId})`,
            id: cleanId,
            isRemoteControl: true,
          })
          showToast(`🟢 Connected to ${targetLabel}! Full remote control active.`)
        })

        defaultPeerService.setOnConnectionState((state, detail) => {
          if (state === 'connecting') {
            setConnectingStep(detail || 'Verifying credentials with Partner...')
          } else if (state === 'error') {
            setIsConnecting(false)
            setConnectingStep('')
            setConnectError(detail || 'Could not connect. Please check Partner ID and Password.')
          } else if (state === 'disconnected') {
            setIsConnecting(false)
            setConnectingStep('')
          }
        })

        const dummyStream = createFallbackVideoStream(`LBM Operator (${targetPlatform})`)
        await defaultPeerService.connectToPartner(cleanId, partnerPassword, dummyStream)
      } catch (err: any) {
        setIsConnecting(false)
        setConnectingStep('')
        setConnectError(err.message || 'Connection failed. Please ensure the remote device has LBM open.')
      }
    }, 'कृपया रिमोट कंट्रोल शुरू करने के लिए लॉगिन करें।')
  }

  const cleanPin = (currentPin || hostId).replace(/\s+/g, '')
  const phoneControlUrl = `${getJoinUrl(cleanPin, currentSessionId)}&mode=controller`

  return (
    <section className="airplayer-card remote-control-card">
      <div className="card-top-header" onClick={onToggleExpand}>
        <div className="card-header-left">
          <span className="card-indicator-icon purple-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="3" />
              <path d="M6 12h4m-2-2v4" />
              <circle cx="15" cy="11" r="1" fill="currentColor" />
              <circle cx="18" cy="13" r="1" fill="currentColor" />
            </svg>
          </span>
          <div className="card-title-group">
            <h3 className="card-title-text">
              Remote Control (PC to Mobile &amp; Mobile to PC)
            </h3>
            <span className="platform-tag-pill">{targetPlatform}</span>
          </div>
          <span className="badge-remote-featured">ANY DISTANCE • ANY NETWORK • 60 FPS FULL CONTROL</span>
        </div>
        <button type="button" className="card-toggle-arrow">
          {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="card-inner-content remote-control-inner">
          <p className="highlight-subtitle-purple">
            बिना सेम वाई-फ़ाई की ज़रूरत के — चाहे आपका मोबाइल हज़ारों किलोमीटर दूर किसी भी इंटरनेट (4G / 5G / Wi-Fi / Hotspot) पर हो, ID और Password डालकर 100% स्मूथ 60 FPS फुल रिमोट कंट्रोल करें!
          </p>

          {/* ══════════════════════════════════════════════════════════════════
              2-COLUMN ULTRAVIEWER-STYLE GRID (Both visible at the same time)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="remote-ultra-grid">
            {/* ─── LEFT COLUMN: ALLOW REMOTE CONTROL (YOUR ID & PASSWORD) ─── */}
            <div className="remote-grid-card left-host-card">
              <div className="remote-card-header">
                <div className="card-title-with-icon">
                  <span className="column-icon-disc">📱➔💻</span>
                  <div>
                    <h4 className="column-title">Allow Remote Control (Your ID)</h4>
                    <p className="column-desc">
                      अपने {targetPlatform} मोबाइल में यह ID व Password डालें या QR कोड स्कैन करें ताकि आप मोबाइल से इस पूरे कंप्यूटर को कहीं से भी चला सकें:
                    </p>
                  </div>
                </div>
              </div>

              <div className="credential-boxes-stack">
                {/* Your ID */}
                <div className="credential-row-box">
                  <span className="cred-label">Your ID:</span>
                  <div className="cred-val-row">
                    <span className="cred-val-text large-id">{formatId(cleanPin)}</span>
                    <button
                      type="button"
                      className="copy-cred-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(cleanPin)
                        showToast('✓ PC ID Copied to clipboard!')
                      }}
                      title="Copy PC ID"
                    >
                      📋 Copy ID
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div className="credential-row-box">
                  <span className="cred-label">Password:</span>
                  <div className="cred-val-row">
                    <span className="cred-val-text passcode-text">{hostPassword}</span>
                    <div className="cred-btn-group">
                      <button
                        type="button"
                        className="copy-cred-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(hostPassword)
                          showToast('✓ Password Copied!')
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

              {/* Instant Connect QR Code & Link for Mobile */}
              <div className="mobile-qr-connect-strip">
                {qrDataUrl && (
                  <div className="qr-thumb-box">
                    <img src={qrDataUrl} alt="Scan to Remote Control PC" className="qr-thumb-img" />
                    <span className="qr-thumb-caption">📷 Mobile Camera QR</span>
                  </div>
                )}
                <div className="qr-details-box">
                  <span className="qr-connect-headline">⚡ Direct 1-Tap Mobile Link</span>
                  <p className="qr-connect-sub">
                    अपने {targetPlatform} फ़ोन के ब्राउज़र (Chrome / Safari) में यह लिंक खोलें या QR स्कैन करें। बिना टाइप किए तुरंत मोबाइल पर Windows डेस्कटॉप आ जाएगा:
                  </p>
                  <div className="qr-btn-row">
                    <button
                      type="button"
                      className="copy-link-small-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(phoneControlUrl)
                        showToast('✓ Mobile Controller Link Copied!')
                      }}
                    >
                      📋 Copy Mobile Link
                    </button>
                    <a
                      href={phoneControlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="test-link-small-btn"
                    >
                      👁️ Test in Browser
                    </a>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="remote-options-bar">
                <label className="remote-check-label">
                  <input
                    type="checkbox"
                    checked={allowInputControl}
                    onChange={(e) => setAllowInputControl(e.target.checked)}
                  />
                  <span>Allow Touch Mouse &amp; Keyboard Input</span>
                </label>
                <label className="remote-check-label">
                  <input
                    type="checkbox"
                    checked={fps60Mode}
                    onChange={(e) => setFps60Mode(e.target.checked)}
                  />
                  <span>60 FPS Zero-Lag Stream</span>
                </label>
              </div>

              <div className="host-status-indicator">
                <span className="status-dot solid-green" />
                <span className="status-text">
                  Ready for incoming mobile connection (Ultra Low Latency Active)
                </span>
              </div>
            </div>

            {/* ─── RIGHT COLUMN: CONTROL REMOTE DEVICE (PARTNER ID & PASSWORD) ─── */}
            <div className="remote-grid-card right-partner-card">
              <div className="remote-card-header">
                <div className="card-title-with-icon">
                  <span className="column-icon-disc">💻➔📱</span>
                  <div>
                    <h4 className="column-title">Control Remote Device (Partner ID)</h4>
                    <p className="column-desc">
                      जिस {targetPlatform} फ़ोन या कंप्यूटर को आप इस PC से कंट्रोल करना चाहते हैं, उसकी ID और Password यहाँ दर्ज करें:
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Device Type Selector */}
              <div className="device-type-pills">
                <button
                  type="button"
                  className={`device-pill-btn ${deviceType === 'mobile' ? 'active' : ''}`}
                  onClick={() => setDeviceType('mobile')}
                >
                  📱 Control {targetPlatform} Mobile Phone
                </button>
                <button
                  type="button"
                  className={`device-pill-btn ${deviceType === 'pc' ? 'active' : ''}`}
                  onClick={() => setDeviceType('pc')}
                >
                  💻 Control Another Remote PC
                </button>
              </div>

              <form onSubmit={handleConnect} className="partner-connect-form">
                {/* Partner ID Input */}
                <div className="input-group">
                  <label htmlFor={`partner-id-${targetPlatform}`} className="input-label">
                    Partner ID ({deviceType === 'mobile' ? `${targetPlatform} Phone ID` : 'Remote PC ID'}):
                  </label>
                  <input
                    id={`partner-id-${targetPlatform}`}
                    type="text"
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    placeholder="e.g. 839 201"
                    className="partner-text-input"
                    autoComplete="off"
                  />
                </div>

                {/* Password Input */}
                <div className="input-group">
                  <label htmlFor={`partner-pw-${targetPlatform}`} className="input-label">
                    Partner Password:
                  </label>
                  <div className="password-input-wrap">
                    <input
                      id={`partner-pw-${targetPlatform}`}
                      type={showPartnerPassword ? 'text' : 'password'}
                      value={partnerPassword}
                      onChange={(e) => setPartnerPassword(e.target.value)}
                      placeholder="Enter Partner Password"
                      className="partner-text-input"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="pw-toggle-icon-btn"
                      onClick={() => setShowPartnerPassword(!showPartnerPassword)}
                    >
                      {showPartnerPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Connecting Step / Error feedback */}
                {connectingStep && (
                  <div className="remote-step-banner">
                    <span className="spinner-icon">🔄</span>
                    <span>{connectingStep}</span>
                  </div>
                )}
                {connectError && (
                  <div className="remote-error-banner">
                    <span>⚠️ {connectError}</span>
                  </div>
                )}

                {/* Connect Button */}
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="connect-glow-btn"
                >
                  {isConnecting ? (
                    <>
                      <span className="spinner-icon">🔄</span>
                      <span>Connecting to {deviceType === 'mobile' ? `${targetPlatform} Phone` : 'Partner PC'}…</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-bolt-icon">⚡</span>
                      <span>Connect &amp; Full Control</span>
                    </>
                  )}
                </button>
              </form>

              {/* 3 Simple Steps */}
              <div className="partner-steps-card">
                <span className="steps-title">⚡ How to Connect in 3 Simple Steps:</span>
                <div className="steps-list">
                  <div className="step-item">
                    <span className="step-circle">1</span>
                    <div>
                      <strong>Open LBM on {targetPlatform}:</strong>
                      <p>अपने फ़ोन में LBM Mirror App खोलें या ऊपर दिए गए QR को स्कैन करें।</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-circle">2</span>
                    <div>
                      <strong>Get Partner ID &amp; Password:</strong>
                      <p>फ़ोन की स्क्रीन पर दिखाई देने वाली Partner ID और Password देखें।</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-circle">3</span>
                    <div>
                      <strong>Click Connect:</strong>
                      <p>यहाँ ID और Password लिखकर "Connect &amp; Full Control" दबाएं और 60 FPS पर कंट्रोल शुरू करें।</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="remote-features-pills-row">
                <span className="feat-pill">🖱️ Mouse &amp; Touch Emulation</span>
                <span className="feat-pill">⌨️ Full Keyboard</span>
                <span className="feat-pill">🚀 60 FPS Ultra-Fast</span>
                <span className="feat-pill">🔒 End-to-End Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

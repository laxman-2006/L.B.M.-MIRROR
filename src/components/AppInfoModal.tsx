import React, { useState } from 'react'
import logoImg from '../assets/logo.png'
import { useAppSettings } from '../context/AppSettingsContext'

interface AppInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenAdmin: () => void
}

export const AppInfoModal: React.FC<AppInfoModalProps> = ({ isOpen, onClose, onOpenAdmin }) => {
  const { settings } = useAppSettings()
  const [showPinInput, setShowPinInput] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault()
    const enteredPin = pin.trim()
    const expectedPin = settings.adminPin || '1229'

    if (enteredPin === expectedPin) {
      setError(null)
      setShowPinInput(false)
      setPin('')
      onOpenAdmin()
    } else {
      setError('गलत एडमिन पासवर्ड / PIN (Incorrect Admin PIN)')
    }
  }

  const activeLogo = settings.appLogo || logoImg

  return (
    <div className="auth-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="app-info-modal-card">
        <button
          type="button"
          className="download-close-btn"
          onClick={onClose}
          title="Close"
        >
          ✕
        </button>

        {/* Header Block */}
        <div className="app-info-header">
          <div className="app-info-brand">
            <div className="app-info-logo-wrap">
              <img
                src={activeLogo}
                alt={settings.appName}
                className="app-info-logo-img"
                onError={(e) => { ;(e.target as HTMLImageElement).src = logoImg }}
              />
            </div>
            <div>
              <div className="app-info-title-row">
                <h2 className="app-info-title">{settings.appName}</h2>
                <span className="app-info-version-pill">v1.0.0 PRO</span>
              </div>
              <p className="app-info-tagline">{settings.appTagline} • Ultra Fast 60 FPS</p>
            </div>
          </div>
        </div>

        {/* Body Description */}
        <div className="app-info-body">
          <div className="app-info-desc-box">
            <h4 className="app-info-sec-title">About LBM Mirror</h4>
            <p className="app-info-desc-text">
              <strong>{settings.appName}</strong> is an enterprise-grade, hardware-accelerated screen mirroring and remote control platform designed for ultra-low latency 60 FPS performance across Windows, Android, and iOS devices.
            </p>
            <p className="app-info-desc-text">
              Engineered with native Apple AirPlay Bonjour protocols, Android Scrcpy USB direct drivers, and serverless WebRTC cloud casting, it provides crystal-clear Full HD display with audio transmission.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="app-features-grid">
            <div className="app-feature-card">
              <span className="feature-icon">🍎</span>
              <div>
                <strong>Apple AirPlay 60 FPS</strong>
                <p>Native iOS Control Center wireless screen mirroring</p>
              </div>
            </div>

            <div className="app-feature-card">
              <span className="feature-icon">🤖</span>
              <div>
                <strong>Android Scrcpy USB</strong>
                <p>Zero-lag direct cable mirroring with touch control</p>
              </div>
            </div>

            <div className="app-feature-card">
              <span className="feature-icon">💻</span>
              <div>
                <strong>Windows UltraViewer</strong>
                <p>Direct PC-to-PC remote screen mirroring with ID &amp; PIN</p>
              </div>
            </div>

            <div className="app-feature-card">
              <span className="feature-icon">🌐</span>
              <div>
                <strong>WebRTC Cloud Cast</strong>
                <p>Instant browser mirroring without installing any software</p>
              </div>
            </div>
          </div>

          {/* Founder Credit */}
          <div className="app-info-founder-bar">
            <div className="founder-bar-left">
              <span className="founder-crown">👑</span>
              <div>
                <span className="founder-title-label">FOUNDER &amp; CEO</span>
                <strong className="founder-name-highlight">{settings.founderName || 'Laxman Choudhary'}</strong>
              </div>
            </div>
            <span className="founder-quote">"{settings.founderQuote || 'Ideas To A More Connected World'}"</span>
          </div>

          {/* Secret Admin Section */}
          <div className="secret-admin-portal-box">
            {!showPinInput ? (
              <div className="admin-trigger-row">
                <div className="admin-trigger-info">
                  <span className="admin-lock-icon">🔐</span>
                  <div>
                    <strong>Management &amp; Settings Portal</strong>
                    <p>Protected area to customize app branding, logo, contacts &amp; users.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="open-admin-portal-btn"
                  onClick={() => setShowPinInput(true)}
                >
                  ⚙️ Open Admin Panel
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyPin} className="admin-pin-form">
                <div className="admin-pin-header">
                  <span className="pin-prompt-label">Enter Admin Security PIN:</span>
                  <button
                    type="button"
                    className="cancel-pin-btn"
                    onClick={() => { setShowPinInput(false); setError(null); setPin('') }}
                  >
                    Cancel
                  </button>
                </div>
                <div className="pin-input-row">
                  <input
                    type="password"
                    maxLength={10}
                    autoFocus
                    placeholder="Enter Admin PIN (Default: 1229)"
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setError(null) }}
                    className="admin-pin-input"
                  />
                  <button type="submit" className="unlock-admin-btn">
                    Unlock &amp; Enter ➔
                  </button>
                </div>
                {error && <div className="admin-pin-error-alert">{error}</div>}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

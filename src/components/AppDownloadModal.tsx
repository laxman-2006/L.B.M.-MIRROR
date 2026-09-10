import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import logoImg from '../assets/logo.png'
import { useAppSettings } from '../context/AppSettingsContext'

interface AppDownloadModalProps {
  localIp: string
  currentPin?: string
  onClose: () => void
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  localIp,
  currentPin = '839201',
  onClose,
}) => {
  const { settings } = useAppSettings()
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  const isWeb = typeof window !== 'undefined' && !Boolean(window.electronAPI?.isElectron)
  
  // Clean, universal URLs that work both online on Vercel and locally
  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : 'https://l-b-m-mirror.vercel.app'
  const downloadUrl = isWeb
    ? `${origin}/?join=${currentPin}`
    : `http://${localIp && localIp !== '127.0.0.1' ? localIp : 'localhost'}:3001/download`

  const apkDownloadUrl = isWeb
    ? `${origin}/downloads/LBMMirror.apk`
    : `http://${localIp && localIp !== '127.0.0.1' ? localIp : 'localhost'}:3001/api/download/android`

  useEffect(() => {
    // Generate ISO standard QR code readable by any phone camera or Google Lens
    QRCode.toDataURL(downloadUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err))
  }, [downloadUrl])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(downloadUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeLogo = settings.appLogo || logoImg

  return (
    <div className="auth-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="download-modal-card">
        <button
          type="button"
          className="download-close-btn"
          onClick={onClose}
          title="Close"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="download-modal-header">
          <div className="download-brand-row">
            <div className="download-logo-circle">
              <img
                src={activeLogo}
                alt={settings.appName}
                className="download-logo-img"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = logoImg
                }}
              />
            </div>
            <div>
              <h2 className="download-modal-title">Connect &amp; Download {settings.appName}</h2>
              <p className="download-modal-subtitle">Scan QR code with Android / iPhone camera or download the APK</p>
            </div>
          </div>
        </div>

        <div className="download-modal-body">
          {/* QR Code Container */}
          <div className="download-qr-box">
            <div className="qr-wrapper real-qr">
              {qrDataUrl ? (
                <div className="qr-image-container">
                  <img src={qrDataUrl} alt="Scan QR Code" className="actual-qr-code" />
                  <div className="qr-center-logo">
                    <img src={activeLogo} alt="" onError={(e) => { ;(e.target as HTMLImageElement).src = logoImg }} />
                  </div>
                </div>
              ) : (
                <div className="qr-loading-box">Generating QR Code…</div>
              )}
            </div>
            <div className="qr-scan-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
              </svg>
              <span>Scan with phone camera to open instantly</span>
            </div>
          </div>

          {/* Download Instructions & Direct Link */}
          <div className="download-info-side">
            <div className="download-steps">
              <div className="step-item">
                <div className="step-num">1</div>
                <div className="step-content">
                  <strong>Scan QR Code on Phone</strong>
                  <p>Point camera at the QR code to open the LBM Web Cast screen in your phone browser.</p>
                </div>
              </div>

              <div className="step-item">
                <div className="step-num">2</div>
                <div className="step-content">
                  <strong>Zero Install Screen Mirroring</strong>
                  <p>No app install needed! Just tap <strong>"Cast Screen"</strong> in your phone browser.</p>
                </div>
              </div>

              <div className="step-item">
                <div className="step-num">3</div>
                <div className="step-content">
                  <strong>Ultra-Fast 60 FPS Video</strong>
                  <p>Direct low-latency WebRTC connection to this PC.</p>
                </div>
              </div>
            </div>

            {/* Direct Link Box */}
            <div className="download-link-box">
              <label htmlFor="app-url-input">Direct Mobile Connection Link (PIN: {currentPin}):</label>
              <div className="url-copy-row">
                <input
                  id="app-url-input"
                  type="text"
                  readOnly
                  value={downloadUrl}
                  className="download-url-field"
                />
                <button
                  type="button"
                  className={`copy-url-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopyLink}
                >
                  {copied ? '✓ Copied' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="download-actions-row">
              <a
                href={apkDownloadUrl}
                download="LBMMirror.apk"
                className="direct-apk-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Download LBMMirror.apk (Android)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

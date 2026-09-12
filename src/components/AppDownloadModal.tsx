import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import logoImg from '../assets/logo.png'
import { useAppSettings } from '../context/AppSettingsContext'
import { triggerDirectExeDownload } from '../utils/directDownload'

interface AppDownloadModalProps {
  localIp: string
  currentPin?: string
  initialTab?: 'windows' | 'android' | 'usb' | 'cloud'
  onClose: () => void
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  localIp,
  currentPin = '839201',
  initialTab = 'windows',
  onClose,
}) => {
  const { settings } = useAppSettings()
  const [activeTab, setActiveTab] = useState<'windows' | 'android' | 'usb' | 'cloud'>(initialTab)
  const [copied, setCopied] = useState(false)
  const [copiedWindows, setCopiedWindows] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [usbDevices, setUsbDevices] = useState<any[]>([])
  const [isInstallingUsb, setIsInstallingUsb] = useState(false)
  const [usbInstallStatus, setUsbInstallStatus] = useState<string | null>(null)

  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)
  const activeIp = localIp && localIp !== '127.0.0.1' ? localIp : 'localhost'

  // Query USB devices on mount if inside Electron
  useEffect(() => {
    if (isElectron && window.electronAPI?.adb) {
      window.electronAPI.adb.getDevices().then((devs) => {
        setUsbDevices(devs || [])
      }).catch(() => {})
    }
  }, [isElectron])

  // Download URLs
  const downloadUrl = `http://${activeIp}:3001/download?pin=${currentPin}`
  const apkDownloadUrl = `http://${activeIp}:3001/api/download/android`
  const cloudUrl = `https://l-b-m-mirror.vercel.app/?join=${currentPin}&mode=sender`
  const windowsDirectUrl = `http://${activeIp}:3001/api/download/windows`
  const windowsShareLink = 'https://l-b-m-mirror.vercel.app/?download=direct'

  const activeQrTarget = activeTab === 'cloud' ? cloudUrl : downloadUrl

  useEffect(() => {
    if (activeTab === 'android' || activeTab === 'cloud') {
      QRCode.toDataURL(activeQrTarget, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err))
    }
  }, [activeQrTarget, activeTab])

  const handleCopyLink = (textToCopy: string, isWin = false) => {
    navigator.clipboard.writeText(textToCopy)
    if (isWin) {
      setCopiedWindows(true)
      setTimeout(() => setCopiedWindows(false), 2000)
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadWindows = () => {
    // Immediate direct .exe download straight into user's Downloads folder
    triggerDirectExeDownload('LBM_Mirror_Setup.exe', windowsDirectUrl)
  }

  const handle1ClickUsbInstall = async () => {
    if (!window.electronAPI?.adb) {
      setUsbInstallStatus('⚠️ USB Direct Install requires Windows Desktop App.')
      return
    }

    setIsInstallingUsb(true)
    setUsbInstallStatus('⏳ Installing LBMMirror.apk to connected phone via USB...')

    try {
      const devs = await window.electronAPI.adb.getDevices()
      if (!devs || devs.length === 0) {
        setUsbInstallStatus('⚠️ No USB phone detected. Plug in USB cable and enable USB Debugging.')
        setIsInstallingUsb(false)
        return
      }

      const targetSerial = devs[0].serial
      const res = await window.electronAPI.adb.installApk(targetSerial)
      if (res.success) {
        setUsbInstallStatus(`✅ ${res.message || 'App installed successfully on your phone!'}`)
      } else {
        setUsbInstallStatus(`⚠️ ${res.error || 'Failed to install APK.'}`)
      }
    } catch (err: any) {
      setUsbInstallStatus(`⚠️ Error: ${err.message || 'Install failed'}`)
    } finally {
      setIsInstallingUsb(false)
    }
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
              <h2 className="download-modal-title">Download {settings.appName}</h2>
              <p className="download-modal-subtitle">
                Official Windows Desktop App, Android APK &amp; Zero-Install Cloud Web App
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="download-tabs-row">
            <button
              type="button"
              className={`dl-tab-btn ${activeTab === 'windows' ? 'active' : ''}`}
              onClick={() => setActiveTab('windows')}
            >
              💻 Download to Windows
            </button>
            <button
              type="button"
              className={`dl-tab-btn ${activeTab === 'android' ? 'active' : ''}`}
              onClick={() => setActiveTab('android')}
            >
              📱 Android APK / QR
            </button>
            <button
              type="button"
              className={`dl-tab-btn ${activeTab === 'usb' ? 'active' : ''}`}
              onClick={() => setActiveTab('usb')}
            >
              🔌 1-Click USB Install
            </button>
            <button
              type="button"
              className={`dl-tab-btn ${activeTab === 'cloud' ? 'active' : ''}`}
              onClick={() => setActiveTab('cloud')}
            >
              🌐 Web App (No Install)
            </button>
          </div>
        </div>

        <div className="download-modal-body">
          {/* ═══════════════ TAB 1: DOWNLOAD TO WINDOWS ═══════════════ */}
          {activeTab === 'windows' && (
            <div className="download-windows-container">
              <div className="windows-dl-card">
                <div className="windows-icon-header">
                  <div className="win-badge-icon-box">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.8"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="win-dl-title">Download to Windows</h3>
                    <p className="win-dl-sub">
                      Official 64-bit Desktop Setup for Windows 10 &amp; 11 • Remote Control (60 FPS)
                    </p>
                    <div className="win-spec-tags">
                      <span className="spec-tag">✓ Windows 10 / 11 (64-bit)</span>
                      <span className="spec-tag">✓ v1.0.0 Latest</span>
                      <span className="spec-tag">✓ Any Network / Worldwide</span>
                    </div>
                  </div>
                </div>

                {/* Big Glowing Primary Download Button */}
                <div className="win-primary-action">
                  <button
                    type="button"
                    className="win-mega-download-btn"
                    onClick={handleDownloadWindows}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.8"/>
                    </svg>
                    <div className="btn-label-group">
                      <span className="btn-main-text">Download to Windows</span>
                      <span className="btn-sub-text">LBM Mirror Setup 1.0.0.exe (Direct Download)</span>
                    </div>
                    <span className="btn-download-arrow">⬇️</span>
                  </button>
                </div>

                {/* Shareable Link Box */}
                <div className="win-share-link-box">
                  <div className="share-label-row">
                    <span>📲 Share Link on WhatsApp / Telegram / Instagram:</span>
                  </div>
                  <div className="share-input-row">
                    <input
                      type="text"
                      readOnly
                      value={windowsShareLink}
                      className="win-share-url-field"
                    />
                    <button
                      type="button"
                      className={`copy-share-btn ${copiedWindows ? 'copied' : ''}`}
                      onClick={() => handleCopyLink(windowsShareLink, true)}
                    >
                      {copiedWindows ? '✓ Link Copied' : '📋 Copy Link'}
                    </button>
                  </div>
                  <p className="share-hint">
                    यह लिंक किसी को भी WhatsApp पर भेजें। वो इस लिंक पर क्लिक करके सीधे Chrome से 1-क्लिक में डाउनलोड कर सकेंगे।
                  </p>
                </div>

                {/* 3 Step Install Guide */}
                <div className="win-install-steps">
                  <h4 className="steps-heading">आसान 3 स्टेप में चालू करें (Quick Setup):</h4>
                  <div className="win-steps-grid">
                    <div className="win-step-card">
                      <span className="step-badge">1</span>
                      <strong>Download</strong>
                      <p>ऊपर "Download to Windows" बटन दबाएं और फ़ाइल सेव करें।</p>
                    </div>
                    <div className="win-step-card">
                      <span className="step-badge">2</span>
                      <strong>Install</strong>
                      <p>फ़ाइल पर डबल-क्लिक करके "Install" दबाएं (10 सेकंड में इंस्टॉल)।</p>
                    </div>
                    <div className="win-step-card">
                      <span className="step-badge">3</span>
                      <strong>Control</strong>
                      <p>ऐप खोलें और Partner ID डालकर UltraViewer की तरह स्क्रीन चलाएं!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ TAB 2: ANDROID APK & QR ═══════════════ */}
          {activeTab === 'android' && (
            <div className="download-two-column-layout">
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
                  <span>📱 Scan with Mobile Camera to Download APK</span>
                </div>
              </div>

              <div className="download-info-side">
                <div className="download-steps">
                  <div className="step-item">
                    <div className="step-num">1</div>
                    <div className="step-content">
                      <strong>Scan QR Code or Tap Download</strong>
                      <p>Point phone camera at QR code or click the button below.</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <div className="step-num">2</div>
                    <div className="step-content">
                      <strong>Install LBMMirror.apk</strong>
                      <p>If "File might be harmful" appears, tap <strong>Download anyway</strong>.</p>
                    </div>
                  </div>
                </div>

                <div className="download-actions-row">
                  <a
                    href={apkDownloadUrl}
                    download="LBMMirror.apk"
                    className="primary-action-btn"
                  >
                    <span>📥 Download LBMMirror.apk (Android)</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ TAB 3: USB DIRECT INSTALL ═══════════════ */}
          {activeTab === 'usb' && (
            <div className="usb-install-pane">
              <div className="usb-instructions-box">
                <h3 className="usb-pane-title">🔌 1-Click USB Direct Install to Phone</h3>
                <p className="usb-pane-sub">
                  फोन को USB केबल से कंप्यूटर से जोड़ें और बिना किसी डाउनलोड के सीधे 1-क्लिक में ऐप इंस्टॉल करें।
                </p>

                <div className="usb-device-detect-bar">
                  <div className="detect-status-indicator">
                    <span className={`status-bubble ${usbDevices.length > 0 ? 'online' : 'searching'}`} />
                    <span>
                      {usbDevices.length > 0
                        ? `Phone Connected: ${usbDevices[0].model || usbDevices[0].serial}`
                        : 'No phone detected over USB (Plug in cable and enable USB Debugging)'}
                    </span>
                  </div>
                </div>

                <div className="usb-action-wrapper">
                  <button
                    type="button"
                    className="usb-mega-install-btn"
                    onClick={handle1ClickUsbInstall}
                    disabled={isInstallingUsb || usbDevices.length === 0}
                  >
                    {isInstallingUsb ? '⏳ Installing to phone...' : '⚡ Install App to Phone via USB'}
                  </button>
                </div>

                {usbInstallStatus && (
                  <div className="usb-status-alert">
                    <span>{usbInstallStatus}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ TAB 4: WEB APP (NO INSTALL) ═══════════════ */}
          {activeTab === 'cloud' && (
            <div className="cloud-tab-pane">
              <div className="cloud-hero-box">
                <span className="cloud-big-icon">🌐</span>
                <h3>LBM Mirror Online Web App</h3>
                <p>
                  बिना कोई सॉफ़्टवेयर या ऐप इंस्टॉल किए सीधे Google Chrome या Edge ब्राउज़र में स्क्रीन शेयरिंग और रिमोट कंट्रोल चलाएं।
                </p>
                <div className="cloud-url-container">
                  <input
                    type="text"
                    readOnly
                    value="https://l-b-m-mirror.vercel.app"
                    className="cloud-url-field"
                  />
                  <button
                    type="button"
                    className="copy-cloud-url-btn"
                    onClick={() => handleCopyLink('https://l-b-m-mirror.vercel.app')}
                  >
                    {copied ? '✓ Copied' : '📋 Copy Link'}
                  </button>
                </div>
                <a
                  href="https://l-b-m-mirror.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cloud-launch-btn"
                >
                  🚀 Open Web App in New Tab
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

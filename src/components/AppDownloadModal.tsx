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
  const [activeTab, setActiveTab] = useState<'wifi' | 'usb' | 'cloud'>('wifi')

  // Resolved clean LAN IP (Never fallback to unroutable 169.254.x.x)
  const initialValidIp =
    localIp && !localIp.startsWith('169.254.') && localIp !== '127.0.0.1' && localIp !== 'localhost'
      ? localIp
      : '192.168.137.218'

  const [activeIp, setActiveIp] = useState<string>(initialValidIp)
  const [isInstallingUsb, setIsInstallingUsb] = useState<boolean>(false)
  const [usbInstallStatus, setUsbInstallStatus] = useState<string | null>(null)
  const [usbDevices, setUsbDevices] = useState<any[]>([])

  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)

  // Fetch true server network info on modal mount
  useEffect(() => {
    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.ip && !data.ip.startsWith('169.254.')) {
          setActiveIp(data.ip)
        }
      })
      .catch(() => {})

    if (isElectron && window.electronAPI?.adb) {
      window.electronAPI.adb.getDevices().then((devs) => {
        setUsbDevices(devs || [])
      }).catch(() => {})
    }
  }, [isElectron])

  // Download URL pointing to the real reachable Wi-Fi IP
  const downloadUrl = `http://${activeIp}:3001/download?pin=${currentPin}`
  const apkDownloadUrl = `http://${activeIp}:3001/api/download/android`
  const cloudUrl = `https://l-b-m-mirror.vercel.app/?join=${currentPin}&mode=sender`

  const activeQrTarget = activeTab === 'cloud' ? cloudUrl : downloadUrl

  useEffect(() => {
    QRCode.toDataURL(activeQrTarget, {
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
  }, [activeQrTarget])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeQrTarget)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
              <h2 className="download-modal-title">Connect &amp; Download {settings.appName}</h2>
              <p className="download-modal-subtitle">
                Scan QR Code with your phone camera or install directly via USB cable
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="download-tabs-row">
            <button
              type="button"
              className={`dl-tab-btn ${activeTab === 'wifi' ? 'active' : ''}`}
              onClick={() => setActiveTab('wifi')}
            >
              📶 Local Wi-Fi QR
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
              🌐 Online Cloud Link
            </button>
          </div>
        </div>

        <div className="download-modal-body">
          {/* TAB 1 & 3: QR CODE VIEW */}
          {activeTab !== 'usb' ? (
            <>
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
                  <span>
                    {activeTab === 'cloud'
                      ? 'Scan with phone camera to open in browser (Any Network)'
                      : 'Scan with phone camera to open download page (Wi-Fi)'}
                  </span>
                </div>
              </div>

              {/* Download Instructions & Direct Link */}
              <div className="download-info-side">
                <div className="download-steps">
                  <div className="step-item">
                    <div className="step-num">1</div>
                    <div className="step-content">
                      <strong>Scan QR Code on Phone</strong>
                      <p>Point phone camera or Google Lens at the QR code to open the link directly on your mobile.</p>
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-num">2</div>
                    <div className="step-content">
                      <strong>Tap "Download LBMMirror.apk"</strong>
                      <p>If "File might be harmful" prompt appears, tap <strong>Download anyway</strong>.</p>
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-num">3</div>
                    <div className="step-content">
                      <strong>Zero-Install Web Cast Option</strong>
                      <p>Or tap <strong>"Cast Directly in Browser"</strong> to mirror screen with zero install!</p>
                    </div>
                  </div>
                </div>

                {/* Direct Link Box with IP Editor */}
                <div className="download-link-box">
                  <div className="url-label-row">
                    <label htmlFor="app-url-input">
                      {activeTab === 'cloud' ? 'Cloud Link (Any Network):' : `Local Wi-Fi Link (PC IP: ${activeIp}):`}
                    </label>
                  </div>
                  <div className="url-copy-row">
                    <input
                      id="app-url-input"
                      type="text"
                      readOnly
                      value={activeQrTarget}
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
                    <span>Download LBMMirror.apk (61 MB)</span>
                  </a>
                </div>
              </div>
            </>
          ) : (
            /* TAB 2: USB DIRECT 1-CLICK INSTALL */
            <div className="usb-direct-install-container">
              <div className="usb-install-hero">
                <span className="usb-hero-icon">⚡</span>
                <h3>1-Click Direct Install via USB Cable</h3>
                <p>
                  Scan karne ya mobile me download karne ki koi zaroorat nahi hai! Phone ko USB cable se jodein aur 1-click me app install karein.
                </p>
              </div>

              <div className="usb-device-check-card">
                <label>Detected USB Phone:</label>
                {usbDevices.length > 0 ? (
                  <div className="detected-phone-badge">
                    <span>📱 {usbDevices[0].model || usbDevices[0].serial} ({usbDevices[0].status})</span>
                  </div>
                ) : (
                  <div className="no-phone-warning">
                    <span>⚠️ No phone detected. Please plug in USB cable and enable USB Debugging.</span>
                  </div>
                )}

                <button
                  type="button"
                  className="usb-install-action-btn"
                  onClick={handle1ClickUsbInstall}
                  disabled={isInstallingUsb}
                >
                  {isInstallingUsb ? '⏳ Installing to phone…' : '📲 Install LBMMirror.apk Directly to Phone via USB'}
                </button>

                {usbInstallStatus && (
                  <div className="usb-status-alert">
                    <span>{usbInstallStatus}</span>
                  </div>
                )}
              </div>

              <div className="usb-steps-mini">
                <div className="step-mini-row">
                  <span className="mini-num">1</span>
                  <span>Connect phone to PC with USB Cable.</span>
                </div>
                <div className="step-mini-row">
                  <span className="mini-num">2</span>
                  <span>Turn ON <strong>USB Debugging</strong> in Developer Options.</span>
                </div>
                <div className="step-mini-row">
                  <span className="mini-num">3</span>
                  <span>Tap "Allow" on phone screen and click Install above!</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

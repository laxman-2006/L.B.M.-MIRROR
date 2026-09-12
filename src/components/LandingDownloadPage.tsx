import React, { useState } from 'react'
import logoImg from '../assets/logo.png'
import { useAppSettings } from '../context/AppSettingsContext'
import { triggerDirectExeDownload } from '../utils/directDownload'
import './LandingDownloadPage.css'

interface LandingDownloadPageProps {
  onOpenApp: () => void
}

const FEATURES_24 = [
  { icon: '⚡', tag: '60 FPS', title: '60 FPS Ultra-Fast Engine', desc: 'Hardware-accelerated pipeline with less than 15ms latency for lag-free real-time mirroring.' },
  { icon: '🖥️', tag: '4K RETINA', title: '4K Ultra HD Display', desc: 'Crisp, pixel-perfect rendering with adaptive bitrate and high dynamic range color fidelity.' },
  { icon: '🖱️', tag: 'REMOTE CONTROL', title: 'AnyDesk & UltraViewer Control', desc: 'Full mouse click, drag, scroll, and keyboard input across distant PCs anywhere in the world.' },
  { icon: '🔊', tag: 'SYNC AUDIO', title: 'Bi-Directional Sound Loopback', desc: 'Zero-latency system audio and microphone passthrough with studio-grade clarity.' },
  { icon: '🔌', tag: 'NO WI-FI', title: 'Plug & Play USB Mirroring', desc: 'Connect Android directly via Type-C USB cable for instant 60 FPS video with zero Wi-Fi required.' },
  { icon: '📡', tag: 'AIRPLAY 2', title: 'Native Apple AirPlay Receiver', desc: 'Zero-install screen mirroring for iPhone, iPad, and Mac using native Bonjour broadcast protocols.' },
  { icon: '🌐', tag: 'GLOBAL P2P', title: 'Worldwide Internet Connection', desc: 'Connect computers across different cities and ISPs (Jio, Airtel, Vodafone, 5G) via STUN/TURN relays.' },
  { icon: '📋', tag: 'CLIPBOARD', title: 'Instant Clipboard Sync', desc: 'Copy text on one computer or phone and paste immediately on the connected remote machine.' },
  { icon: '🎮', tag: 'GAMING', title: 'Mobile Game Keymapping', desc: 'Play PUBG, Free Fire, and COD Mobile on your PC with customizable keyboard and mouse controls.' },
  { icon: '📊', tag: 'EXPANSION', title: 'Second Screen Desktop Mode', desc: 'Transform your tablet or smartphone into a secondary extended monitor for multi-tasking.' },
  { icon: '📁', tag: '31 SUITES', title: 'Enterprise Document Viewer', desc: 'Full 31-section document suite for PDFs, Word, Excel, CAD, and images with audit trails and stamps.' },
  { icon: '🔒', tag: 'ENCRYPTED', title: 'End-to-End AES-256 Security', desc: 'Bank-grade encryption ensures your screen sessions and file transfers remain 100% private.' },
  { icon: '🛡️', tag: 'CLEAN INSTALL', title: 'Zero Admin Permissions Needed', desc: 'Installs safely to user directory without triggering annoying UAC prompts or firewall blocks.' },
  { icon: '📱', tag: '1-CLICK QR', title: 'Instant QR Code Pairing', desc: 'Scan the screen QR code with your mobile camera to begin casting in under 2 seconds.' },
  { icon: '🚀', tag: 'LOW CPU', title: 'Ultra-Lightweight Performance', desc: 'Consumes less than 1% CPU and 45MB RAM using native GPU hardware decoding.' },
  { icon: '⌨️', tag: 'SYS KEYS', title: 'Remote System Shortcuts', desc: 'Send Ctrl+Alt+Del, Windows Key, Task Manager, and Alt+Tab directly to the remote computer.' },
  { icon: '💬', tag: 'LIVE CHAT', title: 'Integrated Operator Chat', desc: 'Text back and forth with remote partners during active mirror and support sessions.' },
  { icon: '🔄', tag: 'AUTO HEAL', title: 'Automatic Network Reconnect', desc: 'Seamlessly recovers from Wi-Fi hiccups and network switches without dropping session state.' },
  { icon: '🎥', tag: 'RECORDING', title: '60 FPS Screen Recording', desc: 'Capture high-definition MP4 videos and screenshots of your mirror stream with 1 click.' },
  { icon: '💻', tag: 'CROSS PLATFORM', title: 'Windows, Android, iOS & Web', desc: 'One universal app running seamlessly across desktop, mobile, and modern browsers.' },
  { icon: '🏢', tag: 'MULTI CAST', title: '4-Device Simultaneous Mirror', desc: 'Connect and view multiple smartphones or computers simultaneously on one dashboard.' },
  { icon: '⚡', tag: 'GPU ACCEL', title: 'Hardware NVENC / QuickSync', desc: 'Direct silicon integration with NVIDIA, Intel, and AMD graphic chipsets for zero stutter.' },
  { icon: '📴', tag: 'SCREEN OFF', title: 'Screen-Off Battery Saver', desc: 'Keep phone screen turned off while streaming full 60 FPS to your PC to prevent overheating.' },
  { icon: '🌟', tag: 'FOUNDER CARE', title: '24/7 Founder & CEO Support', desc: 'Direct support and active development driven by Founder & CEO Laxman Choudhary.' },
]

export const LandingDownloadPage: React.FC<LandingDownloadPageProps> = ({ onOpenApp }) => {
  const { settings } = useAppSettings()
  const [copiedLink, setCopiedLink] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activeDemoTab, setActiveDemoTab] = useState<'mobile' | 'pc' | 'apple'>('mobile')

  const activeLogo = settings.appLogo || logoImg
  const shareableDownloadLink = 'https://l-b-m-mirror.vercel.app/?download=direct'

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableDownloadLink)
    setCopiedLink(true)
    showToast('📋 Direct download link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleDownload = () => {
    showToast('🚀 Downloading Setup (.EXE) directly to your Downloads folder...')
    triggerDirectExeDownload('LBM_Mirror_Setup.exe')
  }

  const whatsappShareText = encodeURIComponent(
    `🚀 Download LBM Mirror Setup (.EXE) - Free 60 FPS Screen Mirroring & UltraViewer Remote Desktop for Windows:\n${shareableDownloadLink}`
  )

  return (
    <div className="landing-page-container">
      <div className="landing-bg-glow-1" />
      <div className="landing-bg-glow-2" />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #38bdf8',
            color: '#f8fafc',
            padding: '10px 24px',
            borderRadius: 30,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            fontSize: '0.9rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ─── 1. Top Header Navigation Bar (3u.com style) ─── */}
      <header className="landing-nav-bar">
        <div className="landing-brand" onClick={onOpenApp}>
          <img
            src={activeLogo}
            alt={settings.appName}
            className="landing-brand-logo"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = logoImg
            }}
          />
          <div className="landing-brand-text">
            <h1>{settings.appName}</h1>
            <span>Official Client • 60 FPS Mirror</span>
          </div>
        </div>

        <nav className="landing-nav-links">
          <a href="#hero" className="landing-nav-link active">
            Home
          </a>
          <a href="#windows" className="landing-nav-link">
            UltraViewer PC
          </a>
          <a href="#ios" className="landing-nav-link">
            iOS AirPlay
          </a>
          <a href="#android" className="landing-nav-link">
            Android USB
          </a>
          <a href="#viewer" className="landing-nav-link">
            Viewer Suite
          </a>
          <a href="#guides" className="landing-nav-link">
            Tutorials
          </a>
        </nav>

        <div className="landing-nav-actions">
          <button type="button" className="btn-launch-web" onClick={onOpenApp} title="Open in Browser without Installing">
            <span>🌐 Open Web App</span>
          </button>
          <button type="button" className="btn-header-download" onClick={handleDownload} title="Directly Download Complete Windows Setup .exe to Downloads folder">
            <span>⬇️ DOWNLOAD SETUP (.EXE)</span>
          </button>
        </div>
      </header>

      {/* ─── 2. Hero Section (3u.com Style) ─── */}
      <section className="landing-hero" id="hero">
        <div className="landing-hero-left">
          <div className="landing-pill-tag">
            <span>★</span>
            <span>Windows 11 / 10 / 8 / 7 • 64-Bit Desktop Release (v1.2.0)</span>
          </div>

          <h2 className="hero-title-main">
            New Verification Report
            <span className="hero-title-highlight">New Flashing Experience</span>
          </h2>

          <p className="hero-subtitle">
            <strong>Smarter, More Comprehensive &amp; Zero-Lag:</strong> LBM Mirror PC Client Redesigned:
            Control any remote Windows PC across any network (UltraViewer Mode), mirror iPhone with Apple AirPlay 60 FPS,
            and connect Android via high-speed direct USB cable.
          </p>

          <div className="hero-cta-row">
            <button type="button" className="hero-download-pill-btn" onClick={handleDownload}>
              <span>⬇️ Download for Windows</span>
            </button>

            <button type="button" className="hero-secondary-cta" onClick={onOpenApp}>
              <span>🌐 Launch Web App (Instant)</span>
            </button>
          </div>

          <div className="hero-specs-row">
            <span>✓ Zero Lag (60 FPS)</span>
            <span>•</span>
            <span>✓ Same Wi-Fi Not Required for Remote PC</span>
            <span>•</span>
            <span>✓ 100% Free &amp; Safe</span>
          </div>
        </div>

        {/* Hero Right: 3D Isometric Glass Cards (Inspired by 3u.com) */}
        <div className="landing-hero-right">
          <div className="isometric-board-container">
            <div className="iso-main-base-card">
              <div className="iso-header-badge">
                <div className="iso-brand-pill">
                  <span>📱</span>
                  <span>LBM Mirror PC Client</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>● 60 FPS LIVE</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>REMOTE CONTROL</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>UltraViewer Active</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>LATENCY</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#4ade80' }}>&lt; 15 ms (Direct)</div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>Hardware Acceleration: ON</span>
                <span>Version 1.2.0 PRO</span>
              </div>
            </div>

            {/* Floating 3D Pills */}
            <div className="iso-floating-card-1">
              <span style={{ fontSize: '1.2rem' }}>⭐</span>
              <div>
                <strong style={{ fontSize: '0.8rem', display: 'block', color: '#fff' }}>Device Verification</strong>
                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800 }}>100 ★★★★★</span>
              </div>
            </div>

            <div className="iso-floating-card-2">
              <span style={{ fontSize: '1.2rem' }}>💻</span>
              <div>
                <strong style={{ fontSize: '0.8rem', display: 'block', color: '#fff' }}>Windows Remote PC</strong>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>UltraViewer Connected</span>
              </div>
            </div>

            <div className="iso-floating-card-3">
              <span style={{ fontSize: '1.2rem' }}>📁</span>
              <div>
                <strong style={{ fontSize: '0.8rem', display: 'block', color: '#fff' }}>Enterprise Viewer</strong>
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>31 Feature Suite</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. WhatsApp & Telegram 1-Click Share Box ─── */}
      <section className="landing-share-bar">
        <div className="share-bar-left">
          <div className="whatsapp-icon-circle">💬</div>
          <div className="share-bar-text">
            <h3>Send this Download Link to Another Computer via WhatsApp</h3>
            <p>Share with remote operators or friends to connect their PC with 1 click across any distance.</p>
          </div>
        </div>

        <div className="share-bar-actions">
          <a
            href={`https://api.whatsapp.com/send?text=${whatsappShareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp-share"
          >
            <span>📲 Send via WhatsApp</span>
          </a>

          <button type="button" className="btn-copy-share-link" onClick={handleCopyLink}>
            <span>{copiedLink ? '✓ Copied Link' : '📋 Copy Direct Link'}</span>
          </button>
        </div>
      </section>

      {/* ─── 4. 3D Interactive Device Mirroring Animation Stage (User Requirement) ─── */}
      <section className="landing-3d-showcase-section">
        <div className="showcase-header">
          <div className="showcase-badge-pill">
            <span>✨</span>
            <span>Real-Time 3D Technology Showcase</span>
          </div>
          <h2 className="showcase-title">See How Screen Mirroring Works in Real Time</h2>
          <p className="showcase-subtitle">
            Zero-lag, 60 frames per second transmission powered by hardware-accelerated WebRTC and native direct ADB/AirPlay protocols.
          </p>

          <div className="showcase-tab-bar">
            <button
              type="button"
              className={`showcase-tab-btn ${activeDemoTab === 'mobile' ? 'active' : ''}`}
              onClick={() => setActiveDemoTab('mobile')}
            >
              <span>📱 Mobile ➔ PC 60 FPS Wi-Fi Beam</span>
            </button>
            <button
              type="button"
              className={`showcase-tab-btn ${activeDemoTab === 'pc' ? 'active' : ''}`}
              onClick={() => setActiveDemoTab('pc')}
            >
              <span>💻 PC ➔ PC Remote Desktop (AnyDesk &amp; UltraViewer)</span>
            </button>
            <button
              type="button"
              className={`showcase-tab-btn ${activeDemoTab === 'apple' ? 'active' : ''}`}
              onClick={() => setActiveDemoTab('apple')}
            >
              <span>🍎 iPhone ➔ PC AirPlay &amp; USB</span>
            </button>
          </div>
        </div>

        {/* 3D Visual Stage */}
        <div className="interactive-3d-stage">
          {/* Left Device: Smartphone or PC 1 */}
          <div className="phone-3d-wrapper">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div className="phone-live-content">
                <div className="game-cube-anim" />
                <div style={{ marginTop: 16, fontSize: '0.78rem', fontWeight: 800, textAlign: 'center' }}>
                  {activeDemoTab === 'mobile' && '📱 Android Gaming'}
                  {activeDemoTab === 'pc' && '💻 Remote Host PC'}
                  {activeDemoTab === 'apple' && '🍎 iPhone 15 Pro'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: 4 }}>
                  60 FPS • LIVE STREAM
                </div>
              </div>
            </div>
          </div>

          {/* Center: Wireless Signal Bridge / Cyber Laser Beam */}
          <div className="wireless-signal-bridge">
            <div className="beam-line-wrapper">
              <div className="beam-pulse-particle" />
            </div>
            <div className="signal-hud-tag">
              <div className="wifi-wave-icon" />
              <span>
                {activeDemoTab === 'mobile' && 'Wi-Fi 6 & 5G • 12ms Latency • 60 FPS'}
                {activeDemoTab === 'pc' && 'Global P2P Tunnel • Full Remote Control'}
                {activeDemoTab === 'apple' && 'Apple AirPlay 2 • Lossless Audio'}
              </span>
            </div>
          </div>

          {/* Right Device: 3D Monitor / Screen */}
          <div className="monitor-3d-wrapper">
            <div className="monitor-screen">
              <div className="monitor-top-bar">
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>● LBM Mirror Desktop 60 FPS</span>
                <span style={{ color: '#94a3b8' }}>1920 × 1080 @ 60 Hz</span>
              </div>
              <div className="monitor-live-mirror">
                <div className="game-cube-anim" />
                <div className="mirror-hud-overlay">
                  🟢 60 FPS • BITRATE: 16 MBPS
                </div>
                {activeDemoTab === 'pc' && <div className="remote-cursor-pointer" />}
                <div style={{ marginTop: 16, fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>
                  {activeDemoTab === 'mobile' && '🖥️ PC Mirror Active (Zero Delay)'}
                  {activeDemoTab === 'pc' && '🖱️ Active Remote Mouse & Keyboard Control'}
                  {activeDemoTab === 'apple' && '📺 AirPlay Full HD Mirroring'}
                </div>
              </div>
            </div>
            <div className="monitor-stand" />
            <div className="monitor-base" />
          </div>
        </div>
      </section>

      {/* ─── 5. 24-Feature Extensive Gallery Grid (User Requirement) ─── */}
      <section className="features-24-section">
        <div className="showcase-header">
          <div className="showcase-badge-pill">
            <span>⚡</span>
            <span>24 Advanced System Features</span>
          </div>
          <h2 className="showcase-title">The Complete Next-Gen Mirroring &amp; Remote Desktop Suite</h2>
          <p className="showcase-subtitle">
            Engineered from the ground up for gaming, remote IT support, live presentations, and business collaboration.
          </p>
        </div>

        <div className="features-24-grid">
          {FEATURES_24.map((feat, index) => (
            <div key={index} className="feat-24-card">
              <div className="feat-card-top">
                <div className="feat-icon-bubble">{feat.icon}</div>
                <span className="feat-tag-mini">{feat.tag}</span>
              </div>
              <h4 className="feat-card-title">{feat.title}</h4>
              <p className="feat-card-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 6. Founder & CEO Grand Executive Showcase (Photo Requested by User) ─── */}
      <section className="founder-grand-section">
        <div className="founder-grand-card">
          <div className="founder-grand-header">
            <div className="founder-lead-left">
              <img src={activeLogo} alt="LBM Logo" className="founder-lead-logo" />
              <div className="founder-lead-title">
                <h3>Laxman Choudhary</h3>
                <p>Founder &amp; CEO — LBM Mirror Private Limited</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="f-stat-badge">👥 100K+ Happy Users</span>
              <span className="f-stat-badge">⭐ 4.9★ User Rating</span>
              <span className="f-stat-badge">🌐 Available Worldwide</span>
            </div>
          </div>

          {/* The High-Resolution Executive Office Photo Provided by User */}
          <div className="founder-photo-showcase-container">
            <img
              src="/founder_ceo_showcase.jpg"
              alt="Laxman Choudhary, Founder & CEO, LBM Mirror Private Limited"
              className="founder-showcase-image"
              onError={(e) => {
                // Fallback if needed
                (e.currentTarget as HTMLImageElement).src = '/logo.png'
              }}
            />
          </div>

          <div className="founder-grand-footer-pills">
            <div className="founder-quote-banner">
              &ldquo;Technology should bring people closer.&rdquo; — Laxman Choudhary
            </div>
            <div className="founder-stats-pills">
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>ONE APP • ALL DEVICES • NO LIMITS</span>
              <button
                type="button"
                className="btn-header-download"
                onClick={handleDownload}
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                ⬇️ Download Setup (.EXE)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. Step-by-Step Connection Guides for ALL Platforms (Requested by User) ─── */}
      <section className="landing-guides-section" id="guides">
        <div className="guides-section-header">
          <h2>Complete Connection &amp; Control Guide</h2>
          <p>Follow these quick, smooth steps to connect any computer or mobile device in seconds.</p>
        </div>

        <div className="guides-grid">
          {/* Card 1: Windows UltraViewer Remote PC */}
          <div className="guide-card" id="windows">
            <div className="guide-card-top">
              <span className="guide-platform-badge badge-win">💻 Windows Remote PC</span>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>UltraViewer Mode</span>
            </div>
            <h3>Remote PC Control (Distant Computers)</h3>
            <p className="guide-card-desc">
              Control any remote PC smoothly across the internet. <strong>Same Wi-Fi is NOT required!</strong> Works
              near or far across any city or broadband connection.
            </p>
            <div className="guide-steps-list">
              <div className="guide-step-item">
                <span className="guide-step-num">1</span>
                <span>Open LBM Mirror on both PCs (or open in Chrome browser).</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">2</span>
                <span>On the remote PC, click <strong>"Windows"</strong> and note <strong>Your ID</strong> &amp; <strong>Password</strong>.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">3</span>
                <span>On your PC, enter the remote PC's Partner ID and Password into <strong>"Control Remote PC"</strong>.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">4</span>
                <span>Click <strong>"Connect to Partner"</strong> — instant 60 FPS full mouse &amp; keyboard remote control is active!</span>
              </div>
            </div>
          </div>

          {/* Card 2: iOS Screen Mirroring */}
          <div className="guide-card" id="ios">
            <div className="guide-card-top">
              <span className="guide-platform-badge badge-ios">🍎 Apple iOS</span>
              <span style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 700 }}>AirPlay &amp; USB</span>
            </div>
            <h3>iPhone &amp; iPad Screen Mirroring</h3>
            <p className="guide-card-desc">
              Ultra-fast wireless screen mirroring using native Apple AirPlay Bonjour protocols, or direct Lightning/Type-C USB cable.
            </p>
            <div className="guide-steps-list">
              <div className="guide-step-item">
                <span className="guide-step-num">1</span>
                <span>Connect your iPhone and PC to the same Wi-Fi network OR plug in your USB cable.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">2</span>
                <span>Swipe down from the top-right of your iPhone to open <strong>Control Center</strong>.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">3</span>
                <span>Tap <strong>Screen Mirroring</strong> (two overlapping screens icon).</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">4</span>
                <span>Select <strong>"LBM Mirror"</strong> — screen appears in Full HD 60 FPS with synchronized audio.</span>
              </div>
            </div>
          </div>

          {/* Card 3: Android USB Cable (Scrcpy) & Wireless */}
          <div className="guide-card" id="android">
            <div className="guide-card-top">
              <span className="guide-platform-badge badge-android">🤖 Android Phone</span>
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>Scrcpy 60 FPS</span>
            </div>
            <h3>Android Direct Cable &amp; QR Wireless</h3>
            <p className="guide-card-desc">
              Zero-latency direct hardware mirror with mouse click navigation, keyboard typing, and wireless QR cast.
            </p>
            <div className="guide-steps-list">
              <div className="guide-step-item">
                <span className="guide-step-num">1</span>
                <span>On Android: Go to <strong>Settings &gt; Developer Options &gt; Turn ON USB Debugging</strong>.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">2</span>
                <span>Connect your phone to your PC via Type-C USB cable.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">3</span>
                <span>Unlock phone screen and tap <strong>"Always allow from this computer"</strong> &gt; OK.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">4</span>
                <span>Instant 60 FPS hardware mirror with zero delay and mouse control!</span>
              </div>
            </div>
          </div>

          {/* Card 4: Enterprise Viewer System */}
          <div className="guide-card" id="viewer">
            <div className="guide-card-top">
              <span className="guide-platform-badge badge-viewer">📁 Document Suite</span>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>31 Enterprise Modules</span>
            </div>
            <h3>Professional Viewer &amp; File Manager</h3>
            <p className="guide-card-desc">
              Complete document suite to preview PDFs, Word, Excel sheets, images, and CSVs with stamps, version rollback, and audit trails.
            </p>
            <div className="guide-steps-list">
              <div className="guide-step-item">
                <span className="guide-step-num">1</span>
                <span>Click <strong>"📁 Viewer System"</strong> from the left sidebar inside LBM Mirror.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">2</span>
                <span>Browse files, use multi-filters, or upload new business documents.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">3</span>
                <span>Apply official stamps (APPROVED, CONFIDENTIAL), signatures, and notes on pages.</span>
              </div>
              <div className="guide-step-item">
                <span className="guide-step-num">4</span>
                <span>Compare documents side-by-side with automatic addition/removal diff highlights.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. Footer Section ─── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-credits">
            <strong>{settings.appName}</strong> — Engineered by{' '}
            <strong>Founder &amp; CEO {settings.founderName || 'Laxman Choudhary'}</strong>.
            <div style={{ marginTop: 4, fontSize: '0.76rem', color: '#64748b' }}>
              All Rights Reserved • High-Speed Screen Mirroring &amp; Remote Desktop Platform
            </div>
          </div>

          <div className="footer-links">
            <button type="button" onClick={onOpenApp} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.84rem' }}>
              Launch Web App
            </button>
            <span>•</span>
            <button type="button" onClick={handleDownload} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.84rem' }}>
              Download Windows .exe
            </button>
            <span>•</span>
            <button type="button" onClick={handleCopyLink} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.84rem' }}>
              Share Link
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

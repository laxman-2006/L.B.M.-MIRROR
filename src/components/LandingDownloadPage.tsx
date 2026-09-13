import React, { useState, useEffect } from 'react'
import logoImg from '../assets/logo.png'
import founderCeoShowcase from '../assets/founder_ceo_showcase.jpg'
import heroBgRemotePc from '../assets/hero_bg_remote_pc.jpg'
import heroBgMobileGaming from '../assets/hero_bg_mobile_gaming.jpg'
import heroBgIosAndroidDesk from '../assets/hero_bg_ios_android_desk.jpg'
import heroBgHandsGamingUsb from '../assets/hero_bg_hands_gaming_usb.jpg'
import { useAppSettings } from '../context/AppSettingsContext'
import { triggerDirectExeDownload } from '../utils/directDownload'
import { ProblemReportModal } from './ProblemReportModal'
import './LandingDownloadPage.css'

interface LandingDownloadPageProps {
  onOpenApp: () => void
}

const HERO_3D_SCENES = [
  {
    id: 'mobile-gaming',
    title: 'Mobile ➔ PC Real-Time 60 FPS Gaming Mirror',
    subtitle: 'Play mobile games like PUBG & Free Fire on your PC monitor in 4K 60 FPS with zero lag, instant audio sync & direct mouse/keyboard keymapping',
    badge: '🎮 REAL-TIME 60 FPS MOBILE GAMING MIRROR',
    glowColor: '#10b981',
    accentColor: '#34d399',
    image: heroBgMobileGaming,
    gradient: 'radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.1) 50%, transparent 80%)',
    icon: '🎮',
    status: 'Real-Time Gaming Stream (60 FPS)',
    speed: '< 10 ms Ultra-Low Latency',
    desc: 'Zero delay mobile-to-PC gaming with custom keymapping and studio audio passthrough.',
  },
  {
    id: 'remote-pc',
    title: 'Windows to Windows Remote PC Desktop Control',
    subtitle: 'Control distant PCs across cities and continents with encrypted zero-lag peer-to-peer relay, remote mouse/keyboard dispatch & clipboard sync',
    badge: '💻 REMOTE DESKTOP PC-TO-PC CONTROL',
    glowColor: '#00f5ff',
    accentColor: '#38bdf8',
    image: heroBgRemotePc,
    gradient: 'radial-gradient(circle at 80% 20%, rgba(0, 245, 255, 0.3) 0%, rgba(0, 163, 196, 0.1) 50%, transparent 80%)',
    icon: '💻',
    status: 'Encrypted Remote Desktop Active',
    speed: '60 FPS Direct P2P Relay',
    desc: 'Connect between computers anywhere in the world without requiring the same Wi-Fi network.',
  },
  {
    id: 'ios-android-desk',
    title: 'Dual Cross-Platform Station: iOS Wireless & Android USB',
    subtitle: 'Connect iPhone wirelessly with native Apple AirPlay 60 FPS or plug in Android via direct USB Type-C cable for high-speed hardware screen casting',
    badge: '⚡ ONE APP • TWO WORLDS • UNLIMITED POSSIBILITIES',
    glowColor: '#38bdf8',
    accentColor: '#06b6d4',
    image: heroBgIosAndroidDesk,
    gradient: 'radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.3) 0%, rgba(14, 165, 233, 0.1) 50%, transparent 80%)',
    icon: '📱',
    status: 'Dual iOS & Android Station Ready',
    speed: '4K Ultra HD • Zero Wi-Fi USB',
    desc: 'Full cross-platform freedom: AirPlay 2 Bonjour receiver and Scrcpy USB direct hardware cast.',
  },
  {
    id: 'hands-gaming-usb',
    title: 'Next-Gen Dual Gaming & Screen Control Station',
    subtitle: 'Ultra-fast hardware acceleration, crystal-clear 1080p/4K streaming, and multi-device direct mirroring engineered for modern creators & gamers',
    badge: '🚀 HARDWARE ACCELERATED DIRECT CAST',
    glowColor: '#f59e0b',
    accentColor: '#fbbf24',
    image: heroBgHandsGamingUsb,
    gradient: 'radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.1) 50%, transparent 80%)',
    icon: '⚡',
    status: 'Hardware NVENC GPU Acceleration',
    speed: '60 FPS Ultra-Smooth Cast',
    desc: 'Silicon-level hardware GPU acceleration with zero dropped frames and instant response.',
  },
]

// 4 Full-Resolution Photorealistic 3D Background Scenes with Contrast Vignette
const VisualBackdropScenes: React.FC<{ activeIndex: number }> = ({ activeIndex }) => {
  return (
    <div className="hero-photorealistic-backdrop-container" aria-hidden="true">
      {HERO_3D_SCENES.map((sc, idx) => (
        <div
          key={sc.id}
          className={`hero-photo-layer ${activeIndex === idx ? 'photo-active' : ''}`}
          style={{ backgroundImage: `url(${sc.image})` }}
        />
      ))}
      {/* High-Contrast Vignette: dark on left for ultra-sharp text, clear on right for 3D visuals */}
      <div className="hero-vignette-overlay" />
    </div>
  )
}

// 5 Dedicated High-Resolution Executive Photos
export const FOUNDER_3D_PHOTOS = [
  {
    id: 'founder-official',
    title: 'Official Executive Leadership Portrait',
    tag: '👑 Founder & CEO Profile',
    src: founderCeoShowcase,
    caption: 'Laxman Choudhary — Founder & CEO, LBM Mirror Private Limited',
  },
  {
    id: 'founder-remote-desk',
    title: 'Remote Desktop & Worldwide Connectivity Station',
    tag: '💻 Windows to Windows Control',
    src: heroBgRemotePc,
    caption: 'Connecting computers across continents with zero-lag P2P relays',
  },
  {
    id: 'founder-gaming-mirror',
    title: 'Real-Time 60 FPS Mobile Gaming Casting Station',
    tag: '🎮 60 FPS Gaming Mirror',
    src: heroBgMobileGaming,
    caption: 'Play mobile games in 4K 60 FPS on big monitors with zero lag',
  },
  {
    id: 'founder-dual-station',
    title: 'Dual Cross-Platform iOS & Android Workstation',
    tag: '⚡ AirPlay & Direct USB Station',
    src: heroBgIosAndroidDesk,
    caption: 'Seamless wireless Apple AirPlay + Android direct hardware USB',
  },
  {
    id: 'founder-hands-gaming',
    title: 'Next-Gen Dual Handheld Gaming Control Hub',
    tag: '🚀 Low-Latency Hardware Hub',
    src: heroBgHandsGamingUsb,
    caption: 'Ultra-low latency screen sharing for creators, professionals & gamers',
  },
]

// 3D Interactive Photo Carousel with 3 Exclusive Contact Links
export const Founder3DPhotoCarousel: React.FC = () => {
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0)
  const [isPaused, setIsPaused] = useState<boolean>(false)

  // Auto-rotate 3D photos every 4.5s
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setActivePhotoIdx((prev) => (prev + 1) % FOUNDER_3D_PHOTOS.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [isPaused])

  const handlePrev = () => {
    setActivePhotoIdx((prev) => (prev - 1 + FOUNDER_3D_PHOTOS.length) % FOUNDER_3D_PHOTOS.length)
  }

  const handleNext = () => {
    setActivePhotoIdx((prev) => (prev + 1) % FOUNDER_3D_PHOTOS.length)
  }

  const currentPhoto = FOUNDER_3D_PHOTOS[activePhotoIdx]

  return (
    <div
      className="founder-3d-stage-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 3D Perspective Card Deck */}
      <div className="founder-3d-cards-track">
        {FOUNDER_3D_PHOTOS.map((photo, idx) => {
          let pos = 'hidden'
          if (idx === activePhotoIdx) pos = 'center'
          else if (idx === (activePhotoIdx - 1 + FOUNDER_3D_PHOTOS.length) % FOUNDER_3D_PHOTOS.length) pos = 'left'
          else if (idx === (activePhotoIdx + 1) % FOUNDER_3D_PHOTOS.length) pos = 'right'

          if (pos === 'hidden') return null

          return (
            <div
              key={photo.id}
              className={`founder-3d-card card-${pos}`}
              onClick={() => setActivePhotoIdx(idx)}
              title={photo.title}
            >
              <div className="founder-3d-card-inner">
                <img
                  src={photo.src}
                  alt={photo.title}
                  className="founder-3d-img"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).src = logoImg
                  }}
                />
                <div className="founder-3d-card-overlay">
                  <span className="founder-3d-tag">{photo.tag}</span>
                  <strong>{photo.title}</strong>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation Controls */}
      <div className="founder-3d-nav-row">
        <button type="button" className="founder-3d-nav-btn prev" onClick={handlePrev} title="Previous Photo">
          ◀ Prev
        </button>

        <div className="founder-3d-dots-row">
          {FOUNDER_3D_PHOTOS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`founder-dot-btn ${i === activePhotoIdx ? 'active' : ''}`}
              onClick={() => setActivePhotoIdx(i)}
            >
              <span className="dot-number">{i + 1}</span>
              <span className="dot-label">{p.tag.split(' ')[1] || p.tag}</span>
            </button>
          ))}
        </div>

        <button type="button" className="founder-3d-nav-btn next" onClick={handleNext} title="Next Photo">
          Next ▶
        </button>
      </div>

      {/* Caption Banner */}
      <div className="founder-3d-caption-banner">
        <span className="caption-tag">⭐ {currentPhoto.tag}</span>
        <p className="caption-text">{currentPhoto.caption}</p>
      </div>

      {/* Official Founder Info & EXACTLY 3 Contact Options (NO PHONE) */}
      <div className="founder-official-profile-box">
        <div className="founder-official-title">
          <h4>👑 Laxman Choudhary (लक्ष्मण चौधरी)</h4>
          <span className="founder-role-text">Founder &amp; CEO — LBM Mirror Private Limited</span>
          <p className="founder-vision-quote">
            &ldquo;Distance Means Nothing When Technology Brings Us Together.&rdquo; — Laxman Choudhary
          </p>
        </div>

        <div className="founder-official-contacts-row">
          <a
            href="mailto:lc1229501@gmail.com"
            className="f-contact-btn email-btn"
            title="Send Email to lc1229501@gmail.com"
          >
            <span className="f-btn-icon">📧</span>
            <div className="f-btn-info">
              <small>Email</small>
              <strong>lc1229501@gmail.com</strong>
            </div>
          </a>

          <a
            href="https://www.youtube.com/channel/UCaDs-ZGTGNIvuteFdarhrSg"
            target="_blank"
            rel="noopener noreferrer"
            className="f-contact-btn youtube-btn"
            title="Official YouTube Channel"
          >
            <span className="f-btn-icon">📺</span>
            <div className="f-btn-info">
              <small>YouTube</small>
              <strong>Official Channel</strong>
            </div>
          </a>

          <a
            href="https://www.instagram.com/lucky_bhambhu?stkn=MXgyaHZmNGlhdDR0bA%3D%3D&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className="f-contact-btn instagram-btn"
            title="Official Instagram @lucky_bhambhu"
          >
            <span className="f-btn-icon">📸</span>
            <div className="f-btn-info">
              <small>Instagram</small>
              <strong>@lucky_bhambhu</strong>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

const FEATURES_24 = [
  { icon: '⚡', tag: '60 FPS', title: '60 FPS Ultra-Fast Engine', desc: 'Hardware-accelerated pipeline with less than 15ms latency for lag-free real-time mirroring.' },
  { icon: '🖥️', tag: '4K RETINA', title: '4K Ultra HD Display', desc: 'Crisp, pixel-perfect rendering with adaptive bitrate and high dynamic range color fidelity.' },
  { icon: '🖱️', tag: 'REMOTE CONTROL', title: 'AnyDesk & Remote Desktop Control', desc: 'Full mouse click, drag, scroll, and keyboard input across distant PCs anywhere in the world.' },
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

  // Dynamic 3D Background scene that smoothly switches every 5.0s
  const [sceneIndex, setSceneIndex] = useState<number>(0)
  // Rotating Founder Executive Poster that spotlights every 16 seconds
  const [founderRotateAngle, setFounderRotateAngle] = useState<number>(0)
  const [isFounderSpotlight, setIsFounderSpotlight] = useState<boolean>(false)
  // Lightbox Modal to show Founder Executive Showcase in full size
  const [showFounderLightbox, setShowFounderLightbox] = useState<boolean>(false)
  // User Problem / Support Desk Modal
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false)
  // iOS AirPlay & App Modal
  const [showIosModal, setShowIosModal] = useState<boolean>(false)
  // Native PWA deferred install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  const activeLogo = settings.appLogo || logoImg
  const shareableDownloadLink = 'https://l-b-m-mirror.vercel.app/?download=direct'
  const currentScene = HERO_3D_SCENES[sceneIndex]

  // Listen for native PWA installation event
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  // Enable full native page scrolling for the landing page
  useEffect(() => {
    document.documentElement.classList.add('landing-scroll-active')
    document.body.classList.add('landing-scroll-active')
    const prevHtmlOverflow = document.documentElement.style.overflowY
    const prevHtmlHeight = document.documentElement.style.height
    const prevBodyOverflow = document.body.style.overflowY
    const prevBodyHeight = document.body.style.height

    document.documentElement.style.overflowY = 'auto'
    document.documentElement.style.height = 'auto'
    document.body.style.overflowY = 'auto'
    document.body.style.height = 'auto'

    return () => {
      document.documentElement.classList.remove('landing-scroll-active')
      document.body.classList.remove('landing-scroll-active')
      document.documentElement.style.overflowY = prevHtmlOverflow
      document.documentElement.style.height = prevHtmlHeight
      document.body.style.overflowY = prevBodyOverflow
      document.body.style.height = prevBodyHeight
    }
  }, [])

  // Dynamic 3D Scene Cycle (5.0s Interval as requested)
  useEffect(() => {
    const sceneTimer = setInterval(() => {
      setSceneIndex((prev) => (prev + 1) % HERO_3D_SCENES.length)
    }, 5000)
    return () => clearInterval(sceneTimer)
  }, [])

  // Founder Executive Poster Rotation Animation (every 16s)
  useEffect(() => {
    const founderTimer = setInterval(() => {
      setIsFounderSpotlight(true)
      setFounderRotateAngle((prev) => prev + 360)
      setTimeout(() => setIsFounderSpotlight(false), 4500)
    }, 16000)
    return () => clearInterval(founderTimer)
  }, [])

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

  // 1. Windows Installer .EXE
  const handleDownloadWindows = () => {
    showToast('🚀 Downloading Setup (.EXE) directly to your Downloads folder...')
    triggerDirectExeDownload('LBM_Mirror_Setup.exe')
  }

  // 2. Android APK direct download
  const handleDownloadApk = () => {
    showToast('🤖 Downloading LBMMirror.apk (Android)...')
    const link = document.createElement('a')
    link.href = '/downloads/LBMMirror.apk'
    link.download = 'LBMMirror.apk'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 3. iOS Download & Setup
  const handleDownloadIos = () => {
    setShowIosModal(true)
  }

  // 4. 1-Click Install to Phone Screen (PWA - Places real LBM icon on phone screen)
  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        showToast('✅ LBM Mirror आपके फोन स्क्रीन पर इंस्टॉल हो गया!')
      }
      setDeferredPrompt(null)
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIos) {
        setShowIosModal(true)
      } else {
        showToast('📱 फोन स्क्रीन पर ऐप लगाने के लिए: ब्राउज़र मेनू (⋮) में "Add to Home screen" चुनें।')
      }
    }
  }

  const whatsappShareText = encodeURIComponent(
    `🚀 Download LBM Mirror - Free 60 FPS Screen Mirroring & High-Speed Remote Desktop:\n${shareableDownloadLink}`
  )

  return (
    <div
      className="landing-page-container dynamic-3d-bg"
      style={{
        background: currentScene.gradient,
        transition: 'background 1s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* 3D Animated Cyber Glow Elements */}
      <div
        className="landing-bg-glow-1 dynamic-glow-pulse"
        style={{
          background: `radial-gradient(circle, ${currentScene.glowColor}40 0%, transparent 70%)`,
          transition: 'background 1.2s ease',
        }}
      />
      <div
        className="landing-bg-glow-2 dynamic-glow-pulse-2"
        style={{
          background: `radial-gradient(circle, ${currentScene.glowColor}25 0%, transparent 70%)`,
          transition: 'background 1.2s ease',
        }}
      />

      {/* Floating 3D Tech Particle Mesh */}
      <div className="dynamic-3d-cyber-mesh" />

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

      {/* ─── 1. Top Header Navigation Bar ─── */}
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
            Remote PC Control
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
          <a href="#founder" className="landing-nav-link">
            Founder &amp; CEO
          </a>
          <a href="#guides" className="landing-nav-link">
            Tutorials
          </a>
        </nav>

        <div className="landing-nav-actions">
          <button type="button" className="btn-header-support" onClick={() => setShowSupportModal(true)} title="Report Problem / 24/7 Support (समस्या दर्ज करें)">
            <span>🛠️ 24/7 Support</span>
          </button>
          <button type="button" className="btn-header-apk" onClick={handleDownloadApk} title="Download Android APK (LBMMirror.apk)">
            <span>🤖 ANDROID APK</span>
          </button>
          <button type="button" className="btn-header-download" onClick={handleDownloadWindows} title="Directly Download Complete Windows Setup .exe">
            <span>💻 DOWNLOAD (.EXE)</span>
          </button>
          <button type="button" className="btn-launch-web" onClick={onOpenApp} title="Open in Browser without Installing">
            <span>🌐 Open Web App</span>
          </button>
        </div>
      </header>

      {/* ─── 2. Full-Width Edge-to-Edge Hero Banner ─── */}
      <div className="hero-fullwidth-wrapper">
        {/* Dynamic 4-Scene Photorealistic Backgrounds (Stretches edge-to-edge 100% full screen) */}
        <VisualBackdropScenes activeIndex={sceneIndex} />

        <section className="landing-hero" id="hero">
          <div className="landing-hero-left hero-high-contrast-card" style={{ position: 'relative', zIndex: 10 }}>
          {/* Dynamic Scene Pill */}
          <div
            className="landing-pill-tag dynamic-pill-glow"
            style={{
              borderColor: currentScene.glowColor,
              color: currentScene.accentColor,
              boxShadow: `0 0 20px ${currentScene.glowColor}50`,
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{currentScene.icon}</span>
            <span>{currentScene.badge}</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#e2e8f0' }}>Windows 11 / 10 / 8 / 7 • Android • iOS</span>
          </div>

          {/* 5-Second Progress Countdown Bar */}
          <div className="hero-5s-progress-container" title="Next scene in 5 seconds">
            <div className="hero-5s-progress-fill" key={`progress-${sceneIndex}`} />
          </div>

          {/* Kinetic Unfolding Headline (High-Contrast White with Glowing Highlight) */}
          <div className="hero-headline-wrap" key={`scene-text-${sceneIndex}`}>
            <span className="hero-title-tagline" style={{ color: currentScene.glowColor }}>
              {currentScene.badge}
            </span>
            <h2 className="hero-title-main unfolding-text-anim">
              <span className="hero-title-pure-white">
                {currentScene.title}
              </span>
            </h2>

            <p className="hero-subtitle stylish-subtext-unfold">
              <strong style={{ color: '#ffffff' }}>Smarter, More Comprehensive &amp; Zero-Lag:</strong>{' '}
              <span style={{ color: '#f1f5f9' }}>{currentScene.subtitle}.</span>{' '}
              <span style={{ color: '#cbd5e1' }}>
                Control any remote Windows PC across any network, mirror iPhone with Apple AirPlay 60 FPS,
                and connect Android via high-speed direct USB cable.
              </span>
            </p>
          </div>

          {/* ─── 3 Prominent User-Requested Download Buttons ─── */}
          <div className="hero-3-downloads-grid">
            {/* 1. Download for Windows */}
            <button
              type="button"
              className="hero-dl-main-btn win-btn"
              onClick={handleDownloadWindows}
              title="Download Windows .EXE Installer"
            >
              <span className="dl-icon">💻</span>
              <div className="dl-text">
                <span className="dl-title">डाउनलोड फॉर विंडोज</span>
                <span className="dl-sub">.EXE Installer • Windows 11/10/8/7</span>
              </div>
            </button>

            {/* 2. Download for Android APK */}
            <button
              type="button"
              className="hero-dl-main-btn apk-btn"
              onClick={handleDownloadApk}
              title="Download Android APK (LBMMirror.apk)"
            >
              <span className="dl-icon">🤖</span>
              <div className="dl-text">
                <span className="dl-title">डाउनलोड फॉर एंड्रॉइड APK</span>
                <span className="dl-sub">Direct LBMMirror.apk • Official App</span>
              </div>
            </button>

            {/* 3. Download for iOS */}
            <button
              type="button"
              className="hero-dl-main-btn ios-btn"
              onClick={handleDownloadIos}
              title="Setup on iPhone & iPad"
            >
              <span className="dl-icon">🍎</span>
              <div className="dl-text">
                <span className="dl-title">डाउनलोड फॉर iOS</span>
                <span className="dl-sub">iPhone &amp; iPad • AirPlay Mirror</span>
              </div>
            </button>
          </div>

          {/* Secondary Action Row: 1-Click Phone Screen Install (PWA) & Instant Web App */}
          <div className="hero-cta-row secondary-cta-row">
            <button
              type="button"
              className="hero-pwa-install-btn"
              onClick={handleInstallPwa}
              title="Add LBM Mirror App Icon directly to your Phone Home Screen / Gallery"
            >
              <span>📱 फोन स्क्रीन / गैलरी में ऐप लगाएं (1-Tap Home Screen App)</span>
            </button>

            <button
              type="button"
              className="hero-secondary-cta"
              onClick={onOpenApp}
              title="Launch Web App directly in browser without installing"
            >
              <span>🌐 Launch Web App (बिना इंस्टॉल तुरंत चलाएं)</span>
            </button>
          </div>

          <div className="hero-specs-row">
            <span>✓ Zero Lag (60 FPS)</span>
            <span>•</span>
            <span>✓ Same Wi-Fi Not Required for Remote PC</span>
            <span>•</span>
            <span>✓ 100% Free &amp; Safe</span>
          </div>

          {/* Active 3D Scene Carousel Indicators (Cycles every 5.0s) */}
          <div className="scene-indicator-dots-row">
            {HERO_3D_SCENES.map((sc, idx) => (
              <button
                key={sc.id}
                type="button"
                className={`scene-dot-pill ${idx === sceneIndex ? 'active' : ''}`}
                style={{
                  borderColor: idx === sceneIndex ? sc.glowColor : 'rgba(255,255,255,0.2)',
                  color: idx === sceneIndex ? sc.glowColor : '#94a3b8',
                }}
                onClick={() => setSceneIndex(idx)}
              >
                <span>{sc.icon}</span>
                <span>{sc.id.replace('-', ' ').toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hero Right: 3D Isometric Glass Cards + Rotating Founder Executive Showcase */}
        <div className="landing-hero-right" style={{ position: 'relative', zIndex: 10 }}>
          <div className="isometric-board-container">
            {/* Dynamic 3D Main Base Card */}
            <div
              className="iso-main-base-card 3d-card-tilt"
              style={{
                borderColor: `${currentScene.glowColor}50`,
                boxShadow: `0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px ${currentScene.glowColor}25`,
              }}
            >
              <div className="iso-header-badge">
                <div className="iso-brand-pill">
                  <span>{currentScene.icon}</span>
                  <span>{currentScene.title}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: currentScene.glowColor, fontWeight: 800 }}>
                  ● 60 FPS LIVE
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ACTIVE MODE</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: currentScene.glowColor }}>
                    {currentScene.status}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PERFORMANCE</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#4ade80' }}>
                    {currentScene.speed}
                  </div>
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
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>Remote PC Connected</span>
              </div>
            </div>

            <div className="iso-floating-card-3">
              <span style={{ fontSize: '1.2rem' }}>📁</span>
              <div>
                <strong style={{ fontSize: '0.8rem', display: 'block', color: '#fff' }}>Enterprise Viewer</strong>
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>31 Feature Suite</span>
              </div>
            </div>

            {/* 👑 ROTATING 3D FOUNDER EXECUTIVE SHOWCASE CARD (Click opens full photo lightbox) */}
            <div
              className={`founder-rotating-3d-badge clickable-founder-badge ${isFounderSpotlight ? 'spotlight-active' : ''}`}
              style={{
                transform: `perspective(1000px) rotateY(${founderRotateAngle}deg)`,
                transition: 'transform 1.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onClick={() => setShowFounderLightbox(true)}
              title="Click to view Founder & CEO official photo showcase"
            >
              <div className="founder-badge-inner">
                <img
                  src="/founder_ceo_showcase.jpg"
                  alt="Laxman Choudhary Founder & CEO"
                  className="founder-badge-thumb"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).src = logoImg
                  }}
                />
                <div className="founder-badge-meta">
                  <span className="badge-tag">👑 FOUNDER &amp; CEO</span>
                  <strong>Laxman Choudhary</strong>
                  <small>LBM Mirror Private Limited</small>
                  <span className="click-hint-tag">🔍 Click to Open Full Photo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

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

      {/* ─── 4. 3D Interactive Device Mirroring Animation Stage ─── */}
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
              <span>💻 PC ➔ PC Remote Desktop (AnyDesk &amp; LBM PC Control)</span>
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

      {/* ─── 5. 24-Feature Extensive Gallery Grid ─── */}
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

      {/* ─── 6. Founder & CEO Grand Executive Showcase ─── */}
      <section className="founder-grand-section" id="founder">
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

          {/* 👑 3D Interactive Photo Carousel with 5 Photos & 3 Exclusive Links */}
          <Founder3DPhotoCarousel />
        </div>
      </section>

      {/* ─── 7. Step-by-Step Connection Guides for ALL Platforms ─── */}
      <section className="landing-guides-section" id="guides">
        <div className="guides-section-header">
          <h2>Complete Connection &amp; Control Guide</h2>
          <p>Follow these quick, smooth steps to connect any computer or mobile device in seconds.</p>
        </div>

        <div className="guides-grid">
          {/* Card 1: Windows Remote PC */}
          <div className="guide-card" id="windows">
            <div className="guide-card-top">
              <span className="guide-platform-badge badge-win">💻 Windows Remote PC</span>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>Remote Desktop Mode</span>
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

      {/* ─── 8. Footer Section ─── */}
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
            <button type="button" onClick={handleDownloadWindows} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.84rem' }}>
              Download Windows .exe
            </button>
            <span>•</span>
            <button type="button" onClick={handleCopyLink} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.84rem' }}>
              Share Link
            </button>
            <span>•</span>
            <button type="button" onClick={() => setShowSupportModal(true)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.84rem' }}>
              24/7 Support Desk
            </button>
          </div>
        </div>
      </footer>

      {/* ─── 9. Founder & CEO Executive Photo Lightbox Modal ─── */}
      {showFounderLightbox && (
        <div className="founder-lightbox-overlay" onClick={() => setShowFounderLightbox(false)}>
          <div className="founder-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="founder-lightbox-close"
              onClick={() => setShowFounderLightbox(false)}
              title="Close"
            >
              ✕
            </button>

            <div className="founder-lightbox-header">
              <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 800, letterSpacing: '0.05em' }}>
                👑 OFFICIAL FOUNDER &amp; CEO 3D SHOWCASE
              </span>
              <h3>Laxman Choudhary (लक्ष्मण चौधरी)</h3>
              <p>Founder &amp; CEO — LBM Mirror Private Limited</p>
            </div>

            {/* 3D 5-Photo Carousel inside Modal */}
            <Founder3DPhotoCarousel />
          </div>
        </div>
      )}

      {/* ─── 10. User Problem & Support Desk Modal ─── */}
      <ProblemReportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      {/* ─── 11. iOS AirPlay & Setup Modal ─── */}
      {showIosModal && (
        <div className="auth-modal-overlay" onClick={() => setShowIosModal(false)}>
          <div className="ios-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="download-close-btn"
              onClick={() => setShowIosModal(false)}
              title="Close"
            >
              ✕
            </button>
            <div className="ios-modal-header">
              <span style={{ fontSize: '2.5rem' }}>🍎</span>
              <h3>LBM Mirror for iOS (iPhone &amp; iPad)</h3>
              <p>Apple डिवाइस पर LBM Mirror चलाने के 2 सुपर-फास्ट विकल्प:</p>
            </div>
            <div className="ios-modal-steps">
              <div className="ios-step-item">
                <div className="ios-step-num">1</div>
                <div>
                  <strong>Apple AirPlay 60 FPS Wireless Mirror:</strong>
                  <p>अपने iPhone / iPad के <em>Control Center</em> में जाएं, <strong>Screen Mirroring</strong> पर टैप करें और <strong>LBM Mirror</strong> चुनें। आपकी पूरी मोबाइल स्क्रीन 60 FPS पर कंप्यूटर पर दिखेगी।</p>
                </div>
              </div>
              <div className="ios-step-item">
                <div className="ios-step-num">2</div>
                <div>
                  <strong>1-Tap Home Screen App Icon (फोन स्क्रीन पर ऐप):</strong>
                  <p>iPhone सफारी (Safari) में नीचे <strong>Share (साझा)</strong> बटन दबाएं और <strong>"Add to Home Screen (होम स्क्रीन में जोड़ें)"</strong> चुनें। LBM Mirror का असली लोगो आपके iPhone स्क्रीन पर आ जाएगा।</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="hero-download-pill-btn"
              style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center' }}
              onClick={() => {
                setShowIosModal(false)
                onOpenApp()
              }}
            >
              <span>🌐 Open iOS Web Client Now</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

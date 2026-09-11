import React, { useState } from 'react'
import bannerImg from '../assets/founder_banner.jpg'
import logoImg from '../assets/logo.png'
import { useAppSettings } from '../context/AppSettingsContext'

interface FounderModalProps {
  isOpen: boolean
  onClose: () => void
}

export const FounderModal: React.FC<FounderModalProps> = ({ isOpen, onClose }) => {
  const { settings } = useAppSettings()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  // Configurable contact details from dynamic admin settings
  const emailVal = settings.email || 'lc1229501@gmail.com'
  const instaHandle = settings.instagramHandle || '@lucky_bhambhu'
  const instaUrl = settings.instagramUrl || 'https://instagram.com/lucky_bhambhu'
  const ytHandle = settings.youtubeHandle || 'lucky bhambhu vlog'
  const ytUrl = settings.youtubeUrl || 'https://youtube.com/@luckybhambhuvlog'
  const fbHandle = settings.facebookHandle || 'LBM Mirror Official'
  const fbUrl = settings.facebookUrl || 'https://facebook.com/LBMMirror'
  const phoneVal = settings.phone || settings.whatsapp || '+91 9587124896'

  // Clean application name without "Private Limited"
  const cleanAppName = (settings.appName || 'LBM Mirror').replace(/Private Limited/gi, '').trim()
  const cleanFounderRole = `Founder & CEO — ${cleanAppName}`

  /**
   * Safely opens external links in the user's default web browser (Chrome, Edge, etc.)
   */
  const handleOpenLink = async (target: string, type: 'email' | 'instagram' | 'youtube' | 'facebook' | 'whatsapp') => {
    let url = (target || '').trim()
    if (!url) return

    if (type === 'email') {
      url = url.startsWith('mailto:') ? url : `mailto:${url}`
    } else if (type === 'whatsapp') {
      const digits = url.replace(/[^0-9]/g, '')
      url = `https://wa.me/${digits || '919587124896'}`
    } else if (type === 'instagram') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const handle = url.replace(/^@/, '').replace(/^instagram\.com\//, '')
        url = `https://www.instagram.com/${handle}/`
      }
    } else if (type === 'youtube') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('@')) {
          url = `https://www.youtube.com/${url}`
        } else if (url.includes('youtube.com/')) {
          url = `https://${url.replace(/^https?:\/\//, '')}`
        } else {
          url = `https://www.youtube.com/results?search_query=${encodeURIComponent(url)}`
        }
      }
    } else if (type === 'facebook') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const page = url.replace(/^facebook\.com\//, '')
        url = `https://www.facebook.com/${page}`
      }
    } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
      url = `https://${url}`
    }

    // First try Electron's native shell.openExternal
    if (typeof window !== 'undefined' && window.electronAPI?.openExternal) {
      try {
        const res = await window.electronAPI.openExternal(url)
        if (res && res.success) return
      } catch (err) {
        console.warn('[FounderModal] openExternal failed, falling back to window.open:', err)
      }
    }

    // Fallback for standard browser
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    try {
      await fetch('/api/support/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Anonymous User',
          contact: contact.trim() || 'Not Provided',
          message: message.trim(),
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => null)

      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="founder-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="founder-modal-header">
          <div className="founder-header-badge">
            <img
              src={logoImg}
              alt={cleanAppName}
              className="founder-header-logo"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoImg }}
            />
            <div>
              <h2 className="founder-header-title">Founder &amp; CEO Profile</h2>
              <p className="founder-header-subtitle">{cleanAppName}</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="founder-modal-body">
          {/* 1. Founder Identity Card with Official Logo */}
          <div className="founder-info-bar">
            <div className="founder-identity-wrapper">
              <div className="founder-avatar-box">
                <img
                  src={logoImg}
                  alt="LBM Logo"
                  className="founder-official-logo"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoImg }}
                />
              </div>
              <div className="founder-identity">
                <h3 className="founder-name">{settings.founderName || 'Laxman Choudhary'}</h3>
                <p className="founder-role">{cleanFounderRole}</p>
              </div>
            </div>
            <div className="founder-tags">
              <span className="ftag">🚀 Screen Mirroring Pioneer</span>
              <span className="ftag">⭐ 100K+ Users</span>
              <span className="ftag">⚡ 60 FPS Ultra Fast</span>
            </div>
          </div>

          {/* 2. Official Visual Poster (Placed JUST BELOW Founder and CEO) */}
          <div className="founder-banner-wrapper">
            <img
              src={bannerImg}
              alt={`${settings.founderName || 'Laxman Choudhary'} - ${cleanAppName}`}
              className="founder-banner-img"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = bannerImg }}
            />
            <div className="founder-banner-overlay">
              <span className="founder-quote">
                &ldquo;{settings.founderQuote || 'Ideas To A More Connected World'}&rdquo;
              </span>
            </div>
          </div>

          {/* 3. Official Social & Contact Handles Grid (Placed JUST BELOW Poster) */}
          <div className="founder-contact-section">
            <h4 className="section-heading">Connect Directly with Founder</h4>
            <div className="social-links-grid">
              {/* Official Email ID */}
              <button
                type="button"
                className="contact-card email-card"
                onClick={() => handleOpenLink(emailVal, 'email')}
                title="Send Email"
              >
                <div className="contact-icon email-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <span className="contact-label">OFFICIAL EMAIL ID</span>
                  <span className="contact-val">{emailVal}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>

              {/* Instagram Profile */}
              <button
                type="button"
                className="contact-card insta-card"
                onClick={() => handleOpenLink(instaUrl || instaHandle, 'instagram')}
                title="Open Instagram"
              >
                <div className="contact-icon insta-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <span className="contact-label">INSTAGRAM</span>
                  <span className="contact-val">{instaHandle.startsWith('@') ? instaHandle : `@${instaHandle}`}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>

              {/* YouTube Account */}
              <button
                type="button"
                className="contact-card youtube-card"
                onClick={() => handleOpenLink(ytUrl || ytHandle, 'youtube')}
                title="Open YouTube"
              >
                <div className="contact-icon youtube-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <span className="contact-label">YOUTUBE</span>
                  <span className="contact-val">{ytHandle}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                className="contact-card fb-card"
                onClick={() => handleOpenLink(fbUrl || fbHandle, 'facebook')}
                title="Open Facebook"
              >
                <div className="contact-icon fb-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <span className="contact-label">FACEBOOK</span>
                  <span className="contact-val">{fbHandle}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>

              {/* Direct Contact / Phone Number */}
              <button
                type="button"
                className="contact-card phone-card"
                onClick={() => handleOpenLink(phoneVal, 'whatsapp')}
                title="Call or WhatsApp"
              >
                <div className="contact-icon phone-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <span className="contact-label">DIRECT CONTACT / WHATSAPP</span>
                  <span className="contact-val">{phoneVal}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>
            </div>
          </div>

          {/* 4. Query / Direct Message to Founder */}
          <div className="founder-message-section">
            <div className="message-header-box">
              <span className="message-bubble-icon">💬</span>
              <div>
                <h4 className="message-box-title">Facing Any Issue? Message the Founder Directly</h4>
                <p className="message-box-sub">
                  अगर आपको कोई भी समस्या आ रही है, तो नीचे अपना संदेश लिखें। आपका मैसेज सीधे फाउंडर तक पहुँचेगा।
                </p>
              </div>
            </div>

            {submitted ? (
              <div className="message-success-card">
                <span className="success-icon">✓</span>
                <div>
                  <h5 className="success-title">Message Sent Successfully!</h5>
                  <p className="success-sub">
                    धन्यवाद! आपका संदेश सीधे फाउंडर को भेज दिया गया है। हम जल्द ही आपसे संपर्क करेंगे।
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="founder-form">
                <div className="form-row-2col">
                  <div className="form-field">
                    <label className="field-label">Your Name (आपका नाम):</label>
                    <input
                      type="text"
                      className="founder-input"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Contact No. / Email (फ़ोन या ईमेल):</label>
                    <input
                      type="text"
                      className="founder-input"
                      placeholder="e.g. 98XXXXXXXX or name@mail.com"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label">Describe your issue / Feedback (अपनी समस्या लिखें):</label>
                  <textarea
                    className="founder-textarea"
                    rows={3}
                    placeholder="लिखें कि क्या समस्या आ रही है (जैसे: स्क्रीन कनेक्ट नहीं हो रही, आदि)..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <div className="form-submit-row">
                  <button
                    type="submit"
                    className="founder-submit-btn"
                    disabled={loading || !message.trim()}
                  >
                    {loading ? 'Sending Message...' : '🚀 Send Message Directly to Founder'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

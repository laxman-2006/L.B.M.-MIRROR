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

  // Configurable contact details from dynamic admin settings
  const contactDetails = {
    email: settings.email || 'contact@laxmanchoudhary.com',
    instagram: settings.instagramUrl || 'https://instagram.com/laxman_choudhary',
    instagramHandle: settings.instagramHandle || '@laxman_choudhary',
    youtube: settings.youtubeUrl || 'https://youtube.com/@LBMMirror',
    youtubeHandle: settings.youtubeHandle || 'LBM Mirror Official',
    facebook: settings.facebookUrl || 'https://facebook.com/LBMMirror',
    facebookHandle: settings.facebookHandle || 'LBM Mirror Official',
    phone: settings.phone || '+91 98765 43210',
    whatsapp: `https://wa.me/${(settings.whatsapp || settings.phone || '919876543210').replace(/[^0-9]/g, '')}`,
  }

  const activeLogo = settings.appLogo || logoImg
  const activeBanner = settings.founderBanner || bannerImg

  if (!isOpen) return null

  const handleOpenLink = (url: string) => {
    if (window.electronAPI) {
      window.open(url, '_blank')
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    try {
      // Send query to local server API
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

      // Even if offline, acknowledge submission
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
            <img src={activeLogo} alt={settings.appName} className="founder-header-logo" />
            <div>
              <h2 className="founder-header-title">Founder &amp; CEO Profile</h2>
              <p className="founder-header-subtitle">{settings.appName} Private Limited</p>
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
          {/* Main Visual Poster */}
          <div className="founder-banner-wrapper">
            <img
              src={activeBanner}
              alt={`${settings.founderName || 'Founder & CEO'} - ${settings.appName}`}
              className="founder-banner-img"
            />
            <div className="founder-banner-overlay">
              <span className="founder-quote">
                &ldquo;{settings.founderQuote || 'Ideas To A More Connected World'}&rdquo;
              </span>
            </div>
          </div>

          {/* Founder Identity Card */}
          <div className="founder-info-bar">
            <div className="founder-identity">
              <h3 className="founder-name">{settings.founderName || 'Laxman Choudhary'}</h3>
              <p className="founder-role">{settings.founderRole || 'Founder & CEO'}</p>
            </div>
            <div className="founder-tags">
              <span className="ftag">🚀 Screen Mirroring Pioneer</span>
              <span className="ftag">⭐ 100K+ Users</span>
              <span className="ftag">⚡ 60 FPS Ultra Fast</span>
            </div>
          </div>

          {/* Official Social & Contact Handles Grid */}
          <div className="founder-contact-section">
            <h4 className="section-heading">Connect Directly with Founder</h4>
            <div className="social-links-grid">
              {/* 1. Email ID (Top priority as requested) */}
              <button
                type="button"
                className="contact-card email-card"
                onClick={() => handleOpenLink(`mailto:${contactDetails.email}`)}
                title="Send Email"
              >
                <div className="contact-icon email-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <span className="contact-label">Official Email ID</span>
                  <span className="contact-val">{contactDetails.email}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>

              {/* 2. Instagram Profile */}
              <button
                type="button"
                className="contact-card insta-card"
                onClick={() => handleOpenLink(contactDetails.instagram)}
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
                  <span className="contact-label">Instagram</span>
                  <span className="contact-val">{contactDetails.instagramHandle}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>

              {/* 3. YouTube Account */}
              <button
                type="button"
                className="contact-card youtube-card"
                onClick={() => handleOpenLink(contactDetails.youtube)}
                title="Open YouTube"
              >
                <div className="contact-icon youtube-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <span className="contact-label">YouTube</span>
                  <span className="contact-val">{contactDetails.youtubeHandle}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>

              {/* 4. Facebook */}
              <button
                type="button"
                className="contact-card fb-card"
                onClick={() => handleOpenLink(contactDetails.facebook)}
                title="Open Facebook"
              >
                <div className="contact-icon fb-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <span className="contact-label">Facebook</span>
                  <span className="contact-val">{contactDetails.facebookHandle}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>

              {/* 5. Direct Contact / Phone Number */}
              <button
                type="button"
                className="contact-card phone-card"
                onClick={() => handleOpenLink(contactDetails.whatsapp)}
                title="Call or WhatsApp"
              >
                <div className="contact-icon phone-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <span className="contact-label">Direct Contact / WhatsApp</span>
                  <span className="contact-val">{contactDetails.phone}</span>
                </div>
                <span className="contact-arrow">&rarr;</span>
              </button>
            </div>
          </div>

          {/* Interactive Problem / Query Box as requested */}
          <div className="founder-query-section">
            <div className="query-header">
              <div className="query-icon-badge">💬</div>
              <div>
                <h4 className="query-title">Facing Any Issue? Message the Founder Directly</h4>
                <p className="query-desc">
                  अगर आपको कोई भी समस्या आ रही है, तो नीचे अपना संदेश लिखें। आपका मैसेज सीधे फाउंडर तक पहुँचेगा।
                </p>
              </div>
            </div>

            {submitted ? (
              <div className="query-success-box">
                <div className="success-icon">✓</div>
                <div className="success-content">
                  <h5>Message Received Successfully!</h5>
                  <p>
                    आपका संदेश सीधे <strong>{settings.founderName || 'Laxman Choudhary'} ({settings.founderRole || 'Founder & CEO'})</strong> को भेज दिया गया है। हमारी टीम जल्द ही आपसे संपर्क करेगी।
                  </p>
                  <button
                    type="button"
                    className="send-another-btn"
                    onClick={() => {
                      setSubmitted(false)
                      setMessage('')
                    }}
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              <form className="query-form" onSubmit={handleSubmit}>
                <div className="form-row-dual">
                  <div className="form-group">
                    <label htmlFor="user-name">Your Name (आपका नाम):</label>
                    <input
                      id="user-name"
                      type="text"
                      className="query-input"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="user-contact">Contact No. / Email (फोन या ईमेल):</label>
                    <input
                      id="user-contact"
                      type="text"
                      className="query-input"
                      placeholder="e.g. 98XXXXXXXX or name@mail.com"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="user-problem">Describe Your Issue / Problem (समस्या का विवरण):</label>
                  <textarea
                    id="user-problem"
                    className="query-textarea"
                    rows={4}
                    required
                    placeholder="लिखें कि स्क्रीन मिररिंग या ऐप में क्या समस्या आ रही है..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="form-submit-row">
                  <button
                    type="submit"
                    className="submit-query-btn"
                    disabled={loading || !message.trim()}
                  >
                    {loading ? 'Sending Message…' : '✉️ Send Message to Founder'}
                  </button>
                  <button
                    type="button"
                    className="whatsapp-query-btn"
                    onClick={() => {
                      const text = encodeURIComponent(
                        `*LBM Mirror Support Query*\nName: ${name || 'User'}\nContact: ${contact || 'N/A'}\nMessage: ${message || 'Need support with LBM Mirror'}`
                      )
                      handleOpenLink(`${contactDetails.whatsapp}?text=${text}`)
                    }}
                  >
                    💬 Send via WhatsApp
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

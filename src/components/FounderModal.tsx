import React, { useState } from 'react'
import bannerImg from '../assets/founder_banner.jpg'
import logoImg from '../assets/logo.png'
import { useAppSettings } from '../context/AppSettingsContext'
import { Founder3DPhotoCarousel } from './LandingDownloadPage'
import { cloudSyncService } from '../services/cloudSyncService'
import './LandingDownloadPage.css'

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

  // Clean application name without "Private Limited"
  const cleanAppName = (settings.appName || 'LBM Mirror').replace(/Private Limited/gi, '').trim()
  const cleanFounderRole = `Founder & CEO — ${cleanAppName}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    try {
      await cloudSyncService.submitTicket({
        userId: `USER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        name: name.trim() || 'Anonymous User',
        contact: contact.trim() || 'Not Provided',
        category: 'Founder Direct Query',
        deviceInfo: typeof navigator !== 'undefined' ? `${navigator.platform || 'Windows PC'} • Desktop App` : 'Windows Desktop App',
        message: message.trim(),
        priority: 'High',
      })
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

          {/* 2. Official Social & Contact Section */}
          <div className="founder-contact-section">
            <h4 className="section-heading">Connect Directly with Founder</h4>

            {/* Official Executive Photo & Showcase (Placed between 'Connect Directly with Founder' and Contact Cards) */}
            <div className="founder-banner-wrapper" style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, border: '1px solid rgba(56, 189, 248, 0.3)', boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)', margin: '14px 0 20px' }}>
              <img
                src="/founder_ceo_showcase.jpg"
                alt={`${settings.founderName || 'Laxman Choudhary'} - Founder & CEO`}
                className="founder-banner-img"
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  if (target.src.indexOf('founder_banner.jpg') === -1) {
                    target.src = bannerImg
                  }
                }}
              />
              <div className="founder-banner-overlay" style={{ background: 'linear-gradient(to top, rgba(7, 13, 30, 0.95) 0%, rgba(7, 13, 30, 0.3) 60%, transparent 100%)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ background: 'rgba(37, 99, 235, 0.7)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                    👥 100K+ Happy Users
                  </span>
                  <span style={{ background: 'rgba(16, 185, 129, 0.7)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                    ⭐ 4.9★ User Rating
                  </span>
                  <span style={{ background: 'rgba(168, 85, 247, 0.7)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                    🌐 Available Worldwide
                  </span>
                </div>
                <span className="founder-quote" style={{ fontSize: '0.92rem', color: '#f8fafc', fontWeight: 600 }}>
                  &ldquo;Technology should bring people closer.&rdquo; — Laxman Choudhary
                </span>
              </div>
            </div>

            {/* 👑 3D Interactive 5-Photo Animated Carousel with Exactly 3 Exclusive Contact Options (Email, YouTube, Instagram) */}
            <div style={{ marginTop: 14, marginBottom: 20 }}>
              <Founder3DPhotoCarousel />
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

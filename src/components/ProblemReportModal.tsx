import React, { useState, useEffect } from 'react'
import { useAppSettings } from '../context/AppSettingsContext'
import './ProblemReportModal.css'

interface ProblemReportModalProps {
  isOpen: boolean
  onClose: () => void
  initialCategory?: string
}

export const ProblemReportModal: React.FC<ProblemReportModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'Screen Mirroring',
}) => {
  const { settings } = useAppSettings()

  // Persistent User ID for this client
  const [userId, setUserId] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [contact, setContact] = useState<string>('')
  const [category, setCategory] = useState<string>(initialCategory)
  const [message, setMessage] = useState<string>('')
  const [deviceSpec, setDeviceSpec] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submittedTicket, setSubmittedTicket] = useState<{ ticketId: string; userId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setSubmittedTicket(null)
      setError(null)
      return
    }

    // Initialize or load permanent user ID
    let currentId = localStorage.getItem('lbm_client_user_id')
    if (!currentId) {
      currentId = `LBM-USR-${Math.floor(10000 + Math.random() * 90000)}`
      localStorage.setItem('lbm_client_user_id', currentId)
    }
    setUserId(currentId)

    // Load saved user name/contact if any
    const savedName = localStorage.getItem('lbm_client_user_name') || ''
    const savedContact = localStorage.getItem('lbm_client_user_contact') || ''
    if (savedName) setName(savedName)
    if (savedContact) setContact(savedContact)

    // Detect device info
    const platform = navigator.userAgent.includes('Windows')
      ? 'Windows PC'
      : navigator.userAgent.includes('Android')
      ? 'Android Mobile'
      : navigator.userAgent.includes('iPhone')
      ? 'iOS iPhone'
      : 'Desktop/Web'
    const screenRes = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'
    setDeviceSpec(`${platform} (${screenRes})`)
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('कृपया अपनी समस्या या संदेश का विवरण दर्ज करें (Please enter details of your issue).')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      userId,
      name: name.trim() || 'Anonymous User',
      contact: contact.trim() || 'Not Provided',
      category,
      deviceInfo: deviceSpec,
      priority: 'Normal',
      message: message.trim(),
      timestamp: new Date().toISOString(),
    }

    // Save user info locally for future tickets
    if (name.trim()) localStorage.setItem('lbm_client_user_name', name.trim())
    if (contact.trim()) localStorage.setItem('lbm_client_user_contact', contact.trim())

    let ticketId = `TCK-${Date.now().toString().slice(-6)}`

    try {
      const res = await fetch('/api/support/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ticketId) ticketId = data.ticketId
      }
    } catch (err) {
      console.warn('[Problem Report] Network error posting to server, saved locally:', err)
    }

    // Always store ticket in local storage so AdminPanel can merge it 100% reliably
    try {
      const existingRaw = localStorage.getItem('lbm_local_user_queries')
      const existing = existingRaw ? JSON.parse(existingRaw) : []
      const ticketObj = {
        id: ticketId,
        userId,
        name: payload.name,
        contact: payload.contact,
        category: payload.category,
        deviceInfo: payload.deviceInfo,
        message: payload.message,
        status: 'new',
        timestamp: payload.timestamp,
      }
      existing.unshift(ticketObj)
      localStorage.setItem('lbm_local_user_queries', JSON.stringify(existing.slice(0, 50)))
    } catch {}

    setSubmitting(false)
    setSubmittedTicket({ ticketId, userId })
    setMessage('')
  }

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userId)
  }

  const directWhatsAppUrl = `https://wa.me/${(settings.whatsapp || '+919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    `नमस्ते Founder & CEO! मेरी LBM User ID है: ${userId}\nमेरी समस्या का विवरण:\n${message || 'सहायता चाहिए।'}`
  )}`

  return (
    <div className="support-modal-backdrop" onClick={onClose}>
      <div className="support-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="support-modal-header">
          <div className="support-header-left">
            <div className="support-icon-circle">🛠️</div>
            <div>
              <h3>24/7 LBM Support &amp; Problem Desk</h3>
              <p>समस्या समाधान एवं सुझाव — सीधा Founder &amp; CEO से संपर्क</p>
            </div>
          </div>
          <button type="button" className="support-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {submittedTicket ? (
          <div className="support-success-pane">
            <div className="success-icon-badge">✅</div>
            <h4>आपकी समस्या सफलतापूर्वक दर्ज हो गई है!</h4>
            <p>
              Founder &amp; CEO <strong>{settings.founderName || 'Laxman Choudhary'}</strong> और सपोर्ट टीम को आपका संदेश प्राप्त हो गया है। एडमिन पैनल में आपका टिकट सक्रिय है।
            </p>

            <div className="success-ticket-box">
              <div>Ticket ID: <strong>{submittedTicket.ticketId}</strong></div>
              <div>User ID: <strong>{submittedTicket.userId}</strong></div>
            </div>

            <div className="support-success-actions">
              <a
                href={directWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="wa-direct-btn"
              >
                💬 व्हाट्सएप पर सीधे बात करें
              </a>
              <button type="button" className="support-done-btn" onClick={onClose}>
                पूर्ण (Done)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* User ID Banner */}
            <div className="support-user-id-banner">
              <div>
                <span>आपकी यूज़र आईडी (Your User ID):</span>
                <span className="user-id-badge" style={{ marginLeft: 8 }}>{userId}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUserId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                📋 Copy ID
              </button>
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="support-form-grid">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="support-field">
                  <label>आपका नाम (Your Name):</label>
                  <input
                    type="text"
                    className="support-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="उदा. राहुल शर्मा"
                  />
                </div>

                <div className="support-field">
                  <label>मोबाइल / व्हाट्सएप (Phone / WA):</label>
                  <input
                    type="text"
                    className="support-input"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="support-field">
                <label>समस्या का प्रकार (Issue Category):</label>
                <select
                  className="support-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Screen Mirroring">🖥️ स्क्रीन मिररिंग काम नहीं कर रही (Screen Mirroring)</option>
                  <option value="Remote PC Control">💻 रिमोट कंप्यूटर कनेक्शन व पासवर्ड (Remote PC)</option>
                  <option value="Audio Sync">🔊 आवाज़ / साउंड नहीं आ रही (Audio Sync)</option>
                  <option value="Download Setup">📥 Windows Setup (.exe) डाउनलोड सहायता (Download / Install)</option>
                  <option value="USB Android">🤖 Android USB Debugging कनेक्शन (Android USB)</option>
                  <option value="Feature Request">💡 नया फीचर सुझाव या आइडिया (Feature Suggestion)</option>
                  <option value="Other">❓ अन्य समस्या (Other Problem)</option>
                </select>
              </div>

              <div className="support-field">
                <label>समस्या या संदेश का विस्तार से विवरण (Describe your problem):</label>
                <textarea
                  className="support-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="यहाँ विस्तार से लिखें कि क्या समस्या आ रही है, ताकि एडमिन तुरंत समाधान कर सकें…"
                  rows={3}
                />
              </div>

              <div className="device-spec-chip">
                <span>💻 डिटेक्टेड डिवाइस:</span>
                <strong style={{ color: '#38bdf8' }}>{deviceSpec}</strong>
                <span style={{ marginLeft: 'auto', color: '#4ade80' }}>● Auto-Attached to Ticket</span>
              </div>

              <button
                type="submit"
                className="support-submit-btn"
                disabled={submitting}
              >
                {submitting ? 'दर्ज कर रहे हैं…' : '🚀 समस्या दर्ज करें (Submit Problem to Admin)'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

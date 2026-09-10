import React, { useState } from 'react'
import logoImg from '../assets/logo.png'
import { useAppSettings } from '../context/AppSettingsContext'

interface FAQsModalProps {
  onClose: () => void
}

export const FAQsModal: React.FC<FAQsModalProps> = ({ onClose }) => {
  const { settings } = useAppSettings()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      q: `1. How to mirror iPhone or iPad to PC via AirPlay?`,
      a: `Make sure your iPhone and PC are connected to the same Wi-Fi network. Swipe down from top-right corner to open Control Center, tap "Screen Mirroring", and select "${settings.appName}". Your iPhone screen will appear instantly on PC!`
    },
    {
      q: '2. How to enable USB Debugging on Android for USB Mirroring?',
      a: 'Go to Android Settings > About Phone > tap "Build Number" 7 times to enable Developer Options. Then go to Settings > System > Developer Options and turn ON "USB Debugging". Connect USB cable to PC and tap "Allow" on the phone prompt.'
    },
    {
      q: '3. What to do if Screen Mirroring does not detect this PC?',
      a: `1) Verify both devices are on the exact same Wi-Fi router. 2) Click "Restart AirPlay Service" on the iOS Screen Mirroring card. 3) Make sure Windows Defender Firewall allows ${settings.appName} incoming connections.`
    },
    {
      q: '4. How does the Login and "Your ID" work?',
      a: 'You can explore the app and receive screens without logging in. When you start an outbound screen cast or stream, click "Log in" in the top-right header or click "Cast Screen". Enter your email and password to activate your ID and start casting!'
    },
    {
      q: `5. How to download the ${settings.appName} mobile app on Android?`,
      a: 'Click "Download App" in the left sidebar menu. Scan the QR code with your Android phone camera to download the APK or open the mobile client on your phone.'
    }
  ]

  return (
    <div className="auth-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="faqs-modal-card">
        <button type="button" className="download-close-btn" onClick={onClose} title="Close">✕</button>
        <div className="faqs-modal-header">
          <img
            src={settings.appLogo || logoImg}
            alt={settings.appName}
            className="about-logo-img"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = logoImg
            }}
          />
          <h2>{settings.appName} Help &amp; FAQs</h2>
          <p>Quick guides for wireless and USB screen mirroring</p>
        </div>

        <div className="faqs-accordion">
          {faqs.map((item, idx) => {
            const isOpen = openIndex === idx
            return (
              <div key={idx} className={`faq-card-item ${isOpen ? 'active' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span>{item.q}</span>
                  <span className="chevron">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="faq-answer-body">
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="faqs-footer">
          <button type="button" className="airplayer-submit-btn" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  )
}

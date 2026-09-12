import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAppSettings, type AppSettings } from '../context/AppSettingsContext'
import './AdminPanel.css'

interface AdminPanelProps {
  onSwitchToUserView: () => void
}

interface UserQuery {
  id: string
  userId?: string
  name: string
  contact: string
  category?: string
  deviceInfo?: string
  priority?: string
  message: string
  timestamp: string
  status?: string
}

interface RegisteredUser {
  id: string
  username: string
  email: string
  mobile?: string
  createdAt?: number
  updatedAt?: number
  hasPassword?: boolean
  maskedPassword?: string
  plainPassword?: string
}

interface LiveSession {
  sessionId: string
  pin: string
  status: string
  clientName?: string
  clientPlatform?: string
  connectionMethod?: string
  createdAt?: number
}

interface ImageAsset {
  name: string
  path: string
  sizeKb: string
  modifiedAt?: string
}

interface AdminStats {
  totalUsers: number
  activeSessionsCount: number
  totalQueries: number
  totalImages: number
  uptimeSeconds: number
  activeSessions: LiveSession[]
  recentQueries: UserQuery[]
  users: RegisteredUser[]
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSwitchToUserView }) => {
  const { settings, updateSettings, refreshSettings } = useAppSettings()

  // Active Tab: 'overview' | 'branding' | 'contact' | 'inbox' | 'users' | 'images' | 'security'
  const [activeTab, setActiveTab] = useState<'overview' | 'branding' | 'contact' | 'inbox' | 'users' | 'images' | 'security'>('overview')

  // Local Editable Settings State
  const [formData, setFormData] = useState<AppSettings>({ ...settings })
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Data Lists
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [queries, setQueries] = useState<UserQuery[]>([])
  const [usersList, setUsersList] = useState<RegisteredUser[]>([])
  const [imagesList, setImagesList] = useState<ImageAsset[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // Direct WhatsApp Sender Utility State
  const [directPhone, setDirectPhone] = useState('')
  const [directMessage, setDirectMessage] = useState('नमस्ते! LBM Mirror की ओर से आपका स्वागत है।')

  // Search & Filter State
  const [querySearch, setQuerySearch] = useState<string>('')
  const [queryFilter, setQueryFilter] = useState<'all' | 'new' | 'resolved'>('all')
  const [userSearch, setUserSearch] = useState<string>('')

  // Password visibility map
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false)
  const [newUsername, setNewUsername] = useState<string>('')
  const [newEmail, setNewEmail] = useState<string>('')
  const [newMobile, setNewMobile] = useState<string>('')
  const [newUserPassword, setNewUserPassword] = useState<string>('')
  const [addingUser, setAddingUser] = useState<boolean>(false)

  // Reset Password Modal State
  const [resetTargetUser, setResetTargetUser] = useState<RegisteredUser | null>(null)
  const [newResetPasswordInput, setNewResetPasswordInput] = useState<string>('')
  const [resettingPassword, setResettingPassword] = useState<boolean>(false)

  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Admin PIN change
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  // Sync formData when settings change
  useEffect(() => {
    setFormData({ ...settings })
  }, [settings])

  // Fetch full stats and lists
  const fetchAllData = useCallback(async () => {
    setLoadingData(true)
    try {
      // 1. Stats
      const statsRes = await fetch('/api/admin/stats').catch(() => null)
      if (statsRes?.ok) {
        const data = await statsRes.json()
        if (data.success) setStats(data.stats)
      }

      // 2. Queries / Ideas / User Problems (Merge Server + Local Storage)
      let fetchedQueries: UserQuery[] = []
      const queriesRes = await fetch('/api/admin/queries').catch(() => null)
      if (queriesRes?.ok) {
        const data = await queriesRes.json()
        if (data.success && Array.isArray(data.queries)) {
          fetchedQueries = data.queries
        }
      }
      try {
        const localRaw = localStorage.getItem('lbm_local_user_queries')
        if (localRaw) {
          const localList: UserQuery[] = JSON.parse(localRaw)
          for (const lq of localList) {
            if (!fetchedQueries.some((fq) => fq.id === lq.id)) {
              fetchedQueries.unshift(lq)
            }
          }
        }
      } catch {}
      setQueries(fetchedQueries)

      // 3. Users Directory (Merge Server + Local Storage Registrations)
      let fetchedUsers: RegisteredUser[] = []
      const usersRes = await fetch('/api/admin/users').catch(() => null)
      if (usersRes?.ok) {
        const data = await usersRes.json()
        if (data.success && Array.isArray(data.users)) {
          fetchedUsers = data.users
        }
      }
      try {
        const localAuthRaw = localStorage.getItem('lbm_auth_users')
        if (localAuthRaw) {
          const localAuthList = JSON.parse(localAuthRaw)
          for (const lau of localAuthList) {
            if (!fetchedUsers.some((fu) => (fu.email && lau.email && fu.email.toLowerCase() === lau.email.toLowerCase()) || fu.id === lau.id)) {
              fetchedUsers.push({
                id: lau.id || `USR-${Math.floor(1000 + Math.random() * 9000)}`,
                username: lau.username || lau.name || (lau.email ? lau.email.split('@')[0] : 'user'),
                email: lau.email || '',
                mobile: lau.mobile || '',
                createdAt: lau.createdAt || Date.now(),
                hasPassword: Boolean(lau.password),
                maskedPassword: lau.password ? '••••••••' : 'Not Set',
                plainPassword: lau.password,
              })
            }
          }
        }
      } catch {}
      setUsersList(fetchedUsers)

      // 4. Images
      const imagesRes = await fetch('/api/admin/images').catch(() => null)
      if (imagesRes?.ok) {
        const data = await imagesRes.json()
        if (data.success) setImagesList(data.images || [])
      }
    } catch (err) {
      console.warn('[AdminPanel] Error fetching admin data:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 15000)
    return () => clearInterval(interval)
  }, [fetchAllData])

  const notifySuccess = (msg: string) => {
    setSaveMessage(msg)
    setErrorMessage(null)
    setTimeout(() => setSaveMessage(null), 4000)
  }

  const notifyError = (msg: string) => {
    setErrorMessage(msg)
    setSaveMessage(null)
    setTimeout(() => setErrorMessage(null), 4000)
  }

  // Handle Form Change
  const handleChange = (field: keyof AppSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Save Settings to Backend
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    const res = await updateSettings(formData)
    setSaving(false)
    if (res.success) {
      notifySuccess('✅ ' + (res.message || 'Settings saved successfully!'))
      refreshSettings()
    } else {
      notifyError('❌ ' + (res.error || 'Failed to save settings.'))
    }
  }

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField?: 'appLogo' | 'founderBanner') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string
        const res = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64Data,
            label: targetField || 'custom_image',
          }),
        })
        const data = await res.json()
        if (data.success && data.url) {
          notifySuccess(`✅ छवि अपलोड हो गई: ${file.name}`)
          if (targetField) {
            handleChange(targetField, data.url)
            // Auto save updated logo or banner
            await updateSettings({ [targetField]: data.url })
          }
          fetchAllData()
        } else {
          notifyError('❌ ' + (data.error || 'Image upload failed.'))
        }
      } catch {
        notifyError('❌ Image upload failed. Network error.')
      } finally {
        setUploadingImage(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  // Direct WhatsApp Launcher
  const handleDirectWhatsApp = (phoneNum?: string, msgText?: string) => {
    const rawNumber = (phoneNum || directPhone).replace(/[^0-9]/g, '')
    if (!rawNumber) {
      notifyError('कृपया मान्य मोबाइल नंबर दर्ज करें (Please enter a valid phone number).')
      return
    }
    const messageToSend = encodeURIComponent(msgText || directMessage || 'Hello from LBM Mirror!')
    const url = `https://wa.me/${rawNumber}?text=${messageToSend}`
    window.open(url, '_blank')
  }

  // Query Actions
  const handleQueryStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/queries/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setQueries((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)))
        notifySuccess('स्टेटस अपडेट किया गया (Status updated)')
      }
    } catch {
      notifyError('Failed to update status.')
    }
  }

  const handleDeleteQuery = async (id: string) => {
    if (!window.confirm('क्या आप वाकई इस संदेश को हटाना चाहते हैं? (Delete this message?)')) return
    try {
      const res = await fetch(`/api/admin/queries/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setQueries((prev) => prev.filter((q) => q.id !== id))
        notifySuccess('संदेश हटा दिया गया (Message deleted)')
      }
    } catch {
      notifyError('Failed to delete query.')
    }
  }

  // User Management Actions
  const handleTogglePasswordView = (userId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !newUserPassword.trim()) {
      notifyError('ईमेल और पासवर्ड आवश्यक हैं (Email and password are required).')
      return
    }
    setAddingUser(true)
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          email: newEmail.trim(),
          mobile: newMobile.trim(),
          password: newUserPassword.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        notifySuccess('✅ ' + data.message)
        setShowAddUserModal(false)
        setNewUsername('')
        setNewEmail('')
        setNewMobile('')
        setNewUserPassword('')
        fetchAllData()
      } else {
        notifyError('❌ ' + (data.error || 'Failed to create user.'))
      }
    } catch {
      // Local fallback
      try {
        const existingRaw = localStorage.getItem('lbm_auth_users')
        const existing = existingRaw ? JSON.parse(existingRaw) : []
        const newUserObj = {
          id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
          username: newUsername.trim() || newEmail.split('@')[0],
          email: newEmail.trim(),
          mobile: newMobile.trim(),
          password: newUserPassword.trim(),
          createdAt: Date.now(),
        }
        existing.push(newUserObj)
        localStorage.setItem('lbm_auth_users', JSON.stringify(existing))
        notifySuccess('✅ यूज़र सफलतापूर्वक बनाया गया (User created)!')
        setShowAddUserModal(false)
        setNewUsername('')
        setNewEmail('')
        setNewMobile('')
        setNewUserPassword('')
        fetchAllData()
      } catch {
        notifyError('❌ Failed to save user locally.')
      }
    } finally {
      setAddingUser(false)
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTargetUser || !newResetPasswordInput.trim()) return
    setResettingPassword(true)
    try {
      const res = await fetch(`/api/admin/users/${resetTargetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newResetPasswordInput.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        notifySuccess('✅ ' + data.message)
        setResetTargetUser(null)
        setNewResetPasswordInput('')
        fetchAllData()
      } else {
        notifyError('❌ ' + (data.error || 'Password reset failed.'))
      }
    } catch {
      // Local fallback
      try {
        const existingRaw = localStorage.getItem('lbm_auth_users')
        if (existingRaw) {
          const existing = JSON.parse(existingRaw)
          const idx = existing.findIndex((u: any) => u.id === resetTargetUser.id || u.email === resetTargetUser.email)
          if (idx !== -1) {
            existing[idx].password = newResetPasswordInput.trim()
            localStorage.setItem('lbm_auth_users', JSON.stringify(existing))
          }
        }
        notifySuccess(`✅ पासवर्ड सफलतापूर्वक रीसेट किया गया (${resetTargetUser.username})!`)
        setResetTargetUser(null)
        setNewResetPasswordInput('')
        fetchAllData()
      } catch {
        notifyError('❌ Password reset failed.')
      }
    } finally {
      setResettingPassword(false)
    }
  }

  const handleDeleteUser = async (user: RegisteredUser) => {
    if (!window.confirm(`क्या आप वाकई यूज़र "${user.username}" (${user.email}) को हटाना चाहते हैं?`)) return
    try {
      await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    } catch {}
    try {
      const existingRaw = localStorage.getItem('lbm_auth_users')
      if (existingRaw) {
        const existing = JSON.parse(existingRaw)
        const filtered = existing.filter((u: any) => u.id !== user.id && u.email !== user.email)
        localStorage.setItem('lbm_auth_users', JSON.stringify(filtered))
      }
    } catch {}
    setUsersList((prev) => prev.filter((u) => u.id !== user.id))
    notifySuccess(`✅ यूज़र ${user.username} हटा दिया गया।`)
  }

  // Change Admin PIN
  const handleSaveNewPin = async () => {
    if (!newPin.trim() || newPin.length < 4) {
      notifyError('पिन कम से कम 4 अंकों का होना चाहिए (PIN must be at least 4 digits).')
      return
    }
    if (newPin !== confirmPin) {
      notifyError('दोनों पिन मेल नहीं खाते (PINs do not match).')
      return
    }
    const res = await updateSettings({ adminPin: newPin.trim() })
    if (res.success) {
      notifySuccess('✅ एडमिन पिन सफलतापूर्वक बदल दिया गया (Admin PIN updated)!')
      setNewPin('')
      setConfirmPin('')
    } else {
      notifyError('❌ Failed to update PIN.')
    }
  }

  const formatUptime = (sec: number) => {
    const hrs = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  return (
    <div className="admin-panel-container">
      {/* ════ TOP NAVBAR ════ */}
      <header className="admin-top-bar">
        <div className="admin-brand-col">
          <span className="admin-shield-icon">🛡️</span>
          <div>
            <h2 className="admin-title">LBM Mirror Control Panel</h2>
            <p className="admin-subtitle">फाउंडर व मास्टर एडमिन डैशबोर्ड (Full Access)</p>
          </div>
        </div>

        <div className="admin-top-actions">
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={fetchAllData}
            title="रिफ्रेश करें (Refresh Data)"
            disabled={loadingData}
          >
            🔄 {loadingData ? 'रिफ्रेश हो रहा है…' : 'Refresh'}
          </button>

          <button
            type="button"
            className="switch-user-mode-btn"
            onClick={onSwitchToUserView}
            title="नॉर्मल स्क्रीन मिररिंग यूज़र मोड पर वापस जाएं"
          >
            ← Switch to Normal User View (यूज़र मोड)
          </button>
        </div>
      </header>

      {/* Floating Notifications */}
      {saveMessage && <div className="admin-alert-banner success">{saveMessage}</div>}
      {errorMessage && <div className="admin-alert-banner error">{errorMessage}</div>}

      {/* ════ METRIC STATS SUMMARY BAR ════ */}
      <section className="admin-metrics-ribbon">
        <div
          className={`metric-stat-card ${activeTab === 'users' ? 'active-card' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <div className="metric-icon-box blue-gradient">👥</div>
          <div className="metric-details">
            <span className="metric-label">कुल जुड़े यूज़र्स (Registered)</span>
            <strong className="metric-number">{stats?.totalUsers ?? usersList.length}</strong>
            <span className="metric-hint">क्लिक करके यूज़र्स देखें &rarr;</span>
          </div>
        </div>

        <div
          className={`metric-stat-card ${activeTab === 'users' ? 'active-card' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <div className="metric-icon-box green-gradient">⚡</div>
          <div className="metric-details">
            <span className="metric-label">लाइव एक्टिव मिररिंग (Live Cast)</span>
            <strong className="metric-number">{stats?.activeSessionsCount ?? 0}</strong>
            <span className="metric-hint">डिवाइस स्टेटस देखें &rarr;</span>
          </div>
        </div>

        <div
          className={`metric-stat-card ${activeTab === 'inbox' ? 'active-card' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          <div className="metric-icon-box orange-gradient">💡</div>
          <div className="metric-details">
            <span className="metric-label">यूज़र आइडिया व संदेश (Inbox)</span>
            <strong className="metric-number">{queries.length}</strong>
            <span className="metric-hint">मैसेज पढ़ें व जवाब दें &rarr;</span>
          </div>
        </div>

        <div
          className={`metric-stat-card ${activeTab === 'images' ? 'active-card' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          <div className="metric-icon-box purple-gradient">🖼️</div>
          <div className="metric-details">
            <span className="metric-label">कुल इमेजेज व एसेट्स (Gallery)</span>
            <strong className="metric-number">{imagesList.length}</strong>
            <span className="metric-hint">लोगो व बैनर बदलें &rarr;</span>
          </div>
        </div>

        <div className="metric-stat-card server-health-card">
          <div className="metric-icon-box teal-gradient">🚀</div>
          <div className="metric-details">
            <span className="metric-label">सर्वर हेल्थ व अपटाइम</span>
            <strong className="metric-number">{stats ? formatUptime(stats.uptimeSeconds) : 'Live'}</strong>
            <span className="metric-badge-live">🟢 Online 0.0.0.0:3001</span>
          </div>
        </div>
      </section>

      {/* ════ MAIN BODY WITH SIDEBAR TABS ════ */}
      <div className="admin-body-layout">
        {/* Navigation Tabs */}
        <aside className="admin-tab-nav">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard Overview</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'branding' ? 'active' : ''}`}
            onClick={() => setActiveTab('branding')}
          >
            <span className="nav-icon">⚙️</span>
            <span>ऐप नाम व लोगो (Branding)</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            <span className="nav-icon">📱</span>
            <span>सोशल, फ़ोन व WhatsApp</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'inbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('inbox')}
          >
            <span className="nav-icon">💬</span>
            <span>यूज़र आइडिया व संदेश</span>
            {queries.length > 0 && <span className="tab-pill-badge">{queries.length}</span>}
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="nav-icon">👥</span>
            <span>यूज़र्स व लाइव सेशन्स</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            <span className="nav-icon">🖼️</span>
            <span>इमेजेज व लोगो गैलरी</span>
            <span className="tab-pill-badge muted">{imagesList.length}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <span className="nav-icon">🔒</span>
            <span>एडमिन पिन व सुरक्षा</span>
          </button>
        </aside>

        {/* Content Pane */}
        <main className="admin-content-pane">
          {/* ══════════════ TAB 1: OVERVIEW ══════════════ */}
          {activeTab === 'overview' && (
            <div className="admin-view-panel">
              <div className="panel-header-row">
                <div>
                  <h3 className="panel-main-title">सिस्टम अवलोकन (Dashboard Overview)</h3>
                  <p className="panel-desc">
                    यहाँ से आप अपने स्क्रीन मिररिंग ऐप का पूरा नियंत्रण और लाइव गतिविधियाँ देख सकते हैं।
                  </p>
                </div>
              </div>

              {/* Quick WhatsApp Direct Messenger Tool */}
              <div className="admin-feature-card whatsapp-quick-card">
                <div className="card-header-line">
                  <div className="card-title-group">
                    <span className="badge-icon-wa">💬</span>
                    <div>
                      <h4 className="card-heading">डायरेक्ट व्हाट्सएप सेंडर टूल (Direct WhatsApp Messenger)</h4>
                      <p className="card-subheading">
                        एडमिन पैनल से सीधे किसी भी मोबाइल नंबर पर बिना नंबर सेव किए संदेश भेजें।
                      </p>
                    </div>
                  </div>
                </div>

                <div className="direct-sender-form">
                  <div className="sender-input-group">
                    <label>मोबाइल नंबर (Country Code सहित, उदा: 919876543210):</label>
                    <input
                      type="text"
                      placeholder="उदा: +91 98765 43210"
                      value={directPhone}
                      onChange={(e) => setDirectPhone(e.target.value)}
                      className="admin-input-field"
                    />
                  </div>
                  <div className="sender-input-group">
                    <label>संदेश (Message text):</label>
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={directMessage}
                      onChange={(e) => setDirectMessage(e.target.value)}
                      className="admin-input-field"
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-action-btn wa-send-btn"
                    onClick={() => handleDirectWhatsApp()}
                  >
                    <span>🚀 डायरेक्ट व्हाट्सएप पर भेजें</span>
                  </button>
                </div>
              </div>

              {/* Two Column Grid: Current Brand Info & Recent Queries */}
              <div className="admin-grid-split">
                <div className="admin-feature-card">
                  <h4 className="card-heading">वर्तमान ऐप ब्रांडिंग (Current Live Branding)</h4>
                  <div className="current-brand-preview">
                    <div className="brand-logo-wrap">
                      <img
                        src={settings.appLogo || '/logo.png'}
                        alt="Current Logo"
                        className="preview-logo-thumb"
                        onError={(e) => {
                          // Fallback to default
                          ;(e.target as HTMLImageElement).src = '/logo.png'
                        }}
                      />
                    </div>
                    <div className="brand-texts">
                      <h3 className="brand-app-name">{settings.appName}</h3>
                      <p className="brand-tagline">{settings.appTagline}</p>
                      <p className="brand-founder">फाउंडर: <strong>{settings.founderName}</strong></p>
                      <p className="brand-contact">📞 {settings.phone} | ✉️ {settings.email}</p>
                      <p className="brand-insta">📸 {settings.instagramHandle}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => setActiveTab('branding')}
                  >
                    ✏️ ऐप नाम व लोगो बदलें &rarr;
                  </button>
                </div>

                <div className="admin-feature-card">
                  <div className="card-header-line">
                    <h4 className="card-heading">हाल के यूज़र संदेश व आइडिया (Recent Messages)</h4>
                    <span className="count-tag-sm">{queries.length} कुल संदेश</span>
                  </div>

                  {queries.length === 0 ? (
                    <p className="empty-text">अभी तक कोई यूज़र संदेश प्राप्त नहीं हुआ है।</p>
                  ) : (
                    <div className="recent-queries-mini-list">
                      {queries.slice(0, 3).map((q) => (
                        <div key={q.id} className="mini-query-row">
                          <div className="mini-query-meta">
                            <strong>{q.name}</strong>
                            <span className="mini-contact">{q.contact}</span>
                          </div>
                          <p className="mini-message">"{q.message}"</p>
                          <div className="mini-actions">
                            <button
                              type="button"
                              className="mini-wa-btn"
                              onClick={() => handleDirectWhatsApp(q.contact, `नमस्ते ${q.name}! आपके संदेश के संबंध में:`)}
                              title="WhatsApp पर जवाब दें"
                            >
                              💬 WhatsApp
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => setActiveTab('inbox')}
                  >
                    📬 सभी संदेश व आइडिया देखें &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: BRANDING (APP NAME, LOGO, BANNER) ══════════════ */}
          {activeTab === 'branding' && (
            <div className="admin-view-panel">
              <div className="panel-header-row">
                <div>
                  <h3 className="panel-main-title">ऐप ब्रांडिंग सेटिंग्स (App Name &amp; Logo Editor)</h3>
                  <p className="panel-desc">
                    यहाँ से आप ऐप का नाम, लोगो, स्लोगन और फाउंडर प्रोफ़ाइल सीधे बदल सकते हैं। यह बदलाव तुरंत सभी यूज़र्स के लिए लागू होगा।
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-save-btn"
                  onClick={handleSaveSettings}
                  disabled={saving}
                >
                  {saving ? 'सहेज रहे हैं…' : '💾 बदलाव सहेजें (Save Changes)'}
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="admin-form-grid">
                {/* 1. App Name & Tagline */}
                <div className="admin-feature-card">
                  <h4 className="card-heading">1. ऐप का नाम और टैगलाइन (App Title &amp; Tagline)</h4>
                  <div className="form-row-pair">
                    <div className="form-field">
                      <label>ऐप का नाम (App Name):</label>
                      <input
                        type="text"
                        value={formData.appName}
                        onChange={(e) => handleChange('appName', e.target.value)}
                        placeholder="उदा: LBM Mirror"
                        className="admin-input-field"
                        required
                      />
                      <span className="field-hint">यह नाम साइडबार, विंडो हेडर और मोबाइल डाउनलोड पेज पर दिखेगा।</span>
                    </div>

                    <div className="form-field">
                      <label>टैगलाइन / सबटाइटल (Tagline):</label>
                      <input
                        type="text"
                        value={formData.appTagline}
                        onChange={(e) => handleChange('appTagline', e.target.value)}
                        placeholder="उदा: Screen Mirroring"
                        className="admin-input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. App Logo Manager */}
                <div className="admin-feature-card">
                  <h4 className="card-heading">2. ऐप का लोगो (App Logo Editor &amp; Upload)</h4>
                  <div className="logo-manager-split">
                    <div className="current-logo-display">
                      <span className="logo-label-tag">वर्तमान लोगो (Active Logo):</span>
                      <div className="logo-avatar-frame">
                        <img
                          src={formData.appLogo || '/logo.png'}
                          alt="App Logo"
                          className="logo-full-render"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = '/logo.png'
                          }}
                        />
                      </div>
                    </div>

                    <div className="logo-inputs-block">
                      <div className="form-field">
                        <label>नया लोगो फ़ाइल अपलोड करें (Upload Logo from Computer):</label>
                        <div className="upload-btn-row">
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={(e) => handleImageUpload(e, 'appLogo')}
                            style={{ display: 'none' }}
                            id="logo-file-input"
                          />
                          <label htmlFor="logo-file-input" className="file-upload-trigger-btn">
                            📁 {uploadingImage ? 'अपलोड हो रहा है…' : 'कंप्यूटर से नया लोगो चुनें (Upload Logo)'}
                          </label>
                        </div>
                      </div>

                      <div className="form-field">
                        <label>या लोगो इमेज URL दर्ज करें (Image URL):</label>
                        <input
                          type="text"
                          value={formData.appLogo}
                          onChange={(e) => handleChange('appLogo', e.target.value)}
                          placeholder="/logo.png या https://..."
                          className="admin-input-field"
                        />
                      </div>

                      <div className="quick-presets">
                        <span className="preset-label">क्विक विकल्प:</span>
                        <button
                          type="button"
                          className="preset-chip"
                          onClick={() => handleChange('appLogo', '/logo.png')}
                        >
                          Default LBM Logo
                        </button>
                        <button
                          type="button"
                          className="preset-chip"
                          onClick={() => handleChange('appLogo', '/favicon.png')}
                        >
                          Square Icon
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Founder Details & Banner */}
                <div className="admin-feature-card">
                  <h4 className="card-heading">3. फाउंडर और सीईओ प्रोफ़ाइल (Founder Profile &amp; Banner)</h4>
                  <div className="form-row-pair">
                    <div className="form-field">
                      <label>फाउंडर का नाम (Founder Name):</label>
                      <input
                        type="text"
                        value={formData.founderName}
                        onChange={(e) => handleChange('founderName', e.target.value)}
                        placeholder="Laxman Choudhary"
                        className="admin-input-field"
                      />
                    </div>
                    <div className="form-field">
                      <label>पद / भूमिका (Founder Role):</label>
                      <input
                        type="text"
                        value={formData.founderRole}
                        onChange={(e) => handleChange('founderRole', e.target.value)}
                        placeholder="Founder & CEO — LBM Mirror"
                        className="admin-input-field"
                      />
                    </div>
                  </div>

                  <div className="form-row-pair">
                    <div className="form-field">
                      <label>फाउंडर कोट / विचार (Quote):</label>
                      <input
                        type="text"
                        value={formData.founderQuote}
                        onChange={(e) => handleChange('founderQuote', e.target.value)}
                        placeholder="Ideas To A More Connected World"
                        className="admin-input-field"
                      />
                    </div>

                    <div className="form-field">
                      <label>फाउंडर बैनर इमेज (Banner Image Path/URL):</label>
                      <input
                        type="text"
                        value={formData.founderBanner}
                        onChange={(e) => handleChange('founderBanner', e.target.value)}
                        placeholder="/founder_banner.jpg"
                        className="admin-input-field"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-submit-bar">
                  <button type="submit" className="admin-save-btn large" disabled={saving}>
                    {saving ? 'सहेज रहे हैं…' : '💾 सभी बदलाव सहेजें (Save All Branding)'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════ TAB 3: CONTACT & SOCIAL MEDIA ══════════════ */}
          {activeTab === 'contact' && (
            <div className="admin-view-panel">
              <div className="panel-header-row">
                <div>
                  <h3 className="panel-main-title">सोशल मीडिया व संपर्क विवरण (Contact &amp; Social Media Editor)</h3>
                  <p className="panel-desc">
                    यहाँ से आप इंस्टाग्राम आईडी, मोबाइल नंबर, व्हाट्सएप लिंक और सोशल प्रोफाइल्स अपडेट कर सकते हैं।
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-save-btn"
                  onClick={handleSaveSettings}
                  disabled={saving}
                >
                  {saving ? 'सहेज रहे हैं…' : '💾 बदलाव सहेजें (Save Changes)'}
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="admin-form-grid">
                {/* 1. Mobile & WhatsApp */}
                <div className="admin-feature-card">
                  <div className="card-title-row">
                    <h4 className="card-heading">1. मोबाइल नंबर और व्हाट्सएप (Mobile Number &amp; WhatsApp)</h4>
                    <span className="tag-green-pulse">Direct Chat Enabled</span>
                  </div>

                  <div className="form-row-pair">
                    <div className="form-field">
                      <label>कॉलिंग / मोबाइल नंबर (Calling &amp; Direct Phone):</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="+91 98765 43210"
                        className="admin-input-field"
                      />
                      <span className="field-hint">यूज़र्स को Founder &amp; CEO और Support में यही नंबर दिखेगा।</span>
                    </div>

                    <div className="form-field">
                      <label>व्हाट्सएप नंबर / लिंक (WhatsApp Contact):</label>
                      <input
                        type="text"
                        value={formData.whatsapp}
                        onChange={(e) => handleChange('whatsapp', e.target.value)}
                        placeholder="+91 98765 43210"
                        className="admin-input-field"
                      />
                      <span className="field-hint">यूज़र द्वारा 1-क्लिक पर सीधे इसी व्हाट्सएप नंबर पर चैट खुलेगी।</span>
                    </div>
                  </div>
                </div>

                {/* 2. Instagram Profile */}
                <div className="admin-feature-card">
                  <div className="card-title-row">
                    <h4 className="card-heading">2. इंस्टाग्राम आईडी व प्रोफ़ाइल लिंक (Instagram ID &amp; Profile)</h4>
                    <span className="tag-insta-badge">📸 Instagram</span>
                  </div>

                  <div className="form-row-pair">
                    <div className="form-field">
                      <label>इंस्टाग्राम हैंडल / यूज़रनेम (Instagram Handle):</label>
                      <input
                        type="text"
                        value={formData.instagramHandle}
                        onChange={(e) => handleChange('instagramHandle', e.target.value)}
                        placeholder="@laxman_choudhary"
                        className="admin-input-field"
                      />
                    </div>

                    <div className="form-field">
                      <label>इंस्टाग्राम प्रोफ़ाइल URL (Instagram URL):</label>
                      <input
                        type="text"
                        value={formData.instagramUrl}
                        onChange={(e) => handleChange('instagramUrl', e.target.value)}
                        placeholder="https://instagram.com/laxman_choudhary"
                        className="admin-input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Email, YouTube, Facebook */}
                <div className="admin-feature-card">
                  <h4 className="card-heading">3. ईमेल, यूट्यूब व फेसबुक (Other Official Socials)</h4>

                  <div className="form-field">
                    <label>ऑफिशियल ईमेल आईडी (Official Email):</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="contact@laxmanchoudhary.com"
                      className="admin-input-field"
                    />
                  </div>

                  <div className="form-row-pair">
                    <div className="form-field">
                      <label>यूट्यूब चैनल लिंक (YouTube URL):</label>
                      <input
                        type="text"
                        value={formData.youtubeUrl}
                        onChange={(e) => handleChange('youtubeUrl', e.target.value)}
                        placeholder="https://youtube.com/@LBMMirror"
                        className="admin-input-field"
                      />
                    </div>

                    <div className="form-field">
                      <label>यूट्यूब चैनल नाम (YouTube Handle):</label>
                      <input
                        type="text"
                        value={formData.youtubeHandle}
                        onChange={(e) => handleChange('youtubeHandle', e.target.value)}
                        placeholder="LBM Mirror Official"
                        className="admin-input-field"
                      />
                    </div>
                  </div>

                  <div className="form-row-pair">
                    <div className="form-field">
                      <label>फेसबुक पेज लिंक (Facebook URL):</label>
                      <input
                        type="text"
                        value={formData.facebookUrl}
                        onChange={(e) => handleChange('facebookUrl', e.target.value)}
                        placeholder="https://facebook.com/LBMMirror"
                        className="admin-input-field"
                      />
                    </div>

                    <div className="form-field">
                      <label>फेसबुक पेज नाम (Facebook Handle):</label>
                      <input
                        type="text"
                        value={formData.facebookHandle}
                        onChange={(e) => handleChange('facebookHandle', e.target.value)}
                        placeholder="LBM Mirror Official"
                        className="admin-input-field"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-submit-bar">
                  <button type="submit" className="admin-save-btn large" disabled={saving}>
                    {saving ? 'सहेज रहे हैं…' : '💾 सभी सोशल व संपर्क विवरण सहेजें (Save Social Settings)'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════ TAB 4: USER IDEAS & MESSAGES INBOX ══════════════ */}
          {activeTab === 'inbox' && (
            <div className="admin-view-panel">
              <div className="panel-header-row">
                <div>
                  <h3 className="panel-main-title">उपयोगकर्ताओं की समस्याएँ व संदेश (User Problems &amp; Support Tickets)</h3>
                  <p className="panel-desc">
                    यूज़र्स द्वारा ऐप के Support Desk या Founder Modal से भेजे गए संदेश, समस्याएं व टिकट्स।
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-refresh-btn"
                  onClick={fetchAllData}
                >
                  🔄 Refresh Inbox
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="admin-header-actions-row">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="🔍 Search User ID, Name, Phone or Issue…"
                  value={querySearch}
                  onChange={(e) => setQuerySearch(e.target.value)}
                />

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className={`admin-filter-pill-btn ${queryFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setQueryFilter('all')}
                  >
                    All ({queries.length})
                  </button>
                  <button
                    type="button"
                    className={`admin-filter-pill-btn ${queryFilter === 'new' ? 'active' : ''}`}
                    onClick={() => setQueryFilter('new')}
                  >
                    New ({queries.filter((q) => q.status !== 'resolved').length})
                  </button>
                  <button
                    type="button"
                    className={`admin-filter-pill-btn ${queryFilter === 'resolved' ? 'active' : ''}`}
                    onClick={() => setQueryFilter('resolved')}
                  >
                    Resolved ({queries.filter((q) => q.status === 'resolved').length})
                  </button>
                </div>
              </div>

              {queries.length === 0 ? (
                <div className="admin-empty-pane">
                  <span className="empty-big-icon">📬</span>
                  <h4>इनबॉक्स खाली है (No Messages Yet)</h4>
                  <p>जब भी कोई यूज़र ऐप से मैसेज या सुझाव भेजेगा, वह तुरंत यहाँ दिखेगा।</p>
                </div>
              ) : (
                <div className="queries-card-list">
                  {queries
                    .filter((q) => {
                      if (queryFilter === 'new' && q.status === 'resolved') return false
                      if (queryFilter === 'resolved' && q.status !== 'resolved') return false
                      if (querySearch.trim()) {
                        const term = querySearch.toLowerCase()
                        const matchId = (q.userId || q.id || '').toLowerCase().includes(term)
                        const matchName = (q.name || '').toLowerCase().includes(term)
                        const matchContact = (q.contact || '').toLowerCase().includes(term)
                        const matchMsg = (q.message || '').toLowerCase().includes(term)
                        const matchCat = (q.category || '').toLowerCase().includes(term)
                        return matchId || matchName || matchContact || matchMsg || matchCat
                      }
                      return true
                    })
                    .map((q) => (
                      <div key={q.id} className={`query-full-card ${q.status === 'resolved' ? 'resolved-card' : ''}`}>
                        <div className="query-card-header">
                          <div className="user-profile-badge">
                            <span className="user-avatar-initial">{(q.name || 'U').charAt(0).toUpperCase()}</span>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <h4 className="user-name-title">{q.name}</h4>
                                <span className="user-id-table-tag">{q.userId || `#${q.id.slice(0, 8)}`}</span>
                                {q.category && <span className="category-pill-tag">{q.category}</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                                <span className="user-contact-tag">📞 {q.contact}</span>
                                {q.deviceInfo && <span className="device-pill-tag">💻 {q.deviceInfo}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="query-status-right">
                            <span className="query-time-badge">
                              {new Date(q.timestamp).toLocaleString('hi-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            {q.status === 'resolved' ? (
                              <span className="status-badge-pill green">Resolved ✅</span>
                            ) : (
                              <span className="status-badge-pill orange">New 💬</span>
                            )}
                          </div>
                        </div>

                        <div className="query-card-body">
                          <p className="query-user-message">{q.message}</p>
                        </div>

                        <div className="query-card-footer">
                          <div className="footer-actions-left">
                            <button
                              type="button"
                              className="action-pill-btn wa-reply"
                              onClick={() =>
                                handleDirectWhatsApp(
                                  q.contact,
                                  `नमस्ते ${q.name}! LBM Mirror Founder & CEO Laxman Choudhary: आपके द्वारा भेजी गई समस्या (User ID: ${q.userId || q.id} - ${q.category || 'Support'}): "${q.message.slice(0, 80)}" के समाधान हेतु संपर्क कर रहा हूँ।`
                                )
                              }
                            >
                              💬 WhatsApp पर सीधे चैट करें
                            </button>

                            <button
                              type="button"
                              className="action-pill-btn call-reply"
                              onClick={() => {
                                window.location.href = `tel:${q.contact.replace(/[^0-9+]/g, '')}`
                              }}
                            >
                              📞 कॉल करें
                            </button>
                          </div>

                          <div className="footer-actions-right">
                            {q.status !== 'resolved' ? (
                              <button
                                type="button"
                                className="action-pill-btn mark-done"
                                onClick={() => handleQueryStatus(q.id, 'resolved')}
                              >
                                ✓ हल हुआ (Mark Resolved)
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="action-pill-btn mark-done"
                                onClick={() => handleQueryStatus(q.id, 'new')}
                              >
                                Mark as Unread
                              </button>
                            )}

                            <button
                              type="button"
                              className="action-pill-btn delete-btn"
                              onClick={() => handleDeleteQuery(q.id)}
                              title="Delete this query"
                            >
                              🗑️ हटाएं
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ TAB 5: USERS & ACTIVE SESSIONS ══════════════ */}
          {activeTab === 'users' && (
            <div className="admin-view-panel">
              <div className="panel-header-row">
                <div>
                  <h3 className="panel-main-title">जुड़े हुए यूज़र्स व लाइव सेशन्स (Users &amp; Live Mirroring)</h3>
                  <p className="panel-desc">
                    यहाँ से देखें कि कुल कितने लोग जुड़े हैं, और वर्तमान में कितने लोग स्क्रीन मिररिंग का इस्तेमाल कर रहे हैं।
                  </p>
                </div>
              </div>

              {/* Section A: Active Mirroring Devices */}
              <div className="admin-feature-card">
                <div className="card-title-row">
                  <h4 className="card-heading">⚡ वर्तमान में चल रहे लाइव सेशन्स (Currently Casting Devices)</h4>
                  <span className="count-tag-sm">
                    {stats?.activeSessions?.length ?? 0} सक्रिय सेशन्स
                  </span>
                </div>

                {!stats?.activeSessions || stats.activeSessions.length === 0 ? (
                  <p className="empty-text">वर्तमान में कोई लाइव कास्टिंग सेशन चालू नहीं है।</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>डिवाइस का नाम</th>
                          <th>प्लेटफ़ॉर्म</th>
                          <th>PIN कोड</th>
                          <th>कनेक्शन का प्रकार</th>
                          <th>स्टेटस</th>
                          <th>सेशन आईडी</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.activeSessions.map((sess) => (
                          <tr key={sess.sessionId}>
                            <td><strong>{sess.clientName || 'Host Device'}</strong></td>
                            <td>{sess.clientPlatform || 'Windows'}</td>
                            <td><span className="pin-highlight">{sess.pin}</span></td>
                            <td>{sess.connectionMethod || 'Wi-Fi / LAN'}</td>
                            <td><span className="status-badge-pill green">{sess.status}</span></td>
                            <td className="code-text">{sess.sessionId.substring(0, 8)}…</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section B: Registered Users with Passwords & Management */}
              <div className="admin-feature-card">
                <div className="card-title-row">
                  <h4 className="card-heading">👥 कुल रजिस्टर्ड यूज़र्स व क्रेडेंशियल्स (Users &amp; Passwords Directory)</h4>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="count-tag-sm">{usersList.length} कुल यूज़र्स</span>
                    <button
                      type="button"
                      className="add-user-primary-btn"
                      onClick={() => setShowAddUserModal(true)}
                    >
                      ➕ नया यूज़र जोड़ें
                    </button>
                  </div>
                </div>

                <div className="admin-header-actions-row" style={{ marginTop: 12 }}>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="🔍 Search Username, Email or User ID…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>

                {usersList.length === 0 ? (
                  <p className="empty-text">कोई पंजीकृत यूज़र नहीं मिला।</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>यूज़र आईडी (User ID)</th>
                          <th>यूज़रनेम</th>
                          <th>ईमेल आईडी</th>
                          <th>मोबाइल नंबर</th>
                          <th>पासवर्ड (Password)</th>
                          <th>रजिस्ट्रेशन तारीख</th>
                          <th>कार्रवाई (Actions)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList
                          .filter((u) => {
                            if (!userSearch.trim()) return true
                            const term = userSearch.toLowerCase()
                            return (
                              u.id.toLowerCase().includes(term) ||
                              u.username.toLowerCase().includes(term) ||
                              u.email.toLowerCase().includes(term) ||
                              (u.mobile || '').includes(term)
                            )
                          })
                          .map((u) => {
                            const isRevealed = Boolean(revealedPasswords[u.id])
                            const displayPwd = isRevealed
                              ? (u.plainPassword || 'Secret Hash Set')
                              : (u.maskedPassword || '••••••••')

                            return (
                              <tr key={u.id}>
                                <td>
                                  <span className="user-id-table-tag">#{u.id.slice(0, 8)}</span>
                                </td>
                                <td>
                                  <div className="user-table-cell">
                                    <span className="mini-user-avatar">{(u.username || 'U').charAt(0).toUpperCase()}</span>
                                    <strong>{u.username}</strong>
                                  </div>
                                </td>
                                <td>{u.email}</td>
                                <td>{u.mobile || '—'}</td>
                                <td>
                                  <div className="user-password-cell">
                                    <span>{displayPwd}</span>
                                    <button
                                      type="button"
                                      className="password-view-toggle"
                                      onClick={() => handleTogglePasswordView(u.id)}
                                      title={isRevealed ? 'Hide Password' : 'Show Password'}
                                    >
                                      {isRevealed ? '🙈' : '👁️'}
                                    </button>
                                  </div>
                                </td>
                                <td>
                                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('hi-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  }) : '—'}
                                </td>
                                <td>
                                  <div className="user-table-actions-cell">
                                    <button
                                      type="button"
                                      className="user-action-btn reset-pwd"
                                      onClick={() => {
                                        setResetTargetUser(u)
                                        setNewResetPasswordInput('')
                                      }}
                                      title="Reset Password for this user"
                                    >
                                      🔑 रीसेट
                                    </button>
                                    <button
                                      type="button"
                                      className="user-action-btn del-user"
                                      onClick={() => handleDeleteUser(u)}
                                      title="Delete user"
                                    >
                                      🗑️ हटाएं
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════ TAB 6: IMAGES & LOGO GALLERY ══════════════ */}
          {activeTab === 'images' && (
            <div className="admin-view-panel">
              <div className="panel-header-row">
                <div>
                  <h3 className="panel-main-title">इमेजेज व लोगो गैलरी (Image Assets Manager)</h3>
                  <p className="panel-desc">
                    यहाँ आप देख सकते हैं कि सिस्टम में कुल कितने इमेजेज हैं, नए इमेजेज अपलोड कर सकते हैं और 1-क्लिक में लोगो या बैनर सेट कर सकते हैं।
                  </p>
                </div>
                <div className="header-upload-btn-wrap">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e)}
                    style={{ display: 'none' }}
                    id="gallery-file-upload"
                  />
                  <label htmlFor="gallery-file-upload" className="admin-save-btn">
                    ➕ {uploadingImage ? 'अपलोड हो रहा है…' : 'नया इमेज अपलोड करें (Upload Image)'}
                  </label>
                </div>
              </div>

              <div className="images-summary-bar">
                <span className="summary-pill">
                  📷 कुल इमेजेज: <strong>{imagesList.length}</strong>
                </span>
                <span className="summary-pill">
                  ⭐ एक्टिव ऐप लोगो: <strong>{formData.appLogo}</strong>
                </span>
              </div>

              <div className="images-gallery-grid">
                {imagesList.map((img) => {
                  const isCurrentLogo = formData.appLogo === img.path
                  const isCurrentBanner = formData.founderBanner === img.path

                  return (
                    <div key={img.path} className={`image-card-item ${isCurrentLogo ? 'active-logo-border' : ''}`}>
                      <div className="image-thumb-box">
                        <img
                          src={img.path}
                          alt={img.name}
                          className="image-thumb"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = '/logo.png'
                          }}
                        />
                        {isCurrentLogo && <span className="active-badge-tag">Current Logo ⭐</span>}
                        {isCurrentBanner && <span className="active-badge-tag banner">Current Banner 🖼️</span>}
                      </div>

                      <div className="image-card-info">
                        <strong className="image-name" title={img.name}>{img.name}</strong>
                        <span className="image-size-tag">{img.sizeKb} KB</span>
                      </div>

                      <div className="image-card-actions">
                        {!isCurrentLogo && (
                          <button
                            type="button"
                            className="img-action-btn"
                            onClick={async () => {
                              handleChange('appLogo', img.path)
                              await updateSettings({ appLogo: img.path })
                              notifySuccess(`⭐ लोगो सेट किया गया: ${img.name}`)
                            }}
                          >
                            Set as Logo
                          </button>
                        )}

                        {!isCurrentBanner && (
                          <button
                            type="button"
                            className="img-action-btn secondary"
                            onClick={async () => {
                              handleChange('founderBanner', img.path)
                              await updateSettings({ founderBanner: img.path })
                              notifySuccess(`🖼️ बैनर सेट किया गया: ${img.name}`)
                            }}
                          >
                            Set as Banner
                          </button>
                        )}

                        <button
                          type="button"
                          className="img-action-btn copy"
                          onClick={() => {
                            navigator.clipboard.writeText(img.path)
                            notifySuccess('Image path copied: ' + img.path)
                          }}
                        >
                          Copy Path
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════ TAB 7: SECURITY & PIN ══════════════ */}
          {activeTab === 'security' && (
            <div className="admin-view-panel">
              <div className="panel-header-row">
                <div>
                  <h3 className="panel-main-title">एडमिन सुरक्षा व एक्सेस पिन (Admin Security &amp; Passcode)</h3>
                  <p className="panel-desc">
                    एडमिन पैनल की सुरक्षा के लिए आप अपना गुप्त पिन बदल सकते हैं। डिफ़ॉल्ट पिन <strong>1229</strong> है।
                  </p>
                </div>
              </div>

              <div className="admin-feature-card security-card">
                <h4 className="card-heading">एडमिन एक्सेस पिन बदलें (Change Admin Access PIN)</h4>

                <div className="form-field max-w-sm">
                  <label>नया एडमिन पिन (New 4+ Digit PIN):</label>
                  <input
                    type="password"
                    maxLength={10}
                    placeholder="उदा: 1229 या 9876"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="admin-input-field"
                  />
                </div>

                <div className="form-field max-w-sm">
                  <label>नया पिन दोबारा दर्ज करें (Confirm New PIN):</label>
                  <input
                    type="password"
                    maxLength={10}
                    placeholder="पिन की पुष्टि करें"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="admin-input-field"
                  />
                </div>

                <button
                  type="button"
                  className="admin-save-btn"
                  onClick={handleSaveNewPin}
                >
                  🔒 नया पिन सुरक्षित करें (Update PIN)
                </button>
              </div>

              <div className="admin-feature-card info-card">
                <h4 className="card-heading">महत्वपूर्ण सुरक्षा निर्देश:</h4>
                <ul className="security-bullets">
                  <li>सामान्य यूज़र्स केवल सामान्य स्क्रीन मिररिंग इंटरफ़ेस देखेंगे।</li>
                  <li>एडमिन पैनल साइडबार के <strong>Management / Admin Panel</strong> बटन से पिन दर्ज करने पर ही खुलता है।</li>
                  <li>यदि आप कभी पिन भूल जाएं तो सर्वर फ़ाइल <code>server/data/app_settings.json</code> में जाकर पिन रीसेट कर सकते हैं।</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Add User Modal Dialog ── */}
      {showAddUserModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowAddUserModal(false)}>
          <div className="admin-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-dialog-header">
              <h4>➕ नया यूज़र बनाएं (Create New User)</h4>
              <p>नया खाता बनाएं जिसका विवरण सीधे ऐप और एडमिन दोनों में सक्रिय होगा।</p>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>यूज़रनेम (Username):</label>
                <input
                  type="text"
                  className="admin-input-field"
                  placeholder="उदा. rahul_sharma"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>ईमेल आईडी (Email *):</label>
                <input
                  type="email"
                  required
                  className="admin-input-field"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>मोबाइल नंबर (Mobile):</label>
                <input
                  type="text"
                  className="admin-input-field"
                  placeholder="+91 98765 43210"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>पासवर्ड (Password *):</label>
                <input
                  type="text"
                  required
                  className="admin-input-field"
                  placeholder="नया पासवर्ड दर्ज करें"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>

              <div className="admin-dialog-actions">
                <button
                  type="button"
                  className="dialog-cancel-btn"
                  onClick={() => setShowAddUserModal(false)}
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="dialog-submit-btn"
                  disabled={addingUser}
                >
                  {addingUser ? 'बना रहे हैं…' : 'यूज़र बनाएं (Save)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal Dialog ── */}
      {resetTargetUser && (
        <div className="admin-modal-backdrop" onClick={() => setResetTargetUser(null)}>
          <div className="admin-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-dialog-header">
              <h4>🔑 पासवर्ड रीसेट करें (Reset Password)</h4>
              <p>
                यूज़र <strong>{resetTargetUser.username}</strong> ({resetTargetUser.email}) के लिए नया पासवर्ड सेट करें।
              </p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>नया पासवर्ड दर्ज करें (New Password):</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="admin-input-field"
                  placeholder="कम से कम 4 अक्षर का पासवर्ड"
                  value={newResetPasswordInput}
                  onChange={(e) => setNewResetPasswordInput(e.target.value)}
                />
              </div>

              <div className="admin-dialog-actions">
                <button
                  type="button"
                  className="dialog-cancel-btn"
                  onClick={() => setResetTargetUser(null)}
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="dialog-submit-btn"
                  disabled={resettingPassword}
                >
                  {resettingPassword ? 'सहेज रहे हैं…' : 'पासवर्ड अपडेट करें (Save)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

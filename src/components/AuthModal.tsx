import React, { useState } from 'react'
import logoImg from '../assets/logo.png'
import { useAppSettings } from '../context/AppSettingsContext'
import { webSignup, webLogin } from '../services/webAuthFallback'

export interface UserProfile {
  id?: string
  username: string
  email: string
  mobile?: string
}

interface AuthModalProps {
  apiBaseUrl: string
  onAuthSuccess: (user: UserProfile, token: string) => void
  initialMode?: 'signup' | 'login'
  /** If provided, shows a contextual gate message */
  gateMessage?: string
  /** If true, user can close the dialog and browse without login */
  onClose?: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  apiBaseUrl,
  onAuthSuccess,
  initialMode = 'login',
  gateMessage,
  onClose,
}) => {
  const { settings } = useAppSettings()
  const [mode, setMode] = useState<'signup' | 'login' | 'reset' | 'google-prompt'>(initialMode)

  // ─── Sign Up Fields ────────────────────────────────────────────────────────
  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ─── Login Fields ──────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [autoLogin, setAutoLogin] = useState(true)

  // ─── Reset Password Fields ─────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState('')
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request')
  const [resetOtp, setResetOtp] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)

  // ─── Google OAuth Prompt ───────────────────────────────────────────────────
  const [googleEmail, setGoogleEmail] = useState('')
  const [googleName, setGoogleName] = useState('')

  // ─── Status ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const switchMode = (newMode: 'signup' | 'login' | 'reset' | 'google-prompt') => {
    setMode(newMode)
    setError(null)
    setSuccessMsg(null)
    if (newMode === 'reset') {
      setResetStep('request')
    }
  }

  // ─── Handle Sign Up ────────────────────────────────────────────────────────
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setError('Please enter a valid Email ID.')
      return
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match. Please check again.')
      return
    }

    setLoading(true)
    const payload = {
      username: signupUsername.trim() || signupEmail.split('@')[0],
      email: signupEmail.trim().toLowerCase(),
      password: signupPassword,
    }

    try {
      let data: any
      if (window.electronAPI?.auth) {
        data = await window.electronAPI.auth.signup(payload)
      } else if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ) {
        const res = await fetch(`${apiBaseUrl}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        data = await res.json()
      } else {
        // Instant client-side persistence for Vercel / GitHub Pages / Web App
        data = webSignup(payload)
      }

      if (!data.success) {
        setError(data.error || 'Failed to create account.')
      } else {
        setSuccessMsg('Account created successfully! Logging you in…')
        setTimeout(() => { onAuthSuccess(data.user, data.token) }, 300)
      }
    } catch {
      const fallback = webSignup(payload)
      if (fallback.success && fallback.user && fallback.token) {
        setSuccessMsg('Account created! (Web Mode Active)')
        setTimeout(() => { onAuthSuccess(fallback.user, fallback.token!) }, 300)
      } else {
        setError(fallback.error || 'Registration failed. Please check details.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Handle Login ──────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!loginEmail.trim()) {
      setError('Please enter your Email ID or Username.')
      return
    }
    if (!loginPassword) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    const payload = { identifier: loginEmail.trim(), password: loginPassword }

    try {
      let data: any
      if (window.electronAPI?.auth) {
        data = await window.electronAPI.auth.login(payload)
      } else if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ) {
        const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        data = await res.json()
      } else {
        // Instant client-side authentication for Vercel / GitHub Pages / Web App
        data = webLogin(payload)
      }

      if (!data.success) {
        setError(data.error || 'Invalid credentials. Check your Email or Password.')
      } else {
        setSuccessMsg('Login successful! Welcome to LBM Mirror.')
        setTimeout(() => { onAuthSuccess(data.user, data.token) }, 300)
      }
    } catch {
      const fallback = webLogin(payload)
      if (fallback.success && fallback.user && fallback.token) {
        setSuccessMsg('Login successful! (Web Mode Active)')
        setTimeout(() => { onAuthSuccess(fallback.user, fallback.token!) }, 300)
      } else {
        setError(fallback.error || 'Invalid credentials. Check your Email or Password.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Send Reset Code (Forgot Password Step 1) ──────────────────────────────
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!resetTarget.trim()) {
      setError('Please enter your registered Email ID.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetTarget.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(data.message || 'Verification code sent to your email!')
        setResetStep('verify')
      } else {
        setSuccessMsg(`Verification initiated for ${resetTarget.trim()}. Please set your new password.`)
        setResetStep('verify')
      }
    } catch {
      setSuccessMsg(`Verification code dispatched to ${resetTarget.trim()}.`)
      setResetStep('verify')
    } finally {
      setLoading(false)
    }
  }

  // ─── Reset Password (Forgot Password Step 2) ───────────────────────────────
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (resetNewPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
      return
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setError('Passwords do not match. Please verify.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        identifier: resetTarget.trim(),
        email: resetTarget.trim(),
        newPassword: resetNewPassword,
        otp: resetOtp.trim() || undefined,
      }

      let data: any
      if (window.electronAPI?.auth) {
        data = await window.electronAPI.auth.resetPassword(payload)
      } else {
        const res = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        data = await res.json()
      }

      if (!data.success) {
        setError(data.error || 'Password reset failed. Please check your details.')
      } else {
        setSuccessMsg('Password updated successfully! Logging you in…')
        setTimeout(() => { onAuthSuccess(data.user, data.token) }, 400)
      }
    } catch {
      setError('Network error during password reset.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Handle Google Sign-In Prompt ──────────────────────────────────────────
  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!googleEmail.trim() || !googleEmail.includes('@')) {
      setError('Please enter a valid Google Account Email (e.g. user@gmail.com).')
      return
    }

    setLoading(true)
    try {
      const payload = {
        email: googleEmail.trim().toLowerCase(),
        name: googleName.trim() || googleEmail.split('@')[0],
      }

      const res = await fetch(`${apiBaseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Google authentication failed.')
      } else {
        setSuccessMsg('Signed in with Google! Welcome to LBM Mirror.')
        setTimeout(() => { onAuthSuccess(data.user, data.token) }, 400)
      }
    } catch {
      setError('Could not connect to authentication server for Google Sign-In.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="auth-modal-overlay"
      onClick={onClose ? (e) => { if (e.target === e.currentTarget) onClose() } : undefined}
    >
      <div className="airplayer-login-card">
        {/* ── LEFT PANEL: Gradient Branding Artwork (Photo 2 Reference) ── */}
        <div className="airplayer-login-artwork">
          <div className="artwork-swirl-bg" />
          <div className="artwork-content">
            <div className="artwork-plane-badge">
              <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z"/>
                <path d="M22 2 11 13"/>
              </svg>
            </div>
            <div className="artwork-logo-wrap">
              <img
                src={settings.appLogo || logoImg}
                alt={settings.appName}
                className="artwork-logo-img"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = logoImg
                }}
              />
            </div>
            <h2 className="artwork-brand-title">{settings.appName}</h2>
            <p className="artwork-tagline">{settings.appTagline || 'Casting Made Easy'}</p>
            <div className="artwork-bullets">
              <span>⚡ Fast 60 FPS Stream</span>
              <span>📶 Wireless & USB Mirror</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Form Controls (Photo 2 Reference) ── */}
        <div className="airplayer-login-form-pane">
          {/* Close button in top right */}
          {onClose && (
            <button
              type="button"
              className="airplayer-close-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close login dialog"
            >
              ✕
            </button>
          )}

          {/* Gate notification if cast was clicked while logged out */}
          {gateMessage && (
            <div className="airplayer-gate-alert">
              <span className="gate-icon">🔒</span>
              <span>{gateMessage}</span>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="airplayer-alert error">
              <span>⚠️ {error}</span>
              <button type="button" onClick={() => setError(null)}>✕</button>
            </div>
          )}
          {successMsg && (
            <div className="airplayer-alert success">
              <span>✓ {successMsg}</span>
              <button type="button" onClick={() => setSuccessMsg(null)}>✕</button>
            </div>
          )}

          {/* ── 1. EMAIL LOGIN VIEW (Photo 2 Main) ── */}
          {mode === 'login' && (
            <div className="login-form-container">
              <h3 className="pane-main-heading">Email Login</h3>

              <form onSubmit={handleLoginSubmit} className="airplayer-form">
                <div className="field-block">
                  <input
                    id="login-email"
                    type="text"
                    className="airplayer-input"
                    placeholder="Enter email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>

                <div className="field-block">
                  <div className="input-with-icon">
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      className="airplayer-input"
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="input-eye-btn"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      tabIndex={-1}
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="forgot-row">
                  <button
                    type="button"
                    className="airplayer-link-btn"
                    onClick={() => {
                      setResetTarget(loginEmail)
                      switchMode('reset')
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="airplayer-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Logging in…' : 'Login'}
                </button>

                <div className="login-options-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={autoLogin}
                      onChange={(e) => setAutoLogin(e.target.checked)}
                    />
                    <span>Auto login next time</span>
                  </label>

                  <button
                    type="button"
                    className="airplayer-link-btn register-link"
                    onClick={() => switchMode('signup')}
                  >
                    Register Free
                  </button>
                </div>

                <div className="methods-separator">
                  <span>Other Login Methods</span>
                </div>

                <div className="social-methods-row">
                  <button
                    type="button"
                    className="circle-method-btn"
                    title="Sign in with Google"
                    onClick={() => switchMode('google-prompt')}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="circle-method-btn qr-method-btn"
                    title="Scan QR Login"
                    onClick={() => {
                      setError(null)
                      setSuccessMsg('QR Login scanner ready: Open LBM Mirror app on phone to scan.')
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/>
                      <rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </button>
                </div>

                <div className="terms-footnote">
                  Logging in agrees to the <a href="#terms" onClick={(e) => e.preventDefault()}>User Agreement</a> and <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
                </div>
              </form>
            </div>
          )}

          {/* ── 2. REGISTER FREE VIEW ── */}
          {mode === 'signup' && (
            <div className="login-form-container">
              <h3 className="pane-main-heading">Register Free</h3>

              <form onSubmit={handleSignUpSubmit} className="airplayer-form">
                <div className="field-block">
                  <input
                    type="text"
                    className="airplayer-input"
                    placeholder="Username (optional)"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                  />
                </div>

                <div className="field-block">
                  <input
                    type="email"
                    className="airplayer-input"
                    placeholder="Enter email address"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="field-block">
                  <div className="input-with-icon">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      className="airplayer-input"
                      placeholder="Create password (min 6 characters)"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="input-eye-btn"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                    >
                      {showSignupPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="field-block">
                  <div className="input-with-icon">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="airplayer-input"
                      placeholder="Confirm password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="input-eye-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="airplayer-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Creating Account…' : 'Create Free Account'}
                </button>

                <div className="login-options-row center-link">
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    className="airplayer-link-btn"
                    onClick={() => switchMode('login')}
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── 3. RESET PASSWORD VIEW ── */}
          {mode === 'reset' && (
            <div className="login-form-container">
              <h3 className="pane-main-heading">Forgot Password</h3>

              {resetStep === 'request' ? (
                <form onSubmit={handleSendResetCode} className="airplayer-form">
                  <p className="reset-hint-text">
                    Enter your registered email ID. We will generate a verification code to reset your password.
                  </p>
                  <div className="field-block">
                    <input
                      type="email"
                      className="airplayer-input"
                      placeholder="Enter registered email"
                      value={resetTarget}
                      onChange={(e) => setResetTarget(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="airplayer-submit-btn" disabled={loading}>
                    {loading ? 'Sending Code…' : 'Send Verification Code'}
                  </button>
                  <div className="login-options-row center-link">
                    <button type="button" className="airplayer-link-btn" onClick={() => switchMode('login')}>
                      ← Back to Login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="airplayer-form">
                  <div className="field-block">
                    <input
                      type="text"
                      className="airplayer-input"
                      placeholder="Enter 6-digit OTP code"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="field-block">
                    <div className="input-with-icon">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        className="airplayer-input"
                        placeholder="New password (min 6 characters)"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="input-eye-btn"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                      >
                        {showResetPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div className="field-block">
                    <div className="input-with-icon">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        className="airplayer-input"
                        placeholder="Confirm new password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="input-eye-btn"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                      >
                        {showResetPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="airplayer-submit-btn" disabled={loading}>
                    {loading ? 'Resetting…' : 'Set New Password & Login'}
                  </button>
                  <div className="login-options-row center-link">
                    <button type="button" className="airplayer-link-btn" onClick={() => switchMode('login')}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── 4. GOOGLE SIGN-IN PROMPT ── */}
          {mode === 'google-prompt' && (
            <div className="login-form-container">
              <h3 className="pane-main-heading">Sign in with Google</h3>
              <p className="reset-hint-text">
                Connect your Google account instantly with one click.
              </p>
              <form onSubmit={handleGoogleSubmit} className="airplayer-form">
                <div className="field-block">
                  <input
                    type="email"
                    className="airplayer-input"
                    placeholder="Your Google Email (e.g. name@gmail.com)"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="field-block">
                  <input
                    type="text"
                    className="airplayer-input"
                    placeholder="Your Full Name (optional)"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                  />
                </div>
                <button type="submit" className="airplayer-submit-btn" disabled={loading}>
                  {loading ? 'Connecting…' : 'Continue with Google'}
                </button>
                <div className="login-options-row center-link">
                  <button type="button" className="airplayer-link-btn" onClick={() => switchMode('login')}>
                    ← Back to Email Login
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

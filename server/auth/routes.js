import express from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import {
  countUsers,
  findUserByUsername,
  findUserByEmail,
  findUserByIdentifier,
  findUserByMobile,
  createUser,
  updateUserPassword,
  saveOtp,
  getLatestOtp,
  recordOtpAttempt,
  markOtpVerified,
  checkVerifiedToken,
  consumeVerifiedToken,
  createSession,
  getSession,
  deleteSession,
} from './db.js'
import { sendEmailOtp } from './services/emailService.js'
import { sendMobileOtp } from './services/smsService.js'

const router = express.Router()

// Secure 6-digit random code generator
function generateNumericOtp() {
  const num = crypto.randomInt(100000, 999999)
  return String(num)
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email.trim())
}

function isValidMobile(mobile) {
  if (!mobile || typeof mobile !== 'string') return false
  const digits = mobile.replace(/[^0-9]/g, '')
  return digits.length >= 10 && digits.length <= 15
}

// ─── Status ──────────────────────────────────────────────────────────────────
router.get('/system-status', (_req, res) => {
  const usersCount = countUsers()
  res.json({
    hasUsers: usersCount > 0,
    totalUsers: usersCount,
    appName: 'LBM Mirror',
    version: '1.0.0',
  })
})

// ─── Email OTP ───────────────────────────────────────────────────────────────
router.post('/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' })
    }

    // Check if user already registered with this email
    if (findUserByEmail(email)) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Rate limiting & cooldown (60 seconds)
    const existing = getLatestOtp(cleanEmail, 'email')
    const now = Date.now()
    if (existing && existing.lastSentAt && now - existing.lastSentAt < 60000) {
      const waitSecs = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000)
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSecs} seconds before requesting a new email OTP.`,
        cooldownRemaining: waitSecs,
      })
    }

    const otpCode = generateNumericOtp()
    saveOtp({
      target: cleanEmail,
      type: 'email',
      code: otpCode,
      maxAttempts: 5,
      ttlSeconds: 600, // 10 minutes
    })

    const sendResult = await sendEmailOtp(cleanEmail, otpCode)
    if (!sendResult.sent) {
      return res.status(500).json({ success: false, error: sendResult.error || 'Failed to dispatch email OTP.' })
    }

    res.json({
      success: true,
      message: 'OTP has been dispatched to your email address.',
      devNotice: sendResult.message,
    })
  } catch (err) {
    console.error('Error in send-email-otp:', err)
    res.status(500).json({ success: false, error: 'Internal server error while processing email OTP.' })
  }
})

router.post('/verify-email-otp', (req, res) => {
  try {
    const { email, otp } = req.body
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address.' })
    }
    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return res.status(400).json({ success: false, error: 'Enter a valid 6-digit OTP.' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const record = getLatestOtp(cleanEmail, 'email')

    if (!record) {
      return res.status(400).json({ success: false, error: 'No active OTP found. Please request a new OTP.' })
    }

    if (Date.now() > record.expiresAt) {
      return res.status(400).json({ success: false, error: 'This OTP has expired. Please request a new one.' })
    }

    if (record.attempts >= record.maxAttempts) {
      return res.status(400).json({
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new OTP.',
      })
    }

    recordOtpAttempt(record.id)

    if (record.code !== otp.trim()) {
      const remaining = record.maxAttempts - (record.attempts)
      return res.status(400).json({
        success: false,
        error: `Incorrect OTP. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new OTP.'}`,
      })
    }

    const verifiedRecord = markOtpVerified(record.id)
    res.json({
      success: true,
      message: 'Email successfully verified.',
      verifiedToken: verifiedRecord.verifiedToken,
    })
  } catch (err) {
    console.error('Error in verify-email-otp:', err)
    res.status(500).json({ success: false, error: 'Internal server error while verifying email OTP.' })
  }
})

// ─── Mobile OTP ──────────────────────────────────────────────────────────────
router.post('/send-mobile-otp', async (req, res) => {
  try {
    const { mobile } = req.body
    if (!isValidMobile(mobile)) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit mobile number is required.' })
    }

    if (findUserByMobile(mobile)) {
      return res.status(400).json({ success: false, error: 'An account with this mobile number already exists.' })
    }

    const cleanMobile = mobile.trim()

    // Rate limiting & cooldown (60 seconds)
    const existing = getLatestOtp(cleanMobile, 'mobile')
    const now = Date.now()
    if (existing && existing.lastSentAt && now - existing.lastSentAt < 60000) {
      const waitSecs = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000)
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSecs} seconds before requesting a new mobile OTP.`,
        cooldownRemaining: waitSecs,
      })
    }

    const otpCode = generateNumericOtp()
    saveOtp({
      target: cleanMobile,
      type: 'mobile',
      code: otpCode,
      maxAttempts: 5,
      ttlSeconds: 600, // 10 minutes
    })

    const sendResult = await sendMobileOtp(cleanMobile, otpCode)
    if (!sendResult.sent) {
      return res.status(500).json({ success: false, error: sendResult.error || 'Failed to dispatch mobile OTP.' })
    }

    res.json({
      success: true,
      message: 'OTP has been dispatched to your mobile number.',
      devNotice: sendResult.message,
    })
  } catch (err) {
    console.error('Error in send-mobile-otp:', err)
    res.status(500).json({ success: false, error: 'Internal server error while processing mobile OTP.' })
  }
})

router.post('/verify-mobile-otp', (req, res) => {
  try {
    const { mobile, otp } = req.body
    if (!isValidMobile(mobile)) {
      return res.status(400).json({ success: false, error: 'Invalid mobile number.' })
    }
    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return res.status(400).json({ success: false, error: 'Enter a valid 6-digit OTP.' })
    }

    const cleanMobile = mobile.trim()
    const record = getLatestOtp(cleanMobile, 'mobile')

    if (!record) {
      return res.status(400).json({ success: false, error: 'No active OTP found. Please request a new OTP.' })
    }

    if (Date.now() > record.expiresAt) {
      return res.status(400).json({ success: false, error: 'This OTP has expired. Please request a new one.' })
    }

    if (record.attempts >= record.maxAttempts) {
      return res.status(400).json({
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new OTP.',
      })
    }

    recordOtpAttempt(record.id)

    if (record.code !== otp.trim()) {
      const remaining = record.maxAttempts - (record.attempts)
      return res.status(400).json({
        success: false,
        error: `Incorrect OTP. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new OTP.'}`,
      })
    }

    const verifiedRecord = markOtpVerified(record.id)
    res.json({
      success: true,
      message: 'Mobile number successfully verified.',
      verifiedToken: verifiedRecord.verifiedToken,
    })
  } catch (err) {
    console.error('Error in verify-mobile-otp:', err)
    res.status(500).json({ success: false, error: 'Internal server error while verifying mobile OTP.' })
  }
})

// ─── Sign Up (Email + Password - No OTP Required) ───────────────────────────
const handleRegister = async (req, res) => {
  try {
    const { username, email, password } = req.body

    // 1. Email validation
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' })
    }
    const cleanEmail = email.trim().toLowerCase()
    if (findUserByEmail(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists. Please log in.' })
    }

    // 2. Password validation
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' })
    }

    // 3. Username handling
    let finalUsername = (username || '').trim()
    if (!finalUsername) {
      // Default to email prefix
      finalUsername = cleanEmail.split('@')[0]
    }
    if (finalUsername.length < 2) {
      finalUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`
    }
    // If username already taken, add numbers
    if (findUserByUsername(finalUsername)) {
      finalUsername = `${finalUsername}_${Math.floor(100 + Math.random() * 900)}`
    }

    // 4. Secure password hashing with bcryptjs
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // 5. Create user in database
    const user = createUser({
      username: finalUsername,
      email: cleanEmail,
      mobile: '',
      passwordHash,
    })

    // 6. Create authenticated session
    const session = createSession(user.id, user.username)

    res.status(201).json({
      success: true,
      message: 'Account successfully created!',
      token: session.token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mobile: user.mobile || '',
      },
    })
  } catch (err) {
    console.error('Error during registration/signup:', err)
    res.status(500).json({ success: false, error: err?.message ? `Account creation failed: ${err.message}` : 'Internal server error while creating account.' })
  }
}

router.post('/signup', handleRegister)
router.post('/register', handleRegister)

// ─── Login (Email / Username + Password) ───────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, email, identifier, password } = req.body
    const loginId = (identifier || email || username || '').trim()

    if (!loginId || !password) {
      return res.status(400).json({ success: false, error: 'Please enter your Email/Username and Password.' })
    }

    // Search user by email or username (case-insensitive)
    const user = findUserByIdentifier(loginId)

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'No account found with this email or username. Please check your details or click "Sign Up" to create an account.'
      })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please check your password or use "Reset Password".'
      })
    }

    // Issue session token
    const session = createSession(user.id, user.username)

    res.json({
      success: true,
      message: 'Login successful.',
      token: session.token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mobile: user.mobile || '',
      },
    })
  } catch (err) {
    console.error('Error during login:', err)
    res.status(500).json({ success: false, error: 'Internal server error during login.' })
  }
})

// ─── Reset / Update Password ───────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, email, newPassword } = req.body
    const target = (email || identifier || '').trim()

    if (!target) {
      return res.status(400).json({ success: false, error: 'Please enter your registered Email or Username.' })
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' })
    }

    const saltRounds = 10
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)
    const updated = updateUserPassword(target, newPasswordHash)

    if (!updated) {
      return res.status(404).json({ success: false, error: 'No account found with this email or username.' })
    }

    // Issue session token
    const session = createSession(updated.id, updated.username)

    res.json({
      success: true,
      message: 'Password reset successful! Logging you in…',
      token: session.token,
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        mobile: updated.mobile || '',
      },
    })
  } catch (err) {
    console.error('Error during password reset:', err)
    res.status(500).json({ success: false, error: 'Internal server error during password reset.' })
  }
})

// ─── Sign in with Google (OAuth 2.0) ──────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential, email, name, googleId } = req.body

    let userEmail = (email || '').trim().toLowerCase()
    let userName = (name || '').trim()

    // If a Google ID token (JWT) is supplied, decode payload securely
    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
          if (payload.email) userEmail = payload.email.toLowerCase()
          if (payload.name) userName = payload.name
        }
      } catch (err) {
        console.warn('Failed to parse Google JWT credential:', err.message)
      }
    }

    if (!userEmail || !userEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid Google account email is required.' })
    }

    // Check if user already exists
    let user = findUserByEmail(userEmail)
    if (!user) {
      // Auto-provision user account from Google profile
      const cleanUsername = userName || userEmail.split('@')[0]
      const passwordHash = await bcrypt.hash('oauth_google_' + crypto.randomBytes(16).toString('hex'), 10)
      user = createUser({
        username: cleanUsername,
        email: userEmail,
        mobile: '',
        passwordHash,
      })
    }

    // Issue session token
    const session = createSession(user.id, user.username)

    res.json({
      success: true,
      message: 'Signed in with Google successfully.',
      token: session.token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mobile: user.mobile || '',
      },
    })
  } catch (err) {
    console.error('Error during Google sign-in:', err)
    res.status(500).json({ success: false, error: 'Internal server error during Google sign-in.' })
  }
})

// ─── Current User / Verify Session ───────────────────────────────────────────
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ success: false, error: 'No session token provided.' })
  }

  const sessionData = getSession(token)
  if (!sessionData) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid.' })
  }

  res.json({
    success: true,
    user: sessionData.user,
  })
})

// ─── Logout ──────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || req.body?.token

  if (token) {
    deleteSession(token)
  }

  res.json({ success: true, message: 'Logged out successfully.' })
})

export default router

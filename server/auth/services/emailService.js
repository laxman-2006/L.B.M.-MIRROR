import nodemailer from 'nodemailer'

let cachedTransporter = null

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = process.env.SMTP_SECURE === 'true' || port === 465
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS

  if (!user || !pass) {
    return null
  }

  // Create or reuse transporter
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false, // Compatibility for varied corporate/home networks
    },
  })
}

export async function sendEmailOtp(toEmail, otpCode) {
  const transporter = getTransporter()
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"LBM Mirror" <noreply@lbm-mirror.local>'

  const subject = `Your LBM Mirror Verification Code: ${otpCode}`
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #090d16; color: #f1f5f9; padding: 24px; margin: 0; }
    .container { max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .brand { font-size: 24px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    .otp-box { background: #0f172a; border: 2px dashed #0284c7; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }
    .notice { color: #94a3b8; font-size: 13px; line-height: 1.6; }
    .footer { margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">LBM Mirror</div>
    <div class="subtitle">Secure Screen Mirroring Authentication</div>
    <p>Namaste / Hello,</p>
    <p>Aapke LBM Mirror account verification ke liye OTP request ki gayi hai:</p>
    
    <div class="otp-box">
      <div class="otp-code">${otpCode}</div>
    </div>

    <p class="notice">
      • Yeh OTP <strong>10 minutes</strong> ke liye valid hai.<br>
      • Yeh code kisi ke sath share na karein.<br>
      • Agar aapne yeh request nahi kiya hai toh is email ko ignore karein.
    </p>

    <div class="footer">
      © ${new Date().getFullYear()} LBM Mirror. All rights reserved.
    </div>
  </div>
</body>
</html>
  `

  if (!transporter) {
    console.warn(`\n[LBM Mirror OTP Service] ---------------------------------------------`)
    console.warn(`[LBM Mirror OTP Service] ✉️ Real Email OTP for ${toEmail}: [ ${otpCode} ]`)
    console.warn(`[LBM Mirror OTP Service] NOTE: SMTP credentials are not configured in .env.`)
    console.warn(`[LBM Mirror OTP Service] Please add SMTP_USER & SMTP_PASS in .env to send real Gmail emails.`)
    console.warn(`[LBM Mirror OTP Service] ---------------------------------------------\n`)
    return {
      sent: true,
      deliveredViaSmtp: false,
      message: 'OTP generated. Configure SMTP_USER and SMTP_PASS in .env for live email delivery.',
      codeForDev: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    }
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      html: htmlContent,
      text: `Your LBM Mirror verification code is: ${otpCode}. It is valid for 10 minutes.`,
    })
    console.log(`[LBM Mirror OTP Service] Real Email sent to ${toEmail}. MessageId: ${info.messageId}`)
    return { sent: true, deliveredViaSmtp: true, messageId: info.messageId }
  } catch (err) {
    console.error(`[LBM Mirror OTP Service] Error sending email via SMTP:`, err.message)
    // Return explicit error so frontend and user know what happened
    return {
      sent: false,
      error: `Failed to send email: ${err.message}. Please verify SMTP credentials in .env.`,
    }
  }
}

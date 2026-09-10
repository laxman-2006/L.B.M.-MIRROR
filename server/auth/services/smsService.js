// Real SMS delivery service supporting Twilio, Fast2SMS, or HTTP SMS Gateway

export async function sendMobileOtp(mobileNumber, otpCode) {
  const cleanNumber = mobileNumber.replace(/[^0-9+]/g, '')
  const messageText = `Your LBM Mirror verification code is ${otpCode}. Valid for 10 minutes. Do not share.`

  // 1. Check for Fast2SMS (popular in India, uses simple fast POST request)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const numberWithoutPlus = cleanNumber.replace(/^\+91/, '').replace(/[^0-9]/g, '')
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otpCode,
          numbers: numberWithoutPlus,
        }),
      })
      const resData = await response.json()
      if (resData.return) {
        console.log(`[LBM Mirror SMS] Fast2SMS sent successfully to ${cleanNumber}`)
        return { sent: true, provider: 'Fast2SMS' }
      } else {
        console.error(`[LBM Mirror SMS] Fast2SMS error:`, resData)
        return { sent: false, error: resData.message || 'Fast2SMS delivery failed' }
      }
    } catch (err) {
      console.error(`[LBM Mirror SMS] Fast2SMS network error:`, err)
      return { sent: false, error: err.message }
    }
  }

  // 2. Check for Twilio API
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64')

      const params = new URLSearchParams()
      params.append('To', cleanNumber.startsWith('+') ? cleanNumber : `+91${cleanNumber}`)
      params.append('From', process.env.TWILIO_PHONE_NUMBER)
      params.append('Body', messageText)

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      )
      const resData = await response.json()
      if (response.ok) {
        console.log(`[LBM Mirror SMS] Twilio SMS sent to ${cleanNumber}. SID: ${resData.sid}`)
        return { sent: true, provider: 'Twilio', sid: resData.sid }
      } else {
        console.error(`[LBM Mirror SMS] Twilio API error:`, resData)
        return { sent: false, error: resData.message || 'Twilio SMS failed' }
      }
    } catch (err) {
      console.error(`[LBM Mirror SMS] Twilio network error:`, err)
      return { sent: false, error: err.message }
    }
  }

  // 3. Check for Generic SMS Webhook/Gateway
  if (process.env.SMS_GATEWAY_URL) {
    try {
      const response = await fetch(process.env.SMS_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SMS_API_KEY ? { 'Authorization': `Bearer ${process.env.SMS_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          to: cleanNumber,
          message: messageText,
          otp: otpCode,
        }),
      })
      if (response.ok) {
        console.log(`[LBM Mirror SMS] Custom gateway sent to ${cleanNumber}`)
        return { sent: true, provider: 'CustomGateway' }
      }
    } catch (err) {
      console.error(`[LBM Mirror SMS] Custom gateway error:`, err)
      return { sent: false, error: err.message }
    }
  }

  // Fallback when no provider is configured yet in .env
  console.warn(`\n[LBM Mirror SMS Service] ---------------------------------------------`)
  console.warn(`[LBM Mirror SMS Service] 📱 Real Mobile OTP for ${cleanNumber}: [ ${otpCode} ]`)
  console.warn(`[LBM Mirror SMS Service] NOTE: No SMS provider configured in .env.`)
  console.warn(`[LBM Mirror SMS Service] Please configure FAST2SMS_API_KEY or TWILIO credentials in .env.`)
  console.warn(`[LBM Mirror SMS Service] ---------------------------------------------\n`)

  return {
    sent: true,
    deliveredViaGateway: false,
    message: 'Mobile OTP generated. Configure TWILIO or FAST2SMS in .env for live SMS dispatch.',
    codeForDev: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
  }
}

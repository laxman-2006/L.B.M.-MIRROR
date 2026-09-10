# LBM Mirror

LBM Mirror is a professional Screen Mirroring application for Windows with real full-stack authentication, secure session management, and modular screen casting support (Same Wi-Fi, USB, and AirPlay).

## Features

- **LBM Mirror Branding**: Consistent high-performance identity across Windows app, browser, installer, and dashboard.
- **First-Time Sign-Up Flow**:
  1. Username
  2. Gmail Address (with real OTP verification)
  3. Gmail Verification OTP
  4. Mobile Number (with real SMS OTP verification)
  5. Mobile Verification OTP
  6. Password (securely hashed with bcrypt)
- **Normal Login**: Simple Username + Password login without needing repeated OTPs once verified.
- **Session Management**: Secure session token persistence with Sign Out capability.
- **Screen Mirroring Capabilities**:
  - **Same Wi-Fi**: Real-time WebRTC wireless screen mirroring with QR code and PIN pairing.
  - **USB Super Fast (60 FPS)**: Low-latency mirroring via Native ADB / scrcpy and WebUSB fallback.
  - **AirPlay Receiver**: Native Bonjour/mDNS service for Apple iPhone/iPad Control Center screen mirroring.

## Setup & Credentials (.env)

Configure your credentials in `.env` (refer to `.env.example`):

### 1. Gmail OTP Delivery (SMTP)
Generate an App Password from your Google Account:
1. Go to Google Account > Security > Enable 2-Step Verification.
2. Search for **App passwords**.
3. Generate a 16-character password and set:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="LBM Mirror" <your-email@gmail.com>
```

### 2. Mobile SMS OTP Delivery
Configure your preferred SMS Gateway provider:
- **Fast2SMS** (India): Set `FAST2SMS_API_KEY`
- **Twilio** (Global): Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- *Development Note*: If keys are not yet configured, the system generates real cryptographically secure OTPs and outputs them to the secure server console for testing.

## Running the Application

### Start Backend & Electron App:
```powershell
npm run dev
```

### Or Start Independently:
- Backend server: `npm run server`
- Frontend: `npm run dev:client`
- Electron app: `npm run dev:app`
- Production build: `npm run build`
- Windows Installer (EXE): `npm run dist`

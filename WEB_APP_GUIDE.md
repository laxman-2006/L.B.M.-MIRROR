# LBM Mirror — Complete Application Guide

LBM Mirror is available in two full, dedicated editions:
1. **LBM Mirror EXE Desktop App** (Native Windows application with Scrcpy 60 FPS, Bonjour AirPlay, and window frame controls)
2. **LBM Mirror Web App** (Full-featured browser application with WebRTC wireless casting & receiving, WebUSB direct cable mirroring, mobile browser sender mode, web authentication, and GitHub Pages deployment)

---

## 1. Quick Start Commands

### Running LBM Mirror EXE Desktop App:
```powershell
# Starts the backend signaling server, client dev server, and Electron desktop window simultaneously:
npm run dev

# Or launch only the Electron desktop window:
npm run dev:app
```

### Running LBM Mirror Web App:
```powershell
# Starts the Web App development server accessible locally and on LAN:
npm run dev:web

# Or preview the production Web App bundle:
npm run preview
```

### Building & Packaging:
```powershell
# Build the Web App for deployment:
npm run build:web

# Package the Windows EXE installer (.exe file in release/ folder):
npm run dist
```

---

## 2. LBM Mirror Web App Features

- **Runtime Auto-Detection**: The app detects whether it is running inside Electron (`🖥️ Desktop EXE`) or in a browser (`🌐 Web App`).
- **Cast Screen (Broadcaster Hub)**:
  - Select Entire Screen, App Window, or Browser Tab using browser `getDisplayMedia`.
  - Live outgoing monitor preview with 60 FPS streaming, elapsed timer, resolution, and viewer count.
  - Generates a unique 6-digit PIN and dynamic QR Code for instant receiver pairing.
  - Copy Shareable Link and "Open Receiver Viewer (Test in New Tab)" for 1-click verification.
- **Receive Screen (Receiver Hub)**:
  - **Android Wireless**: Pair phone to PC wirelessly using 6-digit PIN and QR code over WebRTC peer-to-peer.
  - **Android WebUSB**: Direct USB cable connection in Chrome, Edge, Opera, and Brave via the standard `navigator.usb` API.
  - **iOS Safari Screen Sharing**: Connect iPhone/iPad directly from Safari without requiring desktop software.
  - **Windows PC-to-PC**: Stream and receive PC screens over WebRTC.
- **Mirror Viewer**:
  - Live video stream display with 60 FPS hardware acceleration.
  - 90-degree screen rotation (ideal for portrait phone screens).
  - Audio mute/unmute and system audio passthrough.
  - Fullscreen mode and Stats HUD (FPS, latency, bitrate, resolution, packet loss).
- **Mobile Sender View**:
  - When opening the URL on a mobile device or via `?join=PIN` / `?mode=sender`, a streamlined mobile interface allows casting the phone screen directly to the PC browser with a single tap.
- **Hybrid Web Authentication**:
  - Full Sign Up (Username, Gmail, Password), Login, and Password Reset.
  - Connects to the live REST API when available.
  - Seamlessly falls back to local browser persistence when deployed statically on GitHub Pages.
- **Admin Panel**:
  - Unlockable with 4-digit PIN (default: `1229`).
  - Customize App Name, Tagline, Logo, Founder & CEO details (Laxman Choudhary), WhatsApp number, Instagram, and VIP pricing.
  - Customizations persist locally and sync across sessions.

---

## 3. How to Deploy the Web App to GitHub Pages

The repository is already configured with an automated GitHub Actions deployment workflow: [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml).

### Step-by-Step GitHub Pages Setup:
1. **Push your code to GitHub**:
   ```powershell
   git add .
   git commit -m "Add complete LBM Mirror Web App and GitHub Pages deployment workflow"
   git push origin main
   ```

2. **Enable GitHub Pages in your repository settings**:
   - Go to your repository on GitHub: `https://github.com/your-username/your-repo`
   - Click **Settings** > **Pages** (in the left sidebar).
   - Under **Build and deployment > Source**, select **GitHub Actions**.

3. **Automatic Deployment**:
   - The GitHub Actions workflow will automatically trigger on push to `main`.
   - It installs dependencies, runs `npm run build:web`, and deploys the `dist/` directory to GitHub Pages.
   - Your Web App will be live online at: `https://your-username.github.io/your-repo/`!

4. **Single Page Application Routing**:
   - The [`public/404.html`](file:///public/404.html) file automatically redirects deep URLs or query parameters (e.g., `?join=123456`) back to `index.html` without 404 errors.

---

## 4. Deploying to Other Web Platforms (Optional)

The built `dist/` folder is standard static HTML/CSS/JS and can also be deployed to:
- **Vercel**: Run `vercel --prod` or link the GitHub repository.
- **Netlify**: Drag-and-drop the `dist/` folder or link the GitHub repository (Build command: `npm run build:web`, Publish directory: `dist`).
- **Render / Cloudflare Pages**: Connect repo, set build command to `npm run build:web` and output directory to `dist`.

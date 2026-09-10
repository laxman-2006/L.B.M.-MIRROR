import { app, BrowserWindow, ipcMain, session, desktopCapturer } from 'electron'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import os from 'os'
import { AdbBridge } from './bridge/adbBridge.js'
import { AirPlayBridge } from './bridge/airplayBridge.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
let adbBridge = null
let airplayBridge = null

import fs from 'fs'
import bcrypt from 'bcryptjs'
import {
  countUsers,
  findUserByIdentifier,
  findUserByEmail,
  findUserByUsername,
  createUser,
  updateUserPassword,
  createSession,
  getSession,
  deleteSession,
} from '../server/auth/db.js'

// Support second-instance focus if available
try {
  const gotLock = app.requestSingleInstanceLock()
  if (gotLock) {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
    })
  }
} catch {}

process.on('uncaughtException', (err) => {
  console.error('[LBM Mirror Main Process Exception]:', err)
})

// Start internal signaling server
async function startInternalServer() {
  try {
    let serverPath = path.join(__dirname, '../server/index.js')
    if (app.isPackaged) {
      const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'index.js')
      if (fs.existsSync(unpackedPath)) {
        serverPath = unpackedPath
      } else {
        const altPath = serverPath.replace('app.asar', 'app.asar.unpacked')
        if (fs.existsSync(altPath)) {
          serverPath = altPath
        }
      }
    }
    console.log('[LBM Mirror] Starting internal server from:', serverPath)
    await import(pathToFileURL(serverPath).href)
    console.log('[LBM Mirror] Internal LBM Mirror signaling server started in main process')
  } catch (err) {
    console.error('[LBM Mirror] Note on internal server start:', err.message)
  }
}

function getLocalIp() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return '127.0.0.1'
}

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.ico')
  const fallbackIcon = path.join(__dirname, '../public/icon.ico')
  const pngIcon = path.join(__dirname, '../public/logo.png')
  const winIcon = fs.existsSync(iconPath) ? iconPath : (fs.existsSync(fallbackIcon) ? fallbackIcon : (fs.existsSync(pngIcon) ? pngIcon : undefined))

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 650,
    backgroundColor: '#ffffff',
    title: 'Lucky Bhambhu Mirror',
    icon: winIcon,
    frame: true, // Native Windows Titlebar with minimize/maximize/close
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  mainWindow.show()
  mainWindow.focus()

  const indexPath = path.join(__dirname, '../dist/index.html')

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(indexPath).catch(console.error)
    })
  } else {
    mainWindow.loadFile(indexPath).catch(console.error)
  }

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle('LBM Mirror')
    }
  })

  // Allow F12 to inspect if needed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools()
    }
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL)
    if (validatedURL && validatedURL.includes('5173') && fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath).catch(console.error)
    }
  })

  // Remove default menu for sleek look
  mainWindow.setMenuBarVisibility(false)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── Setup IPC Bridges ───────────────────────────────────────────────────────
function setupIpcHandlers() {
  adbBridge = new AdbBridge({
    onFrame: (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:frame', data)
      }
    },
    onStats: (stats) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:stats', stats)
      }
    },
  })

  airplayBridge = new AirPlayBridge({
    onClientConnected: (client) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('airplay:client-connected', client)
      }
    },
    onStats: (stats) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('airplay:stats', stats)
      }
    },
  })

  // Start background tracking for USB Android devices
  adbBridge.startTracking((devices) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:device-list', devices)
    }
  })

  // System
  ipcMain.handle('system:get-network-info', () => {
    return {
      ip: getLocalIp(),
      hostname: os.hostname(),
      platform: process.platform,
    }
  })

  // ADB Handlers
  ipcMain.handle('adb:check-installed', async () => {
    return await adbBridge.ensureAdbInstalled()
  })

  ipcMain.handle('adb:download-adb', async () => {
    return await adbBridge.downloadPortableAdb((progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:download-progress', progress)
      }
    })
  })

  ipcMain.handle('adb:get-devices', async () => {
    return await adbBridge.getConnectedDevices()
  })

  ipcMain.handle('adb:restart-server', async () => {
    return await adbBridge.restartServer()
  })

  ipcMain.handle('adb:start-mirroring', async (_event, serial, options) => {
    return await adbBridge.startMirroring(serial, options)
  })

  ipcMain.handle('adb:stop-mirroring', () => {
    adbBridge.stopMirroring()
    return { success: true }
  })

  // AirPlay Handlers
  ipcMain.handle('airplay:start-receiver', (_event, options) => {
    return airplayBridge.start(options)
  })

  ipcMain.handle('airplay:stop-receiver', () => {
    airplayBridge.stop()
    return { success: true }
  })

  // iOS USB Cable Check Handler
  ipcMain.handle('ios:check-usb', async () => {
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)
      const { stdout } = await execAsync('powershell -NoProfile -Command "Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -like \'*Apple*\' -or $_.FriendlyName -like \'*iPhone*\' } | Select-Object -ExpandProperty FriendlyName"')
      const hasApple = stdout.includes('Apple') || stdout.includes('iPhone')
      return {
        connected: hasApple,
        deviceName: hasApple ? (stdout.split('\r\n')[0]?.trim() || 'Apple iPhone') : null,
      }
    } catch {
      return { connected: false }
    }
  })

  // Window Controls
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  // Desktop Screen Sources for Mirroring
  ipcMain.handle('system:get-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
      })
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail.toDataURL(),
        display_id: s.display_id,
      }))
    } catch (err) {
      console.error('get-sources error:', err)
      return []
    }
  })

  // ─── Authentication Handlers (Native Direct) ───────────────────────────────
  ipcMain.handle('auth:login', async (_event, { identifier, email, username, password }) => {
    try {
      const loginId = (identifier || email || username || '').trim()
      if (!loginId || !password) {
        return { success: false, error: 'Please enter your Email/Username and Password.' }
      }
      const user = findUserByIdentifier(loginId)
      if (!user) {
        return {
          success: false,
          error: 'No account found with this email or username. Please check your details or click "Sign Up" to create an account.',
        }
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash)
      if (!isMatch) {
        return {
          success: false,
          error: 'Incorrect password. Please check your password or use "Reset Password".',
        }
      }
      const session = createSession(user.id, user.username)
      return {
        success: true,
        message: 'Login successful.',
        token: session.token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          mobile: user.mobile || '',
        },
      }
    } catch (err) {
      console.error('[IPC auth:login error]:', err)
      return { success: false, error: 'Internal error during login.' }
    }
  })

  ipcMain.handle('auth:signup', async (_event, { username, email, password }) => {
    try {
      if (!email || !email.includes('@')) {
        return { success: false, error: 'A valid email address is required.' }
      }
      const cleanEmail = email.trim().toLowerCase()
      if (findUserByEmail(cleanEmail)) {
        return { success: false, error: 'An account with this email already exists. Please log in.' }
      }
      if (!password || password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' }
      }
      let finalUsername = (username || '').trim()
      if (!finalUsername) finalUsername = cleanEmail.split('@')[0]
      if (finalUsername.length < 2) finalUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`
      if (findUserByUsername(finalUsername)) {
        finalUsername = `${finalUsername}_${Math.floor(100 + Math.random() * 900)}`
      }
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(password, saltRounds)
      const user = createUser({
        username: finalUsername,
        email: cleanEmail,
        mobile: '',
        passwordHash,
      })
      const session = createSession(user.id, user.username)
      return {
        success: true,
        message: 'Account successfully created!',
        token: session.token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          mobile: user.mobile || '',
        },
      }
    } catch (err) {
      console.error('[IPC auth:signup error]:', err)
      return { success: false, error: 'Internal error during account creation.' }
    }
  })

  ipcMain.handle('auth:me', async (_event, token) => {
    if (!token) return { success: false, error: 'No session token provided.' }
    const sessionData = getSession(token)
    if (!sessionData) return { success: false, error: 'Session expired or invalid.' }
    return { success: true, user: sessionData.user }
  })

  ipcMain.handle('auth:logout', async (_event, token) => {
    if (token) deleteSession(token)
    return { success: true, message: 'Logged out successfully.' }
  })

  ipcMain.handle('auth:system-status', async () => {
    const count = countUsers()
    return {
      hasUsers: count > 0,
      totalUsers: count,
      appName: 'LBM Mirror',
      version: '1.0.0',
    }
  })

  ipcMain.handle('auth:reset-password', async (_event, { identifier, newPassword }) => {
    try {
      const target = (identifier || '').trim()
      if (!target) return { success: false, error: 'Please enter your registered Email or Username.' }
      if (!newPassword || newPassword.length < 6) return { success: false, error: 'New password must be at least 6 characters.' }
      const saltRounds = 10
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)
      const updated = updateUserPassword(target, newPasswordHash)
      if (!updated) return { success: false, error: 'No account found with this email or username.' }
      const session = createSession(updated.id, updated.username)
      return {
        success: true,
        message: 'Password reset successful!',
        token: session.token,
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
        },
      }
    } catch (err) {
      return { success: false, error: 'Internal error during password reset.' }
    }
  })
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Handle desktop capture requests in Electron (screen share permission)
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
      if (sources.length > 0) {
        callback({ video: sources[0], audio: 'loopback' })
      } else {
        callback({})
      }
    } catch (err) {
      console.error('Display media request error:', err)
      callback({})
    }
  })

  await startInternalServer()
  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (adbBridge) {
    adbBridge.stopTracking()
    adbBridge.stopMirroring()
  }
  if (airplayBridge) {
    airplayBridge.stop()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

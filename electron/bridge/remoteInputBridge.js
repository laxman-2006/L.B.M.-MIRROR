import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { app } from 'electron'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Standard Windows Virtual Key Codes mapping
const VK_MAP = {
  Backspace: 0x08,
  Tab: 0x09,
  Enter: 0x0D,
  ShiftLeft: 0x10,
  ShiftRight: 0x10,
  ControlLeft: 0x11,
  ControlRight: 0x11,
  AltLeft: 0x12,
  AltRight: 0x12,
  Pause: 0x13,
  CapsLock: 0x14,
  Escape: 0x1B,
  Space: 0x20,
  PageUp: 0x21,
  PageDown: 0x22,
  End: 0x23,
  Home: 0x24,
  ArrowLeft: 0x25,
  ArrowUp: 0x26,
  ArrowRight: 0x27,
  ArrowDown: 0x28,
  PrintScreen: 0x2C,
  Insert: 0x2D,
  Delete: 0x2E,
  MetaLeft: 0x5B,
  MetaRight: 0x5C,
  F1: 0x70,
  F2: 0x71,
  F3: 0x72,
  F4: 0x73,
  F5: 0x74,
  F6: 0x75,
  F7: 0x76,
  F8: 0x77,
  F9: 0x78,
  F10: 0x79,
  F11: 0x7A,
  F12: 0x7B,
}

export class RemoteInputBridge {
  constructor() {
    this.process = null
    this.screenWidth = 1920
    this.screenHeight = 1080
    this.isReady = false
    this.pendingResolves = []
  }

  resolveScriptPath() {
    const possiblePaths = [
      path.join(__dirname, 'remote_input_agent.ps1'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'electron', 'bridge', 'remote_input_agent.ps1'),
      path.join(app ? app.getAppPath() : process.cwd(), 'electron', 'bridge', 'remote_input_agent.ps1'),
      path.join(process.cwd(), 'electron', 'bridge', 'remote_input_agent.ps1'),
    ]

    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) return p
    }

    return path.join(__dirname, 'remote_input_agent.ps1')
  }

  start() {
    if (this.process && this.isReady) {
      return Promise.resolve({
        success: true,
        width: this.screenWidth,
        height: this.screenHeight,
      })
    }

    return new Promise((resolve) => {
      const scriptPath = this.resolveScriptPath()
      console.log('[RemoteInputBridge] Starting input agent from:', scriptPath)

      try {
        this.process = spawn(
          'powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
          {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'inherit'],
          }
        )

        this.process.stdout.on('data', (data) => {
          const lines = data.toString().split('\n')
          for (let line of lines) {
            line = line.trim()
            if (!line) continue

            if (line.startsWith('READY')) {
              const parts = line.split(' ')
              if (parts.length >= 3) {
                this.screenWidth = parseInt(parts[1], 10) || 1920
                this.screenHeight = parseInt(parts[2], 10) || 1080
              }
              this.isReady = true
              console.log(`[RemoteInputBridge] Host screen resolution: ${this.screenWidth}x${this.screenHeight}`)
              resolve({
                success: true,
                width: this.screenWidth,
                height: this.screenHeight,
              })
            }
          }
        })

        this.process.on('close', (code) => {
          console.log('[RemoteInputBridge] Agent exited with code:', code)
          this.process = null
          this.isReady = false
        })

        this.process.on('error', (err) => {
          console.error('[RemoteInputBridge] Spawn error:', err)
          this.process = null
          this.isReady = false
          resolve({ success: false, error: err.message })
        })

        // Safety timeout in case READY is delayed
        setTimeout(() => {
          if (!this.isReady) {
            resolve({
              success: true,
              width: this.screenWidth,
              height: this.screenHeight,
            })
          }
        }, 1500)
      } catch (err) {
        console.error('[RemoteInputBridge] Failed to start:', err)
        resolve({ success: false, error: err.message })
      }
    })
  }

  sendRaw(cmd) {
    if (this.process && this.process.stdin && !this.process.stdin.destroyed) {
      try {
        this.process.stdin.write(cmd + '\n')
      } catch (err) {
        console.warn('[RemoteInputBridge] Write error:', err)
      }
    }
  }

  handleEvent(event) {
    if (!event || !event.type) return

    switch (event.type) {
      case 'mouse:move': {
        // Normalized coordinates 0..1 to host screen pixels
        const targetX = Math.round(event.x * this.screenWidth)
        const targetY = Math.round(event.y * this.screenHeight)
        this.sendRaw(`M ${targetX} ${targetY}`)
        break
      }

      case 'mouse:click': {
        if (event.button === 'right') {
          this.sendRaw('RC')
        } else {
          this.sendRaw('LC')
        }
        break
      }

      case 'mouse:down': {
        if (event.button === 'right') {
          this.sendRaw('RD')
        } else {
          this.sendRaw('LD')
        }
        break
      }

      case 'mouse:up': {
        if (event.button === 'right') {
          this.sendRaw('RU')
        } else {
          this.sendRaw('LU')
        }
        break
      }

      case 'mouse:dblclick': {
        this.sendRaw('DC')
        break
      }

      case 'mouse:wheel': {
        // Delta > 0 is scroll up, Delta < 0 is scroll down
        const delta = event.deltaY ? -Math.sign(event.deltaY) * 120 : (event.delta || -120)
        this.sendRaw(`W ${delta}`)
        break
      }

      case 'key:text': {
        if (event.text) {
          this.sendRaw(`C ${event.text}`)
        }
        break
      }

      case 'key:down':
      case 'key:up': {
        const isUp = event.type === 'key:up' ? 1 : 0
        let vk = 0

        if (event.code && VK_MAP[event.code]) {
          vk = VK_MAP[event.code]
        } else if (event.key && event.key.length === 1) {
          const charCode = event.key.toUpperCase().charCodeAt(0)
          if ((charCode >= 65 && charCode <= 90) || (charCode >= 48 && charCode <= 57)) {
            vk = charCode
          }
        }

        if (vk > 0) {
          this.sendRaw(`K ${vk} ${isUp}`)
        }
        break
      }

      case 'shortcut': {
        const sc = (event.name || '').toUpperCase()
        if (sc === 'WIN') this.sendRaw('WIN')
        else if (sc === 'TASKMGR') this.sendRaw('TASKMGR')
        else if (sc === 'ALTTAB') this.sendRaw('ALTTAB')
        else if (sc === 'EXPLORER') this.sendRaw('EXPLORER')
        break
      }

      default:
        break
    }
  }

  stop() {
    if (this.process) {
      try {
        this.sendRaw('QUIT')
        this.process.kill()
      } catch {}
      this.process = null
      this.isReady = false
    }
  }
}

export const defaultRemoteInputBridge = new RemoteInputBridge()

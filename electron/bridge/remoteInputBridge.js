import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { app } from 'electron'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Standard Windows Virtual Key Codes mapping
const VK_MAP = {
  // Navigation & Control
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

  // Windows Keys
  MetaLeft: 0x5B,
  MetaRight: 0x5C,
  ContextMenu: 0x5D,

  // Number Row
  Digit0: 0x30,
  Digit1: 0x31,
  Digit2: 0x32,
  Digit3: 0x33,
  Digit4: 0x34,
  Digit5: 0x35,
  Digit6: 0x36,
  Digit7: 0x37,
  Digit8: 0x38,
  Digit9: 0x39,

  // Alphabet A-Z
  KeyA: 0x41,
  KeyB: 0x42,
  KeyC: 0x43,
  KeyD: 0x44,
  KeyE: 0x45,
  KeyF: 0x46,
  KeyG: 0x47,
  KeyH: 0x48,
  KeyI: 0x49,
  KeyJ: 0x4A,
  KeyK: 0x4B,
  KeyL: 0x4C,
  KeyM: 0x4D,
  KeyN: 0x4E,
  KeyO: 0x4F,
  KeyP: 0x50,
  KeyQ: 0x51,
  KeyR: 0x52,
  KeyS: 0x53,
  KeyT: 0x54,
  KeyU: 0x55,
  KeyV: 0x56,
  KeyW: 0x57,
  KeyX: 0x58,
  KeyY: 0x59,
  KeyZ: 0x5A,

  // Numpad
  Numpad0: 0x60,
  Numpad1: 0x61,
  Numpad2: 0x62,
  Numpad3: 0x63,
  Numpad4: 0x64,
  Numpad5: 0x65,
  Numpad6: 0x66,
  Numpad7: 0x67,
  Numpad8: 0x68,
  Numpad9: 0x69,
  NumpadMultiply: 0x6A,
  NumpadAdd: 0x6B,
  NumpadSubtract: 0x6D,
  NumpadDecimal: 0x6E,
  NumpadDivide: 0x6F,

  // Function Keys
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

  // Punctuation & Symbols
  Semicolon: 0xBA,
  Equal: 0xBB,
  Comma: 0xBC,
  Minus: 0xBD,
  Period: 0xBE,
  Slash: 0xBF,
  Backquote: 0xC0,
  BracketLeft: 0xDB,
  Backslash: 0xDC,
  BracketRight: 0xDD,
  Quote: 0xDE,
}

export class RemoteInputBridge {
  constructor() {
    this.process = null
    this.screenWidth = 1920
    this.screenHeight = 1080
    this.isReady = false
    this.isStarting = false
    this.pendingResolves = []
    this.commandBuffer = []
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

    if (this.isStarting) {
      return new Promise((resolve) => {
        this.pendingResolves.push(resolve)
      })
    }

    this.isStarting = true

    return new Promise((resolve) => {
      this.pendingResolves.push(resolve)
      const scriptPath = this.resolveScriptPath()
      console.log('[RemoteInputBridge] Starting native input agent from:', scriptPath)

      try {
        this.process = spawn(
          'powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
          {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
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
              this.isStarting = false
              console.log(`[RemoteInputBridge] Host screen resolution: ${this.screenWidth}x${this.screenHeight}`)

              // Flush buffered commands if any
              if (this.commandBuffer.length > 0) {
                const queued = [...this.commandBuffer]
                this.commandBuffer = []
                queued.forEach((cmd) => this.sendRaw(cmd))
              }

              this.flushResolves({
                success: true,
                width: this.screenWidth,
                height: this.screenHeight,
              })
            }
          }
        })

        this.process.stderr.on('data', (errData) => {
          console.warn('[RemoteInputBridge STDERR]:', errData.toString().trim())
        })

        this.process.on('close', (code) => {
          console.log('[RemoteInputBridge] Agent exited with code:', code)
          this.process = null
          this.isReady = false
          this.isStarting = false
        })

        this.process.on('error', (err) => {
          console.error('[RemoteInputBridge] Spawn error:', err)
          this.process = null
          this.isReady = false
          this.isStarting = false
          this.flushResolves({ success: false, error: err.message })
        })

        // Safety timeout
        setTimeout(() => {
          if (!this.isReady) {
            this.isReady = true
            this.isStarting = false
            this.flushResolves({
              success: true,
              width: this.screenWidth,
              height: this.screenHeight,
            })
          }
        }, 1500)
      } catch (err) {
        console.error('[RemoteInputBridge] Failed to start:', err)
        this.isStarting = false
        this.flushResolves({ success: false, error: err.message })
      }
    })
  }

  flushResolves(result) {
    const list = [...this.pendingResolves]
    this.pendingResolves = []
    list.forEach((r) => {
      try { r(result) } catch {}
    })
  }

  sendRaw(cmd) {
    if (!this.process || !this.isReady) {
      this.commandBuffer.push(cmd)
      if (this.commandBuffer.length > 50) this.commandBuffer.shift()
      if (!this.isStarting) {
        this.start().catch(() => {})
      }
      return
    }

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

    // Ensure agent is running
    if (!this.process && !this.isStarting) {
      this.start().catch(() => {})
    }

    // Compute pixel coordinates if normalized x, y are provided
    let px = -1
    let py = -1
    if (typeof event.x === 'number' && typeof event.y === 'number') {
      px = Math.max(0, Math.min(this.screenWidth - 1, Math.round(event.x * this.screenWidth)))
      py = Math.max(0, Math.min(this.screenHeight - 1, Math.round(event.y * this.screenHeight)))
    }

    switch (event.type) {
      case 'mouse:move': {
        if (px >= 0 && py >= 0) {
          this.sendRaw(`M ${px} ${py}`)
        }
        break
      }

      case 'mouse:click': {
        if (event.button === 'right') {
          if (px >= 0 && py >= 0) this.sendRaw(`RC ${px} ${py}`)
          else this.sendRaw('RC')
        } else {
          if (px >= 0 && py >= 0) this.sendRaw(`LC ${px} ${py}`)
          else this.sendRaw('LC')
        }
        break
      }

      case 'mouse:down': {
        if (event.button === 'right') {
          if (px >= 0 && py >= 0) this.sendRaw(`RD ${px} ${py}`)
          else this.sendRaw('RD')
        } else {
          if (px >= 0 && py >= 0) this.sendRaw(`LD ${px} ${py}`)
          else this.sendRaw('LD')
        }
        break
      }

      case 'mouse:up': {
        if (event.button === 'right') {
          if (px >= 0 && py >= 0) this.sendRaw(`RU ${px} ${py}`)
          else this.sendRaw('RU')
        } else {
          if (px >= 0 && py >= 0) this.sendRaw(`LU ${px} ${py}`)
          else this.sendRaw('LU')
        }
        break
      }

      case 'mouse:dblclick': {
        if (px >= 0 && py >= 0) this.sendRaw(`DC ${px} ${py}`)
        else this.sendRaw('DC')
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
        else if (sc === 'WIN_R') this.sendRaw('WIN_R')
        else if (sc === 'WIN_D') this.sendRaw('WIN_D')
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
      this.isStarting = false
    }
  }
}

export const defaultRemoteInputBridge = new RemoteInputBridge()

import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Embedded PowerShell agent script to guarantee physical file execution in all modes
const EMBEDDED_AGENT_SCRIPT = `Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WinUser32 {
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, ushort bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);
}
"@

try { [WinUser32]::SetProcessDPIAware() | Out-Null } catch {}

$SM_CXSCREEN = 0
$SM_CYSCREEN = 1

$MOUSEEVENTF_MOVE        = 0x0001
$MOUSEEVENTF_LEFTDOWN    = 0x0002
$MOUSEEVENTF_LEFTUP      = 0x0004
$MOUSEEVENTF_RIGHTDOWN   = 0x0008
$MOUSEEVENTF_RIGHTUP     = 0x0010
$MOUSEEVENTF_MIDDLEDOWN  = 0x0020
$MOUSEEVENTF_MIDDLEUP    = 0x0040
$MOUSEEVENTF_WHEEL       = 0x0800

$KEYEVENTF_KEYUP         = 0x0002
$KEYEVENTF_UNICODE       = 0x0004

$screenWidth  = [WinUser32]::GetSystemMetrics($SM_CXSCREEN)
$screenHeight = [WinUser32]::GetSystemMetrics($SM_CYSCREEN)

Write-Host "READY $screenWidth $screenHeight"
[Console]::Out.Flush()

while ($true) {
    $line = [Console]::ReadLine()
    if ($null -eq $line) { break }
    $line = $line.Trim()
    if ([string]::IsNullOrEmpty($line)) { continue }
    if ($line -eq "QUIT" -or $line -eq "EXIT") { break }

    try {
        $parts = $line -split " "
        $cmd = $parts[0].ToUpperInvariant()

        switch ($cmd) {
            "M" {
                $x = [int]$parts[1]
                $y = [int]$parts[2]
                [WinUser32]::SetCursorPos($x, $y) | Out-Null
            }
            "LC" {
                if ($parts.Length -ge 3) {
                    $x = [int]$parts[1]
                    $y = [int]$parts[2]
                    [WinUser32]::SetCursorPos($x, $y) | Out-Null
                }
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "LD" {
                if ($parts.Length -ge 3) {
                    $x = [int]$parts[1]
                    $y = [int]$parts[2]
                    [WinUser32]::SetCursorPos($x, $y) | Out-Null
                }
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
            }
            "LU" {
                if ($parts.Length -ge 3) {
                    $x = [int]$parts[1]
                    $y = [int]$parts[2]
                    [WinUser32]::SetCursorPos($x, $y) | Out-Null
                }
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "RC" {
                if ($parts.Length -ge 3) {
                    $x = [int]$parts[1]
                    $y = [int]$parts[2]
                    [WinUser32]::SetCursorPos($x, $y) | Out-Null
                }
                [WinUser32]::mouse_event($MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::mouse_event($MOUSEEVENTF_RIGHTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "RD" {
                if ($parts.Length -ge 3) {
                    $x = [int]$parts[1]
                    $y = [int]$parts[2]
                    [WinUser32]::SetCursorPos($x, $y) | Out-Null
                }
                [WinUser32]::mouse_event($MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, [UIntPtr]::Zero)
            }
            "RU" {
                if ($parts.Length -ge 3) {
                    $x = [int]$parts[1]
                    $y = [int]$parts[2]
                    [WinUser32]::SetCursorPos($x, $y) | Out-Null
                }
                [WinUser32]::mouse_event($MOUSEEVENTF_RIGHTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "DC" {
                if ($parts.Length -ge 3) {
                    $x = [int]$parts[1]
                    $y = [int]$parts[2]
                    [WinUser32]::SetCursorPos($x, $y) | Out-Null
                }
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
                [System.Threading.Thread]::Sleep(40)
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "W" {
                $delta = [int]$parts[1]
                [WinUser32]::mouse_event($MOUSEEVENTF_WHEEL, 0, 0, [uint32]$delta, [UIntPtr]::Zero)
            }
            "C" {
                $charStr = $line.Substring(2)
                foreach ($c in $charStr.ToCharArray()) {
                    $u16 = [uint16][char]$c
                    [WinUser32]::keybd_event(0, $u16, $KEYEVENTF_UNICODE, [UIntPtr]::Zero)
                    [WinUser32]::keybd_event(0, $u16, ($KEYEVENTF_UNICODE -bor $KEYEVENTF_KEYUP), [UIntPtr]::Zero)
                }
            }
            "K" {
                $vk = [byte]$parts[1]
                $isUp = ($parts[2] -eq "1" -or $parts[2].ToUpper() -eq "UP")
                $flags = if ($isUp) { $KEYEVENTF_KEYUP } else { 0 }
                [WinUser32]::keybd_event($vk, 0, $flags, [UIntPtr]::Zero)
            }
            "WIN" {
                [WinUser32]::keybd_event(0x5B, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x5B, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
            "TASKMGR" {
                [WinUser32]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x10, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x1B, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x1B, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x10, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x11, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
            "ALTTAB" {
                [WinUser32]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x09, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x09, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x12, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
            "EXPLORER" {
                [WinUser32]::keybd_event(0x5B, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x45, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x45, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x5B, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
            "WIN_R" {
                [WinUser32]::keybd_event(0x5B, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x52, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x52, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x5B, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
            "WIN_D" {
                [WinUser32]::keybd_event(0x5B, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x44, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x44, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x5B, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
        }
    } catch {}
}
`

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

  // Alphabet
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
    const tempAgentPath = path.join(os.tmpdir(), 'lbm_remote_input_agent.ps1')

    // 1. Write the embedded agent script to a physical temp file so powershell.exe can always execute it
    try {
      fs.writeFileSync(tempAgentPath, EMBEDDED_AGENT_SCRIPT, 'utf8')
      return tempAgentPath
    } catch (err) {
      console.warn('[RemoteInputBridge] Could not write temp agent script:', err)
    }

    // 2. Fallbacks for dev and unpacked
    const possiblePaths = [
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'electron', 'bridge', 'remote_input_agent.ps1'),
      path.join(process.cwd(), 'electron', 'bridge', 'remote_input_agent.ps1'),
      path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), 'remote_input_agent.ps1'),
    ]

    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) return p
    }

    return tempAgentPath
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
        const isUp = event.type === 'key:up'
        let vk = 0

        if (event.code && VK_MAP[event.code]) {
          vk = VK_MAP[event.code]
        } else if (event.key) {
          if (event.key.length === 1) {
            const upper = event.key.toUpperCase()
            const codeKey = `Key${upper}`
            const digitKey = `Digit${upper}`
            if (VK_MAP[codeKey]) vk = VK_MAP[codeKey]
            else if (VK_MAP[digitKey]) vk = VK_MAP[digitKey]
            else vk = upper.charCodeAt(0)
          } else {
            vk = VK_MAP[event.key] || 0
          }
        }

        if (vk > 0) {
          this.sendRaw(`K ${vk} ${isUp ? '1' : '0'}`)
        } else if (!isUp && event.key && event.key.length === 1) {
          this.sendRaw(`C ${event.key}`)
        }
        break
      }

      case 'shortcut': {
        const name = (event.name || '').toUpperCase()
        if (name === 'WIN' || name === 'START') this.sendRaw('WIN')
        else if (name === 'TASKMGR' || name === 'TASK_MANAGER') this.sendRaw('TASKMGR')
        else if (name === 'ALTTAB' || name === 'ALT_TAB') this.sendRaw('ALTTAB')
        else if (name === 'EXPLORER' || name === 'FILE_EXPLORER') this.sendRaw('EXPLORER')
        else if (name === 'WIN_R' || name === 'RUN') this.sendRaw('WIN_R')
        else if (name === 'WIN_D' || name === 'DESKTOP') this.sendRaw('WIN_D')
        break
      }

      default:
        break
    }
  }

  stop() {
    if (this.process) {
      try {
        this.process.stdin.write('QUIT\n')
      } catch {}
      setTimeout(() => {
        if (this.process) {
          try { this.process.kill() } catch {}
          this.process = null
        }
      }, 200)
    }
    this.isReady = false
    this.isStarting = false
  }
}

export const defaultRemoteInputBridge = new RemoteInputBridge()

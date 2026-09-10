/**
 * Environment detection utilities for LBM Mirror
 * Differentiates between Electron Desktop App runtime and Web Browser App runtime.
 */

export function isElectronApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)
}

export function isWebApp(): boolean {
  return !isElectronApp()
}

export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
}

export function isAndroidBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

export function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function getAppRuntime(): 'electron' | 'web' {
  return isElectronApp() ? 'electron' : 'web'
}

/**
 * Returns shareable URL for joining the session from another device.
 */
export function getJoinUrl(pin: string, sessionId?: string): string {
  if (typeof window === 'undefined') return `https://lbm-mirror.web.app/?join=${pin}`
  const origin = window.location.origin.replace(/\/$/, '')
  return `${origin}/?join=${pin}${sessionId ? `&session=${sessionId}` : ''}`
}

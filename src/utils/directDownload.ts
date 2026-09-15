/**
 * Direct Windows EXE Download System
 *
 * Requirements:
 * 1. Download Button → Direct .EXE Download
 * 2. Directly Windows .EXE setup file download to user's default Downloads folder
 * 3. NO intermediate HTML page, preview window, confirmation dialog, or blank tab
 * 4. Standard browser download mechanism
 */

export function getDirectExeDownloadUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost'
    const port = window.location.port
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')

    if (isLocal) {
      if (port === '3001') {
        return '/api/download/windows'
      }
      return `http://${hostname}:3001/api/download/windows`
    }

    // Direct static path if hosted
    return '/downloads/LBM_Mirror_Setup.exe'
  }

  return 'https://github.com/laxman-2006/L.B.M.-MIRROR/releases/download/v1.0.0/LBM_Mirror_Setup.exe'
}

export function getDirectApkDownloadUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost'
    const port = window.location.port
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')

    if (isLocal) {
      if (port === '3001') {
        return '/api/download/android'
      }
      return `http://${hostname}:3001/api/download/android`
    }

    // Hosted/Production: use absolute URL to ensure correct APK file is served
    const origin = window.location.origin
    return `${origin}/downloads/LBMMirror.apk`
  }

  // Absolute fallback for SSR or unknown environments
  return 'https://l-b-m-mirror.vercel.app/downloads/LBMMirror.apk'
}

/**
 * Triggers an immediate, standard browser file download without opening blank tabs or pages.
 * The file is automatically saved into the user's default Downloads folder.
 */
export function triggerDirectExeDownload(fileName: string = 'LBM_Mirror_Setup.exe', customUrl?: string): void {
  const downloadUrl = customUrl || getDirectExeDownloadUrl()

  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', fileName)
  link.style.position = 'fixed'
  link.style.left = '-9999px'
  link.style.top = '-9999px'
  link.style.opacity = '0'

  document.body.appendChild(link)
  link.click()

  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link)
      }
    } catch {}
  }, 1000)
}

/**
 * Triggers an immediate Android APK download directly to user's device.
 */
export function triggerDirectApkDownload(fileName: string = 'LBMMirror.apk', customUrl?: string): void {
  const downloadUrl = customUrl || getDirectApkDownloadUrl()

  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', fileName)
  link.style.position = 'fixed'
  link.style.left = '-9999px'
  link.style.top = '-9999px'
  link.style.opacity = '0'

  document.body.appendChild(link)
  link.click()

  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link)
      }
    } catch {}
  }, 1000)
}


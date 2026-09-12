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
  // 1. If running in browser connected to local server or LAN:
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost'
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')

    if (isLocal) {
      // Use local server port 3001 direct download endpoint
      return `http://${hostname}:3001/api/download/windows`
    }
  }

  // 2. Direct Cloud Binary URL (GitHub releases direct attachment download)
  return 'https://github.com/laxman-2006/L.B.M.-MIRROR/releases/download/v1.0.0/LBM_Mirror_Setup.exe'
}

/**
 * Triggers an immediate, standard browser file download without opening blank tabs or pages.
 * The file is automatically saved into the user's default Downloads folder.
 */
export function triggerDirectExeDownload(fileName: string = 'LBM_Mirror_Setup.exe', customUrl?: string): void {
  const downloadUrl = customUrl || getDirectExeDownloadUrl()

  // Standard invisible anchor element with download attribute
  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', fileName)
  link.style.position = 'fixed'
  link.style.left = '-9999px'
  link.style.top = '-9999px'
  link.style.opacity = '0'

  // DO NOT use target="_blank" so the browser doesn't flash a blank white window
  document.body.appendChild(link)
  link.click()

  // Clean up element after triggering download
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link)
      }
    } catch {}
  }, 1000)
}

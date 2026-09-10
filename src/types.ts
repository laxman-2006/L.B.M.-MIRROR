export type ConnectionMode = 'host' | 'client'

// Platform tabs
export type Platform = 'ios' | 'android' | 'windows'

// Home screen pe kaunsa card select hua
export type AppView = 'home' | 'same-wifi' | 'usb' | 'screen-mirroring' | 'windows-cast' | 'windows-receive' | 'android-download'

export type SessionStatus =
  | 'WAITING'
  | 'REQUESTED'
  | 'APPROVED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'MIRRORING'
  | 'RECONNECTING'
  | 'DISCONNECTED'

export type PermissionSet = {
  screenShare: boolean
  audioShare: boolean
  remoteControl: boolean
  clipboard: boolean
  fileTransfer: boolean
}

export type SessionState = {
  sessionId: string
  pin: string
  status: SessionStatus
  connectionMethod: string
  permissions: PermissionSet
  createdAt: number
  qrLink: string
  clientName?: string | null
  clientPlatform?: string | null
}

export type DeviceRequest = {
  sessionId: string
  deviceName: string
  platform: string
}

export type StatsState = {
  fps: string
  latency: string
  resolution: string
  bitrate: string
  packetLoss: string
  connectionType: string
  webrtcState: string
  networkQuality: string
}

// USB device minimal info (WebUSB or Native ADB)
export type UsbDeviceInfo = {
  productName: string
  manufacturerName: string
  serial?: string
  status?: string // 'device' | 'unauthorized' | 'offline'
  isAuthorized?: boolean
}

export type AdbDevice = {
  id: string
  serial: string
  status: 'device' | 'unauthorized' | 'offline'
  isAuthorized: boolean
  model: string
  manufacturer: string
  product?: string
  usb?: string
}

export interface ElectronAPI {
  isElectron: boolean
  getNetworkInfo: () => Promise<{ ip: string; hostname: string; platform: string }>
  auth?: {
    signup: (data: { username?: string; email: string; password: string }) => Promise<{ success: boolean; user?: any; token?: string; error?: string; message?: string }>
    login: (data: { identifier?: string; email?: string; username?: string; password: string }) => Promise<{ success: boolean; user?: any; token?: string; error?: string; message?: string }>
    logout: (token?: string) => Promise<{ success: boolean; message?: string }>
    getMe: (token: string) => Promise<{ success: boolean; user?: any; error?: string }>
    systemStatus: () => Promise<{ hasUsers: boolean; totalUsers: number; appName: string; version: string }>
    resetPassword: (data: { identifier: string; newPassword: string }) => Promise<{ success: boolean; user?: any; token?: string; error?: string; message?: string }>
  }
  adb: {
    checkInstalled: () => Promise<{ installed: boolean; path: string | null }>
    downloadAdb: () => Promise<{ installed: boolean; path: string }>
    getDevices: () => Promise<AdbDevice[]>
    restartServer: () => Promise<{ success: boolean; error?: string }>
    startMirroring: (serial: string, options?: { fps?: number; resolution?: string; bitrate?: number; stayAwake?: boolean; turnScreenOff?: boolean; noAudio?: boolean; codec?: string }) => Promise<{ success: boolean; error?: string; serial?: string; resolution?: string; fps?: number }>
    stopMirroring: () => Promise<{ success: boolean }>
    onDeviceList: (cb: (devices: AdbDevice[]) => void) => () => void
    onFrame: (cb: (frame: { image: string; resolution: string; latency: string }) => void) => () => void
    onStats: (cb: (stats: Partial<StatsState>) => void) => () => void
    onDownloadProgress: (cb: (p: { status: string; message: string }) => void) => () => void
  }
  airplay: {
    startReceiver: (options?: { serviceName?: string; fps?: number }) => Promise<{ running: boolean; serviceName?: string; port?: number }>
    stopReceiver: () => Promise<{ success: boolean }>
    onClientConnected: (cb: (client: { ip: string; name: string; connectedAt: number }) => void) => () => void
    onStats: (cb: (stats: Partial<StatsState>) => void) => () => void
    checkIosUsb?: () => Promise<{ connected: boolean; deviceName?: string | null }>
  }
  system: {
    getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>
  }
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

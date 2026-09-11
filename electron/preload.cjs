const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  getNetworkInfo: () => ipcRenderer.invoke('system:get-network-info'),

  auth: {
    login: (data) => ipcRenderer.invoke('auth:login', data),
    signup: (data) => ipcRenderer.invoke('auth:signup', data),
    logout: (token) => ipcRenderer.invoke('auth:logout', token),
    getMe: (token) => ipcRenderer.invoke('auth:me', token),
    systemStatus: () => ipcRenderer.invoke('auth:system-status'),
    resetPassword: (data) => ipcRenderer.invoke('auth:reset-password', data),
  },

  adb: {
    checkInstalled: () => ipcRenderer.invoke('adb:check-installed'),
    downloadAdb: () => ipcRenderer.invoke('adb:download-adb'),
    getDevices: () => ipcRenderer.invoke('adb:get-devices'),
    restartServer: () => ipcRenderer.invoke('adb:restart-server'),
    installApk: (serial) => ipcRenderer.invoke('adb:install-apk', serial),
    startMirroring: (serial, options) => ipcRenderer.invoke('adb:start-mirroring', serial, options),
    stopMirroring: () => ipcRenderer.invoke('adb:stop-mirroring'),

    onDeviceList: (cb) => {
      const listener = (_event, devices) => cb(devices)
      ipcRenderer.on('adb:device-list', listener)
      return () => ipcRenderer.removeListener('adb:device-list', listener)
    },
    onFrame: (cb) => {
      const listener = (_event, frameData) => cb(frameData)
      ipcRenderer.on('adb:frame', listener)
      return () => ipcRenderer.removeListener('adb:frame', listener)
    },
    onStats: (cb) => {
      const listener = (_event, stats) => cb(stats)
      ipcRenderer.on('adb:stats', listener)
      return () => ipcRenderer.removeListener('adb:stats', listener)
    },
    onDownloadProgress: (cb) => {
      const listener = (_event, progress) => cb(progress)
      ipcRenderer.on('adb:download-progress', listener)
      return () => ipcRenderer.removeListener('adb:download-progress', listener)
    },
  },

  remoteInput: {
    start: () => ipcRenderer.invoke('remote-input:start'),
    stop: () => ipcRenderer.invoke('remote-input:stop'),
    sendEvent: (event) => ipcRenderer.invoke('remote-input:event', event),
  },

  airplay: {
    startReceiver: (options) => ipcRenderer.invoke('airplay:start-receiver', options),
    stopReceiver: () => ipcRenderer.invoke('airplay:stop-receiver'),

    onClientConnected: (cb) => {
      const listener = (_event, client) => cb(client)
      ipcRenderer.on('airplay:client-connected', listener)
      return () => ipcRenderer.removeListener('airplay:client-connected', listener)
    },
    onStats: (cb) => {
      const listener = (_event, stats) => cb(stats)
      ipcRenderer.on('airplay:stats', listener)
      return () => ipcRenderer.removeListener('airplay:stats', listener)
    },
    checkIosUsb: () => ipcRenderer.invoke('ios:check-usb'),
  },

  system: {
    getSources: () => ipcRenderer.invoke('system:get-sources'),
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
})

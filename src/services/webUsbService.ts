/**
 * LBM Mirror - WebUSB Direct Device Service
 * Enables Chromium browsers (Chrome, Edge, Opera, Brave) to detect and connect to Android devices via USB cable.
 */

export interface WebUsbDevice {
  productName: string
  manufacturerName: string
  serialNumber?: string
  vendorId: number
  productId: number
  deviceClass?: number
  rawDevice: any
}

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}

// Well-known Android OEM Vendor IDs
const KNOWN_ANDROID_VENDOR_IDS = [
  0x18d1, // Google
  0x04e8, // Samsung
  0x2717, // Xiaomi
  0x22d9, // OnePlus / Oppo
  0x12d1, // Huawei / Honor
  0x2a70, // OnePlus
  0x0bb4, // HTC
  0x0fce, // Sony
  0x17ef, // Lenovo / Motorola
  0x05c6, // Qualcomm
  0x2836, // Vivo
]

export class WebUsbService {
  private static instance: WebUsbService

  static getInstance(): WebUsbService {
    if (!WebUsbService.instance) {
      WebUsbService.instance = new WebUsbService()
    }
    return WebUsbService.instance
  }

  /**
   * Prompts user with browser's native USB device picker dialog.
   */
  async requestAndroidDevice(): Promise<WebUsbDevice | null> {
    if (!isWebUsbSupported()) {
      throw new Error('WebUSB is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera.')
    }

    try {
      const usb = (navigator as any).usb
      const filters = KNOWN_ANDROID_VENDOR_IDS.map((vendorId) => ({ vendorId }))

      const device = await usb.requestDevice({ filters })
      if (!device) return null

      return {
        productName: device.productName || 'Android USB Device',
        manufacturerName: device.manufacturerName || 'Android',
        serialNumber: device.serialNumber || 'USB-DEVICE',
        vendorId: device.vendorId,
        productId: device.productId,
        deviceClass: device.deviceClass,
        rawDevice: device,
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return null // User cancelled picker
      }
      throw err
    }
  }

  /**
   * Lists already-paired USB devices without showing the picker dialog again.
   */
  async getPairedDevices(): Promise<WebUsbDevice[]> {
    if (!isWebUsbSupported()) return []

    try {
      const usb = (navigator as any).usb
      const devices = await usb.getDevices()
      return devices.map((d: any) => ({
        productName: d.productName || 'Android Device',
        manufacturerName: d.manufacturerName || 'Android',
        serialNumber: d.serialNumber || 'USB-DEVICE',
        vendorId: d.vendorId,
        productId: d.productId,
        rawDevice: d,
      }))
    } catch {
      return []
    }
  }

  /**
   * Listens for USB plug / unplug events.
   */
  onDeviceChange(cb: () => void): () => void {
    if (!isWebUsbSupported()) return () => {}

    const usb = (navigator as any).usb
    usb.addEventListener('connect', cb)
    usb.addEventListener('disconnect', cb)

    return () => {
      usb.removeEventListener('connect', cb)
      usb.removeEventListener('disconnect', cb)
    }
  }
}

export const defaultWebUsbService = WebUsbService.getInstance()

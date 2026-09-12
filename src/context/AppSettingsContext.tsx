import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import logoImg from '../assets/logo.png'

export interface AppSettings {
  appName: string
  appTagline: string
  appLogo: string
  founderName: string
  founderRole: string
  founderQuote: string
  founderBanner: string
  email: string
  phone: string
  whatsapp: string
  instagramHandle: string
  instagramUrl: string
  youtubeHandle: string
  youtubeUrl: string
  facebookHandle: string
  facebookUrl: string
  windowsDownloadUrl?: string
  androidDownloadUrl?: string
  adminPin?: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  appName: 'LBM Mirror',
  appTagline: 'Screen Mirroring',
  appLogo: logoImg,
  founderName: 'Laxman Choudhary',
  founderRole: 'Founder & CEO — LBM Mirror',
  founderQuote: 'Distance Means Nothing When Technology Brings Us Together.',
  founderBanner: '/founder_ceo_showcase.jpg',
  email: 'lc1229501@gmail.com',
  phone: '',
  whatsapp: '',
  instagramHandle: '@lucky_bhambhu',
  instagramUrl: 'https://www.instagram.com/lucky_bhambhu?stkn=MXgyaHZmNGlhdDR0bA%3D%3D&utm_source=qr',
  youtubeHandle: 'UCaDs-ZGTGNIvuteFdarhrSg',
  youtubeUrl: 'https://www.youtube.com/channel/UCaDs-ZGTGNIvuteFdarhrSg',
  facebookHandle: '',
  facebookUrl: '',
  windowsDownloadUrl: 'https://github.com/laxman-2006/L.B.M.-MIRROR/releases/latest',
  androidDownloadUrl: '/api/download/android',
  adminPin: '1229',
}

interface AppSettingsContextType {
  settings: AppSettings
  isLoading: boolean
  refreshSettings: () => Promise<void>
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<{ success: boolean; message?: string; error?: string }>
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  refreshSettings: async () => {},
  updateSettings: async () => ({ success: false }),
})

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const cached = localStorage.getItem('lbm_cached_settings')
      if (cached) return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) }
    } catch {}
    return DEFAULT_SETTINGS
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/public/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.settings) {
          setSettings((prev) => {
            const merged = { ...prev, ...data.settings }
            try {
              localStorage.setItem('lbm_cached_settings', JSON.stringify(merged))
            } catch {}
            return merged
          })
        }
      }
    } catch (err) {
      console.warn('[AppSettings] Could not load dynamic settings, using cache/defaults:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.success && data.settings) {
        setSettings((prev) => {
          const merged = { ...prev, ...data.settings }
          try {
            localStorage.setItem('lbm_cached_settings', JSON.stringify(merged))
          } catch {}
          return merged
        })
        return { success: true, message: data.message || 'Settings updated successfully' }
      }
      return { success: false, error: data.error || 'Failed to update settings' }
    } catch (err) {
      console.warn('[AppSettings Update] Offline/Web fallback mode, saving to localStorage:', err)
      setSettings((prev) => {
        const merged = { ...prev, ...updates }
        try {
          localStorage.setItem('lbm_cached_settings', JSON.stringify(merged))
        } catch {}
        return merged
      })
      return { success: true, message: 'Settings saved successfully (Web Mode)!' }
    }
  }, [])

  useEffect(() => {
    refreshSettings()
  }, [refreshSettings])

  // Dynamically update document title with app name
  useEffect(() => {
    if (settings.appName) {
      document.title = `${settings.appName} — Ultra Fast Screen Mirroring`
    }
  }, [settings.appName])

  return (
    <AppSettingsContext.Provider value={{ settings, isLoading, refreshSettings, updateSettings }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export const useAppSettings = () => useContext(AppSettingsContext)

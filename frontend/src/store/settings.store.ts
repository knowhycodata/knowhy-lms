import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface PublicSettings {
  siteName: string
  siteDescription: string
  maintenanceMode: boolean
  maintenanceMessage: string
  allowRegistration: boolean
}

interface SettingsState {
  settings: PublicSettings
  loading: boolean
  fetchSettings: () => Promise<void>
}

const DEFAULT_SETTINGS: PublicSettings = {
  siteName: '',
  siteDescription: '',
  maintenanceMode: false,
  maintenanceMessage: '',
  allowRegistration: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      loading: false,

      fetchSettings: async () => {
        set({ loading: true })
        try {
          const response = await api.get('/public/settings')
          set({ settings: response.data.data })
        } catch (error) {
          console.error('Ayarlar yüklenemedi:', error)
        } finally {
          set({ loading: false })
        }
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)

import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Settings = {
  darkMode: boolean
  haptics: boolean
}

type SettingsContextType = {
  settings: Settings
  setDarkMode: (v: boolean) => void
  setHaptics: (v: boolean) => void
  loaded: boolean
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    haptics: true,
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const stored = await AsyncStorage.getItem('settings')
      if (stored) {
        setSettings(JSON.parse(stored))
      }
      setLoaded(true)
    })()
  }, [])

  const persist = async (next: Settings) => {
    setSettings(next)
    await AsyncStorage.setItem('settings', JSON.stringify(next))
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loaded,
        setDarkMode: v => persist({ ...settings, darkMode: v }),
        setHaptics: v => persist({ ...settings, haptics: v }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
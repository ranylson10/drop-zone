import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { darkColors, lightColors, type AppColors } from './colors'

type ThemeMode = 'light' | 'dark'

type ThemeContextValue = {
  colors: AppColors
  mode: ThemeMode
  toggleTheme: () => void
  setThemeMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  mode: 'light',
  toggleTheme: () => undefined,
  setThemeMode: () => undefined
})

const STORAGE_KEY = 'dropzone_theme_mode'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'dark' || value === 'light') setMode(value)
    }).catch(() => null)
  }, [])

  const setThemeMode = (nextMode: ThemeMode) => {
    setMode(nextMode)
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => null)
  }

  const value = useMemo(() => ({
    colors: mode === 'dark' ? darkColors : lightColors,
    mode,
    setThemeMode,
    toggleTheme: () => setThemeMode(mode === 'dark' ? 'light' : 'dark')
  }), [mode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getTheme, AVAILABLE_THEMES, type Theme } from '@/lib/themes'
import { database } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'

interface PersonalThemePreferences {
  themeId: string
  isDark: boolean
  accent: string
}

interface ThemeContextType {
  currentThemeId: string
  theme: Theme
  isDark: boolean
  setTheme: (themeId: string) => Promise<void>
  setIsDark: (isDark: boolean) => void
  setPersonalPreferences: (preferences: PersonalThemePreferences) => void
  applyTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith('/admin')
  const [globalThemeId, setGlobalThemeId] = useState('black-diamond')
  const [globalIsDark, setGlobalIsDark] = useState(true)
  const [personalPreferences, setPersonalPreferencesState] = useState<PersonalThemePreferences>({
    themeId: 'black-diamond',
    isDark: true,
    accent: '#914eff',
  })
  const [isLoading, setIsLoading] = useState(true)

  const currentThemeId = isAdminRoute ? globalThemeId : personalPreferences.themeId
  const isDark = isAdminRoute ? globalIsDark : personalPreferences.isDark
  const theme = getTheme(currentThemeId)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('myhack:theme-preferences')
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PersonalThemePreferences>
        const themeId = AVAILABLE_THEMES.some((available) => available.id === parsed.themeId)
          ? parsed.themeId!
          : 'black-diamond'
        const accent = typeof parsed.accent === 'string' && /^#[\da-f]{6}$/i.test(parsed.accent)
          ? parsed.accent
          : '#914eff'
        setPersonalPreferencesState({
          themeId,
          isDark: parsed.isDark !== false,
          accent,
        })
      }
    } catch (error) {
      console.error('[ThemeContext] Invalid local theme preferences:', error)
    }

    const loadTheme = async () => {
      try {
        if (database) {
          const themeRef = ref(database, 'settings/theme')
          return onValue(themeRef, (snapshot) => {
            if (snapshot.exists()) {
              const settings = snapshot.val()
              if (typeof settings.themeId === 'string') setGlobalThemeId(settings.themeId)
              setGlobalIsDark(settings.isDark !== false)
            } else {
              setGlobalThemeId('black-diamond')
              setGlobalIsDark(true)
            }
            setIsLoading(false)
          }, (error) => {
            console.error('[ThemeContext] Firebase listener error:', error.message)
            setIsLoading(false)
          })
        } else {
          setIsLoading(false)
          return undefined
        }
      } catch (error) {
        console.error('[ThemeContext] Unable to load shared theme settings:', error)
        setIsLoading(false)
        return undefined
      }
    }

    const unsubscribe = loadTheme()
    return () => {
      void unsubscribe.then((stop) => stop?.())
    }
  }, [])

  useEffect(() => {
    if (isLoading) return

    const themeToApply = getTheme(currentThemeId)
    const colors = isDark ? themeToApply.dark : themeToApply.light
    Object.entries(colors).forEach(([key, value]) => {
      const cssKey = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^chart(\d)$/, 'chart-$1')
      document.documentElement.style.setProperty(cssKey, value)
    })
    const accent = isAdminRoute ? colors.primary : personalPreferences.accent
    document.documentElement.style.setProperty('--primary', accent)
    document.documentElement.style.setProperty('--sidebar-primary', accent)
    document.documentElement.style.setProperty('--radius', themeToApply.borderRadius)
    document.documentElement.style.setProperty(
      '--animation-duration',
      themeToApply.animations.primaryDuration
    )
    document.documentElement.style.setProperty(
      '--animation-easing',
      themeToApply.animations.easingFunction
    )

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }, [currentThemeId, isAdminRoute, isDark, isLoading, personalPreferences.accent])

  const setTheme = async (themeId: string) => {
    if (!AVAILABLE_THEMES.some((available) => available.id === themeId)) {
      throw new Error(`Unknown theme: ${themeId}`)
    }

    try {
      if (database) {
        await set(ref(database, 'settings/theme'), {
          themeId,
          isDark,
          updatedAt: new Date().toISOString(),
        })
        setGlobalThemeId(themeId)
        setGlobalIsDark(isDark)
      } else {
        throw new Error('Firebase database is unavailable')
      }
    } catch (error) {
      console.error('[ThemeContext] Failed to save shared theme to Firebase:', error)
      throw error
    }
  }

  const setIsDarkMode = async (dark: boolean) => {
    try {
      if (database) {
        await set(ref(database, 'settings/theme'), {
          themeId: currentThemeId,
          isDark: dark,
          updatedAt: new Date().toISOString(),
        })
        setGlobalIsDark(dark)
      } else {
        throw new Error('Firebase database is unavailable')
      }
    } catch (error) {
      console.error('[ThemeContext] Failed to save shared color mode to Firebase:', error)
      throw error
    }
  }

  const setPersonalPreferences = (preferences: PersonalThemePreferences) => {
    if (!AVAILABLE_THEMES.some((available) => available.id === preferences.themeId)) {
      throw new Error(`Unknown theme: ${preferences.themeId}`)
    }
    if (!/^#[\da-f]{6}$/i.test(preferences.accent)) {
      throw new Error('Accent color must be a six-digit hex color')
    }
    localStorage.setItem('myhack:theme-preferences', JSON.stringify(preferences))
    setPersonalPreferencesState(preferences)
  }

  const applyTheme = () => {
    const themeToApply = getTheme(currentThemeId)
    const colors = isDark ? themeToApply.dark : themeToApply.light

    Object.entries(colors).forEach(([key, value]) => {
      const cssKey = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^chart(\d)$/, 'chart-$1')
      document.documentElement.style.setProperty(cssKey, value)
    })
    document.documentElement.style.setProperty('--primary', personalPreferences.accent)
    document.documentElement.style.setProperty('--sidebar-primary', personalPreferences.accent)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }

  return (
    <ThemeContext.Provider
      value={{
        currentThemeId,
        theme,
        isDark,
        setTheme,
        setIsDark: setIsDarkMode,
        setPersonalPreferences,
        applyTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

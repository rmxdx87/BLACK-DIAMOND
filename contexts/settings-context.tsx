"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { AdminSettings, type SiteSettings } from "@/lib/admin-settings"

interface SettingsContextType {
  settings: SiteSettings
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>
  resetSettings: () => void
  isLoading: boolean
  exportSettings: () => string
  importSettings: (settingsJson: string) => Promise<boolean>
  getSettingsHistory: () => SiteSettings[]
  restoreFromHistory: (index: number) => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(AdminSettings.getSettings())
  const [isLoading, setIsLoading] = useState(true)
  const [settingsHistory, setSettingsHistory] = useState<SiteSettings[]>([])

  const addToHistory = useCallback((newSettings: SiteSettings) => {
    setSettingsHistory((prev) => {
      const newHistory = [newSettings, ...prev].slice(0, 10)
      if (typeof window !== "undefined") {
        localStorage.setItem("jalwa_settings_history", JSON.stringify(newHistory))
      }
      return newHistory
    })
  }, [])

  useEffect(() => {
    // Load settings and history on mount
    const loadedSettings = AdminSettings.getSettings()
    setSettings(loadedSettings)

    if (typeof window !== "undefined") {
      // Load settings history
      const history = localStorage.getItem("jalwa_settings_history")
      if (history) {
        try {
          setSettingsHistory(JSON.parse(history))
        } catch (error) {
          console.error("Error loading settings history:", error)
        }
      }
    }

    setIsLoading(false)

    // Subscribe to Firebase real-time updates so every device/tab stays in sync.
    // This only updates local React state (never writes back), so no loop occurs.
    const unsubscribeFirebase = AdminSettings.subscribeToChanges((newSettings) => {
      setSettings(newSettings)
      console.log("[v0] SettingsProvider received real-time update from Firebase")
    })

    // Same-tab instant updates (e.g. admin editing in the same browser)
    const handleLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<SiteSettings>).detail
      if (detail) setSettings(detail)
    }
    window.addEventListener("adminSettingsChanged", handleLocalChange as EventListener)

    return () => {
      unsubscribeFirebase()
      window.removeEventListener("adminSettingsChanged", handleLocalChange as EventListener)
    }
  }, [])

  const updateSettings = useCallback(
    async (newSettings: Partial<SiteSettings>) => {
      try {
        const updatedSettings = await AdminSettings.saveSettings(newSettings)
        setSettings(updatedSettings)
        addToHistory(updatedSettings)
      } catch (error) {
        console.error("[v0] Error updating settings:", error)
      }
    },
    [addToHistory],
  )

  const resetSettings = useCallback(() => {
    try {
      const defaultSettings = AdminSettings.resetSettings()
      setSettings(defaultSettings)
      addToHistory(defaultSettings)
    } catch (error) {
      console.error("[v0] Error resetting settings:", error)
    }
  }, [addToHistory])

  const exportSettings = useCallback((): string => {
    const exportData = {
      settings,
      exportDate: new Date().toISOString(),
      version: "1.0",
    }
    return JSON.stringify(exportData, null, 2)
  }, [settings])

  const importSettings = useCallback(
    async (settingsJson: string): Promise<boolean> => {
      try {
        const importData = JSON.parse(settingsJson)
        if (importData.settings && typeof importData.settings === "object") {
          const updatedSettings = await AdminSettings.saveSettings(importData.settings)
          setSettings(updatedSettings)
          addToHistory(updatedSettings)
          return true
        }
        return false
      } catch (error) {
        console.error("[v0] Error importing settings:", error)
        return false
      }
    },
    [addToHistory],
  )

  const getSettingsHistory = useCallback((): SiteSettings[] => {
    return settingsHistory
  }, [settingsHistory])

  const restoreFromHistory = useCallback(
    async (index: number) => {
      if (index >= 0 && index < settingsHistory.length) {
        try {
          const historicalSettings = settingsHistory[index]
          const updatedSettings = await AdminSettings.saveSettings(historicalSettings)
          setSettings(updatedSettings)
          addToHistory(updatedSettings)
        } catch (error) {
          console.error("[v0] Error restoring from history:", error)
        }
      }
    },
    [settingsHistory, addToHistory],
  )

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        isLoading,
        exportSettings,
        importSettings,
        getSettingsHistory,
        restoreFromHistory,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}

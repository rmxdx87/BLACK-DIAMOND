"use client"

import { useState, useEffect } from "react"
import { AdminSettings, type SiteSettings } from "@/lib/admin-settings"

export function useAdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>(AdminSettings.getSettings())

  useEffect(() => {
    // Subscribe to Firebase real-time updates
    const unsubscribeFirebase = AdminSettings.subscribeToChanges((newSettings) => {
      setSettings(newSettings)
    })

    // Also listen to local event changes (for same-tab updates)
    const handleSettingsChange = (event: CustomEvent<SiteSettings>) => {
      setSettings(event.detail)
    }

    window.addEventListener("adminSettingsChanged", handleSettingsChange as EventListener)

    return () => {
      unsubscribeFirebase()
      window.removeEventListener("adminSettingsChanged", handleSettingsChange as EventListener)
    }
  }, [])

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    await AdminSettings.saveSettings(newSettings)
  }

  // Update a single top-level setting key and persist globally to Firebase
  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    // Optimistically update local state so the UI reflects the change instantly
    setSettings((prev) => ({ ...prev, [key]: value }))
    // Persist to Firebase (and localStorage) so every device receives it
    void AdminSettings.saveSettings({ [key]: value } as Partial<SiteSettings>)
    return value
  }

  // Toggle the access-control requirement and return the new boolean value synchronously
  const toggleAccessControl = () => {
    const newValue = !settings.requireAccessCode
    updateSetting("requireAccessCode", newValue)
    return newValue
  }

  const resetSettings = () => {
    AdminSettings.resetSettings()
  }

  return {
    settings,
    updateSettings,
    updateSetting,
    toggleAccessControl,
    resetSettings,
  }
}

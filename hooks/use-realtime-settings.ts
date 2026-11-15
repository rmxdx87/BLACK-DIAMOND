"use client"

import { useState, useEffect } from "react"
import { AdminSettings, type SiteSettings } from "@/lib/admin-settings"

/**
 * Hook to subscribe to real-time admin settings changes from Firebase
 * Any component using this hook will automatically update when admin changes settings
 */
export function useRealtimeSettings() {
  const [settings, setSettings] = useState<SiteSettings>(AdminSettings.getSettings())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)

    // Subscribe to Firebase real-time updates
    const unsubscribe = AdminSettings.subscribeToChanges((newSettings) => {
      setSettings(newSettings)
      setIsLoading(false)
      console.log("[v0] Real-time settings update received")
    })

    // Set initial settings
    const currentSettings = AdminSettings.getSettings()
    setSettings(currentSettings)
    setIsLoading(false)

    return () => {
      unsubscribe()
    }
  }, [])

  return {
    settings,
    isLoading,
    siteName: settings.siteName,
    isMaintenanceMode: settings.isMaintenanceMode,
    technicalMessage: settings.technicalMessage,
    showTechnicalMessage: settings.showTechnicalMessage,
    predictionSettings: settings.predictionSettings,
  }
}

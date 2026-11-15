"use client"

import { useState, useEffect } from "react"
import { MaintenanceManager, type MaintenanceSchedule, type MaintenanceLog } from "@/lib/maintenance-manager"
import { useSettings } from "@/contexts/settings-context"

export function useMaintenance() {
  const { settings, updateSettings } = useSettings()
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [emergencyMaintenance, setEmergencyMaintenance] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load initial data
    setSchedules(MaintenanceManager.getScheduledMaintenance())
    setLogs(MaintenanceManager.getMaintenanceLogs())
    setEmergencyMaintenance(MaintenanceManager.getEmergencyMaintenance())
    setIsLoading(false)

    // Listen for emergency maintenance events
    const handleEmergencyEnabled = (event: CustomEvent) => {
      setEmergencyMaintenance(event.detail)
      updateSettings({ isMaintenanceMode: true })
    }

    const handleEmergencyDisabled = () => {
      setEmergencyMaintenance(null)
      updateSettings({ isMaintenanceMode: false })
    }

    window.addEventListener("emergencyMaintenanceEnabled", handleEmergencyEnabled as EventListener)
    window.addEventListener("emergencyMaintenanceDisabled", handleEmergencyDisabled as EventListener)

    return () => {
      window.removeEventListener("emergencyMaintenanceEnabled", handleEmergencyEnabled as EventListener)
      window.removeEventListener("emergencyMaintenanceDisabled", handleEmergencyDisabled as EventListener)
    }
  }, [updateSettings])

  const enableMaintenance = (reason?: string) => {
    updateSettings({ isMaintenanceMode: true })
    MaintenanceManager.addLog({
      action: "enabled",
      user: "admin",
      reason: reason || "Manual maintenance enabled",
    })
    setLogs(MaintenanceManager.getMaintenanceLogs())
    console.log("[v0] Maintenance mode enabled via settings context")
  }

  const disableMaintenance = (reason?: string) => {
    updateSettings({ isMaintenanceMode: false })
    MaintenanceManager.addLog({
      action: "disabled",
      user: "admin",
      reason: reason || "Manual maintenance disabled",
    })
    setLogs(MaintenanceManager.getMaintenanceLogs())
    console.log("[v0] Maintenance mode disabled via settings context")
  }

  const enableEmergencyMaintenance = (reason: string) => {
    MaintenanceManager.enableEmergencyMaintenance(reason, "admin")
    setEmergencyMaintenance(MaintenanceManager.getEmergencyMaintenance())
    setLogs(MaintenanceManager.getMaintenanceLogs())
    updateSettings({ isMaintenanceMode: true })
  }

  const disableEmergencyMaintenance = () => {
    MaintenanceManager.disableEmergencyMaintenance("admin")
    setEmergencyMaintenance(null)
    setLogs(MaintenanceManager.getMaintenanceLogs())
    updateSettings({ isMaintenanceMode: false })
  }

  const addSchedule = (schedule: Omit<MaintenanceSchedule, "id">) => {
    MaintenanceManager.addScheduledMaintenance(schedule)
    setSchedules(MaintenanceManager.getScheduledMaintenance())
    setLogs(MaintenanceManager.getMaintenanceLogs())
  }

  const removeSchedule = (id: string) => {
    MaintenanceManager.removeScheduledMaintenance(id)
    setSchedules(MaintenanceManager.getScheduledMaintenance())
  }

  return {
    // State
    isMaintenanceMode: settings.isMaintenanceMode,
    schedules,
    logs,
    emergencyMaintenance,
    isLoading,

    // Actions
    enableMaintenance,
    disableMaintenance,
    enableEmergencyMaintenance,
    disableEmergencyMaintenance,
    addSchedule,
    removeSchedule,

    // Utilities
    isInMaintenanceWindow: MaintenanceManager.isInMaintenanceWindow(),
    activeMaintenanceReason: MaintenanceManager.getActiveMaintenanceReason(),
    nextMaintenanceWindow: MaintenanceManager.getNextMaintenanceWindow(),
  }
}

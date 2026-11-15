export interface MaintenanceSchedule {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  isActive: boolean
  isRecurring: boolean
  recurringPattern?: "daily" | "weekly" | "monthly"
  notifyUsers: boolean
  allowedIPs?: string[]
}

export interface MaintenanceLog {
  id: string
  action: "enabled" | "disabled" | "scheduled" | "emergency"
  timestamp: Date
  user: string
  reason?: string
  duration?: number
  affectedUsers?: number
}

export class MaintenanceManager {
  private static SCHEDULE_KEY = "jalwa_maintenance_schedule"
  private static LOGS_KEY = "jalwa_maintenance_logs"
  private static EMERGENCY_KEY = "jalwa_emergency_maintenance"

  static getScheduledMaintenance(): MaintenanceSchedule[] {
    try {
      const schedules = localStorage.getItem(this.SCHEDULE_KEY)
      return schedules ? JSON.parse(schedules) : []
    } catch {
      return []
    }
  }

  static addScheduledMaintenance(schedule: Omit<MaintenanceSchedule, "id">): string {
    const schedules = this.getScheduledMaintenance()
    const newSchedule: MaintenanceSchedule = {
      ...schedule,
      id: Date.now().toString(),
    }

    schedules.push(newSchedule)
    localStorage.setItem(this.SCHEDULE_KEY, JSON.stringify(schedules))

    this.addLog({
      action: "scheduled",
      user: "admin",
      reason: schedule.title,
    })

    return newSchedule.id
  }

  static removeScheduledMaintenance(id: string): void {
    const schedules = this.getScheduledMaintenance().filter((s) => s.id !== id)
    localStorage.setItem(this.SCHEDULE_KEY, JSON.stringify(schedules))
  }

  static getMaintenanceLogs(): MaintenanceLog[] {
    try {
      const logs = localStorage.getItem(this.LOGS_KEY)
      return logs ? JSON.parse(logs) : []
    } catch {
      return []
    }
  }

  static addLog(log: Omit<MaintenanceLog, "id" | "timestamp">): void {
    const logs = this.getMaintenanceLogs()
    const newLog: MaintenanceLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    }

    logs.unshift(newLog) // Add to beginning
    const trimmedLogs = logs.slice(0, 100) // Keep last 100 logs
    localStorage.setItem(this.LOGS_KEY, JSON.stringify(trimmedLogs))
  }

  static enableEmergencyMaintenance(reason: string, user: string): void {
    const emergencyData = {
      enabled: true,
      reason,
      startTime: new Date(),
      user,
    }

    localStorage.setItem(this.EMERGENCY_KEY, JSON.stringify(emergencyData))

    this.addLog({
      action: "emergency",
      user,
      reason,
    })

    // Trigger emergency maintenance
    window.dispatchEvent(new CustomEvent("emergencyMaintenanceEnabled", { detail: emergencyData }))
  }

  static disableEmergencyMaintenance(user: string): void {
    const emergencyData = localStorage.getItem(this.EMERGENCY_KEY)
    if (emergencyData) {
      const data = JSON.parse(emergencyData)
      const duration = Date.now() - new Date(data.startTime).getTime()

      this.addLog({
        action: "disabled",
        user,
        reason: "Emergency maintenance ended",
        duration: Math.round(duration / 1000 / 60), // minutes
      })
    }

    localStorage.removeItem(this.EMERGENCY_KEY)
    window.dispatchEvent(new CustomEvent("emergencyMaintenanceDisabled"))
  }

  static getEmergencyMaintenance(): any {
    try {
      const data = localStorage.getItem(this.EMERGENCY_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  static isInMaintenanceWindow(): boolean {
    const schedules = this.getScheduledMaintenance()
    const now = new Date()

    return schedules.some((schedule) => {
      if (!schedule.isActive) return false

      const start = new Date(schedule.startTime)
      const end = new Date(schedule.endTime)

      return now >= start && now <= end
    })
  }

  static getActiveMaintenanceReason(): string {
    const emergency = this.getEmergencyMaintenance()
    if (emergency) return emergency.reason

    const schedules = this.getScheduledMaintenance()
    const now = new Date()

    const activeSchedule = schedules.find((schedule) => {
      if (!schedule.isActive) return false
      const start = new Date(schedule.startTime)
      const end = new Date(schedule.endTime)
      return now >= start && now <= end
    })

    return activeSchedule?.description || "Scheduled maintenance in progress"
  }

  static getNextMaintenanceWindow(): MaintenanceSchedule | null {
    const schedules = this.getScheduledMaintenance()
    const now = new Date()

    const upcomingSchedules = schedules
      .filter((s) => s.isActive && new Date(s.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    return upcomingSchedules[0] || null
  }
}

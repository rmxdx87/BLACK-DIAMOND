import { ref, set, get, onValue, Database } from 'firebase/database'
import { database as firebaseDatabase } from './firebase'

export interface SiteSettings {
  siteName: string
  apiEndpoint: string
  isMaintenanceMode: boolean
  technicalMessage: string
  showTechnicalMessage: boolean
  requireAccessCode: boolean
  predictionSettings: {
    enableColorPrediction: boolean
    enableSizePrediction: boolean
    enableNumberPrediction: boolean
    confidenceThreshold: number
    updateInterval: number
  }
  updatedAt?: number
}

export class AdminSettings {
  private static SETTINGS_KEY = "jalwa_admin_settings"
  private static FIREBASE_PATH = "admin/settings"
  private static database: Database | undefined = firebaseDatabase
  private static listeners: Set<Function> = new Set()

  private static defaultSettings: SiteSettings = {
    siteName: "Jalwa Colour Prediction Tool",
    apiEndpoint: "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json",
    isMaintenanceMode: false,
    technicalMessage: "System is running normally",
    showTechnicalMessage: false,
    requireAccessCode: false,
    predictionSettings: {
      enableColorPrediction: true,
      enableSizePrediction: true,
      enableNumberPrediction: true,
      confidenceThreshold: 0.6,
      updateInterval: 30000,
    },
    updatedAt: Date.now(),
  }

  static setDatabase(db: Database) {
    this.database = db
  }

  static getSettings(): SiteSettings {
    if (typeof window === "undefined") return this.defaultSettings

    try {
      const settings = localStorage.getItem(this.SETTINGS_KEY)
      if (settings) {
        return { ...this.defaultSettings, ...JSON.parse(settings) }
      }
    } catch (error) {
      console.error("[v0] Error loading settings:", error)
    }
    return this.defaultSettings
  }

  static async saveSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    if (typeof window === "undefined") return this.defaultSettings

    try {
      const currentSettings = this.getSettings()
      const newSettings = { 
        ...currentSettings, 
        ...settings,
        updatedAt: Date.now()
      }

      // Save to localStorage first (for SSR compatibility)
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(newSettings))

      // Save to Firebase if database is available
      if (this.database) {
        const settingsRef = ref(this.database, this.FIREBASE_PATH)
        await set(settingsRef, newSettings)
        console.log("[v0] Settings saved to Firebase")
      }

      // Trigger event for local listeners
      window.dispatchEvent(new CustomEvent("adminSettingsChanged", { detail: newSettings }))
      
      // Notify all listeners
      this.notifyListeners(newSettings)

      return newSettings
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      return this.getSettings()
    }
  }

  static resetSettings(): SiteSettings {
    if (typeof window === "undefined") return this.defaultSettings

    try {
      localStorage.removeItem(this.SETTINGS_KEY)
      
      // Reset in Firebase
      if (this.database) {
        const settingsRef = ref(this.database, this.FIREBASE_PATH)
        set(settingsRef, { ...this.defaultSettings, updatedAt: Date.now() }).catch(err => {
          console.error("[v0] Error resetting Firebase settings:", err)
        })
      }

      window.dispatchEvent(new CustomEvent("adminSettingsChanged", { detail: this.defaultSettings }))
      this.notifyListeners(this.defaultSettings)
      
      return this.defaultSettings
    } catch (error) {
      console.error("[v0] Error resetting settings:", error)
      return this.defaultSettings
    }
  }

  static addListener(callback: (settings: SiteSettings) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private static notifyListeners(settings: SiteSettings) {
    this.listeners.forEach(listener => {
      try {
        listener(settings)
      } catch (error) {
        console.error("[v0] Error calling settings listener:", error)
      }
    })
  }

  static subscribeToChanges(callback: (settings: SiteSettings) => void): () => void {
    if (!this.database) {
      console.warn("[v0] Firebase database not initialized, using local settings only")
      return () => {}
    }

    try {
      const settingsRef = ref(this.database, this.FIREBASE_PATH)
      const unsubscribe = onValue(
        settingsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const settings = snapshot.val() as SiteSettings
            // Update localStorage with Firebase data
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings))
            callback(settings)
            console.log("[v0] Real-time settings update received from Firebase")
          }
        },
        (error) => {
          console.error("[v0] Error subscribing to settings changes:", error)
        }
      )
      
      return unsubscribe
    } catch (error) {
      console.error("[v0] Error setting up Firebase subscription:", error)
      return () => {}
    }
  }
}

export { AdminSettings as AdminSettingsManager }

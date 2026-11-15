import { ref, set, onValue, type Database } from "firebase/database"
import { database } from "./firebase"

export type SubscriptionTier = "free" | "basic" | "premium" | "vip"

export interface SubscriptionFeatures {
  colorPredictions: boolean
  sizePredictions: boolean
  numberPredictions: boolean
  advancedAnalytics: boolean
  historicalData: boolean
  charts: boolean
  prioritySupport: boolean
  customAlerts: boolean
  exportData: boolean
}

export interface UserSubscription {
  userId: string
  tier: SubscriptionTier
  features: SubscriptionFeatures
  startDate: string
  endDate?: string
  isActive: boolean
  autoRenew: boolean
  customPermissions?: Partial<SubscriptionFeatures>
}

export class SubscriptionManager {
  private static readonly STORAGE_KEY = "jalwa_subscriptions"
  private static readonly FIREBASE_PATH = "subscriptions/list"
  private static database: Database | undefined = database
  private static subscriptionStarted = false
  // Prevents echoing a Firebase-originated update straight back to Firebase
  private static applyingRemote = false

  static setDatabase(db: Database) {
    this.database = db
  }

  /**
   * Start listening to the global subscriptions list in Firebase.
   * Whenever the admin approves a payment on any device, the granted
   * subscription is written to Firebase and every user's device receives it
   * in real time, unlocking the purchased tier immediately.
   */
  static startRealtimeSync(): () => void {
    if (typeof window === "undefined") return () => {}
    if (!this.database) {
      console.warn("[v0] Firebase not initialized - subscriptions will be local only")
      return () => {}
    }
    if (this.subscriptionStarted) return () => {}
    this.subscriptionStarted = true

    try {
      const subsRef = ref(this.database, this.FIREBASE_PATH)
      const unsubscribe = onValue(
        subsRef,
        (snapshot) => {
          const value = snapshot.val()
          const subscriptions: UserSubscription[] = value
            ? Array.isArray(value)
              ? value
              : Object.values(value)
            : []
          this.applyingRemote = true
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(subscriptions))
          window.dispatchEvent(new CustomEvent("subscriptionsUpdated", { detail: subscriptions }))
          this.applyingRemote = false
          console.log("[v0] Real-time subscriptions update received from Firebase")
        },
        (error) => {
          console.error("[v0] Error subscribing to subscriptions:", error)
        },
      )
      return () => {
        this.subscriptionStarted = false
        unsubscribe()
      }
    } catch (error) {
      console.error("[v0] Error setting up subscription sync:", error)
      this.subscriptionStarted = false
      return () => {}
    }
  }

  static readonly TIER_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
    free: {
      colorPredictions: true,
      sizePredictions: false,
      numberPredictions: false,
      advancedAnalytics: false,
      historicalData: false,
      charts: false,
      prioritySupport: false,
      customAlerts: false,
      exportData: false,
    },
    basic: {
      colorPredictions: true,
      sizePredictions: true,
      numberPredictions: false,
      advancedAnalytics: false,
      historicalData: true,
      charts: false,
      prioritySupport: false,
      customAlerts: false,
      exportData: false,
    },
    premium: {
      colorPredictions: true,
      sizePredictions: true,
      numberPredictions: true,
      advancedAnalytics: true,
      historicalData: true,
      charts: false,
      prioritySupport: true,
      customAlerts: true,
      exportData: false,
    },
    vip: {
      colorPredictions: true,
      sizePredictions: true,
      numberPredictions: true,
      advancedAnalytics: true,
      historicalData: true,
      charts: true,
      prioritySupport: true,
      customAlerts: true,
      exportData: true,
    },
  }

  static getSubscriptions(): UserSubscription[] {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem(this.STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  }

  static saveSubscriptions(subscriptions: UserSubscription[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(subscriptions))
    window.dispatchEvent(new CustomEvent("subscriptionsUpdated", { detail: subscriptions }))

    // Persist globally to Firebase so every device (and the purchasing user)
    // stays in sync in real time.
    if (this.database && !this.applyingRemote) {
      const subsRef = ref(this.database, this.FIREBASE_PATH)
      set(subsRef, subscriptions).catch((error) => {
        console.error("[v0] Error saving subscriptions to Firebase:", error)
      })
    }
  }

  static getUserSubscription(userId: string): UserSubscription | null {
    const subscriptions = this.getSubscriptions()
    const subscription = subscriptions.find((s) => s.userId === userId)

    if (!subscription) return null

    // Keep this read operation pure. Persisting an expiry update here dispatches
    // subscriptionsUpdated while React is rendering, which can create a render loop.
    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      return { ...subscription, isActive: false }
    }

    return subscription
  }

  static createSubscription(userId: string, tier: SubscriptionTier, durationDays?: number): UserSubscription {
    const subscriptions = this.getSubscriptions()

    // Remove existing subscription for this user
    const filteredSubscriptions = subscriptions.filter((s) => s.userId !== userId)

    const startDate = new Date().toISOString()
    const endDate = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : undefined

    const newSubscription: UserSubscription = {
      userId,
      tier,
      features: { ...this.TIER_FEATURES[tier] },
      startDate,
      endDate,
      isActive: true,
      autoRenew: false,
    }

    filteredSubscriptions.push(newSubscription)
    this.saveSubscriptions(filteredSubscriptions)

    console.log(`[v0] Created ${tier} subscription for user ${userId}`)
    return newSubscription
  }

  static updateSubscription(subscription: UserSubscription): boolean {
    const subscriptions = this.getSubscriptions()
    const index = subscriptions.findIndex((s) => s.userId === subscription.userId)

    if (index === -1) return false

    subscriptions[index] = subscription
    this.saveSubscriptions(subscriptions)

    console.log(`[v0] Updated subscription for user ${subscription.userId}`)
    return true
  }

  static updateUserTier(userId: string, newTier: SubscriptionTier): boolean {
    const subscription = this.getUserSubscription(userId)
    if (!subscription) return false

    subscription.tier = newTier
    subscription.features = { ...this.TIER_FEATURES[newTier] }

    // Merge custom permissions if they exist
    if (subscription.customPermissions) {
      subscription.features = { ...subscription.features, ...subscription.customPermissions }
    }

    return this.updateSubscription(subscription)
  }

  static setCustomPermissions(userId: string, permissions: Partial<SubscriptionFeatures>): boolean {
    const subscription = this.getUserSubscription(userId)
    if (!subscription) return false

    subscription.customPermissions = permissions
    subscription.features = { ...this.TIER_FEATURES[subscription.tier], ...permissions }

    return this.updateSubscription(subscription)
  }

  static getUserFeatures(userId: string): SubscriptionFeatures {
    const subscription = this.getUserSubscription(userId)

    if (!subscription || !subscription.isActive) {
      return this.TIER_FEATURES.free
    }

    return { ...this.TIER_FEATURES[subscription.tier], ...subscription.features }
  }

  static canAccessFeature(userId: string, feature: keyof SubscriptionFeatures): boolean {
    const features = this.getUserFeatures(userId)
    return features[feature]
  }

  static extendSubscription(userId: string, additionalDays: number): boolean {
    const subscription = this.getUserSubscription(userId)
    if (!subscription) return false

    const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date()
    const newEndDate = new Date(currentEndDate.getTime() + additionalDays * 24 * 60 * 60 * 1000)

    subscription.endDate = newEndDate.toISOString()
    subscription.isActive = true

    return this.updateSubscription(subscription)
  }

  static cancelSubscription(userId: string): boolean {
    const subscription = this.getUserSubscription(userId)
    if (!subscription) return false

    subscription.isActive = false
    subscription.autoRenew = false

    return this.updateSubscription(subscription)
  }

  static getSubscriptionStats(): {
    totalUsers: number
    activeSubscriptions: number
    tierDistribution: Record<SubscriptionTier, number>
    revenue: { monthly: number; total: number }
  } {
    const subscriptions = this.getSubscriptions()
    const now = Date.now()
    const activeSubscriptions = subscriptions.filter(
      (s) => s.isActive && (!s.endDate || new Date(s.endDate).getTime() >= now),
    )

    const tierDistribution: Record<SubscriptionTier, number> = {
      free: 0,
      basic: 0,
      premium: 0,
      vip: 0,
    }

    activeSubscriptions.forEach((sub) => {
      tierDistribution[sub.tier]++
    })

    // Mock revenue calculation (you would integrate with actual payment system)
    const tierPrices = { free: 0, basic: 10, premium: 25, vip: 50 }
    const monthlyRevenue = activeSubscriptions.reduce((total, sub) => {
      return total + tierPrices[sub.tier]
    }, 0)

    return {
      totalUsers: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      tierDistribution,
      revenue: {
        monthly: monthlyRevenue,
        total: monthlyRevenue * 12, // Simplified calculation
      },
    }
  }

  static getTierDisplayName(tier: SubscriptionTier): string {
    const names = {
      free: "Free",
      basic: "Basic",
      premium: "Premium",
      vip: "VIP",
    }
    return names[tier]
  }

  static getTierColor(tier: SubscriptionTier): string {
    const colors = {
      free: "bg-gray-500/20 text-gray-400 border-gray-500",
      basic: "bg-blue-500/20 text-blue-400 border-blue-500",
      premium: "bg-purple-500/20 text-purple-400 border-purple-500",
      vip: "bg-yellow-500/20 text-yellow-400 border-yellow-500",
    }
    return colors[tier]
  }
}

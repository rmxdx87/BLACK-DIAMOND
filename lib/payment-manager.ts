import { ref, set, onValue, type Database } from "firebase/database"
import { database } from "./firebase"
import type { SubscriptionTier } from "./subscription-manager"

export type PaymentMethodType = "upi" | "bank" | "qr" | "crypto" | "wallet" | "other"

export interface PaymentMethod {
  id: string
  name: string
  type: PaymentMethodType
  /** UPI id / account number / wallet address / crypto address */
  identifier: string
  /** Optional extra label (account holder name, bank name, network, etc.) */
  holder?: string
  instructions: string
  qrImageUrl?: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface PaymentPlan {
  tier: Exclude<SubscriptionTier, "free">
  price: number
  durationDays: number
  isActive: boolean
}

export type PaymentRequestStatus = "pending" | "approved" | "rejected"

export interface PaymentRequest {
  id: string
  userId: string
  userName: string
  tier: SubscriptionTier
  amount: number
  methodId: string
  methodName: string
  transactionId: string
  note?: string
  status: PaymentRequestStatus
  createdAt: number
  reviewedAt?: number
}

export interface PaymentData {
  methods: PaymentMethod[]
  plans: PaymentPlan[]
  requests: PaymentRequest[]
  updatedAt: number
}

/**
 * Realtime payment configuration manager.
 * Mirrors the AdminSettings / UserAccessManager pattern:
 *  - localStorage cache for instant/SSR-safe reads
 *  - Firebase Realtime Database for cross-device sync
 *  - CustomEvent dispatch for same-tab updates
 */
export class PaymentManager {
  private static readonly STORAGE_KEY = "jalwa_payment_config"
  private static readonly FIREBASE_PATH = "payments/config"
  private static database: Database | undefined = database
  private static applyingRemote = false
  private static subscriptionStarted = false

  private static defaultPlans: PaymentPlan[] = [
    { tier: "basic", price: 99, durationDays: 30, isActive: true },
    { tier: "premium", price: 199, durationDays: 30, isActive: true },
    { tier: "vip", price: 299, durationDays: 30, isActive: true },
  ]

  private static defaultMethods: PaymentMethod[] = [
    {
      id: "method_default_upi",
      name: "UPI",
      type: "upi",
      identifier: "jalwa@upi",
      holder: "Jalwa Prediction",
      instructions: "Pay using any UPI app (PhonePe, GPay, Paytm) and enter the 12-digit UTR / transaction ID.",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]

  static setDatabase(db: Database) {
    this.database = db
  }

  private static getDefaultData(): PaymentData {
    return {
      methods: [...this.defaultMethods],
      plans: [...this.defaultPlans],
      requests: [],
      updatedAt: Date.now(),
    }
  }

  static getData(): PaymentData {
    if (typeof window === "undefined") return this.getDefaultData()
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as PaymentData
        return {
          methods: parsed.methods ?? [],
          plans: parsed.plans ?? this.defaultPlans,
          requests: parsed.requests ?? [],
          updatedAt: parsed.updatedAt ?? Date.now(),
        }
      }
    } catch (error) {
      console.error("[v0] Error loading payment config:", error)
    }
    return this.getDefaultData()
  }

  private static saveData(data: PaymentData): PaymentData {
    if (typeof window === "undefined") return data
    const next = { ...data, updatedAt: Date.now() }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent("paymentConfigUpdated", { detail: next }))

    if (this.database && !this.applyingRemote) {
      const configRef = ref(this.database, this.FIREBASE_PATH)
      set(configRef, next).catch((error) => {
        console.error("[v0] Error saving payment config to Firebase:", error)
      })
    }
    return next
  }

  // ---- Realtime sync ----
  /**
   * Start listening to the global payment config in Firebase.
   * Registered once from the FirebaseProvider so admin changes (methods,
   * pricing, requests) reach every user's device in real time, regardless
   * of which page is currently mounted.
   */
  static startRealtimeSync(): () => void {
    if (typeof window === "undefined") return () => {}
    if (!this.database) {
      console.warn("[v0] Firebase not initialized - payment config will be local only")
      return () => {}
    }
    if (this.subscriptionStarted) return () => {}
    this.subscriptionStarted = true

    try {
      const configRef = ref(this.database, this.FIREBASE_PATH)
      const unsubscribe = onValue(
        configRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val() as PaymentData
            this.applyingRemote = true
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
            window.dispatchEvent(new CustomEvent("paymentConfigUpdated", { detail: data }))
            this.applyingRemote = false
            console.log("[v0] Real-time payment config update received from Firebase")
          } else if (this.database) {
            // First run on a fresh project: seed Firebase with local defaults
            set(configRef, this.getData()).catch(() => {})
          }
        },
        (error) => {
          console.error("[v0] Error subscribing to payment config:", error)
        },
      )
      return () => {
        this.subscriptionStarted = false
        unsubscribe()
      }
    } catch (error) {
      console.error("[v0] Error setting up payment subscription:", error)
      this.subscriptionStarted = false
      return () => {}
    }
  }

  // ---- Payment methods CRUD ----
  static addMethod(method: Omit<PaymentMethod, "id" | "createdAt" | "updatedAt">): PaymentMethod {
    const data = this.getData()
    const newMethod: PaymentMethod = {
      ...method,
      id: `method_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    data.methods.push(newMethod)
    this.saveData(data)
    return newMethod
  }

  static updateMethod(id: string, updates: Partial<Omit<PaymentMethod, "id" | "createdAt">>): boolean {
    const data = this.getData()
    const index = data.methods.findIndex((m) => m.id === id)
    if (index === -1) return false
    data.methods[index] = { ...data.methods[index], ...updates, updatedAt: Date.now() }
    this.saveData(data)
    return true
  }

  static deleteMethod(id: string): boolean {
    const data = this.getData()
    const next = data.methods.filter((m) => m.id !== id)
    if (next.length === data.methods.length) return false
    data.methods = next
    this.saveData(data)
    return true
  }

  static toggleMethod(id: string, isActive: boolean): boolean {
    return this.updateMethod(id, { isActive })
  }

  static getActiveMethods(): PaymentMethod[] {
    return this.getData().methods.filter((m) => m.isActive)
  }

  // ---- Plans / pricing ----
  static updatePlan(tier: PaymentPlan["tier"], updates: Partial<Omit<PaymentPlan, "tier">>): boolean {
    const data = this.getData()
    const index = data.plans.findIndex((p) => p.tier === tier)
    if (index === -1) return false
    data.plans[index] = { ...data.plans[index], ...updates }
    this.saveData(data)
    return true
  }

  static getPlan(tier: string): PaymentPlan | undefined {
    return this.getData().plans.find((p) => p.tier === tier)
  }

  // ---- Payment requests ----
  static createRequest(
    request: Omit<PaymentRequest, "id" | "status" | "createdAt">,
  ): PaymentRequest {
    const data = this.getData()
    const newRequest: PaymentRequest = {
      ...request,
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "pending",
      createdAt: Date.now(),
    }
    data.requests.unshift(newRequest)
    this.saveData(data)
    return newRequest
  }

  static setRequestStatus(id: string, status: PaymentRequestStatus): PaymentRequest | null {
    const data = this.getData()
    const index = data.requests.findIndex((r) => r.id === id)
    if (index === -1) return null
    data.requests[index] = { ...data.requests[index], status, reviewedAt: Date.now() }
    this.saveData(data)
    return data.requests[index]
  }

  static deleteRequest(id: string): boolean {
    const data = this.getData()
    const next = data.requests.filter((r) => r.id !== id)
    if (next.length === data.requests.length) return false
    data.requests = next
    this.saveData(data)
    return true
  }

  static getUserRequests(userId: string): PaymentRequest[] {
    return this.getData().requests.filter((r) => r.userId === userId)
  }

  static getMethodTypeLabel(type: PaymentMethodType): string {
    const labels: Record<PaymentMethodType, string> = {
      upi: "UPI",
      bank: "Bank Transfer",
      qr: "QR Code",
      crypto: "Crypto",
      wallet: "Wallet",
      other: "Other",
    }
    return labels[type]
  }
}

import { ref, set, onValue, type Database } from "firebase/database"
import { database } from "./firebase"

export type RiskPreset = "conservative" | "balanced" | "aggressive"
export type ProfitLockStatus = "inactive" | "active" | "locked"
export type UnlockRequestStatus = "none" | "pending" | "approved" | "denied"

/**
 * Global, admin-controlled configuration for the Profit Lock system.
 * These are the 15 "top" features the admin can control from the panel.
 */
export interface ProfitLockConfig {
  systemEnabled: boolean // 1. Master switch for the whole profit-lock system
  autoLockOnTarget: boolean // 2. Automatically lock the panel when target profit is reached
  lockDurationHours: number // 3. How long the panel stays locked (default 24h)
  stopLossGuard: boolean // 4. Auto-lock when the user's loss hits their risk limit
  maxProfitTargetPercent: number // 5. Cap on how high a profit target a user may set (% of capital)
  minCapital: number // 6. Minimum capital a user must enter to activate
  requireApproval: boolean // 7. Early unlock needs admin approval
  autoApproveUnlock: boolean // 8. Auto-approve unlock requests instantly
  dailyProfitCapPercent: number // 9. Daily profit cap (% of capital) that also triggers a lock
  tradeCooldownSeconds: number // 10. Minimum seconds between recorded trades
  maxTradesPerSession: number // 11. Max trades allowed before a forced lock
  compoundingMode: boolean // 12. Reinvest profit into the working balance
  defaultRiskPreset: RiskPreset // 13. Default risk profile applied on setup
  lossRecoveryAlerts: boolean // 14. Warn the user when close to the stop-loss
  emergencyGlobalLock: boolean // 15. Instantly lock every user's panel
  updatedAt: number
}

export interface ProfitLockTrade {
  id: string
  type: "win" | "loss"
  amount: number
  balanceAfter: number
  timestamp: number
}

export interface UserProfitLock {
  userId: string
  name: string
  capital: number
  profitTarget: number // absolute profit amount the user wants to make
  riskLimit: number // max loss amount (stop-loss) the user accepts
  riskPreset: RiskPreset
  balance: number // current working balance
  realizedProfit: number // balance - capital
  status: ProfitLockStatus
  lockedAt?: number
  lockUntil?: number
  lockReason?: string
  unlockStatus: UnlockRequestStatus
  unlockRequestedAt?: number
  unlockNote?: string
  trades: ProfitLockTrade[]
  createdAt: number
  updatedAt: number
}

interface ProfitLockState {
  config: ProfitLockConfig
  users: Record<string, UserProfitLock>
}

export class ProfitLockManager {
  private static readonly STORAGE_KEY = "jalwa_profit_lock"
  private static readonly FIREBASE_PATH = "profitLock"
  private static database: Database | undefined = database
  private static subscriptionStarted = false
  private static applyingRemote = false

  static readonly defaultConfig: ProfitLockConfig = {
    systemEnabled: true,
    autoLockOnTarget: true,
    lockDurationHours: 24,
    stopLossGuard: true,
    maxProfitTargetPercent: 100,
    minCapital: 100,
    requireApproval: true,
    autoApproveUnlock: false,
    dailyProfitCapPercent: 50,
    tradeCooldownSeconds: 0,
    maxTradesPerSession: 100,
    compoundingMode: true,
    defaultRiskPreset: "balanced",
    lossRecoveryAlerts: true,
    emergencyGlobalLock: false,
    updatedAt: Date.now(),
  }

  static setDatabase(db: Database) {
    this.database = db
  }

  // ---------- low level state ----------
  private static getState(): ProfitLockState {
    if (typeof window === "undefined") {
      return { config: this.defaultConfig, users: {} }
    }
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ProfitLockState>
        return {
          config: { ...this.defaultConfig, ...(parsed.config || {}) },
          users: parsed.users || {},
        }
      }
    } catch (error) {
      console.error("[v0] Error reading profit-lock state:", error)
    }
    return { config: this.defaultConfig, users: {} }
  }

  private static saveState(state: ProfitLockState): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent("profitLockUpdated", { detail: state }))

    if (this.database && !this.applyingRemote) {
      const stateRef = ref(this.database, this.FIREBASE_PATH)
      set(stateRef, state).catch((error) => {
        console.error("[v0] Error saving profit-lock to Firebase:", error)
      })
    }
  }

  /** Start listening to global profit-lock state so every device stays in sync. */
  static startRealtimeSync(): () => void {
    if (typeof window === "undefined") return () => {}
    if (!this.database) {
      console.warn("[v0] Firebase not initialized - profit lock will be local only")
      return () => {}
    }
    if (this.subscriptionStarted) return () => {}
    this.subscriptionStarted = true

    try {
      const stateRef = ref(this.database, this.FIREBASE_PATH)
      const unsubscribe = onValue(
        stateRef,
        (snapshot) => {
          const value = snapshot.val()
          if (!value) return
          const state: ProfitLockState = {
            config: { ...this.defaultConfig, ...(value.config || {}) },
            users: value.users || {},
          }
          this.applyingRemote = true
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state))
          window.dispatchEvent(new CustomEvent("profitLockUpdated", { detail: state }))
          this.applyingRemote = false
          console.log("[v0] Real-time profit-lock update received from Firebase")
        },
        (error) => {
          console.error("[v0] Error subscribing to profit lock:", error)
        },
      )
      return () => {
        this.subscriptionStarted = false
        unsubscribe()
      }
    } catch (error) {
      console.error("[v0] Error setting up profit-lock sync:", error)
      this.subscriptionStarted = false
      return () => {}
    }
  }

  static subscribeToChanges(callback: (state: ProfitLockState) => void): () => void {
    const handler = (event: Event) => {
      callback((event as CustomEvent).detail as ProfitLockState)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("profitLockUpdated", handler)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("profitLockUpdated", handler)
      }
    }
  }

  // ---------- config (admin) ----------
  static getConfig(): ProfitLockConfig {
    return this.getState().config
  }

  static saveConfig(partial: Partial<ProfitLockConfig>): ProfitLockConfig {
    const state = this.getState()
    state.config = { ...state.config, ...partial, updatedAt: Date.now() }
    this.saveState(state)
    return state.config
  }

  // ---------- per-user ----------
  static getUser(userId: string): UserProfitLock | null {
    if (!userId) return null
    const user = this.getState().users[userId] || null
    if (user) return this.reconcile(user)
    return null
  }

  static getAllUsers(): UserProfitLock[] {
    return Object.values(this.getState().users).map((u) => this.reconcile(u))
  }

  /** Configure (or reconfigure) a user's profit-lock session. */
  static setupUser(
    userId: string,
    name: string,
    input: { capital: number; profitTarget: number; riskLimit: number; riskPreset?: RiskPreset },
  ): UserProfitLock {
    const state = this.getState()
    const now = Date.now()
    const existing = state.users[userId]

    const user: UserProfitLock = {
      userId,
      name,
      capital: input.capital,
      profitTarget: input.profitTarget,
      riskLimit: input.riskLimit,
      riskPreset: input.riskPreset || state.config.defaultRiskPreset,
      balance: input.capital,
      realizedProfit: 0,
      status: "active",
      unlockStatus: "none",
      trades: [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }

    state.users[userId] = user
    this.saveState(state)
    return user
  }

  /** Record a win/loss and auto-lock if the target profit or stop-loss is hit. */
  static recordTrade(userId: string, type: "win" | "loss", amount: number): UserProfitLock | null {
    const state = this.getState()
    const user = state.users[userId]
    if (!user || user.status !== "active") return user ? this.reconcile(user) : null

    const now = Date.now()
    const signed = type === "win" ? Math.abs(amount) : -Math.abs(amount)
    user.balance = Math.max(0, user.balance + signed)
    user.realizedProfit = user.balance - user.capital

    const trade: ProfitLockTrade = {
      id: `t_${now}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      amount: Math.abs(amount),
      balanceAfter: user.balance,
      timestamp: now,
    }
    user.trades = [trade, ...(user.trades || [])].slice(0, 100)
    user.updatedAt = now

    state.users[userId] = user
    // Evaluate lock conditions after the trade.
    this.evaluateLock(state, userId)
    this.saveState(state)
    return this.reconcile(state.users[userId])
  }

  /** Apply auto-lock rules (target reached / stop-loss / daily cap / trade cap). */
  private static evaluateLock(state: ProfitLockState, userId: string): void {
    const cfg = state.config
    const user = state.users[userId]
    if (!user || user.status !== "active" || !cfg.systemEnabled) return

    const now = Date.now()
    const dailyCapAmount = (cfg.dailyProfitCapPercent / 100) * user.capital
    let reason: string | null = null

    if (cfg.autoLockOnTarget && user.profitTarget > 0 && user.realizedProfit >= user.profitTarget) {
      reason = `Profit target of ${user.profitTarget} reached`
    } else if (cfg.dailyProfitCapPercent > 0 && user.realizedProfit >= dailyCapAmount && dailyCapAmount > 0) {
      reason = `Daily profit cap reached`
    } else if (cfg.stopLossGuard && user.riskLimit > 0 && user.realizedProfit <= -Math.abs(user.riskLimit)) {
      reason = `Stop-loss limit of ${user.riskLimit} hit`
    } else if (cfg.maxTradesPerSession > 0 && user.trades.length >= cfg.maxTradesPerSession) {
      reason = `Max trades per session reached`
    }

    if (reason) {
      user.status = "locked"
      user.lockedAt = now
      user.lockUntil = now + cfg.lockDurationHours * 60 * 60 * 1000
      user.lockReason = reason
      user.unlockStatus = "none"
    }
  }

  /** Recompute derived fields and auto-unlock expired locks. */
  private static reconcile(user: UserProfitLock): UserProfitLock {
    const cfg = this.getConfig()

    // Emergency global lock overrides everything.
    if (cfg.emergencyGlobalLock && user.status !== "locked") {
      return { ...user, status: "locked", lockReason: "Emergency global lock by admin", lockUntil: undefined }
    }

    if (user.status === "locked" && !cfg.emergencyGlobalLock) {
      const expired = user.lockUntil && Date.now() >= user.lockUntil
      // Auto-unlock once the timer expires (unless still waiting on required approval).
      const waitingApproval = cfg.requireApproval && user.unlockStatus === "pending"
      if (expired && !waitingApproval) {
        return this.buildUnlocked(user)
      }
    }
    return user
  }

  private static buildUnlocked(user: UserProfitLock): UserProfitLock {
    // Reset the session so the panel works "as before".
    return {
      ...user,
      status: "active",
      balance: user.capital,
      realizedProfit: 0,
      trades: [],
      lockedAt: undefined,
      lockUntil: undefined,
      lockReason: undefined,
      unlockStatus: "none",
      unlockRequestedAt: undefined,
      unlockNote: undefined,
      updatedAt: Date.now(),
    }
  }

  /** User asks the admin to unlock early. */
  static requestUnlock(userId: string, note?: string): UserProfitLock | null {
    const state = this.getState()
    const user = state.users[userId]
    if (!user || user.status !== "locked") return user ? this.reconcile(user) : null

    const cfg = state.config
    // If approval isn't required, or auto-approve is on, unlock immediately.
    if (!cfg.requireApproval || cfg.autoApproveUnlock) {
      state.users[userId] = this.buildUnlocked(user)
      this.saveState(state)
      return state.users[userId]
    }

    user.unlockStatus = "pending"
    user.unlockRequestedAt = Date.now()
    user.unlockNote = note
    user.updatedAt = Date.now()
    state.users[userId] = user
    this.saveState(state)
    return user
  }

  /** Admin approves an unlock request -> panel unlocks instantly. */
  static approveUnlock(userId: string): void {
    const state = this.getState()
    const user = state.users[userId]
    if (!user) return
    state.users[userId] = this.buildUnlocked(user)
    this.saveState(state)
  }

  /** Admin denies an unlock request -> stays locked until the timer expires. */
  static denyUnlock(userId: string): void {
    const state = this.getState()
    const user = state.users[userId]
    if (!user) return
    user.unlockStatus = "denied"
    user.updatedAt = Date.now()
    state.users[userId] = user
    this.saveState(state)
  }

  /** Admin manually locks a specific user. */
  static forceLock(userId: string, hours?: number): void {
    const state = this.getState()
    const user = state.users[userId]
    if (!user) return
    const now = Date.now()
    const duration = (hours ?? state.config.lockDurationHours) * 60 * 60 * 1000
    user.status = "locked"
    user.lockedAt = now
    user.lockUntil = now + duration
    user.lockReason = "Locked by admin"
    user.unlockStatus = "none"
    user.updatedAt = now
    state.users[userId] = user
    this.saveState(state)
  }

  /** Reset a user's session entirely (clears config so they can set up again). */
  static resetUser(userId: string): void {
    const state = this.getState()
    if (state.users[userId]) {
      delete state.users[userId]
      this.saveState(state)
    }
  }

  static getPendingRequests(): UserProfitLock[] {
    return this.getAllUsers().filter((u) => u.unlockStatus === "pending")
  }

  static riskPresetLimits(preset: RiskPreset, capital: number): { profitTarget: number; riskLimit: number } {
    switch (preset) {
      case "conservative":
        return { profitTarget: Math.round(capital * 0.15), riskLimit: Math.round(capital * 0.1) }
      case "aggressive":
        return { profitTarget: Math.round(capital * 0.75), riskLimit: Math.round(capital * 0.4) }
      case "balanced":
      default:
        return { profitTarget: Math.round(capital * 0.35), riskLimit: Math.round(capital * 0.2) }
    }
  }
}

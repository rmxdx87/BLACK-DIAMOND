import { ref, set, onValue, type Database } from "firebase/database"
import { database } from "./firebase"

export interface AccessUser {
  id: string
  name: string
  accessCode: string
  status: "active" | "restricted" | "terminated"
  createdAt: string
  lastLogin?: string
  loginCount: number
  isOnline: boolean
}

export interface UserSession {
  userId: string
  name: string
  accessCode: string
  loginTime: string
  isActive: boolean
}

export class UserAccessManager {
  private static readonly STORAGE_KEY = "jalwa_users"
  private static readonly SESSION_KEY = "jalwa_user_session"
  private static readonly FIREBASE_PATH = "access/users"
  private static database: Database | undefined = database
  private static subscriptionStarted = false
  // Prevents echoing a Firebase-originated update straight back to Firebase
  private static applyingRemote = false

  static setDatabase(db: Database) {
    this.database = db
  }

  /**
   * Start listening to the global users list in Firebase.
   * Whenever another device changes users, the local cache is updated and
   * a "usersUpdated" event is dispatched so the UI refreshes in real time.
   */
  static startRealtimeSync(): () => void {
    if (typeof window === "undefined") return () => {}
    if (!this.database) {
      console.warn("[v0] Firebase not initialized - user access will be local only")
      return () => {}
    }
    if (this.subscriptionStarted) return () => {}
    this.subscriptionStarted = true

    try {
      const usersRef = ref(this.database, this.FIREBASE_PATH)
      const unsubscribe = onValue(
        usersRef,
        (snapshot) => {
          const value = snapshot.val()
          const users: AccessUser[] = value ? (Array.isArray(value) ? value : Object.values(value)) : []
          // Update local cache without pushing back to Firebase
          this.applyingRemote = true
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))
          window.dispatchEvent(new CustomEvent("usersUpdated", { detail: users }))
          this.applyingRemote = false
          console.log("[v0] Real-time user list update received from Firebase")
        },
        (error) => {
          console.error("[v0] Error subscribing to users:", error)
        },
      )
      return () => {
        this.subscriptionStarted = false
        unsubscribe()
      }
    } catch (error) {
      console.error("[v0] Error setting up user sync:", error)
      this.subscriptionStarted = false
      return () => {}
    }
  }

  static getUsers(): AccessUser[] {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem(this.STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  }

  static saveUsers(users: AccessUser[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))
    // Dispatch event for real-time updates in the same tab
    window.dispatchEvent(new CustomEvent("usersUpdated", { detail: users }))

    // Persist globally to Firebase so every device stays in sync
    if (this.database && !this.applyingRemote) {
      const usersRef = ref(this.database, this.FIREBASE_PATH)
      set(usersRef, users).catch((error) => {
        console.error("[v0] Error saving users to Firebase:", error)
      })
    }
  }

  static addUser(name: string, accessCode: string): AccessUser {
    const users = this.getUsers()
    const newUser: AccessUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      accessCode,
      status: "active",
      createdAt: new Date().toISOString(),
      loginCount: 0,
      isOnline: false,
    }
    users.push(newUser)
    this.saveUsers(users)

    const { SubscriptionManager } = require("./subscription-manager")
    SubscriptionManager.createSubscription(newUser.id, "free")

    return newUser
  }

  static validateAccessCode(accessCode: string): AccessUser | null {
    if (!accessCode || typeof accessCode !== "string") {
      return null
    }

    const cleanCode = accessCode.trim().toUpperCase()

    // Validate format
    if (cleanCode.length !== 8 || !/^[A-Z0-9]{8}$/.test(cleanCode)) {
      return null
    }

    const users = this.getUsers()
    const user = users.find((u) => u.accessCode === cleanCode)

    if (!user) return null
    if (user.status === "terminated") return null
    if (user.status === "restricted") return null

    return user
  }

  static loginUser(accessCode: string): UserSession | null {
    const user = this.validateAccessCode(accessCode)
    if (!user) return null

    // Update user login stats
    const users = this.getUsers()
    const userIndex = users.findIndex((u) => u.id === user.id)
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date().toISOString()
      users[userIndex].loginCount += 1
      users[userIndex].isOnline = true
      this.saveUsers(users)
    }

    const session: UserSession = {
      userId: user.id,
      name: user.name,
      accessCode: user.accessCode,
      loginTime: new Date().toISOString(),
      isActive: true,
    }

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
    return session
  }

  static getCurrentSession(): UserSession | null {
    if (typeof window === "undefined") return null

    try {
      const stored = localStorage.getItem(this.SESSION_KEY)
      if (!stored) return null

      const session: UserSession = JSON.parse(stored)

      // Validate session is still valid
      const user = this.validateAccessCode(session.accessCode)
      if (!user) {
        this.logoutUser()
        return null
      }

      return session
    } catch (error) {
      console.error("Error reading user session:", error)
      this.logoutUser()
      return null
    }
  }

  static logoutUser(): void {
    if (typeof window === "undefined") return

    const session = this.getCurrentSession()
    if (session) {
      // Mark user as offline
      const users = this.getUsers()
      const userIndex = users.findIndex((u) => u.id === session.userId)
      if (userIndex !== -1) {
        users[userIndex].isOnline = false
        this.saveUsers(users)
      }
    }

    localStorage.removeItem(this.SESSION_KEY)
    window.dispatchEvent(new CustomEvent("userLoggedOut"))
  }

  static updateUserStatus(userId: string, status: AccessUser["status"]): boolean {
    const users = this.getUsers()
    const userIndex = users.findIndex((u) => u.id === userId)

    if (userIndex === -1) return false

    users[userIndex].status = status
    if (status === "terminated") {
      users[userIndex].isOnline = false
    }

    this.saveUsers(users)

    // If current user is affected, logout
    const currentSession = this.getCurrentSession()
    if (currentSession && currentSession.userId === userId && status !== "active") {
      this.logoutUser()
    }

    return true
  }

  static deleteUser(userId: string): boolean {
    const users = this.getUsers()
    const userIndex = users.findIndex((u) => u.id === userId)

    if (userIndex === -1) return false

    // If current user is being deleted, logout
    const currentSession = this.getCurrentSession()
    if (currentSession && currentSession.userId === userId) {
      this.logoutUser()
    }

    users.splice(userIndex, 1)
    this.saveUsers(users)
    return true
  }

  static generateAccessCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  static isAccessCodeUnique(accessCode: string): boolean {
    if (!accessCode || typeof accessCode !== "string") {
      return false
    }

    const cleanCode = accessCode.trim().toUpperCase()
    if (cleanCode.length !== 8 || !/^[A-Z0-9]{8}$/.test(cleanCode)) {
      return false
    }

    const users = this.getUsers()
    return !users.some((u) => u.accessCode === cleanCode)
  }

  static generateUniqueAccessCode(): string {
    let code = this.generateAccessCode()
    let attempts = 0
    const maxAttempts = 100 // Prevent infinite loop

    while (!this.isAccessCodeUnique(code) && attempts < maxAttempts) {
      code = this.generateAccessCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      code = this.generateAccessCode() + Date.now().toString().slice(-2)
      code = code.slice(0, 8).toUpperCase()
    }

    return code
  }
}

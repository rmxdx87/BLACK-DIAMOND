"use client"

import { useState, useEffect, useCallback } from "react"
import { UserAccessManager, type AccessUser, type UserSession } from "@/lib/user-access"
import { AdminSettings } from "@/lib/admin-settings"

export function useUserAccess() {
  // Determine initial loading state based on whether we're on client
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    if (typeof window === "undefined") return null
    // Try to load user immediately
    try {
      const adminSettings = AdminSettings.getSettings()
      if (!adminSettings.requireAccessCode) {
        return {
          userId: "guest",
          name: "Guest User",
          accessCode: "GUEST",
          loginTime: new Date().toISOString(),
          isActive: true,
        }
      }
      return UserAccessManager.getCurrentSession()
    } catch {
      return {
        userId: "guest",
        name: "Guest User",
        accessCode: "GUEST",
        loginTime: new Date().toISOString(),
        isActive: true,
      }
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<AccessUser[]>([])

  const loadCurrentUser = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const adminSettings = AdminSettings.getSettings()

      if (!adminSettings.requireAccessCode) {
        const guestSession: UserSession = {
          userId: "guest",
          name: "Guest User",
          accessCode: "GUEST",
          loginTime: new Date().toISOString(),
          isActive: true,
        }
        setCurrentUser(guestSession)
        setIsLoading(false)
        return
      }

      const session = UserAccessManager.getCurrentSession()
      setCurrentUser(session)
      setIsLoading(false)
    } catch (error) {
      // Fallback: create guest session on error
      const guestSession: UserSession = {
        userId: "guest",
        name: "Guest User",
        accessCode: "GUEST",
        loginTime: new Date().toISOString(),
        isActive: true,
      }
      setCurrentUser(guestSession)
      setIsLoading(false)
    }
  }, [])

  const loadUsers = useCallback(() => {
    const allUsers = UserAccessManager.getUsers()
    setUsers(allUsers)
  }, [])

  useEffect(() => {
    loadCurrentUser()
    loadUsers()

    const handleUsersUpdated = (event: CustomEvent) => {
      setUsers(event.detail)
    }

    const handleUserLoggedOut = () => {
      setCurrentUser(null)
    }

    const handleAdminSettingsUpdated = () => {
      loadCurrentUser()
    }

    window.addEventListener("usersUpdated", handleUsersUpdated as EventListener)
    window.addEventListener("userLoggedOut", handleUserLoggedOut)
    // AdminSettings dispatches "adminSettingsChanged" (both local + Firebase updates)
    window.addEventListener("adminSettingsChanged", handleAdminSettingsUpdated)

    // React to real-time access-control changes coming from Firebase on other devices
    const unsubscribeSettings = AdminSettings.subscribeToChanges(() => {
      loadCurrentUser()
    })

    return () => {
      window.removeEventListener("usersUpdated", handleUsersUpdated as EventListener)
      window.removeEventListener("userLoggedOut", handleUserLoggedOut)
      window.removeEventListener("adminSettingsChanged", handleAdminSettingsUpdated)
      unsubscribeSettings()
    }
  }, [loadCurrentUser, loadUsers])

  const login = useCallback((accessCode: string): { success: boolean; error?: string; user?: UserSession } => {
    const session = UserAccessManager.loginUser(accessCode)

    if (!session) {
      return { success: false, error: "Invalid or inactive access code" }
    }

    setCurrentUser(session)
    return { success: true, user: session }
  }, [])

  const logout = useCallback(() => {
    UserAccessManager.logoutUser()
    setCurrentUser(null)
  }, [])

  const addUser = useCallback(
    (name: string, accessCode?: string): AccessUser => {
      const code = accessCode || UserAccessManager.generateUniqueAccessCode()
      const user = UserAccessManager.addUser(name, code)
      loadUsers()
      return user
    },
    [loadUsers],
  )

  const updateUserStatus = useCallback(
    (userId: string, status: AccessUser["status"]): boolean => {
      const success = UserAccessManager.updateUserStatus(userId, status)
      if (success) {
        loadUsers()
        if (currentUser && currentUser.userId === userId) {
          loadCurrentUser()
        }
      }
      return success
    },
    [currentUser, loadUsers, loadCurrentUser],
  )

  const deleteUser = useCallback(
    (userId: string): boolean => {
      const success = UserAccessManager.deleteUser(userId)
      if (success) {
        loadUsers()
      }
      return success
    },
    [loadUsers],
  )

  const generateAccessCode = useCallback((): string => {
    return UserAccessManager.generateUniqueAccessCode()
  }, [])

  return {
    currentUser,
    isLoading,
    users,
    login,
    logout,
    addUser,
    updateUserStatus,
    deleteUser,
    generateAccessCode,
    isLoggedIn: !!currentUser,
    refreshUsers: loadUsers,
    refreshSession: loadCurrentUser,
  }
}

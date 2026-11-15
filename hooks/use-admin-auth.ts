"use client"

import { useEffect, useState } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import type { AdminRole, AdminSession } from "@/lib/admin-auth"

interface SessionResponse {
  session: AdminSession
}

function isSessionResponse(value: unknown): value is SessionResponse {
  if (!value || typeof value !== "object" || !("session" in value)) return false
  const session = value.session
  if (!session || typeof session !== "object" || !("user" in session)) return false
  const user = session.user
  if (!user || typeof user !== "object") return false

  return (
    "id" in user &&
    typeof user.id === "string" &&
    "username" in user &&
    typeof user.username === "string" &&
    "email" in user &&
    typeof user.email === "string" &&
    "role" in user &&
    (user.role === "admin" || user.role === "super_admin" || user.role === "viewer")
  )
}

async function fetchAdminSession(user: User): Promise<AdminSession> {
  // Admin claims may have been granted while this browser still had a cached
  // token. Force refresh so the session endpoint sees the latest role.
  const token = await user.getIdToken(true)
  const response = await fetch("/api/admin/session", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error("The admin authentication service returned an invalid response.")
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Admin authentication failed."
    throw new Error(message)
  }

  if (!isSessionResponse(payload)) {
    throw new Error("The admin authentication service returned an invalid session.")
  }

  return payload.session
}

export function useAdminAuth() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    const firebaseAuth = auth
    if (!firebaseAuth) {
      setIsLoading(false)
      return
    }

    let active = true
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!active) return
      setIsLoading(true)

      if (!firebaseUser) {
        setSession(null)
        setAuthError("")
        setIsLoading(false)
        return
      }

      try {
        const verifiedSession = await fetchAdminSession(firebaseUser)
        if (active) setSession(verifiedSession)
      } catch (error) {
        await signOut(firebaseAuth)
        if (active) {
          setSession(null)
          setAuthError(
            error instanceof Error
              ? error.message
              : "Could not restore your admin session. Check the Firebase Admin server configuration.",
          )
        }
      } finally {
        if (active) setIsLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    if (!auth) throw new Error("Firebase Authentication is not configured in this browser.")

    setAuthError("")
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
    try {
      const verifiedSession = await fetchAdminSession(credential.user)
      setSession(verifiedSession)
      setAuthError("")
    } catch (error) {
      await signOut(auth)
      setAuthError(error instanceof Error ? error.message : "Admin sign-in failed.")
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    if (auth) await signOut(auth)
    setSession(null)
  }

  const hasRole = (role: AdminRole): boolean => {
    if (!session) return false
    const roleRank: Record<AdminRole, number> = {
      viewer: 0,
      admin: 1,
      super_admin: 2,
    }
    return roleRank[session.user.role] >= roleRank[role]
  }

  return {
    session,
    authError,
    isAuthenticated: !!session,
    isLoading,
    login,
    logout,
    hasRole,
  }
}

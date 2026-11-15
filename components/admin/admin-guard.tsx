"use client"

import type React from "react"

import { useAdminAuth } from "@/hooks/use-admin-auth"
import type { AdminRole } from "@/lib/admin-auth"
import { AdminLogin } from "./admin-login"

interface AdminGuardProps {
  children: React.ReactNode
  requiredRole?: AdminRole
}

export function AdminGuard({ children, requiredRole = "viewer" }: AdminGuardProps) {
  const { isAuthenticated, isLoading, login, hasRole, authError } = useAdminAuth()

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="dashboard-card px-8 py-6 text-center text-sm text-muted-foreground">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary"></div>
          Restoring admin session…
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} initialError={authError} />
  }

  if (!hasRole(requiredRole)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-4">
        <div className="dashboard-card max-w-md p-8 text-center">
          <h1 className="mb-3 text-2xl font-semibold text-destructive">Access denied</h1>
          <p className="text-sm text-muted-foreground">Your current admin role does not have permission for this section.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

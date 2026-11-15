"use client"

import { useEffect, useState } from "react"
import { Activity, AlertTriangle, Database, LockKeyhole, Shield, Users } from "lucide-react"
import { useFirebaseContext } from "@/contexts/firebase-context"
import { UserAccessManager } from "@/lib/user-access"

export function SecurityManagement() {
  const { isConnected, error: firebaseError } = useFirebaseContext()
  const [userCount, setUserCount] = useState<number | null>(null)

  useEffect(() => {
    const refreshUserCount = () => setUserCount(UserAccessManager.getUsers().length)
    refreshUserCount()
    window.addEventListener("usersUpdated", refreshUserCount)
    return () => window.removeEventListener("usersUpdated", refreshUserCount)
  }, [])

  const statusItems = [
    { label: "Access user records", value: userCount === null ? "Loading" : String(userCount), detail: "Existing access-manager records; not active session count", icon: Users },
    { label: "Firebase connection", value: isConnected ? "Connected" : "Disconnected", detail: firebaseError ?? "Connection status only; not a security-rules audit", icon: Database },
    { label: "Server-side admin authorization", value: "Not configured", detail: "Admin access is currently validated in the browser", icon: LockKeyhole },
    { label: "Security audit events", value: "Unavailable", detail: "No persisted audit-event source is connected", icon: Activity },
  ]

  return (
    <div className="space-y-5">
      <header>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Access and audit status</p>
        <h2 className="text-2xl font-semibold">Security management</h2>
        <p className="mt-2 text-sm text-muted-foreground">Current security capabilities and missing enforcement, based on the services connected to this application.</p>
      </header>

      <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <h3 className="font-semibold">Admin authorization is client-side</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            The current admin gate runs in the browser. It does not protect API routes or Firebase data from direct requests.
            Enforce admin roles on a trusted server and in deployed Firebase Realtime Database security rules before relying on this interface for sensitive data.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statusItems.map(({ label, value, detail, icon: Icon }) => (
          <section key={label} className="dashboard-card min-w-0 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{label}</p>
              <Icon className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <p className="text-xl font-semibold">{value}</p>
            <p className="mt-2 break-words text-xs text-muted-foreground">{detail}</p>
          </section>
        ))}
      </div>

      <section className="dashboard-card p-5">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h3 className="font-semibold">Controls requiring backend support</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              IP allow/block lists, login throttling, multi-factor authentication, session revocation, and intrusion detection are not connected to enforcement services.
              Local-only toggles would not secure accounts, so those controls are intentionally not presented as active.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-card p-5">
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Security and activity history</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No authentication or administrative audit events are currently persisted for this panel. Historical event data cannot be displayed until a trusted audit-log service is added.
        </p>
      </section>
    </div>
  )
}

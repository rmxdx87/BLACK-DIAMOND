"use client"

import { useEffect, useState } from "react"
import { Activity, Database, RefreshCw, Shield, Users, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebaseContext } from "@/contexts/firebase-context"
import { useGameData } from "@/hooks/use-game-data"
import { UserAccessManager } from "@/lib/user-access"

export function SystemMonitoring() {
  const { isConnected, error: firebaseError } = useFirebaseContext()
  const {
    results,
    error: apiError,
    loading,
    refetch,
    lastSuccessfulSyncAt,
    duplicateRecords,
    rejectedRecordCount,
  } = useGameData()
  const [userCount, setUserCount] = useState<number | null>(null)

  useEffect(() => {
    const refreshUserCount = () => setUserCount(UserAccessManager.getUsers().length)
    refreshUserCount()
    window.addEventListener("usersUpdated", refreshUserCount)
    return () => window.removeEventListener("usersUpdated", refreshUserCount)
  }, [])

  const observations = [
    {
      label: "History API",
      value: apiError ? "Error" : loading ? "Syncing" : results.length ? "Responding" : "No data",
      detail: apiError ?? `${results.length} records loaded from the configured source`,
      icon: apiError ? WifiOff : Activity,
    },
    {
      label: "Firebase Realtime Database",
      value: isConnected ? "Connected" : "Disconnected",
      detail: firebaseError ?? "Connection state reported by Firebase",
      icon: isConnected ? Wifi : WifiOff,
    },
    {
      label: "Access user records",
      value: userCount === null ? "Loading" : userCount,
      detail: "Count from the existing client-side access manager",
      icon: Users,
    },
    {
      label: "Duplicate source records",
      value: duplicateRecords ?? "Not measured",
      detail: "Duplicate period identifiers skipped on the latest response",
      icon: Database,
    },
    {
      label: "Rejected source records",
      value: rejectedRecordCount ?? "Not measured",
      detail: "Invalid records reported on the latest API response",
      icon: Database,
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Runtime observations</p>
          <h2 className="text-2xl font-semibold">System monitoring</h2>
          <p className="mt-2 text-sm text-muted-foreground">Live application connections and source data currently visible to this client.</p>
        </div>
        <Button variant="outline" onClick={() => void refetch()} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Sync history
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {observations.map(({ label, value, detail, icon: Icon }) => (
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

      {apiError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{apiError}</p>}

      <section className="dashboard-card p-5">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h3 className="font-semibold">Host telemetry is not connected</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              CPU, memory, disk, uptime, request volume, active sessions, and security events require server-side instrumentation.
              This browser does not report those values, so they are intentionally not estimated or randomized here.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-card p-5">
        <h3 className="font-semibold">Latest successful history sync</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {lastSuccessfulSyncAt ? new Date(lastSuccessfulSyncAt).toLocaleString() : "No successful sync recorded in this session."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">The history endpoint currently exposes its default page only; pagination parameters are not configured.</p>
      </section>
    </div>
  )
}

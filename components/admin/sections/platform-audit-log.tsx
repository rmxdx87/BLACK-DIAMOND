"use client"

import { useCallback, useEffect, useState } from "react"
import { CircleAlert, RefreshCw, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminApiFetch } from "@/lib/admin-api-client"
import { PlatformAuditEventSchema, type PlatformAuditEvent } from "@/lib/platform/audit-schema"

interface AuditResponse {
  events: PlatformAuditEvent[]
}

export function PlatformAuditLog() {
  const [events, setEvents] = useState<PlatformAuditEvent[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setError("")
    try {
      const response = await adminApiFetch<AuditResponse>("/api/admin/platform/audit-logs?limit=100")
      if (!Array.isArray(response.events)) throw new Error("The audit service returned an invalid response.")
      setEvents(response.events.map((event) => PlatformAuditEventSchema.parse(event)))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load platform audit events.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Administrative trail</p>
          <h2 className="mt-2 text-2xl font-semibold">Platform Audit Log</h2>
          <p className="mt-2 text-sm text-muted-foreground">Last 100 platform mutations. Request bodies, API secrets, and credentials are never recorded.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refresh()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {events.length ? events.map((event) => (
        <Card key={event.eventId} className="dashboard-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {event.actorDisplayName}
            </CardTitle>
            <Badge variant={event.outcome === "COMPLETED" ? "default" : "outline"}>{event.outcome}</Badge>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-1 text-xs sm:grid-cols-2">
            <p className="break-all font-mono">{event.method} {event.path}</p>
            <p className="text-muted-foreground">{event.permission.replaceAll("_", " ")} · {event.actorRole.replaceAll("_", " ")}</p>
            <p className="text-muted-foreground">Requested: {new Date(event.requestedAt).toLocaleString()}</p>
            <p className="text-muted-foreground">
              {event.completedAt ? `Completed: ${new Date(event.completedAt).toLocaleString()}` : "Still in progress"}
              {event.responseStatus ? ` · HTTP ${event.responseStatus}` : ""}
            </p>
          </CardContent>
        </Card>
      )) : !error ? (
        <Card className="dashboard-card p-5 text-sm text-muted-foreground">
          {isLoading ? "Loading audit log…" : "No platform mutations have been recorded."}
        </Card>
      ) : null}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { CircleAlert, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LatestGameResult {
  periodId: string
  result: unknown
  timestamp: number | null
  fetchedAt: number
  cached: boolean
}

function isLatestGameResult(value: unknown): value is LatestGameResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "periodId" in value &&
      typeof value.periodId === "string" &&
      "fetchedAt" in value &&
      typeof value.fetchedAt === "number" &&
      "cached" in value &&
      typeof value.cached === "boolean" &&
      "result" in value,
  )
}

interface DynamicGameResultProps {
  gameId: string
  sessionId: string
}

export function DynamicGameResult({ gameId, sessionId }: DynamicGameResultProps) {
  const [result, setResult] = useState<LatestGameResult | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const displayResult = result
    ? typeof result.result === "string" || typeof result.result === "number"
      ? String(result.result)
      : JSON.stringify(result.result) ?? "—"
    : "—"

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ gameId, sessionId })
      const response = await fetch(`/api/platform/results?${params.toString()}`, { cache: "no-store" })
      const payload: unknown = await response.json()
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to load the latest result."
        throw new Error(message)
      }
      if (!isLatestGameResult(payload)) throw new Error("The result adapter returned an invalid response.")
      setResult(payload)
      setError("")
    } catch (refreshError) {
      setResult(null)
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load the latest result.")
    } finally {
      setIsLoading(false)
    }
  }, [gameId, sessionId])

  useEffect(() => {
    const firstLoad = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => {
      window.clearTimeout(firstLoad)
      window.clearInterval(timer)
    }
  }, [refresh])

  return (
    <Card className="dashboard-card min-w-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">History</p>
          <CardTitle className="mt-1 text-base">Latest result</CardTitle>
        </div>
        <Button type="button" variant="outline" size="sm" aria-label="Refresh latest result" onClick={() => void refresh()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 pt-0 sm:px-5 sm:pb-5">
        {error && (
          <p role="alert" className="flex min-w-0 items-start gap-2 text-xs text-destructive">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {result ? (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Period</p>
                <p className="truncate font-mono text-xs font-semibold sm:text-sm" title={result.periodId}>{result.periodId}</p>
              </div>
              <div className="min-w-12 rounded-lg border border-primary/25 bg-primary/8 px-3 py-1 text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Result</p>
                <p className="font-mono text-lg font-bold leading-tight text-primary">{displayResult}</p>
              </div>
            </div>
            <details className="rounded-lg border border-border/60 px-3 py-2">
              <summary className="cursor-pointer text-[10px] text-muted-foreground">Result details</summary>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                <span>Source timestamp: {result.timestamp ? new Date(result.timestamp).toLocaleString() : "Not supplied"}</span>
                <span>Retrieved: {new Date(result.fetchedAt).toLocaleString()}{result.cached ? " · cached" : ""}</span>
              </div>
            </details>
          </>
        ) : !error ? (
          <p className="text-sm text-muted-foreground">{isLoading ? "Fetching a real source result…" : "No result was returned."}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

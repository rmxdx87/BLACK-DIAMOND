"use client"

import { useCallback, useEffect, useState } from "react"
import { CircleAlert, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlatformPredictionRecordSchema, type PlatformPredictionRecord } from "@/lib/platform/schemas"

interface PredictionResponse {
  mode: "system" | "manual"
  sourceStatus: "SYSTEM" | "MANUAL" | "PENDING" | "UNAVAILABLE"
  prediction: PlatformPredictionRecord | null
}

function isPredictionResponse(value: unknown): value is PredictionResponse {
  if (!value || typeof value !== "object" || !("mode" in value) || !("sourceStatus" in value) || !("prediction" in value)) {
    return false
  }
  if (value.mode !== "system" && value.mode !== "manual") return false
  if (!["SYSTEM", "MANUAL", "PENDING", "UNAVAILABLE"].includes(String(value.sourceStatus))) return false
  return value.prediction === null || PlatformPredictionRecordSchema.safeParse(value.prediction).success
}

interface DynamicGamePredictionProps {
  gameId: string
  sessionId: string
}

export function DynamicGamePrediction({ gameId, sessionId }: DynamicGamePredictionProps) {
  const [data, setData] = useState<PredictionResponse | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ gameId, sessionId })
      const response = await fetch(`/api/platform/prediction?${params.toString()}`, { cache: "no-store" })
      const payload: unknown = await response.json()
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to load the prediction."
        throw new Error(message)
      }
      if (!isPredictionResponse(payload)) throw new Error("The prediction service returned invalid data.")
      setData(payload)
      setError("")
    } catch (refreshError) {
      setData(null)
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load the prediction.")
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

  const prediction = data?.prediction
  const numberCandidates = prediction?.predictionPayload.numberCandidates ?? []
  const otherCandidates = [
    ...(prediction?.predictionPayload.colorCandidates ?? []),
    ...(prediction?.predictionPayload.sizeCandidates ?? []),
  ]

  return (
    <Card className="dashboard-card min-w-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Next round</p>
          <CardTitle className="mt-1 text-base">Prediction</CardTitle>
        </div>
        <Button type="button" variant="outline" size="sm" aria-label="Refresh prediction" onClick={() => void refresh()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0 sm:px-5 sm:pb-5">
        {error && (
          <p role="alert" className="flex min-w-0 items-start gap-2 text-xs text-destructive">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {prediction ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>ADMIN PREDICTION</Badge>
              <Badge variant={prediction.verificationStatus === "WIN" ? "default" : "outline"}>
                {prediction.verificationStatus}
              </Badge>
              <span className="min-w-0 truncate text-xs text-muted-foreground">Period {prediction.targetPeriodId}</span>
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-3">
              {numberCandidates.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {numberCandidates.slice(0, 4).map((number, index) => (
                    <div key={`${number}-${index}`} className="rounded-lg border border-border/70 bg-background/50 px-1.5 py-2 text-center">
                      <p className="text-[9px] text-muted-foreground">#{index + 1}</p>
                      <p className="text-xl font-bold">{number}</p>
                    </div>
                  ))}
                </div>
              )}
              {otherCandidates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {otherCandidates.map((candidate, index) => (
                    <Badge key={`${candidate}-${index}`} variant="outline">{candidate}</Badge>
                  ))}
                </div>
              )}
              {prediction.predictionPayload.result !== undefined && (
                <p className="text-sm font-semibold">{String(prediction.predictionPayload.result)}</p>
              )}
              {prediction.note && <p className="mt-2 text-xs text-muted-foreground">{prediction.note}</p>}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Provided by {prediction.createdBy?.displayName ?? "Administrator"} · {new Date(prediction.publishedAt).toLocaleString()}
            </p>
          </>
        ) : data?.sourceStatus === "PENDING" ? (
          <p className="text-sm text-muted-foreground">No prediction has been published for this session yet.</p>
        ) : data?.sourceStatus === "UNAVAILABLE" ? (
          <p className="text-sm text-muted-foreground">Automatic prediction is not configured for this session.</p>
        ) : data?.sourceStatus === "SYSTEM" ? (
          <p className="text-sm text-muted-foreground">System prediction is shown in the main prediction panel.</p>
        ) : !error ? (
          <p className="text-sm text-muted-foreground">{isLoading ? "Checking the authorized prediction source…" : "No prediction is available."}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Check, CircleAlert, LoaderCircle, Radio, RefreshCw, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { adminApiFetch } from "@/lib/admin-api-client"
import { getEffectivePredictionMode } from "@/lib/platform/prediction-mode"
import {
  GameRecordSchema,
  ManualPredictionCreateSchema,
  PlatformPredictionRecordSchema,
  SessionRecordSchema,
  type PlatformGame,
  type PlatformPredictionRecord,
  type PlatformSession,
} from "@/lib/platform/schemas"

interface GameWithSessions {
  game: PlatformGame
  sessions: PlatformSession[]
}

interface GamesResponse {
  games: GameWithSessions[]
}

interface PredictionsResponse {
  predictions: PlatformPredictionRecord[]
}

function isGameWithSessions(value: unknown): value is GameWithSessions {
  if (!value || typeof value !== "object" || !("game" in value) || !("sessions" in value)) return false
  return GameRecordSchema.safeParse(value.game).success &&
    Array.isArray(value.sessions) &&
    value.sessions.every((session) => SessionRecordSchema.safeParse(session).success)
}

export function PredictionControlCenter() {
  const [games, setGames] = useState<GameWithSessions[]>([])
  const [gameId, setGameId] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [targetPeriodId, setTargetPeriodId] = useState("")
  const [numberCandidates, setNumberCandidates] = useState("")
  const [colorCandidates, setColorCandidates] = useState("")
  const [sizeCandidates, setSizeCandidates] = useState("")
  const [resultValue, setResultValue] = useState("")
  const [note, setNote] = useState("")
  const [confirmSystemOverride, setConfirmSystemOverride] = useState(false)
  const [predictions, setPredictions] = useState<PlatformPredictionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isChangingMode, setIsChangingMode] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadGames = useCallback(async () => {
    setError("")
    try {
      const response = await adminApiFetch<GamesResponse>("/api/admin/platform/games")
      if (!Array.isArray(response.games) || !response.games.every(isGameWithSessions)) {
        throw new Error("The prediction control service returned invalid game data.")
      }
      setGames(response.games)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load games.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGames(), 0)
    return () => window.clearTimeout(timer)
  }, [loadGames])

  const currentGame = games.find((item) => item.game.gameId === gameId) ?? games[0]
  const currentGameId = currentGame?.game.gameId ?? ""
  const availableSessions = currentGame?.sessions ?? []
  const currentSession = availableSessions.find((session) => session.sessionId === sessionId) ?? availableSessions[0]
  const currentSessionId = currentSession?.sessionId ?? ""
  const currentMode =
    currentGame && currentSession
      ? getEffectivePredictionMode(currentGame.game, currentSession)
      : currentGame?.game.predictionMode ?? "system"
  const isLegacyWinGo = currentGameId === "wingo-1m"

  const loadPredictions = useCallback(async () => {
    if (!currentGameId || !currentSessionId) {
      setPredictions([])
      return
    }
    setError("")
    try {
      const params = new URLSearchParams({ gameId: currentGameId, sessionId: currentSessionId })
      const response = await adminApiFetch<PredictionsResponse>(`/api/admin/platform/predictions?${params.toString()}`)
      if (!Array.isArray(response.predictions)) throw new Error("Prediction history response was invalid.")
      const verified = response.predictions.map((item) => PlatformPredictionRecordSchema.parse(item))
      setPredictions(verified)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load prediction history.")
    }
  }, [currentGameId, currentSessionId])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPredictions(), 0)
    return () => window.clearTimeout(timer)
  }, [loadPredictions])

  const changeMode = async (mode: "system" | "manual") => {
    if (!currentGameId || !currentSessionId || isLegacyWinGo) return
    setIsChangingMode(true)
    setError("")
    setNotice("")
    try {
      await adminApiFetch("/api/admin/platform/prediction-mode", {
        method: "POST",
        body: JSON.stringify({ gameId: currentGameId, sessionId: currentSessionId, mode }),
      })
      setNotice(`Prediction mode set to ${mode.toUpperCase()}. Existing predictions remain unchanged.`)
      await loadGames()
    } catch (modeError) {
      setError(modeError instanceof Error ? modeError.message : "Unable to change prediction mode.")
    } finally {
      setIsChangingMode(false)
    }
  }

  const parseCandidates = (value: string) =>
    value.split(",").map((candidate) => candidate.trim()).filter(Boolean)

  const trimmedResult = resultValue.trim()
  let parsedResult: { value: unknown; error: string }
  if (!trimmedResult) {
    parsedResult = { value: undefined, error: "" }
  } else if (currentGame?.game.resultFormat === "json") {
    try {
      parsedResult = { value: JSON.parse(trimmedResult) as unknown, error: "" }
    } catch {
      parsedResult = { value: undefined, error: "Result payload must be valid JSON." }
    }
  } else {
    parsedResult = { value: trimmedResult, error: "" }
  }

  const publishManual = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentGame || !currentSession) return
    setIsPublishing(true)
    setError("")
    setNotice("")

    try {
      if (parsedResult.error) throw new Error(parsedResult.error)
      const predictionPayload = {
        ...(parseCandidates(numberCandidates).length ? { numberCandidates: parseCandidates(numberCandidates) } : {}),
        ...(parseCandidates(colorCandidates).length ? { colorCandidates: parseCandidates(colorCandidates) } : {}),
        ...(parseCandidates(sizeCandidates).length ? { sizeCandidates: parseCandidates(sizeCandidates) } : {}),
        ...(parsedResult.value !== undefined ? { result: parsedResult.value } : {}),
      }
      const payload = {
        gameId: currentGameId,
        sessionId: currentSessionId,
        targetPeriodId: targetPeriodId.trim(),
        predictionPayload,
        note: note.trim(),
        expiresAt: null,
        confirmSystemOverride,
      }
      const validation = ManualPredictionCreateSchema.safeParse(payload)
      if (!validation.success) throw new Error(validation.error.issues[0]?.message ?? "Invalid prediction payload.")
      await adminApiFetch("/api/admin/platform/predictions", {
        method: "POST",
        body: JSON.stringify(validation.data),
      })
      setNotice(`Manual prediction published for period ${targetPeriodId}. The source and target are immutable.`)
      setTargetPeriodId("")
      setNumberCandidates("")
      setColorCandidates("")
      setSizeCandidates("")
      setResultValue("")
      setNote("")
      setConfirmSystemOverride(false)
      await loadPredictions()
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish the prediction.")
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Source-controlled forecasts</p>
        <h2 className="mt-2 text-2xl font-semibold">Prediction Control Center</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          System mode never fabricates a forecast for an unsupported engine. Manual records are immutable and scoped to one game, session, and target period.
        </p>
      </div>

      {error && <Alert variant="destructive"><CircleAlert className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <Alert><Check className="h-4 w-4" /><AlertDescription>{notice}</AlertDescription></Alert>}

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4 text-primary" />
            Game and session source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Game
              <select
                value={currentGameId}
                onChange={(event) => {
                  setGameId(event.target.value)
                  setSessionId("")
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {games.map(({ game }) => <option key={game.gameId} value={game.gameId}>{game.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Session
              <select
                value={currentSessionId}
                onChange={(event) => setSessionId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {availableSessions.map((session) => <option key={session.sessionId} value={session.sessionId}>{session.name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Current mode:</span>
            <Badge variant={currentMode === "manual" ? "default" : "outline"}>{currentMode.toUpperCase()}</Badge>
            <Button size="sm" variant={currentMode === "system" ? "secondary" : "outline"} disabled={isChangingMode || isLegacyWinGo || currentMode === "system"} onClick={() => void changeMode("system")}>
              System mode
            </Button>
            <Button size="sm" variant={currentMode === "manual" ? "secondary" : "outline"} disabled={isChangingMode || isLegacyWinGo || currentMode === "manual"} onClick={() => void changeMode("manual")}>
              Manual mode
            </Button>
          </div>
          {isLegacyWinGo ? (
            <p className="text-xs text-muted-foreground">
              Win Go 1M remains on its existing system prediction workflow. Use this center for separately configured games and sessions.
            </p>
          ) : currentMode === "system" ? (
            <p className="text-xs text-amber-300">
              No system prediction engine is currently connected for this game. The user panel will show Prediction Unavailable rather than a fabricated system forecast.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {currentMode === "manual" && !isLegacyWinGo && (
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-base">Publish manual prediction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={publishManual} className="space-y-4">
              <label className="block space-y-1.5 text-xs text-muted-foreground">
                Explicit target period ID from the source
                <Input required value={targetPeriodId} onChange={(event) => setTargetPeriodId(event.target.value)} placeholder="Enter the exact source period" />
              </label>
              {(currentGame?.game.resultFormat === "number" || currentGame?.game.resultFormat === "json") && (
                <label className="block space-y-1.5 text-xs text-muted-foreground">
                  Number candidates (comma separated)
                  <Input value={numberCandidates} onChange={(event) => setNumberCandidates(event.target.value)} placeholder="1, 4, 8" />
                </label>
              )}
              {currentGame?.game.resultFormat === "color_size" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs text-muted-foreground">
                    Colour candidates
                    <Input value={colorCandidates} onChange={(event) => setColorCandidates(event.target.value)} placeholder="red, violet" />
                  </label>
                  <label className="space-y-1.5 text-xs text-muted-foreground">
                    Size candidates
                    <Input value={sizeCandidates} onChange={(event) => setSizeCandidates(event.target.value)} placeholder="small, big" />
                  </label>
                </div>
              )}
              {(currentGame?.game.resultFormat === "string" || currentGame?.game.resultFormat === "json") && (
                <label className="block space-y-1.5 text-xs text-muted-foreground">
                  Exact result value {currentGame.game.resultFormat === "json" ? "(JSON)" : ""}
                  <Textarea value={resultValue} onChange={(event) => setResultValue(event.target.value)} rows={3} />
                </label>
              )}
              <label className="block space-y-1.5 text-xs text-muted-foreground">
                Optional analysis note
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} />
              </label>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={confirmSystemOverride} onChange={(event) => setConfirmSystemOverride(event.target.checked)} />
                <span>I explicitly confirm this manual prediction may supersede an existing system prediction for this exact period; the original system record will not be changed.</span>
              </label>
              <Button type="submit" disabled={isPublishing || !currentSession || !currentGame?.game.published || !currentSession.published}>
                {isPublishing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Publish prediction
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Immutable prediction history</h3>
          <Button size="sm" variant="outline" onClick={() => void loadPredictions()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        </div>
        {predictions.length ? predictions.map((prediction) => (
          <Card key={prediction.predictionId} className="dashboard-card">
            <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold">Period {prediction.targetPeriodId}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{JSON.stringify(prediction.predictionPayload)}</p>
                {prediction.note && <p className="mt-1 text-xs text-muted-foreground">{prediction.note}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {prediction.createdBy?.displayName ?? "System"} · {new Date(prediction.publishedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{prediction.source}</Badge>
                <Badge variant="outline">{prediction.status}</Badge>
                <Badge variant={prediction.verificationStatus === "WIN" ? "default" : "outline"}>{prediction.verificationStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="dashboard-card p-5 text-sm text-muted-foreground">
            {isLoading ? "Loading stored predictions…" : "No predictions have been published for this game/session."}
          </Card>
        )}
      </section>
    </div>
  )
}

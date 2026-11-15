"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, CircleAlert, LoaderCircle, Radio, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminApiFetch } from "@/lib/admin-api-client"
import { GameRecordSchema, type PlatformGame, type PlatformSession } from "@/lib/platform/schemas"

interface GameWithSessions {
  game: PlatformGame
  sessions: PlatformSession[]
}

interface GamesResponse {
  games: GameWithSessions[]
}

interface TestResponse {
  test: {
    success: boolean
    httpStatus: number | null
    mappedPeriod: string | null
    mappedResult: unknown
    timestamp: number | null
    errorCategory?: string
    errorMessage?: string
    lastSuccessfulSyncAt: number | null
  }
}

export function ApiIntegrationCenter() {
  const [games, setGames] = useState<GameWithSessions[]>([])
  const [selection, setSelection] = useState("")
  const [testResult, setTestResult] = useState<TestResponse["test"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState("")

  const loadGames = async () => {
    setIsLoading(true)
    setError("")
    try {
      const response = await adminApiFetch<GamesResponse>("/api/admin/platform/games")
      if (!Array.isArray(response.games)) throw new Error("The API center returned invalid game data.")
      for (const entry of response.games) {
        if (!GameRecordSchema.safeParse(entry.game).success || !Array.isArray(entry.sessions)) {
          throw new Error("The API center returned an invalid game record.")
        }
      }
      setGames(response.games)
      setSelection((current) => current || response.games[0]?.game.gameId || "")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load API configurations.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadGames()
  }, [])

  const [selectedGameId, selectedSessionId] = selection.split("::")
  const selectedGame = games.find((item) => item.game.gameId === selectedGameId)
  const selectedSession = selectedSessionId
    ? selectedGame?.sessions.find((session) => session.sessionId === selectedSessionId)
    : undefined
  const hasConfiguredApi = selectedSession
    ? Boolean(selectedSession.apiConfig || selectedGame?.game.apiConfig)
    : Boolean(selectedGame?.game.apiConfig)
  const configuredTargets = useMemo(
    () =>
      games.flatMap(({ game, sessions }) => [
        { value: game.gameId, label: `${game.name} · game API`, hasConfig: Boolean(game.apiConfig) },
        ...sessions.map((session) => ({
          value: `${game.gameId}::${session.sessionId}`,
          label: `${game.name} · ${session.name}`,
          hasConfig: Boolean(session.apiConfig || game.apiConfig),
        })),
      ]),
    [games],
  )

  const testConnection = async () => {
    if (!selectedGame) return
    setIsTesting(true)
    setError("")
    setTestResult(null)
    try {
      const result = await adminApiFetch<TestResponse>(
        `/api/admin/platform/games/${encodeURIComponent(selectedGameId)}/test-connection`,
        {
          method: "POST",
          body: JSON.stringify(selectedSessionId ? { sessionId: selectedSessionId } : {}),
        },
      )
      setTestResult(result.test)
      await loadGames()
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "The connection test failed.")
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Source validation</p>
        <h2 className="mt-2 text-2xl font-semibold">API integration center</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved configuration is not treated as healthy until a server-side HTTPS request validates its mapped result.
        </p>
      </div>

      {error && <Alert variant="destructive"><CircleAlert className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Test a game or session source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={selection}
              onChange={(event) => {
                setSelection(event.target.value)
                setTestResult(null)
              }}
              disabled={isLoading}
              className="h-10 min-w-64 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {configuredTargets.map((target) => (
                <option key={target.value} value={target.value}>
                  {target.label}{target.hasConfig ? "" : " · no mapped API"}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={() => void loadGames()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />Refresh
            </Button>
            <Button onClick={() => void testConnection()} disabled={!hasConfiguredApi || isTesting || isLoading}>
              {isTesting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
              Test connection
            </Button>
          </div>

          {!hasConfiguredApi && selectedGameId === "wingo-1m" && (
            <p className="text-sm text-muted-foreground">
              Win Go 1M continues using its existing fixed integration. Its observed connection status is shown in API &amp; Data Health.
            </p>
          )}
          {!hasConfiguredApi && selectedGameId !== "wingo-1m" && (
            <p className="text-sm text-amber-300">Configure a mapped API in Game Management before running a connection test.</p>
          )}

          {testResult && (
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Actual test result</h3>
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? "CONNECTED" : "FAILED"}
                </Badge>
              </div>
              {testResult.success ? (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">HTTP status</dt><dd className="mt-1">{testResult.httpStatus}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Mapped period</dt><dd className="mt-1 break-all font-mono">{testResult.mappedPeriod}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Mapped result</dt><dd className="mt-1 break-all font-mono">{JSON.stringify(testResult.mappedResult)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Source timestamp</dt><dd className="mt-1">{testResult.timestamp ? new Date(testResult.timestamp).toLocaleString() : "Not supplied"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Last successful sync</dt><dd className="mt-1">{testResult.lastSuccessfulSyncAt ? new Date(testResult.lastSuccessfulSyncAt).toLocaleString() : "Not yet recorded"}</dd></div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-destructive">{testResult.errorCategory}: {testResult.errorMessage}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

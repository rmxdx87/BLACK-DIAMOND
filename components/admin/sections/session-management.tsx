"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Check, CircleAlert, LoaderCircle, Plus, Radio, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { adminApiFetch } from "@/lib/admin-api-client"
import { type PlatformApiConfig, type PlatformGame, type PlatformSession } from "@/lib/platform/schemas"
import {
  buildApiConfig,
  EMPTY_API_CONFIG_DRAFT,
  PlatformApiConfigFields,
  type ApiConfigDraft,
} from "../platform-api-config-fields"

interface GameWithSessions {
  game: PlatformGame
  sessions: PlatformSession[]
}

interface GamesResponse {
  games: GameWithSessions[]
}

interface SessionTestResponse {
  test: {
    success: boolean
    mappedPeriod: string | null
    errorCategory?: string
    errorMessage?: string
  }
}

export function SessionManagement() {
  const [games, setGames] = useState<GameWithSessions[]>([])
  const [selectedGameId, setSelectedGameId] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [name, setName] = useState("")
  const [durationSeconds, setDurationSeconds] = useState("60")
  const [periodFormat, setPeriodFormat] = useState("Source-provided period ID")
  const [hasApiOverride, setHasApiOverride] = useState(false)
  const [apiDraft, setApiDraft] = useState<ApiConfigDraft>(EMPTY_API_CONFIG_DRAFT)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busySessionId, setBusySessionId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const fetchGames = useCallback(async () => {
    const response = await adminApiFetch<GamesResponse>("/api/admin/platform/games")
    if (!Array.isArray(response.games)) throw new Error("The session manager returned invalid data.")
    return response.games
  }, [])

  const loadGames = async () => {
    setIsLoading(true)
    setError("")
    try {
      const nextGames = await fetchGames()
      setGames(nextGames)
      setSelectedGameId((current) => current || nextGames[0]?.game.gameId || "")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load games.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void fetchGames()
      .then((nextGames) => {
        if (!active) return
        setGames(nextGames)
        setSelectedGameId((current) => current || nextGames[0]?.game.gameId || "")
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load games.")
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchGames])

  const selectedGame = games.find((item) => item.game.gameId === selectedGameId)?.game
  const sessions = games.find((item) => item.game.gameId === selectedGameId)?.sessions ?? []

  const createSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedGame) {
      setError("Choose an existing game before adding a session.")
      return
    }

    setIsSaving(true)
    setError("")
    setNotice("")
    try {
      let apiConfig: PlatformApiConfig | undefined
      if (hasApiOverride) apiConfig = buildApiConfig(apiDraft)

      const payload = {
        sessionId: sessionId.trim().toLowerCase(),
        gameId: selectedGame.gameId,
        name: name.trim(),
        durationSeconds: Number(durationSeconds),
        periodFormat: periodFormat.trim(),
        status: "inactive",
        published: false,
        ...(apiConfig ? { apiConfig } : {}),
      }

      await adminApiFetch(`/api/admin/platform/games/${encodeURIComponent(selectedGame.gameId)}/sessions`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
      setNotice("Session created as inactive. Test the API and activate/publish it when ready.")
      setSessionId("")
      setName("")
      setDurationSeconds("60")
      setHasApiOverride(false)
      setApiDraft(EMPTY_API_CONFIG_DRAFT)
      await loadGames()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create the session.")
    } finally {
      setIsSaving(false)
    }
  }

  const testSessionApi = async (session: PlatformSession) => {
    setBusySessionId(session.sessionId)
    setError("")
    setNotice("")
    try {
      const result = await adminApiFetch<SessionTestResponse>(
        `/api/admin/platform/games/${encodeURIComponent(selectedGameId)}/test-connection`,
        { method: "POST", body: JSON.stringify({ sessionId: session.sessionId }) },
      )
      if (result.test.success) setNotice(`Session API verified for period ${result.test.mappedPeriod}.`)
      else setError(`${result.test.errorCategory ?? "API"}: ${result.test.errorMessage ?? "Connection failed."}`)
      await loadGames()
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Session API test failed.")
    } finally {
      setBusySessionId(null)
    }
  }

  const updateSession = async (session: PlatformSession, patch: Partial<PlatformSession>) => {
    setBusySessionId(session.sessionId)
    setError("")
    setNotice("")
    try {
      await adminApiFetch(
        `/api/admin/platform/games/${encodeURIComponent(selectedGameId)}/sessions/${encodeURIComponent(session.sessionId)}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      )
      setNotice(patch.published === undefined ? "Session status updated." : patch.published ? "Session published." : "Session unpublished.")
      await loadGames()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update the session.")
    } finally {
      setBusySessionId(null)
    }
  }

  const deleteSession = async (session: PlatformSession) => {
    setBusySessionId(session.sessionId)
    setError("")
    setNotice("")
    try {
      await adminApiFetch(
        `/api/admin/platform/games/${encodeURIComponent(selectedGameId)}/sessions/${encodeURIComponent(session.sessionId)}`,
        { method: "DELETE" },
      )
      setNotice("Session deleted.")
      await loadGames()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the session.")
    } finally {
      setBusySessionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Game-specific schedules</p>
        <h2 className="mt-2 text-2xl font-semibold">Session management</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sessions are separate records scoped to a parent game. Period identifiers always come from the selected adapter.
        </p>
      </div>

      {error && <Alert variant="destructive"><CircleAlert className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <Alert><Check className="h-4 w-4" /><AlertDescription>{notice}</AlertDescription></Alert>}

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="text-base">Add a session to an existing game</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createSession} className="space-y-5">
            <label className="block space-y-1.5 text-xs text-muted-foreground">
              Parent game
              <select
                required
                value={selectedGameId}
                onChange={(event) => setSelectedGameId(event.target.value)}
                disabled={isLoading}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {games.map(({ game }) => <option key={game.gameId} value={game.gameId}>{game.name} · {game.gameId}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Session ID
                <Input required value={sessionId} onChange={(event) => setSessionId(event.target.value)} placeholder="3m" />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Session name
                <Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="3 Minutes" />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Duration (seconds)
                <Input required type="number" min={1} max={604800} value={durationSeconds} onChange={(event) => setDurationSeconds(event.target.value)} />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Period format description
                <Input required value={periodFormat} onChange={(event) => setPeriodFormat(event.target.value)} />
              </label>
            </div>
            {(selectedGame?.adapterType === "json-mapped" || selectedGame?.gameId === "wingo-1m") && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasApiOverride} onChange={(event) => setHasApiOverride(event.target.checked)} />
                  Use a session-specific API configuration
                </label>
                {hasApiOverride && <PlatformApiConfigFields value={apiDraft} onChange={setApiDraft} />}
              </div>
            )}
            <Button type="submit" disabled={isSaving || isLoading || !selectedGame}>
              {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add session
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Sessions for {selectedGame?.name ?? "selected game"}</h3>
          <Button size="sm" variant="outline" onClick={() => void loadGames()} disabled={isLoading}>Refresh</Button>
        </div>
        {sessions.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {sessions.map((session) => {
              const isBusy = busySessionId === session.sessionId
              const hasApi = selectedGame?.adapterType === "legacy-wingo-1m" || Boolean(session.apiConfig || selectedGame?.apiConfig)
              return (
                <Card key={session.sessionId} className="dashboard-card">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{session.name}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{session.sessionId} · {session.durationSeconds}s · {session.periodFormat}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{session.status}</Badge>
                        <Badge variant="outline">{session.apiStatus === "connected" ? "API verified" : session.apiStatus === "error" ? "API error" : "API unverified"}</Badge>
                        {session.published && <Badge className="bg-emerald-500/15 text-emerald-300">Published</Badge>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last successful sync: {session.lastSuccessfulSyncAt ? new Date(session.lastSuccessfulSyncAt).toLocaleString() : "Not yet verified"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {hasApi && (selectedGameId !== "wingo-1m" || Boolean(session.apiConfig)) && (
                        <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void testSessionApi(session)}>
                          <Radio className="mr-1 h-3.5 w-3.5" />Test connection
                        </Button>
                      )}
                      {session.sessionId !== "1m" || selectedGameId !== "wingo-1m" ? (
                        <>
                          <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void updateSession(session, {
                            status: session.status === "active" ? "inactive" : "active",
                          })}>
                            {session.status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" disabled={isBusy} onClick={() => void updateSession(session, { published: !session.published })}>
                            {session.published ? "Unpublish" : "Publish"}
                          </Button>
                          <Button size="sm" variant="destructive" disabled={isBusy} onClick={() => void deleteSession(session)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
                          </Button>
                        </>
                      ) : <Badge variant="outline">Protected legacy session</Badge>}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="dashboard-card p-6 text-sm text-muted-foreground">No sessions are configured for this game.</Card>
        )}
      </section>
    </div>
  )
}

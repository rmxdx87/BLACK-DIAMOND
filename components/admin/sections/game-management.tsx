"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Archive, Check, CircleAlert, LoaderCircle, Pencil, Plus, Radio, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { adminApiFetch } from "@/lib/admin-api-client"
import {
  GameCreateSchema,
  GameRecordSchema,
  SessionRecordSchema,
  type PlatformApiConfig,
  type PlatformGame,
  type PlatformSession,
} from "@/lib/platform/schemas"
import {
  buildApiConfig,
  EMPTY_API_CONFIG_DRAFT,
  PlatformApiConfigFields,
  toApiConfigDraft,
  type ApiConfigDraft,
} from "../platform-api-config-fields"

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
    errorCategory?: string
    errorMessage?: string
    lastSuccessfulSyncAt: number | null
  }
}

interface GameDraft {
  gameId: string
  name: string
  description: string
  category: string
  icon: string
  artworkUrl: string
  periodFormat: string
  resultFormat: "number" | "color_size" | "string" | "json"
  supportedResultValues: string
  status: PlatformGame["status"]
}

const EMPTY_GAME_DRAFT: GameDraft = {
  gameId: "",
  name: "",
  description: "",
  category: "",
  icon: "gamepad-2",
  artworkUrl: "",
  periodFormat: "Source-provided period ID",
  resultFormat: "number",
  supportedResultValues: "",
  status: "configuration_incomplete",
}

function isGameWithSessions(value: unknown): value is GameWithSessions {
  if (!value || typeof value !== "object" || !("game" in value) || !("sessions" in value)) return false
  return (
    GameRecordSchema.safeParse(value.game).success &&
    Array.isArray(value.sessions) &&
    value.sessions.every((session) => SessionRecordSchema.safeParse(session).success)
  )
}

async function fetchGames(): Promise<GameWithSessions[]> {
  const response = await adminApiFetch<GamesResponse>("/api/admin/platform/games")
  if (!Array.isArray(response.games) || !response.games.every(isGameWithSessions)) {
    throw new Error("The game manager returned invalid data.")
  }
  return response.games
}

function formatTime(value: number | null): string {
  return value ? new Date(value).toLocaleString() : "Not yet verified"
}

export function GameManagement() {
  const [games, setGames] = useState<GameWithSessions[]>([])
  const [draft, setDraft] = useState<GameDraft>(EMPTY_GAME_DRAFT)
  const [apiDraft, setApiDraft] = useState<ApiConfigDraft>(EMPTY_API_CONFIG_DRAFT)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busyGameId, setBusyGameId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadGames = async () => {
    setIsLoading(true)
    setError("")
    try {
      setGames(await fetchGames())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load games.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrent = true
    fetchGames()
      .then((loadedGames) => {
        if (isCurrent) setGames(loadedGames)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "Unable to load games.")
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  const beginEdit = (game: PlatformGame) => {
    if (game.gameId === "wingo-1m") return
    setEditingGameId(game.gameId)
    setDraft({
      gameId: game.gameId,
      name: game.name,
      description: game.description,
      category: game.category,
      icon: game.icon,
      artworkUrl: game.artworkUrl ?? "",
      periodFormat: game.periodFormat,
      resultFormat: game.resultFormat,
      supportedResultValues: game.supportedResultValues.join(", "),
      status: game.status,
    })
    setApiDraft(toApiConfigDraft(game.apiConfig))
    setNotice("")
    setError("")
  }

  const resetForm = () => {
    setEditingGameId(null)
    setDraft(EMPTY_GAME_DRAFT)
    setApiDraft(EMPTY_API_CONFIG_DRAFT)
  }

  const saveGame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError("")
    setNotice("")

    try {
      const apiConfig: PlatformApiConfig = buildApiConfig(apiDraft)
      const supportedResultValues = draft.supportedResultValues
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)

      if (editingGameId) {
        await adminApiFetch(`/api/admin/platform/games/${encodeURIComponent(editingGameId)}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: draft.name,
            description: draft.description,
            category: draft.category,
            icon: draft.icon,
            ...(draft.artworkUrl.trim() ? { artworkUrl: draft.artworkUrl.trim() } : {}),
            periodFormat: draft.periodFormat,
            resultFormat: draft.resultFormat,
            supportedResultValues,
            status: draft.status,
            apiConfig,
          }),
        })
        setNotice("Game configuration updated. Retest its API before publishing.")
      } else {
        const input = {
          gameId: draft.gameId.trim().toLowerCase(),
          slug: draft.gameId.trim().toLowerCase(),
          name: draft.name,
          description: draft.description,
          category: draft.category,
          icon: draft.icon,
          ...(draft.artworkUrl.trim() ? { artworkUrl: draft.artworkUrl.trim() } : {}),
          status: "configuration_incomplete" as const,
          published: false,
          adapterType: "json-mapped" as const,
          periodFormat: draft.periodFormat,
          resultFormat: draft.resultFormat,
          supportedResultValues,
          defaultSessionId: null,
          predictionMode: "system" as const,
          apiConfig,
        }
        const validation = GameCreateSchema.safeParse(input)
        if (!validation.success) throw new Error(validation.error.issues[0]?.message ?? "Invalid game configuration.")
        await adminApiFetch("/api/admin/platform/games", {
          method: "POST",
          body: JSON.stringify(validation.data),
        })
        setNotice("Game created as configuration-incomplete. Add a session and test its API before publishing.")
      }
      resetForm()
      await loadGames()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the game.")
    } finally {
      setIsSaving(false)
    }
  }

  const testConnection = async (gameId: string) => {
    setBusyGameId(gameId)
    setError("")
    setNotice("")
    try {
      const response = await adminApiFetch<TestResponse>(
        `/api/admin/platform/games/${encodeURIComponent(gameId)}/test-connection`,
        { method: "POST", body: JSON.stringify({}) },
      )
      if (response.test.success) {
        setNotice(`API verified for period ${response.test.mappedPeriod}.`)
      } else {
        setError(`${response.test.errorCategory ?? "API"}: ${response.test.errorMessage ?? "Connection failed."}`)
      }
      await loadGames()
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "API connection test failed.")
    } finally {
      setBusyGameId(null)
    }
  }

  const publishGame = async (item: GameWithSessions) => {
    setBusyGameId(item.game.gameId)
    setError("")
    setNotice("")
    try {
      await adminApiFetch(`/api/admin/platform/games/${encodeURIComponent(item.game.gameId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: item.game.published ? item.game.status : "active",
          published: !item.game.published,
        }),
      })
      setNotice(item.game.published ? "Game unpublished." : "Game published to the user catalog.")
      await loadGames()
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to change publication status.")
    } finally {
      setBusyGameId(null)
    }
  }

  const archiveGame = async (gameId: string) => {
    setBusyGameId(gameId)
    setError("")
    try {
      await adminApiFetch(`/api/admin/platform/games/${encodeURIComponent(gameId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived", published: false }),
      })
      setNotice("Game archived.")
      await loadGames()
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive the game.")
    } finally {
      setBusyGameId(null)
    }
  }

  const deleteGame = async (gameId: string) => {
    setBusyGameId(gameId)
    setError("")
    try {
      await adminApiFetch(`/api/admin/platform/games/${encodeURIComponent(gameId)}`, { method: "DELETE" })
      setNotice("Empty game configuration deleted.")
      await loadGames()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the game.")
    } finally {
      setBusyGameId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Platform configuration</p>
        <h2 className="mt-2 text-2xl font-semibold">Game management</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Game IDs are stable slugs. The legacy Win Go 1M entry remains protected and continues using its existing adapter.
        </p>
      </div>

      {error && <Alert variant="destructive"><CircleAlert className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <Alert><Check className="h-4 w-4" /><AlertDescription>{notice}</AlertDescription></Alert>}

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {editingGameId ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
            {editingGameId ? `Edit ${editingGameId}` : "Add a game"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveGame} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Game ID / slug
                <Input
                  required
                  disabled={Boolean(editingGameId)}
                  value={draft.gameId}
                  onChange={(event) => setDraft({ ...draft, gameId: event.target.value })}
                  placeholder="bingo-1m"
                />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Game name
                <Input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Category
                <Input required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Bingo" />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Icon name
                <Input value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Artwork URL (HTTPS)
                <Input type="url" value={draft.artworkUrl} onChange={(event) => setDraft({ ...draft, artworkUrl: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Period format description
                <Input required value={draft.periodFormat} onChange={(event) => setDraft({ ...draft, periodFormat: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Result format
                <select
                  value={draft.resultFormat}
                  onChange={(event) => setDraft({ ...draft, resultFormat: event.target.value as GameDraft["resultFormat"] })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="number">Number</option>
                  <option value="color_size">Colour and size</option>
                  <option value="string">String</option>
                  <option value="json">Structured JSON</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Supported result values (comma separated)
                <Input required value={draft.supportedResultValues} onChange={(event) => setDraft({ ...draft, supportedResultValues: event.target.value })} placeholder="0, 1, 2, 3" />
              </label>
              {editingGameId && (
                <label className="space-y-1.5 text-xs text-muted-foreground">
                  Configuration status
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value as GameDraft["status"] })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {["active", "inactive", "maintenance", "api_unavailable", "configuration_incomplete", "archived"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                  </select>
                </label>
              )}
            </div>
            <label className="block space-y-1.5 text-xs text-muted-foreground">
              Description
              <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={500} />
            </label>
            <PlatformApiConfigFields value={apiDraft} onChange={setApiDraft} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {editingGameId ? "Save changes" : "Create game"}
              </Button>
              {editingGameId && <Button type="button" variant="outline" onClick={resetForm}>Cancel edit</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Configured games</h3>
          <Button variant="outline" size="sm" onClick={() => void loadGames()} disabled={isLoading}>
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
        {isLoading ? (
          <Card className="dashboard-card p-6 text-sm text-muted-foreground">Loading saved game configurations…</Card>
        ) : games.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {games.map((item) => {
              const { game } = item
              const isBusy = busyGameId === game.gameId
              const hasVerifiedSessionApi = item.sessions.some((session) => session.apiStatus === "connected")
              const hasFailedSessionApi = item.sessions.some((session) => session.apiStatus === "error")
              const apiStatus =
                game.apiStatus === "connected"
                  ? "API verified"
                  : hasVerifiedSessionApi
                    ? "Session API verified"
                    : game.apiStatus === "error" || hasFailedSessionApi
                      ? "API error"
                      : "API unverified"
              const lastSuccessfulSyncAt = item.sessions.reduce<number | null>(
                (latest, session) =>
                  session.lastSuccessfulSyncAt !== null &&
                  (latest === null || session.lastSuccessfulSyncAt > latest)
                    ? session.lastSuccessfulSyncAt
                    : latest,
                game.lastSuccessfulSyncAt,
              )
              return (
                <Card key={game.gameId} className="dashboard-card">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-semibold">{game.name}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{game.gameId} · {game.category}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{game.status.replaceAll("_", " ")}</Badge>
                        <Badge variant="outline">{apiStatus}</Badge>
                        {game.published && <Badge className="bg-emerald-500/15 text-emerald-300">Published</Badge>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <span>Sessions: {item.sessions.length}</span>
                      <span>Adapter: {game.adapterType}</span>
                      <span className="col-span-2">Last successful sync: {formatTime(lastSuccessfulSyncAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {game.gameId !== "wingo-1m" && <Button size="sm" variant="outline" onClick={() => beginEdit(game)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}
                      {game.apiConfig && (
                        <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void testConnection(game.gameId)}>
                          <Radio className="mr-1 h-3.5 w-3.5" />Test API
                        </Button>
                      )}
                      {game.gameId !== "wingo-1m" && (
                        <>
                          <Button size="sm" variant={game.published ? "secondary" : "default"} disabled={isBusy} onClick={() => void publishGame(item)}>
                            {game.published ? "Unpublish" : "Publish"}
                          </Button>
                          <Button size="sm" variant="outline" disabled={isBusy || game.status === "archived"} onClick={() => void archiveGame(game.gameId)}>
                            <Archive className="mr-1 h-3.5 w-3.5" />Archive
                          </Button>
                          {item.sessions.length === 0 && (
                            <Button size="sm" variant="destructive" disabled={isBusy} onClick={() => void deleteGame(game.gameId)}>
                              <Trash2 className="mr-1 h-3.5 w-3.5" />Delete empty game
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="dashboard-card p-6 text-sm text-muted-foreground">No games were returned by the server.</Card>
        )}
      </section>
    </div>
  )
}

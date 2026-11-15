"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePlatformCatalog } from "@/hooks/use-platform-catalog"

interface GameSessionSelectorProps {
  selectedGameId: string
  selectedSessionId: string
  onChange: (gameId: string, sessionId: string) => void
}

const LEGACY_WIN_GO = {
  game: {
    gameId: "wingo-1m",
    name: "Win Go 1M",
    category: "Win Go",
    status: "active",
    apiStatus: "unknown",
    defaultSessionId: "1m",
  },
  sessions: [{ sessionId: "1m", name: "1 Minute", durationSeconds: 60, status: "active" }],
}

export function GameSessionSelector({
  selectedGameId,
  selectedSessionId,
  onChange,
}: GameSessionSelectorProps) {
  const { games, error, isLoading, refresh } = usePlatformCatalog()
  const catalogGames = games.length ? games : [LEGACY_WIN_GO]
  const selectedEntry = catalogGames.find((entry) => entry.game.gameId === selectedGameId)
  const currentGame = selectedEntry ?? LEGACY_WIN_GO
  const availableSessions = selectedEntry?.sessions ?? LEGACY_WIN_GO.sessions
  const currentSession =
    availableSessions.find((session) => session.sessionId === selectedSessionId) ?? availableSessions[0]

  const changeGame = (gameId: string) => {
    const nextGame = catalogGames.find((entry) => entry.game.gameId === gameId)
    const nextSession =
      nextGame?.sessions.find((session) => session.sessionId === nextGame.game.defaultSessionId) ??
      nextGame?.sessions[0]
    if (nextGame && nextSession) onChange(nextGame.game.gameId, nextSession.sessionId)
  }

  return (
    <section className="dashboard-card space-y-2.5 p-3 sm:p-4" aria-label="Game and session selector">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Game &amp; session</h2>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Refresh game catalog" onClick={() => void refresh()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 space-y-1 text-[10px] text-muted-foreground">
          Game
          <select
            value={currentGame.game.gameId}
            onChange={(event) => changeGame(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground sm:text-sm"
          >
            {catalogGames.map(({ game }) => (
              <option key={game.gameId} value={game.gameId}>{game.name}</option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1 text-[10px] text-muted-foreground">
          Session
          <select
            value={currentSession?.sessionId ?? ""}
            onChange={(event) => onChange(currentGame.game.gameId, event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground sm:text-sm"
          >
            {availableSessions.map((session) => (
              <option key={session.sessionId} value={session.sessionId}>
                {session.name} · {session.durationSeconds}s
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="status" className="text-xs text-amber-300">
          {error}
        </p>
      )}
    </section>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { GameRecordSchema, SessionRecordSchema, type PlatformGame, type PlatformSession } from "@/lib/platform/schemas"

export interface PublicGameWithSessions {
  game: PlatformGame
  sessions: PlatformSession[]
}

interface CatalogResponse {
  games: PublicGameWithSessions[]
  syncedAt: number
}

function isCatalogResponse(value: unknown): value is CatalogResponse {
  if (!value || typeof value !== "object" || !("games" in value) || !("syncedAt" in value)) return false
  const games: unknown = value.games
  if (!Array.isArray(games) || typeof value.syncedAt !== "number") return false

  return games.every((entry: unknown) => {
    if (!entry || typeof entry !== "object" || !("game" in entry) || !("sessions" in entry)) return false
    return (
      GameRecordSchema.safeParse(entry.game).success &&
      Array.isArray(entry.sessions) &&
      entry.sessions.every((session) => SessionRecordSchema.safeParse(session).success)
    )
  })
}

export function usePlatformCatalog() {
  const [games, setGames] = useState<PublicGameWithSessions[]>([])
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/platform/catalog", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(response.status === 503 ? "Dynamic game catalog is not configured on the server." : "Unable to load the published game catalog.")
      }
      const payload: unknown = await response.json()
      if (!isCatalogResponse(payload)) throw new Error("The published game catalog returned invalid data.")
      setGames(payload.games)
      setSyncedAt(payload.syncedAt)
      setError("")
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load the published game catalog.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return { games, syncedAt, error, isLoading, refresh }
}

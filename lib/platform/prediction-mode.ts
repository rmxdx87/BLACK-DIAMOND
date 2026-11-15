import type { PlatformGame, PlatformSession } from "./schemas"

export function getEffectivePredictionMode(
  game: Pick<PlatformGame, "predictionMode">,
  session: Pick<PlatformSession, "predictionMode">,
): "system" | "manual" {
  return session.predictionMode ?? game.predictionMode
}

export function hasLegacySystemPredictionPanel(gameId: string, sessionId: string): boolean {
  return gameId === "wingo-1m" && sessionId === "1m"
}

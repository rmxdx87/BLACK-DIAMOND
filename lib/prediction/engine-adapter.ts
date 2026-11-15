import { sizeFromNumber } from "../trend-pattern-engine.ts"
import type { GameResult } from "../types.ts"
import type { HistoricalResult, WingoColor, WingoSize } from "../../src/lib/prediction/engine.ts"

const API_COLORS: Record<GameResult["color"], WingoColor> = {
  red: "RED",
  green: "GREEN",
  violet: "VIOLET",
}

function comparePeriodIds(left: string, right: string): number {
  if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) {
    throw new Error("Historical period IDs must be numeric to sort chronologically")
  }

  const normalizedLeft = left.replace(/^0+(?=\d)/, "")
  const normalizedRight = right.replace(/^0+(?=\d)/, "")
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length - normalizedRight.length
  }
  return normalizedLeft.localeCompare(normalizedRight)
}

export function toHistoricalResults(results: readonly GameResult[]): HistoricalResult[] {
  return results
    .map((result) => {
      if (!/^\d+$/.test(result.period)) {
        throw new Error(`Invalid numeric source period: ${result.period}`)
      }

      const sourceColors = result.colors?.length ? result.colors : [result.color]
      const sourceColor = sourceColors[0]
      const sourceSize = sizeFromNumber(result.number)
      const size: WingoSize = sourceSize === "big" ? "BIG" : "SMALL"

      return {
        periodId: result.period,
        number: result.number,
        color: API_COLORS[sourceColor],
        colors: sourceColors.map((color) => API_COLORS[color]),
        size,
        ...(result.timestamp !== null && Number.isFinite(result.timestamp)
          ? { timestamp: result.timestamp }
          : {}),
      }
    })
    .sort((left, right) => comparePeriodIds(left.periodId, right.periodId))
}

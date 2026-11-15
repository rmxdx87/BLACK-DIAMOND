import type { PlatformPredictionRecord } from "./schemas"

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
  }
  return JSON.stringify(value) ?? "undefined"
}

export function evaluateManualPrediction(
  payload: PlatformPredictionRecord["predictionPayload"],
  actualResult: unknown,
): "WIN" | "LOSS" | "UNVERIFIED" {
  const comparisons: boolean[] = []
  let unavailableComparison = false
  const actual = isRecord(actualResult) ? actualResult : null
  const actualTokens = typeof actualResult === "string"
    ? actualResult.split(/[,+|]/).map((value) => value.trim()).filter(Boolean)
    : []

  if (payload.result !== undefined) comparisons.push(stableJson(payload.result) === stableJson(actualResult))

  if (payload.numberCandidates?.length) {
    const number =
      typeof actualResult === "number" || typeof actualResult === "string"
        ? String(actualResult)
        : actual && ("number" in actual || "value" in actual)
          ? String(actual.number ?? actual.value)
          : null
    if (number === null) unavailableComparison = true
    else comparisons.push(payload.numberCandidates.includes(number))
  }

  if (payload.colorCandidates?.length) {
    const color = actual && ("color" in actual || "colour" in actual)
      ? String(actual.color ?? actual.colour)
      : null
    if (color === null && actualTokens.length) {
      comparisons.push(payload.colorCandidates.some((candidate) => actualTokens.includes(candidate)))
    } else if (color === null) unavailableComparison = true
    else comparisons.push(payload.colorCandidates.includes(color))
  }

  if (payload.sizeCandidates?.length) {
    const size = actual && "size" in actual ? String(actual.size) : null
    if (size === null && actualTokens.length) {
      comparisons.push(payload.sizeCandidates.some((candidate) => actualTokens.includes(candidate)))
    } else if (size === null) unavailableComparison = true
    else comparisons.push(payload.sizeCandidates.includes(size))
  }

  if (!comparisons.length || unavailableComparison) return "UNVERIFIED"
  return comparisons.every(Boolean) ? "WIN" : "LOSS"
}

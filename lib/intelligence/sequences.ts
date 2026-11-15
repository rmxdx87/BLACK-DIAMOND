import type { GameResult } from "../types"
import { sizeFromNumber } from "../trend-pattern-engine.ts"

export type SequenceMarket = "number" | "size" | "colour-combination"

export interface SequenceNextOutcome {
  outcome: string
  count: number
  share: number
}

export interface HistoricalSequence {
  market: SequenceMarket
  contextLength: number
  context: readonly string[]
  historicalSupport: number
  nextOutcomes: readonly SequenceNextOutcome[]
  status: "supported" | "rare" | "unseen"
}

export interface ObservedPatternBreak {
  market: SequenceMarket
  previousOutcome: string
  previousStreakLength: number
  latestOutcome: string
  latestPeriod: string
  historicalSupport: number
  historicalBreaks: number
  historicalBreakRate: number | null
  status: "observed-break" | "continuing" | "insufficient-history"
}

export interface HistoricalSequenceAnalysis {
  targetPeriod: string | null
  dataCutoffPeriod: string | null
  includedRecordCount: number
  duplicatePeriodCount: number
  sequences: readonly HistoricalSequence[]
  patternBreaks: readonly ObservedPatternBreak[]
  limitations: readonly string[]
}

const COLOURS = ["red", "green", "violet"] as const
const MAX_CONTEXT_LENGTH = 6
const MIN_SUPPORTED_OCCURRENCES = 3

function comparePeriods(left: string, right: string): -1 | 0 | 1 | null {
  if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) return null
  const normalizedLeft = left.replace(/^0+(?=\d)/, "")
  const normalizedRight = right.replace(/^0+(?=\d)/, "")
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length < normalizedRight.length ? -1 : 1
  }
  if (normalizedLeft === normalizedRight) return 0
  return normalizedLeft < normalizedRight ? -1 : 1
}

function colourCombination(result: GameResult): string {
  const memberships = result.colors?.length ? result.colors : [result.color]
  return COLOURS.filter((colour) => memberships.includes(colour)).join("+")
}

function marketValues(records: readonly GameResult[], market: SequenceMarket): string[] {
  if (market === "number") return records.map((record) => String(record.number))
  if (market === "size") return records.map((record) => sizeFromNumber(record.number))
  return records.map(colourCombination)
}

function countHistoricalContexts(values: readonly string[], context: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>()
  const lastEligibleNextIndex = values.length - 1

  for (let start = 0; start + context.length < lastEligibleNextIndex; start++) {
    const matches = context.every((value, offset) => values[start + offset] === value)
    if (!matches) continue
    const nextOutcome = values[start + context.length]
    counts.set(nextOutcome, (counts.get(nextOutcome) ?? 0) + 1)
  }

  return counts
}

function analyzeSequence(market: SequenceMarket, values: readonly string[]): HistoricalSequence[] {
  const analyses: HistoricalSequence[] = []
  const maxLength = Math.min(MAX_CONTEXT_LENGTH, values.length - 1)

  for (let contextLength = 2; contextLength <= maxLength; contextLength++) {
    const context = values.slice(-contextLength)
    const counts = countHistoricalContexts(values, context)
    const historicalSupport = [...counts.values()].reduce((total, count) => total + count, 0)
    const nextOutcomes = [...counts.entries()]
      .map(([outcome, count]) => ({
        outcome,
        count,
        share: historicalSupport ? count / historicalSupport : 0,
      }))
      .sort((left, right) => right.count - left.count || left.outcome.localeCompare(right.outcome))

    analyses.push({
      market,
      contextLength,
      context,
      historicalSupport,
      nextOutcomes,
      status: historicalSupport >= MIN_SUPPORTED_OCCURRENCES
        ? "supported"
        : historicalSupport > 0
          ? "rare"
          : "unseen",
    })
  }

  return analyses
}

function analyzeLatestBreak(
  market: SequenceMarket,
  values: readonly string[],
  latestPeriod: string,
): ObservedPatternBreak | null {
  if (values.length < 2) return null

  const latestOutcome = values.at(-1)!
  const previousOutcome = values.at(-2)!
  let previousStreakLength = 0
  for (let index = values.length - 2; index >= 0 && values[index] === previousOutcome; index--) {
    previousStreakLength++
  }

  const isObservedBreak = previousOutcome !== latestOutcome && previousStreakLength >= 2
  let historicalSupport = 0
  let historicalBreaks = 0

  if (previousStreakLength >= 2) {
    for (let nextIndex = previousStreakLength; nextIndex < values.length - 1; nextIndex++) {
      const contextStart = nextIndex - previousStreakLength
      const matchesStreak = values
        .slice(contextStart, nextIndex)
        .every((outcome) => outcome === previousOutcome)
      if (!matchesStreak) continue
      historicalSupport++
      if (values[nextIndex] !== previousOutcome) historicalBreaks++
    }
  }

  return {
    market,
    previousOutcome,
    previousStreakLength,
    latestOutcome,
    latestPeriod,
    historicalSupport,
    historicalBreaks,
    historicalBreakRate: historicalSupport ? historicalBreaks / historicalSupport : null,
    status: isObservedBreak
      ? "observed-break"
      : previousOutcome === latestOutcome
        ? "continuing"
        : "insufficient-history",
  }
}

export function analyzeHistoricalSequences(
  sourceRecords: readonly GameResult[],
  options: { targetPeriod?: string | null } = {},
): HistoricalSequenceAnalysis {
  const seenPeriods = new Set<string>()
  const eligible: GameResult[] = []
  let duplicatePeriodCount = 0

  for (const record of sourceRecords) {
    if (
      !record ||
      typeof record.period !== "string" ||
      !/^\d+$/.test(record.period) ||
      !Number.isInteger(record.number) ||
      record.number < 0 ||
      record.number > 9
    ) continue

    const comparison = options.targetPeriod
      ? comparePeriods(record.period, options.targetPeriod)
      : -1
    if (comparison === null || comparison >= 0) continue
    if (seenPeriods.has(record.period)) {
      duplicatePeriodCount++
      continue
    }
    seenPeriods.add(record.period)
    eligible.push(record)
  }

  eligible.sort((left, right) => comparePeriods(left.period, right.period) ?? 0)
  const markets: readonly SequenceMarket[] = ["number", "size", "colour-combination"]
  const sequences = markets.flatMap((market) => analyzeSequence(market, marketValues(eligible, market)))
  const latestPeriod = eligible.at(-1)?.period
  const patternBreaks = latestPeriod
    ? markets.flatMap((market) => {
        const insight = analyzeLatestBreak(market, marketValues(eligible, market), latestPeriod)
        return insight ? [insight] : []
      })
    : []
  const limitations: string[] = []

  if (eligible.length < 30) {
    limitations.push("Fewer than 30 eligible completed records are loaded; sequence evidence is exploratory.")
  }
  if (duplicatePeriodCount) {
    limitations.push(`${duplicatePeriodCount} duplicate period record(s) were excluded.`)
  }
  if (options.targetPeriod && eligible.some((record) => comparePeriods(record.period, options.targetPeriod!) === 0)) {
    limitations.push("The target period and later records were excluded from sequence analysis.")
  }
  limitations.push("Observed sequences and breaks are descriptive; they do not establish future outcomes.")

  return {
    targetPeriod: options.targetPeriod ?? null,
    dataCutoffPeriod: eligible.at(-1)?.period ?? null,
    includedRecordCount: eligible.length,
    duplicatePeriodCount,
    sequences,
    patternBreaks,
    limitations,
  }
}

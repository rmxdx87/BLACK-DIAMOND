import type { GameResult } from "../types"
import type { FeatureEvidence, ResearchColor, ResearchMarket } from "./contracts"

const COLORS: readonly ResearchColor[] = ["red", "green", "violet"]
const NUMBERS = Array.from({ length: 10 }, (_, number) => String(number))

export interface CategoricalDistribution {
  counts: Readonly<Record<string, number>>
  shares: Readonly<Record<string, number | null>>
  sampleSize: number
  entropy: number | null
}

export interface HistoricalFeatureSnapshot {
  targetPeriod: string
  dataCutoffPeriod: string | null
  sourceRecordCount: number
  includedRecordCount: number
  excludedTargetOrFutureCount: number
  incomparablePeriodCount: number
  duplicatePeriodCount: number
  requestedWindowSize: number
  features: {
    numberDistribution: FeatureEvidence<CategoricalDistribution>
    numberRecencyDistribution: FeatureEvidence<CategoricalDistribution>
    numberGaps: FeatureEvidence<Readonly<Record<string, number | null>>>
    numberStreaks: FeatureEvidence<Readonly<Record<string, number>>>
    numberTransitions: FeatureEvidence<Readonly<Record<string, Readonly<Record<string, number>>>>>
    colorMembershipDistribution: FeatureEvidence<CategoricalDistribution>
    colorCombinationDistribution: FeatureEvidence<CategoricalDistribution>
    colorTransitions: FeatureEvidence<Readonly<Record<string, Readonly<Record<string, number>>>>>
    bigSmallDistribution: FeatureEvidence<CategoricalDistribution> | null
    numberStatistics: FeatureEvidence<{
      mean: number | null
      variance: number | null
      standardDeviation: number | null
      lagOneAutocorrelation: number | null
    }>
    numberColorMutualInformation: FeatureEvidence<{ nats: number | null }>
    numberDistributionDrift: FeatureEvidence<{ totalVariation: number | null }>
    repeatedNumberPatternSupport: FeatureEvidence<{
      pattern: readonly number[]
      occurrenceCount: number
      followingNumbers: Readonly<Record<string, number>>
    }>
  }
}

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

function getColorMemberships(result: GameResult): ResearchColor[] {
  const memberships = result.colors?.length ? result.colors : [result.color]
  return COLORS.filter((color) => memberships.includes(color))
}

function getColorCombination(result: GameResult): string {
  return getColorMemberships(result).join("+")
}

function distribution(values: readonly string[], universe: readonly string[] = []): CategoricalDistribution {
  const counts: Record<string, number> = Object.fromEntries(universe.map((value) => [value, 0]))
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1

  const sampleSize = values.length
  const shares = Object.fromEntries(
    Object.entries(counts).map(([value, count]) => [value, sampleSize ? count / sampleSize : null]),
  )
  const entropy = sampleSize
    ? -Object.values(counts).reduce((total, count) => {
        if (!count) return total
        const probability = count / sampleSize
        return total + probability * Math.log(probability)
      }, 0)
    : null

  return { counts, shares, sampleSize, entropy }
}

function recencyDistribution(valuesNewestFirst: readonly string[], decay: number, universe: readonly string[]): CategoricalDistribution {
  if (!(decay > 0 && decay <= 1)) throw new RangeError("Recency decay must be greater than 0 and at most 1")
  const counts: Record<string, number> = Object.fromEntries(universe.map((value) => [value, 0]))
  let totalWeight = 0

  valuesNewestFirst.forEach((value, age) => {
    const weight = decay ** age
    counts[value] = (counts[value] ?? 0) + weight
    totalWeight += weight
  })

  const shares = Object.fromEntries(
    Object.entries(counts).map(([value, count]) => [value, totalWeight ? count / totalWeight : null]),
  )
  const nonZeroShares = Object.values(shares).filter(
    (probability): probability is number => probability !== null && probability !== 0,
  )
  const entropy = totalWeight
    ? -nonZeroShares.reduce((total, probability) => total + probability * Math.log(probability), 0)
    : null

  return { counts, shares, sampleSize: valuesNewestFirst.length, entropy }
}

function gapsSinceOccurrence(valuesNewestFirst: readonly string[], universe: readonly string[]): Record<string, number | null> {
  return Object.fromEntries(universe.map((outcome) => [
    outcome,
    valuesNewestFirst.indexOf(outcome) < 0 ? null : valuesNewestFirst.indexOf(outcome),
  ]))
}

function currentStreaks(valuesNewestFirst: readonly string[], universe: readonly string[]): Record<string, number> {
  return Object.fromEntries(universe.map((outcome) => {
    let length = 0
    for (const value of valuesNewestFirst) {
      if (value !== outcome) break
      length++
    }
    return [outcome, length]
  }))
}

function transitionCounts(valuesChronological: readonly string[], universe: readonly string[]): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = Object.fromEntries(
    universe.map((from) => [from, Object.fromEntries(universe.map((to) => [to, 0]))]),
  )
  for (let index = 1; index < valuesChronological.length; index++) {
    const from = valuesChronological[index - 1]
    const to = valuesChronological[index]
    if (matrix[from] && matrix[from][to] !== undefined) matrix[from][to]++
  }
  return matrix
}

function lagOneAutocorrelation(values: readonly number[]): number | null {
  if (values.length < 3) return null
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const denominator = values.reduce((sum, value) => sum + (value - mean) ** 2, 0)
  if (denominator === 0) return null
  const numerator = values.slice(1).reduce(
    (sum, value, index) => sum + (values[index] - mean) * (value - mean),
    0,
  )
  return numerator / denominator
}

function mutualInformation(left: readonly string[], right: readonly string[]): number | null {
  if (left.length !== right.length || left.length === 0) return null
  const leftCounts = new Map<string, number>()
  const rightCounts = new Map<string, number>()
  const pairCounts = new Map<string, number>()

  for (let index = 0; index < left.length; index++) {
    leftCounts.set(left[index], (leftCounts.get(left[index]) ?? 0) + 1)
    rightCounts.set(right[index], (rightCounts.get(right[index]) ?? 0) + 1)
    const pair = JSON.stringify([left[index], right[index]])
    pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1)
  }

  let information = 0
  for (const [pair, pairCount] of pairCounts) {
    const [leftValue, rightValue] = JSON.parse(pair) as [string, string]
    const jointProbability = pairCount / left.length
    const independentProbability =
      ((leftCounts.get(leftValue) ?? 0) / left.length) *
      ((rightCounts.get(rightValue) ?? 0) / right.length)
    information += jointProbability * Math.log(jointProbability / independentProbability)
  }
  return information
}

function totalVariation(left: readonly string[], right: readonly string[]): number | null {
  if (left.length < 5 || right.length < 5) return null
  const categories = new Set([...left, ...right])
  let distance = 0
  for (const category of categories) {
    const leftShare = left.filter((value) => value === category).length / left.length
    const rightShare = right.filter((value) => value === category).length / right.length
    distance += Math.abs(leftShare - rightShare)
  }
  return distance / 2
}

function repeatedPatternSupport(values: readonly number[]): {
  pattern: number[]
  occurrenceCount: number
  followingNumbers: Record<string, number>
} {
  const patternLength = 2
  const pattern = values.slice(-patternLength)
  const followingNumbers: Record<string, number> = Object.fromEntries(NUMBERS.map((number) => [number, 0]))
  let occurrenceCount = 0

  if (pattern.length === patternLength) {
    for (let start = 0; start + patternLength < values.length - patternLength; start++) {
      if (pattern.every((number, offset) => values[start + offset] === number)) {
        const following = String(values[start + patternLength])
        followingNumbers[following]++
        occurrenceCount++
      }
    }
  }

  return { pattern, occurrenceCount, followingNumbers }
}

function evidence<T>(
  feature: string,
  market: ResearchMarket,
  value: T,
  windowSize: number,
  sampleSize: number,
  dataCutoffPeriod: string | null,
  limitations: readonly string[] = [],
): FeatureEvidence<T> {
  return {
    feature,
    market,
    value,
    windowSize,
    sampleSize,
    dataCutoffPeriod,
    limitations: dataCutoffPeriod ? limitations : [...limitations, "No eligible historical data before the target period."],
  }
}

export function buildHistoricalFeatureSnapshot(
  sourceRecords: readonly GameResult[],
  targetPeriod: string,
  options: { windowSize?: number; bigSmallRuleVerified?: boolean; recencyDecay?: number } = {},
): HistoricalFeatureSnapshot {
  const requestedWindowSize = options.windowSize ?? 100
  if (!Number.isInteger(requestedWindowSize) || requestedWindowSize < 1) {
    throw new RangeError("Feature window size must be a positive integer")
  }

  const eligible: GameResult[] = []
  const seenPeriods = new Set<string>()
  let excludedTargetOrFutureCount = 0
  let incomparablePeriodCount = 0
  let duplicatePeriodCount = 0

  for (const record of sourceRecords) {
    const comparison = comparePeriods(record.period, targetPeriod)
    if (comparison === null) {
      incomparablePeriodCount++
      continue
    }
    if (comparison >= 0) {
      excludedTargetOrFutureCount++
      continue
    }
    if (seenPeriods.has(record.period)) {
      duplicatePeriodCount++
      continue
    }
    seenPeriods.add(record.period)
    eligible.push(record)
  }

  eligible.sort((left, right) => comparePeriods(left.period, right.period) ?? 0)
  const selected = eligible.slice(-requestedWindowSize)
  const newestFirst = [...selected].reverse()
  const dataCutoffPeriod = selected.at(-1)?.period ?? null
  const numbers = selected.map((record) => record.number)
  const numberStrings = numbers.map(String)
  const colorMemberships = selected.flatMap(getColorMemberships)
  const colorCombinations = selected.map(getColorCombination)
  const sizes = selected
    .map((record) => record.size)
    .filter((size): size is "big" | "small" => size === "big" || size === "small")
  const previousWindow = eligible.slice(Math.max(0, eligible.length - requestedWindowSize * 2), Math.max(0, eligible.length - requestedWindowSize))
  const previousNumbers = previousWindow.map((record) => String(record.number))
  const currentNumbers = selected.map((record) => String(record.number))
  const limitations: string[] = []

  if (incomparablePeriodCount) limitations.push(`${incomparablePeriodCount} record(s) had period identifiers that could not be ordered and were excluded.`)
  if (excludedTargetOrFutureCount) limitations.push(`${excludedTargetOrFutureCount} target-or-future record(s) were excluded to prevent look-ahead.`)
  if (duplicatePeriodCount) limitations.push(`${duplicatePeriodCount} duplicate period record(s) were excluded.`)

  const numberDistribution = distribution(numberStrings, NUMBERS)
  const colorMembershipDistribution = distribution(colorMemberships, COLORS)
  const colorCombinationUniverse = [...new Set(colorCombinations)].sort()
  const colorCombinationDistribution = distribution(colorCombinations, colorCombinationUniverse)
  const numberMean = numbers.length ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : null
  const numberVariance = numberMean === null
    ? null
    : numbers.reduce((sum, number) => sum + (number - numberMean) ** 2, 0) / numbers.length
  const pairedLimitations = selected.length < 5
    ? ["Fewer than five records are available; estimates are descriptive only."]
    : []
  const dataCutoffLimitations = dataCutoffPeriod ? limitations : [...limitations, "No eligible historical data before the target period."]
  const bigSmallDistribution = options.bigSmallRuleVerified
    ? evidence(
        "bigSmall.frequency",
        "bigSmall",
        distribution(sizes, ["big", "small"]),
        requestedWindowSize,
        sizes.length,
        dataCutoffPeriod,
        sizes.length ? limitations : [...limitations, "No verified Big/Small observations are available."],
      )
    : null
  const repeatedPattern = repeatedPatternSupport(numbers)

  return {
    targetPeriod,
    dataCutoffPeriod,
    sourceRecordCount: sourceRecords.length,
    includedRecordCount: selected.length,
    excludedTargetOrFutureCount,
    incomparablePeriodCount,
    duplicatePeriodCount,
    requestedWindowSize,
    features: {
      numberDistribution: evidence(
        "number.frequency",
        "number",
        numberDistribution,
        requestedWindowSize,
        numbers.length,
        dataCutoffPeriod,
        dataCutoffLimitations,
      ),
      numberRecencyDistribution: evidence(
        "number.recency_weighted_frequency",
        "number",
        recencyDistribution(newestFirst.map((record) => String(record.number)), options.recencyDecay ?? 0.95, NUMBERS),
        requestedWindowSize,
        numbers.length,
        dataCutoffPeriod,
        dataCutoffLimitations,
      ),
      numberGaps: evidence(
        "number.gap",
        "number",
        gapsSinceOccurrence(numberStrings.slice().reverse(), NUMBERS),
        requestedWindowSize,
        numbers.length,
        dataCutoffPeriod,
        dataCutoffLimitations,
      ),
      numberStreaks: evidence(
        "number.streak",
        "number",
        currentStreaks(numberStrings.slice().reverse(), NUMBERS),
        requestedWindowSize,
        numbers.length,
        dataCutoffPeriod,
        dataCutoffLimitations,
      ),
      numberTransitions: evidence(
        "number.transition",
        "number",
        transitionCounts(numberStrings, NUMBERS),
        requestedWindowSize,
        Math.max(0, numbers.length - 1),
        dataCutoffPeriod,
        dataCutoffLimitations,
      ),
      colorMembershipDistribution: evidence(
        "colour.membership_frequency",
        "colour",
        colorMembershipDistribution,
        requestedWindowSize,
        selected.length,
        dataCutoffPeriod,
        [...dataCutoffLimitations, "Membership counts can exceed the result count when source outcomes contain multiple colours."],
      ),
      colorCombinationDistribution: evidence(
        "colour.exact_combination_frequency",
        "colour",
        colorCombinationDistribution,
        requestedWindowSize,
        colorCombinations.length,
        dataCutoffPeriod,
        dataCutoffLimitations,
      ),
      colorTransitions: evidence(
        "colour.exact_combination_transition",
        "colour",
        transitionCounts(colorCombinations, colorCombinationUniverse),
        requestedWindowSize,
        Math.max(0, colorCombinations.length - 1),
        dataCutoffPeriod,
        dataCutoffLimitations,
      ),
      bigSmallDistribution,
      numberStatistics: evidence(
        "number.distribution_statistics",
        "number",
        {
          mean: numberMean,
          variance: numberVariance,
          standardDeviation: numberVariance === null ? null : Math.sqrt(numberVariance),
          lagOneAutocorrelation: lagOneAutocorrelation(numbers),
        },
        requestedWindowSize,
        numbers.length,
        dataCutoffPeriod,
        [...dataCutoffLimitations, ...pairedLimitations],
      ),
      numberColorMutualInformation: evidence(
        "number_colour.mutual_information",
        "number",
        { nats: mutualInformation(numberStrings, colorCombinations) },
        requestedWindowSize,
        selected.length,
        dataCutoffPeriod,
        [...dataCutoffLimitations, ...pairedLimitations],
      ),
      numberDistributionDrift: evidence(
        "number.distribution_drift",
        "number",
        { totalVariation: totalVariation(currentNumbers, previousNumbers) },
        requestedWindowSize,
        Math.min(currentNumbers.length, previousNumbers.length),
        dataCutoffPeriod,
        [...dataCutoffLimitations, "Drift compares adjacent windows and does not establish predictive power."],
      ),
      repeatedNumberPatternSupport: evidence(
        "number.repeated_pair_support",
        "number",
        repeatedPattern,
        requestedWindowSize,
        repeatedPattern.occurrenceCount,
        dataCutoffPeriod,
        [...dataCutoffLimitations, "Only completed historical occurrences are counted; this is descriptive, not a forecast guarantee."],
      ),
    },
  }
}

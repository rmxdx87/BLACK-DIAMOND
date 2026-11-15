import type { GameResult } from "./types"
import {
  PATTERN_FAMILY_CONFIG,
  PATTERN_PROFILE_ORDER,
  TREND_PATTERN_COUNT,
  createPatternRegistry,
  type PatternCategory,
  type PatternDefinition,
  type PatternOverrides,
} from "./trend-pattern-registry.ts"

const NUMBERS = Array.from({ length: 10 }, (_, number) => number)
const COLORS = ["red", "green", "violet"] as const
const SIZES = ["small", "big"] as const
const RECENCY_DECAY = 0.95
const MIN_CALIBRATION_FORECASTS = 30

export type TrendColor = (typeof COLORS)[number]
export type TrendSize = (typeof SIZES)[number]
export type NumberColorMapping = Readonly<Record<number, readonly TrendColor[]>>

export interface PatternOutcomeEvidence {
  signal: number | null
  rawValue: number | null
  baseline: number | null
  sampleCount: number
  dataSufficiency: "sufficient" | "insufficient_support" | "insufficient_window" | "disabled" | "diagnostic"
}

export interface PatternEvaluation {
  patternId: string
  patternName: string
  category: PatternCategory
  featureType: string
  market: "number" | "colour" | "size" | "cross"
  lookbackWindow: number
  threshold: number
  profile: PatternDefinition["profile"]
  enabled: boolean
  weight: number
  signal: number | null
  confidence: number | null
  sampleCount: number
  candidateNumber: number | null
  outcome: string | null
  direction: "positive" | "negative" | "neutral" | "watchlist" | "diagnostic" | "insufficient"
  dataSufficiency: PatternOutcomeEvidence["dataSufficiency"]
  outcomeSignals: Readonly<Record<string, PatternOutcomeEvidence>>
}

export interface TrendOutcomeRanking {
  outcome: string
  score: number | null
  supportingPatternCount: number
  opposingPatternCount: number
  signalAgreement: number | null
}

export interface NumberCandidateRanking extends TrendOutcomeRanking {
  number: number
  mappedColours: readonly TrendColor[] | null
  size: TrendSize
  historicalSampleCount: number
  calibratedConfidence: number | null
}

export interface NumberTrendSummary {
  counts: Readonly<Record<number, number>>
  shares: Readonly<Record<number, number | null>>
  momentum: Readonly<Record<number, number | null>>
  gaps: Readonly<Record<number, number | null>>
  hotNumbers: readonly number[]
  coldNumbers: readonly number[]
  overdueNumbers: readonly number[]
  currentStreak: { number: number; length: number } | null
  sampleCount: number
}

export interface ColourTrendPoint {
  colour: TrendColor
  membershipCount: number
  shareOfResults: number | null
  recentMomentum: number | null
  currentStreak: number
  nextMembershipRate: number | null
  transitionSupport: number
}

export interface ColourTrendSummary {
  outcomes: readonly ColourTrendPoint[]
  combinedOutcomeCounts: Readonly<Record<string, number>>
  sampleCount: number
  latestMemberships: readonly TrendColor[]
}

export interface SizeTrendPoint {
  size: TrendSize
  count: number
  share: number | null
  currentStreak: number
  nextTransitionRate: number | null
  transitionSupport: number
}

export interface SizeTrendSummary {
  outcomes: readonly SizeTrendPoint[]
  sampleCount: number
  latestSize: TrendSize | null
}

export interface TrendPatternAnalysis {
  targetPeriod: string | null
  dataCutoffPeriod: string | null
  sourceRecordCount: number
  includedRecordCount: number
  excludedTargetOrFutureCount: number
  invalidRecordCount: number
  duplicatePeriodCount: number
  patternCount: number
  activePatternCount: number
  disabledPatternCount: number
  evaluatedPatternCount: number
  rankings: readonly NumberCandidateRanking[]
  topThree: readonly NumberCandidateRanking[]
  colourRankings: readonly TrendOutcomeRanking[]
  sizeRankings: readonly TrendOutcomeRanking[]
  numberTrends: NumberTrendSummary
  colourTrends: ColourTrendSummary
  sizeTrends: SizeTrendSummary
  evaluations: readonly PatternEvaluation[]
  lowConfidence: boolean
  limitations: readonly string[]
}

export interface BacktestMetric {
  predictions: number
  hits: number
  accuracy: number | null
}

export interface PatternBacktestPerformance extends BacktestMetric {
  patternId: string
  category: PatternCategory
  lookbackWindow: number
}

export interface WalkForwardBacktest {
  requestedHistoryCount: number
  evaluatedForecasts: number
  skippedForecasts: number
  minimumTrainingRecords: number
  numberTop1: BacktestMetric
  numberTop3: BacktestMetric
  numberFrequencyBaselineTop1: BacktestMetric
  numberFrequencyBaselineTop3: BacktestMetric
  colourTop1Membership: BacktestMetric
  colourFrequencyBaselineTop1Membership: BacktestMetric
  sizeTop1: BacktestMetric
  sizeFrequencyBaselineTop1: BacktestMetric
  calibrationByRank: Readonly<Record<1 | 2 | 3, { sampleCount: number; hitRate: number | null }>>
  patternPerformance: Readonly<Record<string, PatternBacktestPerformance>>
  categoryPerformance: Readonly<Record<string, BacktestMetric>>
  windowPerformance: Readonly<Record<string, BacktestMetric>>
  limitations: readonly string[]
}

export interface WalkForwardBacktestOptions {
  minimumTrainingRecords?: number
  overrides?: PatternOverrides
  categoryWeights?: PatternCategoryWeights
  verifiedNumberColorMapping?: NumberColorMapping
  signal?: AbortSignal
}

interface PreparedHistory {
  records: GameResult[]
  excludedTargetOrFutureCount: number
  invalidRecordCount: number
  duplicatePeriodCount: number
  incomparablePeriodCount: number
}

interface RawOutcomeMetric {
  outcome: string
  rawValue: number
  supportCount: number
  baseline: number
}

interface FamilyWindowMetrics {
  outcomes: readonly RawOutcomeMetric[]
  sampleCount: number
  available: boolean
  diagnostic: boolean
}

interface CandidateAggregate extends TrendOutcomeRanking {
  clusters: number
}

interface NumberCandidateAggregate extends CandidateAggregate {
  number: number
}

export type PatternCategoryWeights = Partial<Record<PatternCategory, number>>

interface MutableMetric {
  predictions: number
  hits: number
}

function isSupportedColor(value: unknown): value is TrendColor {
  return typeof value === "string" && COLORS.includes(value as TrendColor)
}

function getColors(record: GameResult): TrendColor[] {
  const rawColors = Array.isArray(record.colors) && record.colors.length ? record.colors : [record.color]
  return [...new Set(rawColors.filter(isSupportedColor))]
}

function normalizePeriod(period: string): string {
  return period.replace(/^0+(?=\d)/, "")
}

function comparePeriods(left: string, right: string): -1 | 0 | 1 | null {
  if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) return null
  const normalizedLeft = normalizePeriod(left)
  const normalizedRight = normalizePeriod(right)
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length < normalizedRight.length ? -1 : 1
  }
  if (normalizedLeft === normalizedRight) return 0
  return normalizedLeft < normalizedRight ? -1 : 1
}

function prepareHistory(source: readonly GameResult[], targetPeriod: string | null): PreparedHistory {
  const records: GameResult[] = []
  const seenPeriods = new Set<string>()
  let excludedTargetOrFutureCount = 0
  let invalidRecordCount = 0
  let duplicatePeriodCount = 0
  let incomparablePeriodCount = 0

  for (const record of source) {
    if (
      !record ||
      typeof record.period !== "string" ||
      !/^\d+$/.test(record.period) ||
      !Number.isInteger(record.number) ||
      record.number < 0 ||
      record.number > 9
    ) {
      invalidRecordCount++
      continue
    }

    const colors = getColors(record)
    if (colors.length === 0) {
      invalidRecordCount++
      continue
    }

    if (targetPeriod !== null) {
      const comparison = comparePeriods(record.period, targetPeriod)
      if (comparison === null) {
        incomparablePeriodCount++
        continue
      }
      if (comparison >= 0) {
        excludedTargetOrFutureCount++
        continue
      }
    }

    const normalizedPeriod = normalizePeriod(record.period)
    if (seenPeriods.has(normalizedPeriod)) {
      duplicatePeriodCount++
      continue
    }
    seenPeriods.add(normalizedPeriod)

    records.push({ ...record, colors, color: colors[0] })
  }

  records.sort((left, right) => comparePeriods(left.period, right.period) ?? 0)
  return {
    records,
    excludedTargetOrFutureCount,
    invalidRecordCount,
    duplicatePeriodCount,
    incomparablePeriodCount,
  }
}

export function sizeFromNumber(number: number): TrendSize {
  if (!Number.isInteger(number) || number < 0 || number > 9) {
    throw new RangeError("WinGo number must be an integer from 0 through 9")
  }
  return number <= 4 ? "small" : "big"
}

function countValues(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1
  return counts
}

function currentRunLength<T>(values: readonly T[], predicate: (value: T) => boolean): number {
  if (!values.length) return 0
  const latest = predicate(values[values.length - 1])
  let count = 0
  for (let index = values.length - 1; index >= 0; index--) {
    if (predicate(values[index]) !== latest) break
    count++
  }
  return count
}

function contextTransitions<T>(
  values: readonly T[],
  contextMatches: (values: readonly T[], endIndex: number) => boolean,
  outcomeMatches: (value: T) => boolean,
): { support: number; successes: number } {
  let support = 0
  let successes = 0
  for (let endIndex = 0; endIndex < values.length - 1; endIndex++) {
    if (!contextMatches(values, endIndex)) continue
    support++
    if (outcomeMatches(values[endIndex + 1])) successes++
  }
  return { support, successes }
}

function smoothedRate(successes: number, support: number, outcomes: number): number {
  return (successes + 1) / (support + outcomes)
}

function entropyOfCounts(counts: readonly number[], sampleCount: number): number {
  if (!sampleCount) return 0
  return -counts.reduce((sum, count) => {
    if (!count) return sum
    const share = count / sampleCount
    return sum + share * Math.log(share)
  }, 0)
}

function isNeighbor(left: number, right: number): boolean {
  const difference = (right - left + 10) % 10
  return difference === 1 || difference === 9
}

function getPatternOutcomes(category: PatternCategory): string[] {
  const market = PATTERN_FAMILY_CONFIG[category].market
  if (market === "number" || market === "cross") return NUMBERS.map(String)
  if (market === "colour") return [...COLORS]
  return [...SIZES]
}

function makeMetric(outcome: string, rawValue: number, supportCount: number, baseline: number): RawOutcomeMetric {
  return { outcome, rawValue, supportCount, baseline }
}

function buildFamilyWindowMetrics(
  category: PatternCategory,
  records: readonly GameResult[],
  windowSize: number,
  cache: Map<string, FamilyWindowMetrics>,
): FamilyWindowMetrics {
  const cacheKey = `${category}:${windowSize}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  if (records.length < windowSize) {
    const unavailable = { outcomes: [], sampleCount: records.length, available: false, diagnostic: false }
    cache.set(cacheKey, unavailable)
    return unavailable
  }

  const window = records.slice(-windowSize)
  const numbers = window.map((record) => record.number)
  const sizes = numbers.map(sizeFromNumber)
  const colors = window.map(getColors)
  const numberCounts = countValues(numbers.map(String))
  const sizeCounts = countValues(sizes)
  const colorCounts = countValues(colors.flat())
  const numberMean = windowSize / 10
  const sizeMean = windowSize / 2
  const colorMembershipTotal = colors.reduce((total, memberships) => total + memberships.length, 0)
  const colorMean = colorMembershipTotal / COLORS.length
  const latestNumber = numbers[numbers.length - 1]
  const latestSize = sizes[sizes.length - 1]
  const latestColors = colors[colors.length - 1]
  const numberStreak = currentRunLength(numbers, (value) => value === latestNumber)
  const sizeStreak = currentRunLength(sizes, (value) => value === latestSize)
  const latestColorKey = latestColors.join("+")
  const numberTransitions = numbers.length - 1
  const output: RawOutcomeMetric[] = []
  let diagnostic = false

  if (category === "NUMBER_FREQUENCY") {
    for (const number of NUMBERS) output.push(makeMetric(String(number), numberCounts[number] ?? 0, numberCounts[number] ?? 0, numberMean))
  } else if (category === "NUMBER_COLDNESS") {
    diagnostic = true
    for (const number of NUMBERS) {
      const gap = numbers.slice().reverse().indexOf(number)
      output.push(makeMetric(String(number), gap < 0 ? windowSize : gap, windowSize, (windowSize - 1) / 10))
    }
  } else if (category === "NUMBER_MOMENTUM") {
    const split = Math.floor(window.length / 2)
    const older = numbers.slice(0, split)
    const recent = numbers.slice(split)
    for (const number of NUMBERS) {
      const recentShare = recent.length ? recent.filter((value) => value === number).length / recent.length : 0
      const olderShare = older.length ? older.filter((value) => value === number).length / older.length : 0
      output.push(makeMetric(String(number), recentShare - olderShare, window.length, 0))
    }
  } else if (category === "NUMBER_STREAK") {
    const contextual = contextTransitions(
      numbers,
      (values, index) => {
        if (values[index] !== latestNumber) return false
        let run = 1
        for (let cursor = index - 1; cursor >= 0 && values[cursor] === latestNumber; cursor--) run++
        return run === numberStreak
      },
      () => false,
    )
    for (const number of NUMBERS) {
      const transition = contextTransitions(
        numbers,
        (values, index) => {
          if (values[index] !== latestNumber) return false
          let run = 1
          for (let cursor = index - 1; cursor >= 0 && values[cursor] === latestNumber; cursor--) run++
          return run === numberStreak
        },
        (value) => value === number,
      )
      output.push(makeMetric(String(number), smoothedRate(transition.successes, transition.support, 10), transition.support, contextual.support ? contextual.successes / contextual.support : 0.1))
    }
  } else if (category === "NUMBER_GAP") {
    const gapCounts = Array.from({ length: 10 }, () => 0)
    for (let index = 0; index < numbers.length - 1; index++) {
      gapCounts[(numbers[index + 1] - numbers[index] + 10) % 10]++
    }
    for (const number of NUMBERS) {
      const gap = (number - latestNumber + 10) % 10
      output.push(makeMetric(String(number), smoothedRate(gapCounts[gap], numberTransitions, 10), numberTransitions, numberTransitions ? 1 / 10 : 0))
    }
  } else if (category === "NUMBER_PARITY") {
    const latestParity = latestNumber % 2
    const transitions = contextTransitions(
      numbers,
      (values, index) => values[index] % 2 === latestParity,
      (value) => value % 2 === latestParity,
    )
    for (const number of NUMBERS) {
      const candidateTransitions = contextTransitions(
        numbers,
        (values, index) => values[index] % 2 === latestParity,
        (value) => value % 2 === number % 2,
      )
      output.push(makeMetric(String(number), smoothedRate(candidateTransitions.successes, candidateTransitions.support, 2), candidateTransitions.support, transitions.support ? transitions.successes / transitions.support : 0.5))
    }
  } else if (category === "NUMBER_HALVES" || category === "SIZE_FREQUENCY") {
    const baseline = category === "NUMBER_HALVES" ? sizeMean : sizeMean
    for (const size of SIZES) output.push(makeMetric(size, sizeCounts[size] ?? 0, sizeCounts[size] ?? 0, baseline))
  } else if (category === "NUMBER_NEIGHBOUR") {
    for (const candidate of NUMBERS) {
      const transition = contextTransitions(
        numbers,
        (values, index) => isNeighbor(values[index], candidate),
        (value) => value === candidate,
      )
      output.push(makeMetric(String(candidate), smoothedRate(transition.successes, transition.support, 10), transition.support, 0.1))
    }
  } else if (category === "NUMBER_PAIR") {
    for (const candidate of NUMBERS) {
      const transition = contextTransitions(numbers, (values, index) => values[index] === latestNumber, (value) => value === candidate)
      output.push(makeMetric(String(candidate), smoothedRate(transition.successes, transition.support, 10), transition.support, 0.1))
    }
  } else if (category === "NUMBER_TRIPLET") {
    const latestPair = numbers.slice(-2)
    for (const candidate of NUMBERS) {
      const transition = contextTransitions(
        numbers,
        (values, index) => index > 0 && values[index - 1] === latestPair[0] && values[index] === latestPair[1],
        (value) => value === candidate,
      )
      output.push(makeMetric(String(candidate), smoothedRate(transition.successes, transition.support, 10), transition.support, 0.1))
    }
  } else if (category === "NUMBER_RECENCY") {
    for (const number of NUMBERS) {
      let weightedCount = 0
      let supportCount = 0
      numbers.forEach((value, index) => {
        if (value !== number) return
        supportCount++
        weightedCount += RECENCY_DECAY ** (numbers.length - 1 - index)
      })
      output.push(makeMetric(String(number), weightedCount, supportCount, window.reduce((sum, _, age) => sum + RECENCY_DECAY ** age, 0) / 10))
    }
  } else if (category === "NUMBER_ENTROPY") {
    diagnostic = true
    const entropy = entropyOfCounts(NUMBERS.map((number) => numberCounts[number] ?? 0), window.length)
    for (const number of NUMBERS) output.push(makeMetric(String(number), entropy, window.length, Math.log(10)))
  } else if (category === "COLOR_FREQUENCY") {
    for (const color of COLORS) output.push(makeMetric(color, colorCounts[color] ?? 0, colorCounts[color] ?? 0, colorMean))
  } else if (category === "COLOR_MOMENTUM") {
    const split = Math.floor(window.length / 2)
    const recent = colors.slice(split)
    const older = colors.slice(0, split)
    for (const color of COLORS) {
      const recentShare = recent.length ? recent.filter((memberships) => memberships.includes(color)).length / recent.length : 0
      const olderShare = older.length ? older.filter((memberships) => memberships.includes(color)).length / older.length : 0
      const support = colors.filter((memberships) => memberships.includes(color)).length
      output.push(makeMetric(color, recentShare - olderShare, support, 0))
    }
  } else if (category === "COLOR_STREAK") {
    for (const color of COLORS) {
      const statuses = colors.map((memberships) => memberships.includes(color))
      const latestStatus = statuses[statuses.length - 1]
      const runLength = currentRunLength(statuses, (value) => value === latestStatus)
      const transition = contextTransitions(
        statuses,
        (values, index) => {
          if (values[index] !== latestStatus) return false
          let run = 1
          for (let cursor = index - 1; cursor >= 0 && values[cursor] === latestStatus; cursor--) run++
          return run === runLength
        },
        (value) => value === latestStatus,
      )
      output.push(makeMetric(color, smoothedRate(transition.successes, transition.support, 2), transition.support, 0.5))
    }
  } else if (category === "COLOR_TRANSITION") {
    for (const color of COLORS) {
      const transition = contextTransitions(
        colors,
        (values, index) => values[index].slice().sort().join("+") === latestColorKey,
        (memberships) => memberships.includes(color),
      )
      output.push(makeMetric(color, smoothedRate(transition.successes, transition.support, 3), transition.support, 1 / 3))
    }
  } else if (category === "SIZE_STREAK" || category === "SIZE_TRANSITION") {
    const transitionSupport = contextTransitions(
      sizes,
      (values, index) => values[index] === latestSize,
      (value) => value === latestSize,
    )
    for (const size of SIZES) {
      let transition
      if (category === "SIZE_STREAK") {
        transition = contextTransitions(
          sizes,
          (values, index) => {
            if (values[index] !== latestSize) return false
            let run = 1
            for (let cursor = index - 1; cursor >= 0 && values[cursor] === latestSize; cursor--) run++
            return run === sizeStreak
          },
          (value) => value === size,
        )
      } else {
        transition = contextTransitions(sizes, (values, index) => values[index] === latestSize, (value) => value === size)
      }
      output.push(makeMetric(size, smoothedRate(transition.successes, transition.support, 2), transition.support, transitionSupport.support ? transitionSupport.successes / transitionSupport.support : 0.5))
    }
  } else if (category === "CROSS_FEATURE") {
    diagnostic = true
    for (const number of NUMBERS) {
      const numberShare = (numberCounts[number] ?? 0) / window.length
      const sizeShare = (sizeCounts[sizeFromNumber(number)] ?? 0) / window.length
      output.push(makeMetric(String(number), numberShare + sizeShare, window.length, 0.6))
    }
  }

  const metrics = { outcomes: output, sampleCount: window.length, available: true, diagnostic }
  cache.set(cacheKey, metrics)
  return metrics
}

function profileSignal(rawValue: number, metrics: readonly RawOutcomeMetric[], profile: PatternDefinition["profile"]): number {
  const values = metrics.map((metric) => metric.rawValue)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  if (!Number.isFinite(rawValue) || maximum === minimum) return 0

  const lessCount = values.filter((value) => value < rawValue).length
  const equalCount = values.filter((value) => value === rawValue).length
  const percentileRank = (lessCount + equalCount / 2) / Math.max(values.length, 1)
  const profileIndex = PATTERN_PROFILE_ORDER.indexOf(profile)
  const cutoff = (profileIndex + 0.5) / PATTERN_PROFILE_ORDER.length
  return Math.max(-1, Math.min(1, (percentileRank - cutoff) * 2))
}

function summarizePatternEvaluation(
  pattern: PatternDefinition,
  metrics: FamilyWindowMetrics,
): PatternEvaluation {
  const outcomeSignals: Record<string, PatternOutcomeEvidence> = {}
  const domainOutcomes = getPatternOutcomes(pattern.category)
  let strongestOutcome: string | null = null
  let strongestSignal: number | null = null
  let strongestSampleCount = 0

  const supportedMetrics = metrics.outcomes.length ? metrics.outcomes : domainOutcomes.map((outcome) => makeMetric(outcome, 0, 0, 0))
  for (const metric of supportedMetrics) {
    let dataSufficiency: PatternOutcomeEvidence["dataSufficiency"]
    let signal: number | null = null

    if (!pattern.enabled) {
      dataSufficiency = "disabled"
    } else if (!metrics.available) {
      dataSufficiency = "insufficient_window"
    } else if (metric.supportCount < pattern.threshold) {
      dataSufficiency = "insufficient_support"
    } else if (pattern.category === "NUMBER_COLDNESS" || pattern.category === "NUMBER_ENTROPY" || pattern.category === "CROSS_FEATURE") {
      dataSufficiency = "diagnostic"
      signal = 0
    } else {
      dataSufficiency = "sufficient"
      signal = profileSignal(metric.rawValue, metrics.outcomes, pattern.profile)
    }

    const evidence: PatternOutcomeEvidence = {
      signal,
      rawValue: metrics.available ? metric.rawValue : null,
      baseline: metrics.available ? metric.baseline : null,
      sampleCount: metric.supportCount,
      dataSufficiency,
    }
    outcomeSignals[metric.outcome] = evidence

    if (signal !== null && (strongestSignal === null || Math.abs(signal) > Math.abs(strongestSignal))) {
      strongestOutcome = metric.outcome
      strongestSignal = signal
      strongestSampleCount = evidence.sampleCount
    }
  }

  const parsedNumber = strongestOutcome !== null && /^\d$/.test(strongestOutcome)
    ? Number(strongestOutcome)
    : null
  const direction = strongestSignal === null
    ? "insufficient"
    : pattern.category === "NUMBER_COLDNESS"
      ? "watchlist"
      : pattern.category === "NUMBER_ENTROPY" || pattern.category === "CROSS_FEATURE"
        ? "diagnostic"
        : strongestSignal > 0.05
          ? "positive"
          : strongestSignal < -0.05
            ? "negative"
            : "neutral"
  const dataSufficiency = !pattern.enabled
    ? "disabled"
    : !metrics.available
      ? "insufficient_window"
      : strongestSignal === null
        ? "insufficient_support"
        : pattern.category === "NUMBER_COLDNESS" || pattern.category === "NUMBER_ENTROPY" || pattern.category === "CROSS_FEATURE"
          ? "diagnostic"
          : "sufficient"

  return {
    patternId: pattern.patternId,
    patternName: pattern.patternName,
    category: pattern.category,
    featureType: pattern.featureType,
    market: pattern.market,
    lookbackWindow: pattern.lookbackWindow,
    threshold: pattern.threshold,
    profile: pattern.profile,
    enabled: pattern.enabled,
    weight: pattern.weight,
    signal: strongestSignal,
    confidence: null,
    sampleCount: strongestSampleCount || metrics.sampleCount,
    candidateNumber: parsedNumber,
    outcome: strongestOutcome,
    direction,
    dataSufficiency,
    outcomeSignals,
  }
}

function getSignalForNumberCandidate(
  pattern: PatternDefinition,
  evaluation: PatternEvaluation,
  number: number,
  mapping?: NumberColorMapping,
): PatternOutcomeEvidence[] {
  if (pattern.market === "number") {
    const evidence = evaluation.outcomeSignals[String(number)]
    return evidence ? [evidence] : []
  }
  if (pattern.market === "size") {
    const evidence = evaluation.outcomeSignals[sizeFromNumber(number)]
    return evidence ? [evidence] : []
  }
  if (pattern.market === "colour" && mapping) {
    return (mapping[number] ?? [])
      .map((color) => evaluation.outcomeSignals[color])
      .filter((evidence): evidence is PatternOutcomeEvidence => Boolean(evidence))
  }
  return []
}

function average(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function scoreNumberCandidate(
  number: number,
  registry: readonly PatternDefinition[],
  evaluationById: ReadonlyMap<string, PatternEvaluation>,
  mapping?: NumberColorMapping,
  categoryWeights: PatternCategoryWeights = {},
): NumberCandidateAggregate {
  const familyTotals = new Map<PatternCategory, { weightedSignal: number; totalWeight: number }>()
  let supportingPatternCount = 0
  let opposingPatternCount = 0

  for (const pattern of registry) {
    const categoryWeight = categoryWeights[pattern.category] ?? 1
    const contributes = pattern.contributesToNumberRanking || (pattern.market === "colour" && Boolean(mapping))
    if (!pattern.enabled || !contributes || pattern.weight === 0 || categoryWeight === 0) continue
    const evaluation = evaluationById.get(pattern.patternId)
    if (!evaluation) continue
    const evidence = getSignalForNumberCandidate(pattern, evaluation, number, mapping)
      .filter((item) => item.signal !== null && item.dataSufficiency === "sufficient")
    const signal = average(evidence.map((item) => item.signal as number))
    if (signal === null) continue

    const family = familyTotals.get(pattern.category) ?? { weightedSignal: 0, totalWeight: 0 }
    family.weightedSignal += signal * pattern.weight
    family.totalWeight += pattern.weight
    familyTotals.set(pattern.category, family)

    if (signal > 0.05) supportingPatternCount++
    else if (signal < -0.05) opposingPatternCount++
  }

  const clusterTotals = new Map<string, { weightedSignal: number; totalWeight: number }>()
  for (const [category, family] of familyTotals) {
    const config = PATTERN_FAMILY_CONFIG[category]
    const familyWeight = categoryWeights[category] ?? 1
    if (!family.totalWeight || familyWeight === 0) continue
    const cluster = clusterTotals.get(config.scoringCluster) ?? { weightedSignal: 0, totalWeight: 0 }
    cluster.weightedSignal += (family.weightedSignal / family.totalWeight) * familyWeight
    cluster.totalWeight += familyWeight
    clusterTotals.set(config.scoringCluster, cluster)
  }
  const clusterScores = [...clusterTotals.values()]
    .map((cluster) => cluster.totalWeight ? cluster.weightedSignal / cluster.totalWeight : null)
    .filter((score): score is number => score !== null)
  const score = average(clusterScores)
  const decisiveSignals = supportingPatternCount + opposingPatternCount

  return {
    outcome: String(number),
    number,
    score,
    clusters: clusterScores.length,
    supportingPatternCount,
    opposingPatternCount,
    signalAgreement: decisiveSignals ? supportingPatternCount / decisiveSignals : null,
  }
}

function scoreMarketOutcomes(
  market: "colour" | "size",
  outcomes: readonly string[],
  registry: readonly PatternDefinition[],
  evaluationById: ReadonlyMap<string, PatternEvaluation>,
  categoryWeights: PatternCategoryWeights = {},
): TrendOutcomeRanking[] {
  const ranked: CandidateAggregate[] = outcomes.map((outcome) => {
    const familyTotals = new Map<PatternCategory, { weightedSignal: number; totalWeight: number }>()
    let supportingPatternCount = 0
    let opposingPatternCount = 0

    for (const pattern of registry) {
      const categoryWeight = categoryWeights[pattern.category] ?? 1
      if (!pattern.enabled || pattern.weight === 0 || categoryWeight === 0) continue
      const evaluation = evaluationById.get(pattern.patternId)
      if (!evaluation) continue

      let evidence: PatternOutcomeEvidence[] = []
      if (pattern.market === market) {
        const found = evaluation.outcomeSignals[outcome]
        if (found) evidence = [found]
      }

      const eligible = evidence.filter((item) => item.signal !== null && item.dataSufficiency === "sufficient")
      const signal = average(eligible.map((item) => item.signal as number))
      if (signal === null) continue

      const family = familyTotals.get(pattern.category) ?? { weightedSignal: 0, totalWeight: 0 }
      family.weightedSignal += signal * pattern.weight
      family.totalWeight += pattern.weight
      familyTotals.set(pattern.category, family)

      if (signal > 0.05) supportingPatternCount++
      else if (signal < -0.05) opposingPatternCount++
    }

    const clusterTotals = new Map<string, { weightedSignal: number; totalWeight: number }>()
    for (const [category, family] of familyTotals) {
      const config = PATTERN_FAMILY_CONFIG[category]
      const familyWeight = categoryWeights[category] ?? 1
      if (familyWeight === 0) continue
      const cluster = clusterTotals.get(config.scoringCluster) ?? { weightedSignal: 0, totalWeight: 0 }
      cluster.weightedSignal += (family.weightedSignal / family.totalWeight) * familyWeight
      cluster.totalWeight += familyWeight
      clusterTotals.set(config.scoringCluster, cluster)
    }
    const clusterScores = [...clusterTotals.values()]
      .map((cluster) => cluster.totalWeight ? cluster.weightedSignal / cluster.totalWeight : null)
      .filter((score): score is number => score !== null)
    const score = average(clusterScores)
    const decisiveSignals = supportingPatternCount + opposingPatternCount
    return {
      outcome,
      score,
      clusters: clusterScores.length,
      supportingPatternCount,
      opposingPatternCount,
      signalAgreement: decisiveSignals ? supportingPatternCount / decisiveSignals : null,
    }
  })

  return ranked.sort((left, right) =>
    (right.score ?? Number.NEGATIVE_INFINITY) - (left.score ?? Number.NEGATIVE_INFINITY) ||
    left.outcome.localeCompare(right.outcome),
  )
}

function validateColorMapping(mapping: NumberColorMapping | undefined): void {
  if (!mapping) return
  for (const number of NUMBERS) {
    const colors = mapping[number]
    if (!Array.isArray(colors) || colors.length === 0 || colors.some((color) => !isSupportedColor(color))) {
      throw new TypeError(`Verified colour mapping must define at least one supported colour for number ${number}`)
    }
  }
}

function calculateNumberTrends(records: readonly GameResult[]): NumberTrendSummary {
  const numbers = records.map((record) => record.number)
  const counts = Object.fromEntries(NUMBERS.map((number) => [number, 0])) as Record<number, number>
  for (const number of numbers) counts[number]++

  const split = Math.floor(records.length / 2)
  const older = numbers.slice(0, split)
  const recent = numbers.slice(split)
  const momentum = Object.fromEntries(NUMBERS.map((number) => {
    const recentShare = recent.length ? recent.filter((value) => value === number).length / recent.length : null
    const olderShare = older.length ? older.filter((value) => value === number).length / older.length : null
    return [number, recentShare === null || olderShare === null ? null : recentShare - olderShare]
  })) as Record<number, number | null>
  const gaps = Object.fromEntries(NUMBERS.map((number) => {
    const gap = numbers.slice().reverse().indexOf(number)
    return [number, gap < 0 ? null : gap]
  })) as Record<number, number | null>
  const sortBy = (metric: Record<number, number>, descending: boolean) =>
    NUMBERS.slice().sort((left, right) =>
      (descending ? metric[right] - metric[left] : metric[left] - metric[right]) || left - right,
    )
  let currentStreak: NumberTrendSummary["currentStreak"] = null
  if (numbers.length) {
    currentStreak = {
      number: numbers[numbers.length - 1],
      length: currentRunLength(numbers, (value) => value === numbers[numbers.length - 1]),
    }
  }

  return {
    counts,
    shares: Object.fromEntries(NUMBERS.map((number) => [number, records.length ? counts[number] / records.length : null])),
    momentum,
    gaps,
    hotNumbers: sortBy(counts, true).slice(0, 3),
    coldNumbers: sortBy(counts, false).slice(0, 3),
    overdueNumbers: NUMBERS.slice().sort((left, right) =>
      (gaps[right] ?? -1) - (gaps[left] ?? -1) || left - right,
    ).slice(0, 3),
    currentStreak,
    sampleCount: records.length,
  }
}

function calculateColourTrends(records: readonly GameResult[]): ColourTrendSummary {
  const colors = records.map(getColors)
  const combinedOutcomeCounts = countValues(colors.map((memberships) => memberships.slice().sort().join("+")))
  const split = Math.floor(records.length / 2)
  const latestMemberships = colors[colors.length - 1] ?? []
  const outcomes = COLORS.map((colour) => {
    const membershipCount = colors.filter((memberships) => memberships.includes(colour)).length
    const older = colors.slice(0, split)
    const recent = colors.slice(split)
    const recentShare = recent.length ? recent.filter((memberships) => memberships.includes(colour)).length / recent.length : null
    const olderShare = older.length ? older.filter((memberships) => memberships.includes(colour)).length / older.length : null
    const currentStreak = currentRunLength(colors, (memberships) => memberships.includes(colour))
    const transition = contextTransitions(
      colors,
      (values, index) => values[index].slice().sort().join("+") === latestMemberships.slice().sort().join("+"),
      (memberships) => memberships.includes(colour),
    )
    return {
      colour,
      membershipCount,
      shareOfResults: records.length ? membershipCount / records.length : null,
      recentMomentum: recentShare === null || olderShare === null ? null : recentShare - olderShare,
      currentStreak,
      nextMembershipRate: transition.support ? transition.successes / transition.support : null,
      transitionSupport: transition.support,
    }
  })
  return { outcomes, combinedOutcomeCounts, sampleCount: records.length, latestMemberships }
}

function calculateSizeTrends(records: readonly GameResult[]): SizeTrendSummary {
  const sizes = records.map((record) => sizeFromNumber(record.number))
  const latestSize = sizes[sizes.length - 1] ?? null
  const outcomes = SIZES.map((size) => {
    const count = sizes.filter((value) => value === size).length
    const transition = latestSize
      ? contextTransitions(sizes, (values, index) => values[index] === latestSize, (value) => value === size)
      : { support: 0, successes: 0 }
    return {
      size,
      count,
      share: sizes.length ? count / sizes.length : null,
      currentStreak: latestSize === size ? currentRunLength(sizes, (value) => value === size) : 0,
      nextTransitionRate: transition.support ? transition.successes / transition.support : null,
      transitionSupport: transition.support,
    }
  })
  return { outcomes, sampleCount: records.length, latestSize }
}

export function analyzeTrendPatterns(
  sourceRecords: readonly GameResult[],
  options: {
    targetPeriod?: string | null
    overrides?: PatternOverrides
    categoryWeights?: PatternCategoryWeights
    verifiedNumberColorMapping?: NumberColorMapping
  } = {},
): TrendPatternAnalysis {
  const targetPeriod = options.targetPeriod ?? null
  validateColorMapping(options.verifiedNumberColorMapping)
  for (const [category, weight] of Object.entries(options.categoryWeights ?? {})) {
    if (!Number.isFinite(weight) || (weight as number) < 0 || (weight as number) > 10) {
      throw new RangeError(`Pattern category ${category} weight must be between 0 and 10`)
    }
  }
  const prepared = prepareHistory(sourceRecords, targetPeriod)
  const registry = createPatternRegistry(options.overrides)
  const metricsCache = new Map<string, FamilyWindowMetrics>()
  const evaluations = registry.map((pattern) =>
    summarizePatternEvaluation(
      pattern,
      buildFamilyWindowMetrics(pattern.category, prepared.records, pattern.lookbackWindow, metricsCache),
    ),
  )
  const evaluationById = new Map(evaluations.map((evaluation) => [evaluation.patternId, evaluation]))
  const rawRankings = NUMBERS.map((number) =>
    scoreNumberCandidate(number, registry, evaluationById, options.verifiedNumberColorMapping, options.categoryWeights),
  )
    .sort((left, right) =>
      (right.score ?? Number.NEGATIVE_INFINITY) - (left.score ?? Number.NEGATIVE_INFINITY) || left.number - right.number,
    )
  const hasEnabledNumberEvidence = registry.some((pattern) => {
    const categoryWeight = options.categoryWeights?.[pattern.category] ?? 1
    return pattern.enabled && pattern.weight > 0 && categoryWeight > 0 && (pattern.contributesToNumberRanking || (pattern.market === "colour" && Boolean(options.verifiedNumberColorMapping)))
  })
  const counts = Object.fromEntries(NUMBERS.map((number) => [number, 0])) as Record<number, number>
  for (const record of prepared.records) counts[record.number]++
  const recentWindow = prepared.records.slice(-Math.min(10, prepared.records.length))
  const rankings: NumberCandidateRanking[] = rawRankings.map((ranking) => {
    // Pattern thresholds can be legitimately unmet on a short history. Keep
    // the ranking available using only verified empirical evidence; confidence
    // remains explicitly uncalibrated and low-confidence is retained below.
    const empiricalScore = prepared.records.length && hasEnabledNumberEvidence
      ? (counts[ranking.number] / prepared.records.length) * 0.7
        + (recentWindow.length ? recentWindow.filter((record) => record.number === ranking.number).length / recentWindow.length : 0) * 0.3
      : null
    return {
    ...ranking,
    score: ranking.score ?? empiricalScore,
    mappedColours: options.verifiedNumberColorMapping?.[ranking.number] ?? null,
    size: sizeFromNumber(ranking.number),
    historicalSampleCount: prepared.records.length,
    calibratedConfidence: null,
    }
  })
  const colourRankings = scoreMarketOutcomes("colour", COLORS, registry, evaluationById, options.categoryWeights)
  const sizeRankings = scoreMarketOutcomes("size", SIZES, registry, evaluationById, options.categoryWeights)
  const topThree = rankings.length >= 3 && rankings.slice(0, 3).every((ranking) => ranking.score !== null)
    ? rankings.slice(0, 3)
    : []

  const limitations: string[] = []
  if (prepared.records.length < 30) limitations.push("Fewer than 30 eligible historical records are available; trend estimates are descriptive and confidence is low.")
  if (!options.verifiedNumberColorMapping) limitations.push("No verified number-to-colour mapping is configured; candidate colours and colour evidence are not applied to number rankings.")
  if (prepared.incomparablePeriodCount) limitations.push(`${prepared.incomparablePeriodCount} record(s) had period identifiers that could not be ordered and were excluded.`)
  if (prepared.excludedTargetOrFutureCount) limitations.push(`${prepared.excludedTargetOrFutureCount} target-or-future record(s) were excluded to prevent look-ahead.`)
  if (prepared.duplicatePeriodCount) limitations.push(`${prepared.duplicatePeriodCount} duplicate period record(s) were excluded.`)
  if (prepared.invalidRecordCount) limitations.push(`${prepared.invalidRecordCount} invalid record(s) were excluded.`)
  if (prepared.records.length < 100) limitations.push(`Patterns with lookback windows above ${prepared.records.length} are marked insufficient until more historical records are available.`)
  if (!topThree.length) limitations.push("There is not enough eligible evidence to return a supported Top 3 ranking.")

  return {
    targetPeriod,
    dataCutoffPeriod: prepared.records.at(-1)?.period ?? null,
    sourceRecordCount: sourceRecords.length,
    includedRecordCount: prepared.records.length,
    excludedTargetOrFutureCount: prepared.excludedTargetOrFutureCount,
    invalidRecordCount: prepared.invalidRecordCount + prepared.incomparablePeriodCount,
    duplicatePeriodCount: prepared.duplicatePeriodCount,
    patternCount: TREND_PATTERN_COUNT,
    activePatternCount: registry.filter((pattern) => pattern.enabled).length,
    disabledPatternCount: registry.filter((pattern) => !pattern.enabled).length,
    evaluatedPatternCount: evaluations.length,
    rankings,
    topThree,
    colourRankings,
    sizeRankings,
    numberTrends: calculateNumberTrends(prepared.records),
    colourTrends: calculateColourTrends(prepared.records),
    sizeTrends: calculateSizeTrends(prepared.records),
    evaluations,
    lowConfidence: prepared.records.length < 30 || topThree.length === 0,
    limitations,
  }
}

function emptyMetric(): MutableMetric {
  return { predictions: 0, hits: 0 }
}

function metricResult(metric: MutableMetric): BacktestMetric {
  return {
    predictions: metric.predictions,
    hits: metric.hits,
    accuracy: metric.predictions ? metric.hits / metric.predictions : null,
  }
}

function addMetric(metric: MutableMetric, hit: boolean): void {
  metric.predictions++
  if (hit) metric.hits++
}

function majorityOutcome<T extends string>(counts: Readonly<Record<string, number>>, outcomes: readonly T[]): T | null {
  return outcomes.slice().sort((left, right) =>
    (counts[right] ?? 0) - (counts[left] ?? 0) || left.localeCompare(right),
  )[0] ?? null
}

function getUniquePatternPrediction(
  evaluation: PatternEvaluation,
): { outcome: string; signal: number } | null {
  const candidates = Object.entries(evaluation.outcomeSignals)
    .filter(([, evidence]) => evidence.signal !== null && evidence.dataSufficiency === "sufficient")
    .map(([outcome, evidence]) => ({ outcome, signal: evidence.signal as number }))
    .sort((left, right) => right.signal - left.signal || left.outcome.localeCompare(right.outcome))
  if (!candidates.length || candidates[0].signal <= 0.05) return null
  if (candidates[1] && Math.abs(candidates[0].signal - candidates[1].signal) < 1e-9) return null
  return candidates[0]
}

function* walkForwardBacktestSteps(
  sourceRecords: readonly GameResult[],
  options: WalkForwardBacktestOptions = {},
): Generator<void, WalkForwardBacktest, void> {
  const minimumTrainingRecords = options.minimumTrainingRecords ?? 5
  if (!Number.isInteger(minimumTrainingRecords) || minimumTrainingRecords < 1) {
    throw new RangeError("Minimum training records must be a positive integer")
  }
  validateColorMapping(options.verifiedNumberColorMapping)
  const fullHistory = prepareHistory(sourceRecords, null)
  const numberTop1 = emptyMetric()
  const numberTop3 = emptyMetric()
  const numberFrequencyBaselineTop1 = emptyMetric()
  const numberFrequencyBaselineTop3 = emptyMetric()
  const colourTop1Membership = emptyMetric()
  const colourFrequencyBaselineTop1Membership = emptyMetric()
  const sizeTop1 = emptyMetric()
  const sizeFrequencyBaselineTop1 = emptyMetric()
  const calibration = {
    1: emptyMetric(),
    2: emptyMetric(),
    3: emptyMetric(),
  }
  const patternMetrics = new Map<string, MutableMetric>()
  const categoryMetrics = new Map<string, MutableMetric>()
  const windowMetrics = new Map<string, MutableMetric>()
  const registry = createPatternRegistry(options.overrides)
  let evaluatedForecasts = 0
  let skippedForecasts = 0

  for (let targetIndex = minimumTrainingRecords; targetIndex < fullHistory.records.length; targetIndex++) {
    if (options.signal?.aborted) throw new DOMException("Backtest cancelled", "AbortError")
    const target = fullHistory.records[targetIndex]
    const training = fullHistory.records.slice(0, targetIndex)
    const analysis = analyzeTrendPatterns(training, {
      targetPeriod: target.period,
      overrides: options.overrides,
      categoryWeights: options.categoryWeights,
      verifiedNumberColorMapping: options.verifiedNumberColorMapping,
    })
    const actualNumber = target.number
    if (analysis.topThree.length !== 3) {
      skippedForecasts++
    } else {
      evaluatedForecasts++
      const numberHit = analysis.topThree.some((candidate) => candidate.number === actualNumber)
      addMetric(numberTop1, analysis.topThree[0].number === actualNumber)
      addMetric(numberTop3, numberHit)
      addMetric(calibration[1], analysis.topThree[0].number === actualNumber)
      addMetric(calibration[2], analysis.topThree[1].number === actualNumber)
      addMetric(calibration[3], analysis.topThree[2].number === actualNumber)

      const trainingNumberCounts = countValues(training.map((record) => String(record.number)))
      const frequencyTopNumbers = NUMBERS.slice().sort((left, right) =>
        (trainingNumberCounts[right] ?? 0) - (trainingNumberCounts[left] ?? 0) || left - right,
      )
      addMetric(numberFrequencyBaselineTop1, frequencyTopNumbers[0] === actualNumber)
      addMetric(numberFrequencyBaselineTop3, frequencyTopNumbers.slice(0, 3).includes(actualNumber))
    }

    const colorPrediction = analysis.colourRankings[0]?.score === null ? null : analysis.colourRankings[0]?.outcome
    const actualColors = getColors(target)
    if (colorPrediction) addMetric(colourTop1Membership, actualColors.includes(colorPrediction as TrendColor))
    const trainingColorCounts = countValues(training.flatMap(getColors))
    const frequencyColor = majorityOutcome(trainingColorCounts, COLORS)
    if (frequencyColor) addMetric(colourFrequencyBaselineTop1Membership, actualColors.includes(frequencyColor))

    const sizePrediction = analysis.sizeRankings[0]?.score === null ? null : analysis.sizeRankings[0]?.outcome
    const actualSize = sizeFromNumber(actualNumber)
    if (sizePrediction) addMetric(sizeTop1, sizePrediction === actualSize)
    const trainingSizeCounts = countValues(training.map((record) => sizeFromNumber(record.number)))
    const frequencySize = majorityOutcome(trainingSizeCounts, SIZES)
    if (frequencySize) addMetric(sizeFrequencyBaselineTop1, frequencySize === actualSize)

    const evaluationById = new Map(analysis.evaluations.map((evaluation) => [evaluation.patternId, evaluation]))
    for (const pattern of registry) {
      if (!pattern.enabled || pattern.weight === 0 || pattern.market === "cross") continue
      const evaluation = evaluationById.get(pattern.patternId)
      if (!evaluation) continue
      const prediction = getUniquePatternPrediction(evaluation)
      if (!prediction) continue
      let hit = false
      if (pattern.market === "number") hit = prediction.outcome === String(actualNumber)
      else if (pattern.market === "colour") hit = actualColors.includes(prediction.outcome as TrendColor)
      else hit = prediction.outcome === actualSize

      const metric = patternMetrics.get(pattern.patternId) ?? emptyMetric()
      addMetric(metric, hit)
      patternMetrics.set(pattern.patternId, metric)
      const categoryMetric = categoryMetrics.get(pattern.category) ?? emptyMetric()
      addMetric(categoryMetric, hit)
      categoryMetrics.set(pattern.category, categoryMetric)
      const windowMetric = windowMetrics.get(String(pattern.lookbackWindow)) ?? emptyMetric()
      addMetric(windowMetric, hit)
      windowMetrics.set(String(pattern.lookbackWindow), windowMetric)
    }
    yield
  }

  const patternPerformance = Object.fromEntries(registry.map((pattern) => {
    const metric = patternMetrics.get(pattern.patternId) ?? emptyMetric()
    return [pattern.patternId, {
      patternId: pattern.patternId,
      category: pattern.category,
      lookbackWindow: pattern.lookbackWindow,
      ...metricResult(metric),
    }]
  }))
  const toRecord = (metrics: ReadonlyMap<string, MutableMetric>) =>
    Object.fromEntries([...metrics.entries()].map(([key, metric]) => [key, metricResult(metric)]))
  const calibrationResult = Object.fromEntries(([1, 2, 3] as const).map((rank) => {
    const metric = calibration[rank]
    return [rank, {
      sampleCount: metric.predictions,
      hitRate: metric.predictions >= MIN_CALIBRATION_FORECASTS ? metric.hits / metric.predictions : null,
    }]
  })) as WalkForwardBacktest["calibrationByRank"]

  const limitations = [
    "Forecasts are walk-forward: every target is excluded from its own training history.",
    "Confidence by rank is withheld until at least 30 out-of-sample forecasts exist for that rank.",
    "The source endpoint currently supplies at most 50 records; results are limited to that available history.",
    "Size outcomes in this backtest are derived from the user-specified 0–4 SMALL and 5–9 BIG rule; stored API records are not modified.",
    "Colour accuracy tests membership in the API-provided colour set; it does not infer a number-to-colour mapping.",
  ]
  if (!options.verifiedNumberColorMapping) {
    limitations.push("Candidate colour mappings are unavailable because no verified number-to-colour lookup is configured.")
  }

  return {
    requestedHistoryCount: sourceRecords.length,
    evaluatedForecasts,
    skippedForecasts,
    minimumTrainingRecords,
    numberTop1: metricResult(numberTop1),
    numberTop3: metricResult(numberTop3),
    numberFrequencyBaselineTop1: metricResult(numberFrequencyBaselineTop1),
    numberFrequencyBaselineTop3: metricResult(numberFrequencyBaselineTop3),
    colourTop1Membership: metricResult(colourTop1Membership),
    colourFrequencyBaselineTop1Membership: metricResult(colourFrequencyBaselineTop1Membership),
    sizeTop1: metricResult(sizeTop1),
    sizeFrequencyBaselineTop1: metricResult(sizeFrequencyBaselineTop1),
    calibrationByRank: calibrationResult,
    patternPerformance,
    categoryPerformance: toRecord(categoryMetrics),
    windowPerformance: toRecord(windowMetrics),
    limitations,
  }
}

export function runTrendWalkForwardBacktest(
  sourceRecords: readonly GameResult[],
  options: WalkForwardBacktestOptions = {},
): WalkForwardBacktest {
  const steps = walkForwardBacktestSteps(sourceRecords, options)
  let step = steps.next()
  while (!step.done) step = steps.next()
  return step.value
}

export async function runTrendWalkForwardBacktestAsync(
  sourceRecords: readonly GameResult[],
  options: WalkForwardBacktestOptions = {},
): Promise<WalkForwardBacktest> {
  const steps = walkForwardBacktestSteps(sourceRecords, options)
  let step = steps.next()
  while (!step.done) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    step = steps.next()
  }
  return step.value
}

import type { GameResult } from "../types"

export type AnomalySeverity = "watch" | "warning" | "high"
export type AnomalyVerificationStatus = "requires-source-review" | "not-verified"

export interface AnomalyEvent {
  eventId: string
  detectedAt: string
  affectedPeriod: string
  feature: string
  baseline: string
  observed: string
  deviation: number | null
  evidence: string
  severity: AnomalySeverity
  verificationStatus: AnomalyVerificationStatus
}

export interface HistoricalAnomalyReport {
  scannedAt: string
  sourceRecordCount: number
  includedRecordCount: number
  invalidRecordCount: number
  duplicatePeriodCount: number
  events: readonly AnomalyEvent[]
  limitations: readonly string[]
}

const NUMBER_CATEGORIES = Array.from({ length: 10 }, (_, number) => number)
const DISTRIBUTION_WINDOW_SIZE = 50
const WATCH_CHI_SQUARE = 21.666
const WARNING_CHI_SQUARE = 27.877

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

function eventId(parts: readonly string[]): string {
  const value = parts.join("|")
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `anom-${(hash >>> 0).toString(16).padStart(8, "0")}`
}

function createEvent(
  detectedAt: string,
  period: string,
  feature: string,
  baseline: string,
  observed: string,
  deviation: number | null,
  evidence: string,
  severity: AnomalySeverity,
): AnomalyEvent {
  return {
    eventId: eventId([period, feature, baseline, observed]),
    detectedAt,
    affectedPeriod: period,
    feature,
    baseline,
    observed,
    deviation,
    evidence,
    severity,
    verificationStatus: "requires-source-review",
  }
}

function validResult(record: GameResult): boolean {
  return Boolean(
    record &&
    typeof record.period === "string" &&
    /^\d+$/.test(record.period) &&
    Number.isInteger(record.number) &&
    record.number >= 0 &&
    record.number <= 9,
  )
}

function distributionShiftStatistic(
  baseline: readonly GameResult[],
  recent: readonly GameResult[],
): number {
  const baselineCounts = NUMBER_CATEGORIES.map(
    (number) => baseline.filter((record) => record.number === number).length,
  )
  const recentCounts = NUMBER_CATEGORIES.map(
    (number) => recent.filter((record) => record.number === number).length,
  )
  const total = baseline.length + recent.length
  const chiSquare = NUMBER_CATEGORIES.reduce((sum, _number, index) => {
    const columnTotal = baselineCounts[index] + recentCounts[index]
    const expectedBaseline = (baseline.length * columnTotal) / total
    const expectedRecent = (recent.length * columnTotal) / total
    if (expectedBaseline === 0 || expectedRecent === 0) return sum
    return sum
      + ((baselineCounts[index] - expectedBaseline) ** 2) / expectedBaseline
      + ((recentCounts[index] - expectedRecent) ** 2) / expectedRecent
  }, 0)

  return chiSquare
}

function distributionEvidence(records: readonly GameResult[], detectedAt: string): AnomalyEvent | null {
  const requiredCount = DISTRIBUTION_WINDOW_SIZE * 2
  if (records.length < requiredCount) return null

  const baseline = records.slice(-(requiredCount), -DISTRIBUTION_WINDOW_SIZE)
  const recent = records.slice(-DISTRIBUTION_WINDOW_SIZE)
  const statistic = distributionShiftStatistic(baseline, recent)
  if (statistic < WATCH_CHI_SQUARE) return null

  const latestPeriod = recent.at(-1)?.period
  if (!latestPeriod) return null
  const severity: AnomalySeverity = statistic >= WARNING_CHI_SQUARE ? "warning" : "watch"

  return createEvent(
    detectedAt,
    latestPeriod,
    "number-distribution-shift",
    `Previous ${baseline.length} completed records`,
    `Latest ${recent.length} completed records differ across number outcomes`,
    statistic,
    `Chi-square homogeneity statistic ${statistic.toFixed(2)} (9 degrees of freedom); screening threshold ${WATCH_CHI_SQUARE}. This is a screening signal, not evidence of manipulation.`,
    severity,
  )
}

function consecutivePeriodGaps(records: readonly GameResult[], detectedAt: string): AnomalyEvent[] {
  const events: AnomalyEvent[] = []
  for (let index = 1; index < records.length; index++) {
    const previous = records[index - 1].period
    const current = records[index].period
    const prefixLength = Math.min(previous.length, current.length) - 3
    if (prefixLength < 1 || previous.slice(0, prefixLength) !== current.slice(0, prefixLength)) continue

    const previousSequence = Number(previous.slice(-3))
    const currentSequence = Number(current.slice(-3))
    const gap = currentSequence - previousSequence - 1
    if (!Number.isInteger(previousSequence) || !Number.isInteger(currentSequence) || gap <= 0 || gap > 20) continue

    events.push(createEvent(
      detectedAt,
      current,
      "period-sequence-gap",
      `Next suffix after ${previous}`,
      `${gap} period(s) absent before ${current}`,
      gap,
      "The adjacent period IDs share the same prefix and have a non-consecutive three-digit suffix. Confirm source pagination and round numbering before treating this as missing data.",
      "watch",
    ))
  }
  return events
}

export function detectHistoricalAnomalies(
  sourceRecords: readonly GameResult[],
  options: { duplicatePeriodCount?: number; scannedAt?: string } = {},
): HistoricalAnomalyReport {
  const scannedAt = options.scannedAt ?? new Date().toISOString()
  const seenPeriods = new Set<string>()
  const records: GameResult[] = []
  let duplicatePeriodCount = Math.max(0, options.duplicatePeriodCount ?? 0)
  let invalidRecordCount = 0

  for (const record of sourceRecords) {
    if (!validResult(record)) {
      invalidRecordCount++
      continue
    }
    if (seenPeriods.has(record.period)) {
      duplicatePeriodCount++
      continue
    }
    seenPeriods.add(record.period)
    records.push(record)
  }

  records.sort((left, right) => comparePeriods(left.period, right.period) ?? 0)
  const distributionShift = distributionEvidence(records, scannedAt)
  const events = [
    ...consecutivePeriodGaps(records, scannedAt),
    ...(distributionShift ? [distributionShift] : []),
  ]
  const limitations: string[] = []

  if (records.length < DISTRIBUTION_WINDOW_SIZE * 2) {
    limitations.push(`Distribution-shift screening requires at least ${DISTRIBUTION_WINDOW_SIZE * 2} eligible records; only ${records.length} are loaded.`)
  }
  if (duplicatePeriodCount) {
    limitations.push(`${duplicatePeriodCount} duplicate period record(s) were reported or excluded.`)
  }
  if (invalidRecordCount) {
    limitations.push(`${invalidRecordCount} invalid record(s) were excluded from this scan.`)
  }
  if (events.length === 0) {
    limitations.push("No configured anomaly threshold was crossed in the available records.")
  }
  limitations.push("This scan is not a persistent event log and cannot verify causes or manipulation.")

  return {
    scannedAt,
    sourceRecordCount: sourceRecords.length,
    includedRecordCount: records.length,
    invalidRecordCount,
    duplicatePeriodCount,
    events,
    limitations,
  }
}

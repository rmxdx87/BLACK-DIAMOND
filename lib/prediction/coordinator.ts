import type { GameResult, PredictionCandidateSnapshot } from "../types"
import { analyzeTrendPatterns, type NumberCandidateRanking, type TrendPatternAnalysis } from "../trend-pattern-engine.ts"
import { TREND_PATTERN_COUNT } from "../trend-pattern-registry.ts"
import { toHistoricalResults } from "./engine-adapter.ts"
import { generatePrediction, type PredictionResult } from "../../src/lib/prediction/engine.ts"

export type PredictionExecutionStatus =
  | "SUCCESS"
  | "INSUFFICIENT_DATA"
  | "SOURCE_ERROR"
  | "ENGINE_ERROR"
  | "PERIOD_ERROR"

export interface EngineExecutionStatistic {
  defined: number
  registered: number
  executable: number
  executed: number
  validOutput: number
  evidenceOutput: number
  failed: number
  duplicates: number
  disconnected: number
  recordsProcessed: number
}

export interface PredictionCoordinatorOutput {
  status: PredictionExecutionStatus
  targetPeriod: string | null
  generatedAt: number
  sampleSize: number
  recordsRejected: number
  duplicateRecords: number
  recordsProcessedByEngines: number
  candidates: readonly PredictionCandidateSnapshot[]
  trendAnalysis: TrendPatternAnalysis | null
  statisticalPrediction: PredictionResult | null
  executionStats: {
    patterns: EngineExecutionStatistic
    statisticalFrequency: EngineExecutionStatistic
    agents: EngineExecutionStatistic
  }
  warnings: readonly string[]
  errorReason: string | null
}

const EMPTY_STAT: EngineExecutionStatistic = {
  defined: 0,
  registered: 0,
  executable: 0,
  executed: 0,
  validOutput: 0,
  evidenceOutput: 0,
  failed: 0,
  duplicates: 0,
  disconnected: 0,
  recordsProcessed: 0,
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function comparePeriods(left: string, right: string): number {
  const normalizedLeft = left.replace(/^0+(?=\d)/, "")
  const normalizedRight = right.replace(/^0+(?=\d)/, "")
  if (normalizedLeft.length !== normalizedRight.length) return normalizedLeft.length - normalizedRight.length
  return normalizedLeft.localeCompare(normalizedRight)
}

function isValidRecord(record: GameResult): boolean {
  if (
    !record ||
    typeof record.period !== "string" ||
    !/^\d+$/.test(record.period) ||
    !Number.isInteger(record.number) ||
    record.number < 0 ||
    record.number > 9
  ) return false

  const colors = record.colors?.length ? record.colors : [record.color]
  return colors.length > 0 && colors.every((color) => ["red", "green", "violet"].includes(color))
}

function isValidPatternOutput(evaluation: TrendPatternAnalysis["evaluations"][number]): boolean {
  return Boolean(
    evaluation.patternId &&
    evaluation.outcomeSignals &&
    Object.values(evaluation.outcomeSignals).every((evidence) =>
      evidence.signal === null || Number.isFinite(evidence.signal),
    ),
  )
}

function toSnapshot(candidate: NumberCandidateRanking, rank: number): PredictionCandidateSnapshot {
  return {
    rank: rank as 1 | 2 | 3 | 4,
    number: candidate.number,
    mappedColours: candidate.mappedColours,
    size: candidate.size,
    score: candidate.score,
    supportingPatternCount: candidate.supportingPatternCount,
    historicalSampleCount: candidate.historicalSampleCount,
    signalAgreement: candidate.signalAgreement,
    calibratedConfidence: candidate.calibratedConfidence,
  }
}

function emptyOutput(
  status: PredictionExecutionStatus,
  targetPeriod: string | null,
  errorReason: string | null,
  warnings: readonly string[] = [],
): PredictionCoordinatorOutput {
  return {
    status,
    targetPeriod,
    generatedAt: Date.now(),
    sampleSize: 0,
    recordsRejected: 0,
    duplicateRecords: 0,
    recordsProcessedByEngines: 0,
    candidates: [],
    trendAnalysis: null,
    statisticalPrediction: null,
    executionStats: {
      patterns: { ...EMPTY_STAT },
      statisticalFrequency: { ...EMPTY_STAT },
      agents: { ...EMPTY_STAT },
    },
    warnings,
    errorReason,
  }
}

export function coordinatePrediction(input: {
  targetPeriod: string
  currentPeriodId: string | null
  history: readonly GameResult[]
}): PredictionCoordinatorOutput {
  const targetPeriod = input.targetPeriod.trim()
  if (!/^\d+$/.test(targetPeriod)) {
    return emptyOutput("PERIOD_ERROR", targetPeriod || null, "Target period is not a numeric source period ID.")
  }
  if (!input.currentPeriodId || !/^\d+$/.test(input.currentPeriodId)) {
    return emptyOutput("PERIOD_ERROR", targetPeriod, "Current completed period ID is missing or invalid.")
  }
  if (comparePeriods(targetPeriod, input.currentPeriodId) <= 0) {
    return emptyOutput("PERIOD_ERROR", targetPeriod, "Target period must be later than the current completed period.")
  }

  const rejectedCount = input.history.length - input.history.filter(isValidRecord).length
  const validRecords = input.history.filter(isValidRecord)
  const seenPeriods = new Set<string>()
  let duplicateCount = 0
  const validHistory = validRecords.filter((record) => {
    if (seenPeriods.has(record.period)) {
      duplicateCount++
      return false
    }
    seenPeriods.add(record.period)
    return true
  })
  if (!validHistory.length) {
    const empty = emptyOutput(
      input.history.length ? "SOURCE_ERROR" : "INSUFFICIENT_DATA",
      targetPeriod,
      input.history.length ? "The source returned no records with valid period, number, and colour fields." : null,
    )
    return { ...empty, recordsRejected: rejectedCount, duplicateRecords: duplicateCount }
  }

  const warnings: string[] = []
  if (rejectedCount) warnings.push(`${rejectedCount} invalid source record(s) were rejected before analysis.`)

  let chronologicalHistory
  try {
    chronologicalHistory = toHistoricalResults(validHistory)
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Source history could not be normalized."
    const empty = emptyOutput("SOURCE_ERROR", targetPeriod, reason, warnings)
    return { ...empty, sampleSize: validHistory.length, recordsRejected: rejectedCount, duplicateRecords: duplicateCount }
  }

  const latestPeriod = chronologicalHistory.at(-1)?.periodId ?? null
  if (latestPeriod !== input.currentPeriodId) {
    const empty = emptyOutput(
      "PERIOD_ERROR",
      targetPeriod,
      `Current period ${input.currentPeriodId} does not match the latest valid history period ${latestPeriod ?? "unavailable"}.`,
      warnings,
    )
    return { ...empty, sampleSize: validHistory.length, recordsRejected: rejectedCount, duplicateRecords: duplicateCount }
  }

  let trendAnalysis: TrendPatternAnalysis | null = null
  let statisticalPrediction: PredictionResult | null = null
  let patternFailure: string | null = null
  let statisticalFailure: string | null = null

  try {
    trendAnalysis = analyzeTrendPatterns(validHistory, { targetPeriod })
  } catch (error) {
    patternFailure = error instanceof Error ? error.message : "Pattern engine failed."
    warnings.push(`Pattern engine failed: ${patternFailure}`)
  }

  const statisticalExecutionCount = chronologicalHistory.length >= 10 ? 1 : 0
  if (chronologicalHistory.length >= 10) {
    try {
      statisticalPrediction = generatePrediction({
        currentPeriodId: input.currentPeriodId,
        targetPeriodId: targetPeriod,
        history: chronologicalHistory,
      })
    } catch (error) {
      statisticalFailure = error instanceof Error ? error.message : "Statistical frequency engine failed."
      warnings.push(`Statistical frequency engine failed: ${statisticalFailure}`)
    }
  } else {
    warnings.push("Statistical frequency analysis requires 10 validated records; pattern ranking remains available with lower evidence.")
  }

  const patternEvaluations = trendAnalysis?.evaluations ?? []
  const uniqueEvaluationIds = new Set(patternEvaluations.map((evaluation) => evaluation.patternId))
  const validPatternOutputCount = patternEvaluations.filter(isValidPatternOutput).length
  const patternEvidenceOutputCount = patternEvaluations.filter((evaluation) =>
    Object.values(evaluation.outcomeSignals).some((evidence) =>
      evidence.signal !== null && evidence.dataSufficiency === "sufficient",
    ),
  ).length
  const patternStat: EngineExecutionStatistic = trendAnalysis
    ? {
        defined: trendAnalysis.patternCount,
        registered: trendAnalysis.activePatternCount + trendAnalysis.disabledPatternCount,
        executable: trendAnalysis.activePatternCount,
        executed: trendAnalysis.evaluatedPatternCount,
        validOutput: validPatternOutputCount,
        evidenceOutput: patternEvidenceOutputCount,
        failed: Math.max(0, trendAnalysis.evaluatedPatternCount - validPatternOutputCount),
        duplicates: patternEvaluations.length - uniqueEvaluationIds.size,
        disconnected: Math.max(0, trendAnalysis.activePatternCount + trendAnalysis.disabledPatternCount - uniqueEvaluationIds.size),
        recordsProcessed: trendAnalysis.includedRecordCount,
      }
    : {
        ...EMPTY_STAT,
        defined: TREND_PATTERN_COUNT,
        failed: patternFailure ? 1 : 0,
        disconnected: TREND_PATTERN_COUNT,
        recordsProcessed: validHistory.length,
      }

  const statisticalStat: EngineExecutionStatistic = {
    defined: 1,
    registered: 1,
    executable: 1,
    executed: statisticalExecutionCount,
    validOutput: statisticalPrediction ? 1 : 0,
    evidenceOutput: statisticalPrediction ? 1 : 0,
    failed: statisticalFailure ? 1 : 0,
    duplicates: 0,
    disconnected: 0,
    recordsProcessed: statisticalPrediction?.totalRecords ?? 0,
  }
  const candidatesFromPatterns = trendAnalysis?.rankings
    .filter((candidate) => candidate.score !== null)
    .slice(0, 4)
    .map((candidate, index) => toSnapshot(candidate, index + 1)) ?? []
  const candidatesFromFrequency = statisticalPrediction?.numbers.candidates
    .slice(0, 4)
    .map((candidate, index) => ({
      rank: (index + 1) as 1 | 2 | 3 | 4,
      number: candidate.value,
      mappedColours: null,
      size: (candidate.value <= 4 ? "small" : "big") as "small" | "big",
      score: candidate.score,
      supportingPatternCount: 0,
      historicalSampleCount: candidate.sampleSize,
      signalAgreement: null,
      calibratedConfidence: null,
    })) ?? []
  const candidates = candidatesFromPatterns.length >= 4 ? candidatesFromPatterns : candidatesFromFrequency
  const allEnginesFailed = !trendAnalysis && !statisticalPrediction
  const status: PredictionExecutionStatus = candidates.length >= 4
    ? "SUCCESS"
    : allEnginesFailed
      ? "ENGINE_ERROR"
      : "INSUFFICIENT_DATA"

  if (status === "SUCCESS" && trendAnalysis?.lowConfidence) {
    warnings.push("LOW EVIDENCE: ranked candidates are available, but historical support is limited and confidence is not calibrated.")
  }
  if (status === "INSUFFICIENT_DATA") {
    warnings.push("Fewer than four valid number candidates could be ranked from the available evidence.")
  }

  return {
    status,
    targetPeriod,
    generatedAt: Date.now(),
    sampleSize: validHistory.length,
    recordsRejected: rejectedCount,
    duplicateRecords: duplicateCount,
    recordsProcessedByEngines: Math.max(
      trendAnalysis?.includedRecordCount ?? 0,
      statisticalPrediction?.totalRecords ?? 0,
    ),
    candidates,
    trendAnalysis,
    statisticalPrediction,
    executionStats: {
      patterns: patternStat,
      statisticalFrequency: statisticalStat,
      agents: { ...EMPTY_STAT },
    },
    warnings: [...warnings, ...(trendAnalysis?.limitations ?? [])],
    errorReason: status === "ENGINE_ERROR"
      ? [patternFailure, statisticalFailure].filter(Boolean).join("; ") || "All prediction engines failed."
      : null,
  }
}

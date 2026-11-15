import { get, ref, runTransaction } from "firebase/database"
import { database } from "./firebase"
import type { PredictionCandidateSnapshot } from "./types"
export { createDataVersion, createLegacyPeriodVersion } from "./prediction-version"

export const PREDICTION_MODEL_VERSION = "trend-patterns-v2"

export interface CanonicalPredictionRecord {
  gameId: string
  sourcePeriodId: string
  targetPeriodId: string
  targetPeriodStatus: "active" | "upcoming"
  /** Canonical field names used by the prediction contract. */
  periodStatus?: "active" | "upcoming" | "settled"
  predictionCreatedAt: number
  predictionTimestamp?: number
  sourceDataCutoff: string | null
  dataVersion: string
  historicalDataVersion?: string
  modelVersion: string
  predictionStatus: "pending" | "active" | "settled"
  topThree: PredictionCandidateSnapshot[]
  topFour?: PredictionCandidateSnapshot[]
  sampleCount?: number
  lowConfidence?: boolean
  limitations?: readonly string[]
  settledResult?: { period: string; number: number; colors?: readonly string[] }
  settledAt?: number
}

function targetCanonicalPath(record: Pick<CanonicalPredictionRecord, "gameId" | "targetPeriodId" | "modelVersion">): string {
  // Keep v3 outside the legacy path tree, where the model node contains dataVersion children.
  return `canonicalPredictionTargets/${record.gameId}/${record.targetPeriodId}/${record.modelVersion}`
}

function legacyCanonicalPath(record: Pick<CanonicalPredictionRecord, "gameId" | "targetPeriodId" | "modelVersion" | "dataVersion">): string {
  return `canonicalPredictions/${record.gameId}/${record.targetPeriodId}/${record.modelVersion}/${record.dataVersion}`
}

/** Returns the canonical shared record when Firebase is configured. */
export async function getCanonicalPrediction(
  record: Pick<CanonicalPredictionRecord, "gameId" | "targetPeriodId" | "modelVersion" | "dataVersion">,
  legacyDataVersion?: string,
): Promise<CanonicalPredictionRecord | null> {
  if (!database) return null
  const stable = await get(ref(database, targetCanonicalPath(record)))
  if (stable.exists()) return stable.val() as CanonicalPredictionRecord

  const legacyVersions = new Set([record.dataVersion, legacyDataVersion].filter((value): value is string => Boolean(value)))
  for (const dataVersion of legacyVersions) {
    const legacy = await get(ref(database, legacyCanonicalPath({ ...record, dataVersion })))
    if (!legacy.exists()) continue
    const migrated = legacy.val() as CanonicalPredictionRecord
    return await createCanonicalPrediction(migrated) ?? migrated
  }
  return null
}

/** Atomic create-if-absent prevents two clients from publishing different forecasts. */
export async function createCanonicalPrediction(record: CanonicalPredictionRecord): Promise<CanonicalPredictionRecord | null> {
  if (!database) return null
  const target = ref(database, targetCanonicalPath(record))
  const result = await runTransaction(target, (current) => current ?? record)
  return result.snapshot.exists() ? result.snapshot.val() as CanonicalPredictionRecord : null
}

export async function saveCanonicalPrediction(record: CanonicalPredictionRecord): Promise<void> {
  await createCanonicalPrediction(record)
}

export async function settleCanonicalPrediction(
  gameId: string,
  targetPeriodId: string,
  modelVersion: string,
  result: { period: string; number: number; colors?: readonly string[] },
): Promise<void> {
  if (!database) return
  const target = ref(database, targetCanonicalPath({ gameId, targetPeriodId, modelVersion }))
  await runTransaction(target, (current) => {
    if (!current || current.predictionStatus === "settled") return
    return {
      ...current,
      periodStatus: "settled",
      predictionStatus: "settled",
      settledResult: result,
      settledAt: Date.now(),
    }
  })
}

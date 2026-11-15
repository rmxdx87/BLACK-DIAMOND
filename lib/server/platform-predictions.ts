import "server-only"

import { randomUUID } from "node:crypto"
import {
  ManualPredictionCreateSchema,
  PlatformPredictionRecordSchema,
  type PlatformPredictionRecord,
} from "@/lib/platform/schemas"
import {
  getEffectivePredictionMode,
  hasLegacySystemPredictionPanel,
} from "@/lib/platform/prediction-mode"
import { evaluateManualPrediction } from "@/lib/platform/prediction-settlement"
import type { VerifiedAdmin } from "./admin-auth"
import { getFirebaseAdminDatabase } from "./firebase-admin"
import { PlatformStoreError, getPlatformGame, getPlatformSession } from "./platform-store"

const ROOT = "platformCatalog"

export type PlatformPrediction = PlatformPredictionRecord

export class PlatformPredictionError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message)
    this.name = "PlatformPredictionError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function validateManualValues(
  resultFormat: "number" | "color_size" | "string" | "json",
  supportedValues: string[],
  payload: {
    numberCandidates?: string[]
    colorCandidates?: string[]
    sizeCandidates?: string[]
    result?: unknown
  },
): void {
  const supported = new Set(supportedValues)
  const supplied = [
    ...(payload.numberCandidates ?? []),
    ...(payload.colorCandidates ?? []),
    ...(payload.sizeCandidates ?? []),
  ]
  if (supplied.some((value) => !supported.has(value))) {
    throw new PlatformPredictionError("A prediction value is not supported by this game.", 400)
  }
  if (resultFormat === "number" && payload.result !== undefined) {
    const value = typeof payload.result === "number" || typeof payload.result === "string"
      ? String(payload.result).trim()
      : ""
    if (!supported.has(value) || !Number.isFinite(Number(value))) {
      throw new PlatformPredictionError("The number result is not supported by this game.", 400)
    }
  }
  if (resultFormat === "string" && payload.result !== undefined) {
    if (typeof payload.result !== "string" || !supported.has(payload.result)) {
      throw new PlatformPredictionError("The string result is not supported by this game.", 400)
    }
  }
  if (
    (resultFormat === "number" && !payload.numberCandidates?.length && payload.result === undefined) ||
    (resultFormat === "string" && payload.result === undefined) ||
    (resultFormat === "color_size" && !payload.colorCandidates?.length && !payload.sizeCandidates?.length && payload.result === undefined) ||
    (resultFormat === "json" && payload.result === undefined)
  ) {
    throw new PlatformPredictionError("The prediction payload does not match the game result format.", 400)
  }
}

export async function setPlatformPredictionMode(
  gameId: string,
  mode: "system" | "manual",
  sessionId?: string,
): Promise<void> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gameId)) {
    throw new PlatformStoreError("Invalid game ID.", 400)
  }
  if (gameId === "wingo-1m") {
    throw new PlatformStoreError("Win Go 1M keeps its existing system prediction workflow.", 409)
  }

  const db = getFirebaseAdminDatabase()
  if (sessionId) {
    await getPlatformSession(gameId, sessionId)
    await db.ref(`${ROOT}/sessions/${gameId}/${sessionId}`).update({
      predictionMode: mode,
      updatedAt: Date.now(),
    })
    return
  }

  await getPlatformGame(gameId)
  await db.ref(`${ROOT}/games/${gameId}`).update({ predictionMode: mode, updatedAt: Date.now() })
}

export async function publishManualPlatformPrediction(
  input: unknown,
  admin: VerifiedAdmin,
): Promise<PlatformPrediction> {
  const parsed = ManualPredictionCreateSchema.safeParse(input)
  if (!parsed.success) {
    throw new PlatformPredictionError(parsed.error.issues[0]?.message ?? "Invalid manual prediction.", 400)
  }

  const value = parsed.data
  const [game, session] = await Promise.all([
    getPlatformGame(value.gameId),
    getPlatformSession(value.gameId, value.sessionId),
  ])
  if (
    game.status !== "active" ||
    !game.published ||
    session.status !== "active" ||
    !session.published
  ) {
    throw new PlatformPredictionError("Manual predictions require a published active game and session.", 409)
  }

  if (getEffectivePredictionMode(game, session) !== "manual") {
    throw new PlatformPredictionError("Switch the game or session to Manual mode before publishing.", 409)
  }
  if (value.expiresAt !== null && (value.expiresAt <= Date.now() || value.expiresAt > Date.now() + 30 * 24 * 60 * 60 * 1000)) {
    throw new PlatformPredictionError("Expiry must be within the next 30 days.", 400)
  }

  validateManualValues(game.resultFormat, game.supportedResultValues, value.predictionPayload)

  const db = getFirebaseAdminDatabase()
  const systemRecord = await db
    .ref(`canonicalPredictionTargets/${value.gameId}/${value.targetPeriodId}`)
    .get()
  if (systemRecord.exists() && !value.confirmSystemOverride) {
    throw new PlatformPredictionError(
      "A system prediction already exists for this period. Confirm the manual override to publish without changing that system record.",
      409,
    )
  }

  const now = Date.now()
  const record: PlatformPrediction = {
    predictionId: randomUUID(),
    gameId: value.gameId,
    sessionId: value.sessionId,
    targetPeriodId: value.targetPeriodId,
    source: "MANUAL",
    predictionMode: "manual",
    predictionPayload: value.predictionPayload,
    engineVersion: null,
    createdBy: { uid: admin.uid, displayName: admin.displayName },
    note: value.note,
    createdAt: now,
    publishedAt: now,
    expiresAt: value.expiresAt,
    status: "PUBLISHED",
    actualResultId: null,
    verificationStatus: "PENDING",
    verifiedAt: null,
    revisionNumber: 1,
    supersedesSystemPrediction: systemRecord.exists(),
  }

  const reference = db.ref(`${ROOT}/predictions/${value.gameId}/${value.sessionId}/${value.targetPeriodId}`)
  const transaction = await reference.transaction((current) => (current === null ? record : undefined))
  if (!transaction.committed) {
    throw new PlatformPredictionError("A prediction already exists for this game, session, and target period.", 409)
  }
  return record
}

export async function getPublicPlatformPrediction(
  gameId: string,
  sessionId: string,
  targetPeriodId?: string,
): Promise<{
  mode: "system" | "manual"
  prediction: PlatformPrediction | null
  sourceStatus: "SYSTEM" | "MANUAL" | "PENDING" | "UNAVAILABLE"
}> {
  const [game, session] = await Promise.all([
    getPlatformGame(gameId),
    getPlatformSession(gameId, sessionId),
  ])
  if (
    game.status !== "active" ||
    !game.published ||
    session.status !== "active" ||
    !session.published
  ) {
    throw new PlatformStoreError("This game and session are not published.", 404)
  }

  const mode = getEffectivePredictionMode(game, session)
  if (mode === "system") {
    return {
      mode,
      prediction: null,
      sourceStatus: hasLegacySystemPredictionPanel(gameId, sessionId) ? "SYSTEM" : "UNAVAILABLE",
    }
  }

  if (gameId === "wingo-1m") {
    return { mode, prediction: null, sourceStatus: "UNAVAILABLE" }
  }

  const reference = getFirebaseAdminDatabase().ref(`${ROOT}/predictions/${gameId}/${sessionId}`)
  const snapshot = targetPeriodId
    ? await reference.child(targetPeriodId).get()
    : await reference.orderByChild("publishedAt").limitToLast(100).get()
  const now = Date.now()
  const candidates = targetPeriodId
    ? snapshot.exists() ? [snapshot.val()] : []
    : isRecord(snapshot.val()) ? Object.values(snapshot.val()) : []
  const valid = candidates
    .map((candidate) => PlatformPredictionRecordSchema.safeParse(candidate))
    .filter((candidate) => candidate.success)
    .map((candidate) => candidate.data)
    .filter(
      (prediction) =>
        (prediction.status === "PUBLISHED" || prediction.status === "VERIFIED") &&
        prediction.source === "MANUAL" &&
        (prediction.status === "VERIFIED" || prediction.expiresAt === null || prediction.expiresAt > now),
    )
    .sort((left, right) => right.publishedAt - left.publishedAt)

  const prediction = valid[0] ?? null
  return {
    mode,
    prediction,
    sourceStatus: prediction ? "MANUAL" : "PENDING",
  }
}

export async function listPlatformPredictions(
  gameId: string,
  sessionId: string,
): Promise<PlatformPrediction[]> {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gameId) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sessionId)
  ) {
    throw new PlatformPredictionError("Invalid game or session ID.", 400)
  }
  const snapshot = await getFirebaseAdminDatabase()
    .ref(`${ROOT}/predictions/${gameId}/${sessionId}`)
    .orderByChild("publishedAt")
    .limitToLast(100)
    .get()
  if (!isRecord(snapshot.val())) return []
  return Object.values(snapshot.val())
    .map((candidate) => PlatformPredictionRecordSchema.safeParse(candidate))
    .filter((candidate) => candidate.success)
    .map((candidate) => candidate.data)
    .sort((left, right) => right.publishedAt - left.publishedAt)
}

export async function verifyPlatformPrediction(
  gameId: string,
  sessionId: string,
  actual: { periodId: string; result: unknown },
): Promise<PlatformPrediction | null> {
  const reference = getFirebaseAdminDatabase()
    .ref(`${ROOT}/predictions/${gameId}/${sessionId}/${actual.periodId}`)
  const now = Date.now()
  const result = await reference.transaction((current) => {
    const parsed = PlatformPredictionRecordSchema.safeParse(current)
    if (
      !parsed.success ||
      parsed.data.status !== "PUBLISHED" ||
      parsed.data.verificationStatus !== "PENDING" ||
      parsed.data.targetPeriodId !== actual.periodId
    ) {
      return
    }

    const verificationStatus = evaluateManualPrediction(parsed.data.predictionPayload, actual.result)
    return {
      ...parsed.data,
      status: verificationStatus === "WIN" || verificationStatus === "LOSS" ? "VERIFIED" : "PUBLISHED",
      verificationStatus,
      actualResultId: `${gameId}:${sessionId}:${actual.periodId}`,
      verifiedAt: now,
    }
  })

  if (!result.committed) return null
  const parsed = PlatformPredictionRecordSchema.safeParse(result.snapshot.val())
  return parsed.success ? parsed.data : null
}

import "server-only"

import {
  ApiConfigSchema,
  GameCreateSchema,
  GameRecordSchema,
  GameUpdateSchema,
  SessionCreateSchema,
  SessionRecordSchema,
  SessionUpdateSchema,
  type PlatformGame,
  type PlatformSession,
} from "@/lib/platform/schemas"
import { fetchMappedResult, GameApiError } from "@/lib/platform/json-api-adapter"
import { getFirebaseAdminDatabase } from "./firebase-admin"

const ROOT = "platformCatalog"
const WIN_GO_GAME_ID = "wingo-1m"
const WIN_GO_SESSION_ID = "1m"

function assertSlug(value: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new PlatformStoreError("Invalid game or session ID.", 400)
  }
}

export class PlatformStoreError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message)
    this.name = "PlatformStoreError"
  }
}

export interface PlatformGameWithSessions {
  game: PlatformGame
  sessions: PlatformSession[]
}

const legacyWinGoGame: PlatformGame = {
  gameId: WIN_GO_GAME_ID,
  slug: WIN_GO_GAME_ID,
  name: "Win Go 1M",
  description: "Existing Win Go one-minute game.",
  category: "Win Go",
  icon: "timer",
  status: "active",
  published: true,
  adapterType: "legacy-wingo-1m",
  periodFormat: "YYYYMMDD1000NNNNN",
  resultFormat: "number",
  supportedResultValues: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  defaultSessionId: WIN_GO_SESSION_ID,
  predictionMode: "system",
  createdAt: 0,
  updatedAt: 0,
  apiStatus: "unknown",
  lastSuccessfulSyncAt: null,
}

const legacyWinGoSession: PlatformSession = {
  sessionId: WIN_GO_SESSION_ID,
  gameId: WIN_GO_GAME_ID,
  name: "1 Minute",
  durationSeconds: 60,
  periodFormat: "YYYYMMDD1000NNNNN",
  status: "active",
  published: true,
  predictionMode: "system",
  createdAt: 0,
  updatedAt: 0,
  apiStatus: "unknown",
  lastSuccessfulSyncAt: null,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function assertApiConfigValid(game: PlatformGame): void {
  if (game.adapterType === "legacy-wingo-1m") {
    if (game.gameId !== WIN_GO_GAME_ID) {
      throw new PlatformStoreError("The legacy adapter is reserved for Win Go 1M.", 400)
    }
    return
  }

  if (!game.apiConfig || !ApiConfigSchema.safeParse(game.apiConfig).success) {
    throw new PlatformStoreError("A valid mapped API configuration is required.", 400)
  }
}

function hasVerifiedSessionSource(game: PlatformGame, session: PlatformSession): boolean {
  if (
    game.adapterType === "legacy-wingo-1m" &&
    game.gameId === WIN_GO_GAME_ID &&
    session.sessionId === WIN_GO_SESSION_ID &&
    !session.apiConfig
  ) {
    return true
  }
  if (session.apiConfig) return session.apiStatus === "connected"
  return Boolean(game.apiConfig) && (game.apiStatus === "connected" || session.apiStatus === "connected")
}

function validateGameResult(game: PlatformGame, result: unknown): void {
  const supported = new Set(game.supportedResultValues)
  let valid = false

  if (game.resultFormat === "number") {
    const value = typeof result === "number" ? String(result) : typeof result === "string" ? result.trim() : ""
    valid = value !== "" && Number.isFinite(Number(value)) && supported.has(value)
  } else if (game.resultFormat === "string") {
    valid = typeof result === "string" && supported.has(result)
  } else if (game.resultFormat === "color_size") {
    const values =
      typeof result === "string"
        ? result.split(/[,+|]/).map((value) => value.trim()).filter(Boolean)
        : isRecord(result)
          ? Object.values(result).filter((value): value is string | number => typeof value === "string" || typeof value === "number").map(String)
          : []
    valid = values.length > 0 && values.every((value) => supported.has(value))
  } else {
    try {
      valid = typeof result === "object" && result !== null && JSON.stringify(result).length <= 100_000
    } catch {
      valid = false
    }
  }

  if (!valid) {
    throw new GameApiError("The mapped result does not match the configured result format and supported values.", "response")
  }
}

function ensureSelectableGame(game: PlatformGame, sessions: PlatformSession[]): void {
  if (game.status !== "active") {
    throw new PlatformStoreError("Only active games can be published.", 409)
  }
  assertApiConfigValid(game)

  const selectableSessions = sessions.filter(
    (session) =>
      session.status === "active" &&
      session.published &&
      hasVerifiedSessionSource(game, session),
  )
  if (!selectableSessions.length) {
    throw new PlatformStoreError(
      "Publish at least one active session with a verified API connection.",
      409,
    )
  }

  if (
    game.adapterType !== "legacy-wingo-1m" &&
    game.apiStatus !== "connected" &&
    !selectableSessions.some((session) => session.apiStatus === "connected")
  ) {
    throw new PlatformStoreError("Test the configured API successfully before publishing this game.", 409)
  }
}

function parseGameEntries(value: unknown): PlatformGame[] {
  if (value === null) return []
  if (!isRecord(value)) throw new Error("Stored platform games have an invalid shape.")

  return Object.entries(value).map(([key, raw]) => {
    if (!isRecord(raw)) throw new Error(`Stored game ${key} is not an object.`)
    const parsed = GameRecordSchema.safeParse({ ...raw, gameId: raw.gameId ?? key })
    if (!parsed.success || parsed.data.gameId !== key) {
      throw new Error(`Stored game ${key} failed schema validation.`)
    }
    return parsed.data
  })
}

function parseSessionEntries(value: unknown, gameId: string): PlatformSession[] {
  if (value === null) return []
  if (!isRecord(value)) throw new Error(`Stored sessions for ${gameId} have an invalid shape.`)

  return Object.entries(value).map(([key, raw]) => {
    if (!isRecord(raw)) throw new Error(`Stored session ${gameId}/${key} is not an object.`)
    const parsed = SessionRecordSchema.safeParse({ ...raw, sessionId: raw.sessionId ?? key })
    if (!parsed.success || parsed.data.sessionId !== key || parsed.data.gameId !== gameId) {
      throw new Error(`Stored session ${gameId}/${key} failed schema validation.`)
    }
    return parsed.data
  })
}

async function getStoredGame(gameId: string): Promise<PlatformGame> {
  assertSlug(gameId)
  const snapshot = await getFirebaseAdminDatabase().ref(`${ROOT}/games/${gameId}`).get()
  if (!snapshot.exists()) {
    if (gameId === WIN_GO_GAME_ID) return legacyWinGoGame
    throw new PlatformStoreError("Game not found.", 404)
  }
  const parsed = GameRecordSchema.safeParse({ ...snapshot.val(), gameId })
  if (!parsed.success) throw new Error(`Stored game ${gameId} failed schema validation.`)
  return parsed.data
}

export async function getPlatformGame(gameId: string): Promise<PlatformGame> {
  return getStoredGame(gameId)
}

async function getStoredSessions(gameId: string): Promise<PlatformSession[]> {
  assertSlug(gameId)
  const snapshot = await getFirebaseAdminDatabase().ref(`${ROOT}/sessions/${gameId}`).get()
  const sessions = parseSessionEntries(snapshot.val(), gameId)
  if (gameId === WIN_GO_GAME_ID && !sessions.some((session) => session.sessionId === WIN_GO_SESSION_ID)) {
    return [legacyWinGoSession, ...sessions]
  }
  return sessions
}

export async function getPlatformSession(gameId: string, sessionId: string): Promise<PlatformSession> {
  assertSlug(gameId)
  assertSlug(sessionId)
  const session = (await getStoredSessions(gameId)).find((item) => item.sessionId === sessionId)
  if (!session) throw new PlatformStoreError("Session not found.", 404)
  return session
}

export async function listPlatformGames(): Promise<PlatformGameWithSessions[]> {
  const snapshot = await getFirebaseAdminDatabase().ref(`${ROOT}/games`).get()
  const games = parseGameEntries(snapshot.val())
  if (!games.some((game) => game.gameId === WIN_GO_GAME_ID)) games.unshift(legacyWinGoGame)
  games.sort((left, right) => left.name.localeCompare(right.name))

  return Promise.all(
    games.map(async (game) => ({
      game,
      sessions: await getStoredSessions(game.gameId),
    })),
  )
}

export async function getPublicPlatformCatalog() {
  const games = await listPlatformGames()

  return games
    .filter(({ game }) => game.status === "active" && game.published)
    .map(({ game, sessions }) => {
      const availableSessions = sessions.filter(
        (session) =>
          session.status === "active" &&
          session.published &&
          hasVerifiedSessionSource(game, session),
      )
      if (!availableSessions.length) return null

      const publicGame = { ...game }
      delete publicGame.apiConfig
      delete publicGame.latestResult
      return {
        game: publicGame,
        sessions: availableSessions.map((session) => {
          const publicSession = { ...session }
          delete publicSession.apiConfig
          delete publicSession.latestResult
          return publicSession
        }),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
}

export async function createPlatformGame(input: unknown): Promise<PlatformGame> {
  const parsed = GameCreateSchema.safeParse(input)
  if (!parsed.success) {
    throw new PlatformStoreError(parsed.error.issues[0]?.message ?? "Invalid game configuration.", 400)
  }
  const gameInput = parsed.data
  if (gameInput.gameId === WIN_GO_GAME_ID) {
    throw new PlatformStoreError("The existing Win Go 1M game is reserved.", 409)
  }

  const apiStatus = gameInput.adapterType === "legacy-wingo-1m" ? "connected" : "unknown"
  const now = Date.now()
  const record: PlatformGame = {
    ...gameInput,
    createdAt: now,
    updatedAt: now,
    apiStatus,
    lastSuccessfulSyncAt: null,
  }

  assertApiConfigValid(record)
  if (record.published) ensureSelectableGame(record, [])

  const result = await getFirebaseAdminDatabase()
    .ref(`${ROOT}/games/${record.gameId}`)
    .transaction((current) => (current === null ? record : undefined))

  if (!result.committed) throw new PlatformStoreError("A game with this ID already exists.", 409)
  return record
}

export async function updatePlatformGame(gameId: string, input: unknown): Promise<PlatformGame> {
  assertSlug(gameId)
  const patch = GameUpdateSchema.safeParse(input)
  if (!patch.success) {
    throw new PlatformStoreError(patch.error.issues[0]?.message ?? "Invalid game update.", 400)
  }
  if (gameId === WIN_GO_GAME_ID) {
    throw new PlatformStoreError("The existing Win Go 1M configuration is protected.", 409)
  }

  const db = getFirebaseAdminDatabase()
  const reference = db.ref(`${ROOT}/games/${gameId}`)
  const currentSnapshot = await reference.get()
  if (!currentSnapshot.exists()) throw new PlatformStoreError("Game not found.", 404)

  const current = GameRecordSchema.safeParse({ ...currentSnapshot.val(), gameId })
  if (!current.success) throw new Error(`Stored game ${gameId} failed schema validation.`)

  const sourceConfigChanged =
    (patch.data.apiConfig !== undefined &&
      JSON.stringify(patch.data.apiConfig) !== JSON.stringify(current.data.apiConfig)) ||
    (patch.data.resultFormat !== undefined && patch.data.resultFormat !== current.data.resultFormat) ||
    (patch.data.supportedResultValues !== undefined &&
      JSON.stringify(patch.data.supportedResultValues) !== JSON.stringify(current.data.supportedResultValues)) ||
    (patch.data.periodFormat !== undefined && patch.data.periodFormat !== current.data.periodFormat)

  const updated = GameRecordSchema.safeParse({
    ...current.data,
    ...patch.data,
    gameId,
    slug: current.data.slug,
    apiStatus: sourceConfigChanged ? "unknown" : current.data.apiStatus,
    lastSuccessfulSyncAt: sourceConfigChanged ? null : current.data.lastSuccessfulSyncAt,
    latestResult: sourceConfigChanged ? null : current.data.latestResult,
    updatedAt: Date.now(),
  })
  if (!updated.success) {
    throw new PlatformStoreError(updated.error.issues[0]?.message ?? "Invalid game configuration.", 400)
  }

  assertApiConfigValid(updated.data)
  if (updated.data.published) {
    ensureSelectableGame(updated.data, await getStoredSessions(gameId))
  }

  await reference.set(updated.data)
  if (sourceConfigChanged) {
    const sessions = await getStoredSessions(gameId)
    await Promise.all(
      sessions
        .filter((session) => !session.apiConfig)
        .map((session) =>
          db.ref(`${ROOT}/sessions/${gameId}/${session.sessionId}`).update({
            apiStatus: "unknown",
            lastSuccessfulSyncAt: null,
            latestResult: null,
          }),
        ),
    )
  }
  return updated.data
}

export async function deletePlatformGame(gameId: string): Promise<void> {
  assertSlug(gameId)
  if (gameId === WIN_GO_GAME_ID) {
    throw new PlatformStoreError("The existing Win Go 1M game cannot be deleted.", 409)
  }

  const db = getFirebaseAdminDatabase()
  const gameReference = db.ref(`${ROOT}/games/${gameId}`)
  const gameSnapshot = await gameReference.get()
  if (!gameSnapshot.exists()) throw new PlatformStoreError("Game not found.", 404)

  const [sessions, predictionTargets, predictions] = await Promise.all([
    db.ref(`${ROOT}/sessions/${gameId}`).get(),
    db.ref(`canonicalPredictionTargets/${gameId}`).get(),
    db.ref(`canonicalPredictions/${gameId}`).get(),
  ])
  if (sessions.exists() || predictionTargets.exists() || predictions.exists()) {
    throw new PlatformStoreError(
      "This game has sessions or prediction history. Archive it instead of deleting it.",
      409,
    )
  }
  await gameReference.remove()
}

export async function createPlatformSession(gameId: string, input: unknown): Promise<PlatformSession> {
  assertSlug(gameId)
  const parsed = SessionCreateSchema.safeParse(input)
  if (!parsed.success) {
    throw new PlatformStoreError(parsed.error.issues[0]?.message ?? "Invalid session configuration.", 400)
  }
  if (parsed.data.gameId !== gameId) {
    throw new PlatformStoreError("Session gameId must match its parent game.", 400)
  }

  const game = await getStoredGame(gameId)
  if (
    game.adapterType === "legacy-wingo-1m" &&
    parsed.data.sessionId !== WIN_GO_SESSION_ID &&
    !parsed.data.apiConfig
  ) {
    throw new PlatformStoreError(
      "Additional sessions need their own validated JSON API mapping.",
      409,
    )
  }
  if (gameId === WIN_GO_GAME_ID && parsed.data.sessionId === WIN_GO_SESSION_ID) {
    throw new PlatformStoreError("The existing Win Go 1M session is reserved.", 409)
  }
  const now = Date.now()
  const session: PlatformSession = {
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
    apiStatus: "unknown",
    lastSuccessfulSyncAt: null,
  }
  const effectiveApi = session.apiConfig ?? game.apiConfig

  if (session.published && session.status === "active") {
    if (!effectiveApi || !hasVerifiedSessionSource(game, session)) {
      throw new PlatformStoreError("Test the session API successfully before publishing it.", 409)
    }
  }

  const result = await getFirebaseAdminDatabase()
    .ref(`${ROOT}/sessions/${gameId}/${session.sessionId}`)
    .transaction((current) => (current === null ? session : undefined))

  if (!result.committed) throw new PlatformStoreError("A session with this ID already exists.", 409)
  return session
}

export async function updatePlatformSession(
  gameId: string,
  sessionId: string,
  input: unknown,
): Promise<PlatformSession> {
  assertSlug(gameId)
  assertSlug(sessionId)
  if (gameId === WIN_GO_GAME_ID && sessionId === WIN_GO_SESSION_ID) {
    throw new PlatformStoreError("The existing Win Go 1M session is protected.", 409)
  }
  const patch = SessionUpdateSchema.safeParse(input)
  if (!patch.success) {
    throw new PlatformStoreError(patch.error.issues[0]?.message ?? "Invalid session update.", 400)
  }

  const reference = getFirebaseAdminDatabase().ref(`${ROOT}/sessions/${gameId}/${sessionId}`)
  const snapshot = await reference.get()
  if (!snapshot.exists()) throw new PlatformStoreError("Session not found.", 404)

  const current = SessionRecordSchema.safeParse({ ...snapshot.val(), gameId, sessionId })
  if (!current.success) throw new Error(`Stored session ${gameId}/${sessionId} failed schema validation.`)

  const game = await getStoredGame(gameId)
  const apiConfigChanged =
    patch.data.apiConfig !== undefined &&
    JSON.stringify(patch.data.apiConfig) !== JSON.stringify(current.data.apiConfig)
  const updated = SessionRecordSchema.safeParse({
    ...current.data,
    ...patch.data,
    apiStatus: apiConfigChanged ? "unknown" : current.data.apiStatus,
    lastSuccessfulSyncAt: apiConfigChanged ? null : current.data.lastSuccessfulSyncAt,
    latestResult: apiConfigChanged ? null : current.data.latestResult,
    updatedAt: Date.now(),
  })
  if (!updated.success) {
    throw new PlatformStoreError(updated.error.issues[0]?.message ?? "Invalid session configuration.", 400)
  }

  if (updated.data.published && updated.data.status === "active") {
    const isLegacyDefault =
      game.adapterType === "legacy-wingo-1m" &&
      game.gameId === WIN_GO_GAME_ID &&
      sessionId === WIN_GO_SESSION_ID &&
      !updated.data.apiConfig
    const effectiveApi = updated.data.apiConfig ?? game.apiConfig
    if (!isLegacyDefault && (!effectiveApi || !hasVerifiedSessionSource(game, updated.data))) {
      throw new PlatformStoreError("Test the session API successfully before publishing it.", 409)
    }
  }

  await reference.set(updated.data)
  return updated.data
}

export async function deletePlatformSession(gameId: string, sessionId: string): Promise<void> {
  assertSlug(gameId)
  assertSlug(sessionId)
  if (gameId === WIN_GO_GAME_ID && sessionId === WIN_GO_SESSION_ID) {
    throw new PlatformStoreError("The existing Win Go 1M session cannot be deleted.", 409)
  }

  const db = getFirebaseAdminDatabase()
  const reference = db.ref(`${ROOT}/sessions/${gameId}/${sessionId}`)
  const snapshot = await reference.get()
  if (!snapshot.exists()) throw new PlatformStoreError("Session not found.", 404)

  const [predictionTargets, predictions] = await Promise.all([
    db.ref(`canonicalPredictionTargets/${gameId}`).get(),
    db.ref(`canonicalPredictions/${gameId}`).get(),
  ])
  if (predictionTargets.exists() || predictions.exists()) {
    throw new PlatformStoreError(
      "Prediction records exist for this game. Archive the session instead of deleting it.",
      409,
    )
  }
  await reference.remove()
}

export async function listPlatformSessions(gameId: string): Promise<PlatformSession[]> {
  await getStoredGame(gameId)
  return getStoredSessions(gameId)
}

export async function testPlatformApi(
  gameId: string,
  sessionId?: string,
): Promise<{
  success: boolean
  httpStatus: number | null
  mappedPeriod: string | null
  mappedResult: unknown
  timestamp: number | null
  errorCategory?: string
  errorMessage?: string
  lastSuccessfulSyncAt: number | null
}> {
  assertSlug(gameId)
  if (sessionId) assertSlug(sessionId)
  const game = await getStoredGame(gameId)
  let config = game.apiConfig
  let statusReference = getFirebaseAdminDatabase().ref(`${ROOT}/games/${gameId}`)
  let lastSuccessfulSyncAt = game.lastSuccessfulSyncAt

  if (sessionId) {
    const sessions = await getStoredSessions(gameId)
    const session = sessions.find((item) => item.sessionId === sessionId)
    if (!session) throw new PlatformStoreError("Session not found.", 404)
    config = session.apiConfig ?? game.apiConfig
    statusReference = getFirebaseAdminDatabase().ref(`${ROOT}/sessions/${gameId}/${sessionId}`)
    lastSuccessfulSyncAt = session.lastSuccessfulSyncAt
  }

  if (!config) {
    throw new PlatformStoreError("Configure an API mapping before testing this connection.", 409)
  }

  try {
    const result = await fetchMappedResult(config)
    validateGameResult(game, result.result)
    await statusReference.update({
      apiStatus: "connected",
      lastSuccessfulSyncAt: result.fetchedAt,
      updatedAt: Date.now(),
    })
    return {
      success: true,
      httpStatus: result.httpStatus,
      mappedPeriod: result.periodId,
      mappedResult: result.result,
      timestamp: result.timestamp,
      lastSuccessfulSyncAt: result.fetchedAt,
    }
  } catch (error) {
    if (!(error instanceof GameApiError)) throw error
    await statusReference.update({ apiStatus: "error", updatedAt: Date.now() })
    return {
      success: false,
      httpStatus: error.statusCode ?? null,
      mappedPeriod: null,
      mappedResult: null,
      timestamp: null,
      errorCategory: error.category,
      errorMessage: error.message,
      lastSuccessfulSyncAt,
    }
  }
}

export async function fetchPublishedPlatformResult(
  gameId: string,
  sessionId: string,
): Promise<{ periodId: string; result: unknown; timestamp: number | null; fetchedAt: number; cached: boolean }> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gameId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sessionId)) {
      throw new PlatformStoreError("Invalid game or session ID.", 400)
    }

    const game = await getStoredGame(gameId)
    if (game.status !== "active" || !game.published) {
      throw new PlatformStoreError("This game is not currently published.", 404)
    }

    const sessions = await getStoredSessions(gameId)
    const session = sessions.find((item) => item.sessionId === sessionId)
    if (!session || session.status !== "active" || !session.published) {
      throw new PlatformStoreError("This session is not currently published.", 404)
    }
    if (gameId === WIN_GO_GAME_ID && sessionId === WIN_GO_SESSION_ID) {
      throw new PlatformStoreError("Win Go 1M continues through its existing history integration.", 409)
    }

    const config = session.apiConfig ?? game.apiConfig
    if (!config) throw new PlatformStoreError("This session has no mapped API configuration.", 409)

    const statusReference = session.apiConfig
      ? getFirebaseAdminDatabase().ref(`${ROOT}/sessions/${gameId}/${sessionId}`)
      : getFirebaseAdminDatabase().ref(`${ROOT}/games/${gameId}`)
    const cachedResult = session.apiConfig ? session.latestResult : game.latestResult
    const now = Date.now()
    if (cachedResult && cachedResult.result !== undefined && now - cachedResult.fetchedAt < 15_000) {
      return {
        periodId: cachedResult.periodId,
        result: cachedResult.result,
        timestamp: cachedResult.timestamp,
        fetchedAt: cachedResult.fetchedAt,
        cached: true,
      }
    }

    try {
      const result = await fetchMappedResult(config, now)
      validateGameResult(game, result.result)
      const latestResult = {
        periodId: result.periodId,
        result: result.result,
        timestamp: result.timestamp,
        fetchedAt: result.fetchedAt,
      }
      await statusReference.update({
        apiStatus: "connected",
        lastSuccessfulSyncAt: result.fetchedAt,
        latestResult,
        updatedAt: result.fetchedAt,
      })
      return { ...latestResult, cached: false }
    } catch (error) {
      if (!(error instanceof GameApiError)) throw error
      await statusReference.update({ apiStatus: "error", updatedAt: now })
      throw error
  }
}

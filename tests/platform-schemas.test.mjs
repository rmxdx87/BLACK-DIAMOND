import assert from "node:assert/strict"
import test from "node:test"
import {
  ApiConfigSchema,
  GameCreateSchema,
  GameRecordSchema,
  SessionCreateSchema,
  SessionRecordSchema,
} from "../lib/platform/schemas.ts"
import {
  getEffectivePredictionMode,
  hasLegacySystemPredictionPanel,
} from "../lib/platform/prediction-mode.ts"
import { isJsonContentType, isPublicIpv4, normalizeMappedResult } from "../lib/platform/json-api-adapter.ts"

const mappedApi = {
  apiName: "Bingo results",
  baseUrl: "https://results.example.com",
  endpointPath: "/api/latest",
  queryParameters: {},
  authentication: { method: "none" },
  responseMapping: {
    periodField: "data.records.0.issue",
    resultField: "data.records.0.value",
    timestampField: "data.records.0.createdAt",
  },
  timeoutMs: 8000,
  retryCount: 1,
}

const mappedGame = {
  gameId: "bingo-1m",
  slug: "bingo-1m",
  name: "Bingo One Minute",
  description: "",
  category: "Bingo",
  icon: "gamepad-2",
  status: "configuration_incomplete",
  published: false,
  adapterType: "json-mapped",
  periodFormat: "Source-provided ID",
  resultFormat: "number",
  supportedResultValues: ["0", "1", "2"],
  defaultSessionId: null,
  predictionMode: "system",
  apiConfig: mappedApi,
}

test("validates a game-specific mapped API without accepting secret values", () => {
  assert.equal(GameCreateSchema.safeParse(mappedGame).success, true)
  assert.equal(
    ApiConfigSchema.safeParse({
      ...mappedApi,
      authentication: {
        method: "bearer_env",
        secretEnvName: "GAME_API_SECRET_BINGO",
      },
    }).success,
    true,
  )

  assert.equal(
    ApiConfigSchema.safeParse({
      ...mappedApi,
      authentication: {
        method: "bearer_env",
        secretEnvName: "actual-token-value",
      },
    }).success,
    false,
  )
  assert.equal(
    ApiConfigSchema.safeParse({ ...mappedApi, apiKey: "actual-token-value" }).success,
    false,
  )
})

test("inherits a game prediction mode unless a session explicitly overrides it", () => {
  const game = GameCreateSchema.parse(mappedGame)
  const session = SessionCreateSchema.parse({
    sessionId: "bingo-1m",
    gameId: game.gameId,
    name: "One minute",
    durationSeconds: 60,
    periodFormat: game.periodFormat,
    status: "active",
  })

  assert.equal(session.predictionMode, undefined)
  assert.equal(getEffectivePredictionMode(game, session), "system")
  assert.equal(getEffectivePredictionMode({ ...game, predictionMode: "manual" }, session), "manual")
  assert.equal(getEffectivePredictionMode(game, { ...session, predictionMode: "manual" }), "manual")
})

test("only advertises the legacy system prediction panel for its supported session", () => {
  assert.equal(hasLegacySystemPredictionPanel("wingo-1m", "1m"), true)
  assert.equal(hasLegacySystemPredictionPanel("wingo-1m", "30s"), false)
  assert.equal(hasLegacySystemPredictionPanel("bingo-1m", "1m"), false)
})

test("loads cached results when Realtime Database omits a null source timestamp", () => {
  const game = GameCreateSchema.parse(mappedGame)
  const gameRecord = GameRecordSchema.parse({
    ...game,
    createdAt: 1,
    updatedAt: 1,
    apiStatus: "connected",
    lastSuccessfulSyncAt: 2,
    latestResult: { periodId: "p1", result: "1", fetchedAt: 2 },
  })
  const session = SessionCreateSchema.parse({
    sessionId: "bingo-1m",
    gameId: game.gameId,
    name: "One minute",
    durationSeconds: 60,
    periodFormat: game.periodFormat,
    status: "active",
  })
  const sessionRecord = SessionRecordSchema.parse({
    ...session,
    createdAt: 1,
    updatedAt: 1,
    apiStatus: "connected",
    lastSuccessfulSyncAt: 2,
    latestResult: { periodId: "p1", result: "1", fetchedAt: 2 },
  })

  assert.equal(gameRecord.latestResult?.timestamp, null)
  assert.equal(sessionRecord.latestResult?.timestamp, null)
})

test("rejects unsafe API origins and unsupported adapter assignments", () => {
  assert.equal(ApiConfigSchema.safeParse({ ...mappedApi, baseUrl: "http://results.example.com" }).success, false)
  assert.equal(ApiConfigSchema.safeParse({ ...mappedApi, baseUrl: "https://127.0.0.1" }).success, false)
  assert.equal(ApiConfigSchema.safeParse({ ...mappedApi, baseUrl: "https://localhost" }).success, false)
  assert.equal(
    GameCreateSchema.safeParse({
      ...mappedGame,
      gameId: "bingo-2m",
      slug: "bingo-2m",
      adapterType: "legacy-wingo-1m",
      apiConfig: undefined,
    }).success,
    false,
  )
  assert.equal(
    ApiConfigSchema.safeParse({
      ...mappedApi,
      responseMapping: { ...mappedApi.responseMapping, periodField: "data.__proto__.period" },
    }).success,
    false,
  )
})

test("blocks private, loopback, link-local, and reserved IPv4 ranges", () => {
  for (const address of [
    "10.0.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.20.1.2",
    "192.168.1.1",
    "100.64.0.1",
    "224.0.0.1",
  ]) {
    assert.equal(isPublicIpv4(address), false, `${address} must be blocked`)
  }
  assert.equal(isPublicIpv4("8.8.8.8"), true)
  assert.equal(isPublicIpv4("1.1.1.1"), true)
})

test("normalizes mapped response data without assuming a Win Go shape", () => {
  const config = ApiConfigSchema.parse(mappedApi)
  const result = normalizeMappedResult(
    {
      data: {
        records: [{ issue: 8421, value: { numbers: [4, 8, 2] }, createdAt: 1_800_000_000 }],
      },
    },
    config,
    1_800_000_100_000,
  )

  assert.deepEqual(result, {
    periodId: "8421",
    result: { numbers: [4, 8, 2] },
    timestamp: 1_800_000_000_000,
  })

  test("maps the Win Go 30-second history response, including octet-stream JSON", () => {
    const config = ApiConfigSchema.parse({
      apiName: "Win Go 30S history",
      baseUrl: "https://draw.ar-lottery01.com",
      endpointPath: "/WinGo/WinGo_30S/GetHistoryIssuePage.json",
      queryParameters: {},
      authentication: { method: "none" },
      responseMapping: {
        periodField: "data.list.0.issueNumber",
        resultField: "data.list.0.number",
        timestampField: "data.serviceTime",
      },
      timeoutMs: 8000,
      retryCount: 0,
    })

    assert.equal(isJsonContentType("application/octet-stream"), true)
    assert.equal(isJsonContentType("application/json; charset=utf-8"), true)
    assert.equal(isJsonContentType("text/html"), false)
    assert.deepEqual(
      normalizeMappedResult(
        {
          data: {
            list: [{ issueNumber: "20261115100052275", number: "9" }],
            serviceTime: 1_800_000_000_000,
          },
        },
        config,
        1_800_000_100_000,
      ),
      {
        periodId: "20261115100052275",
        result: "9",
        timestamp: 1_800_000_000_000,
      },
    )
  })
})

test("rejects missing mapped values and future timestamps", () => {
  const config = ApiConfigSchema.parse(mappedApi)
  assert.throws(
    () => normalizeMappedResult({ data: { records: [] } }, config),
    /valid mapped period and result/,
  )
  assert.throws(
    () =>
      normalizeMappedResult(
        { data: { records: [{ issue: "A-1", value: 1, createdAt: 1_900_000_000 }] } },
        config,
        1_800_000_000_000,
      ),
    /timestamp is invalid or in the future/,
  )
})

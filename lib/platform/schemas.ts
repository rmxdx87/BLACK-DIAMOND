import { z } from "zod"

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.")

const fieldPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*(?:\.(?:[A-Za-z_$][A-Za-z0-9_$]*|[0-9]{1,6}))*$/)
  .refine((path) => !path.split(".").some((part) => ["__proto__", "prototype", "constructor"].includes(part)))

const safeBaseUrlSchema = z.string().url().refine((value) => {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      !url.hostname.startsWith("[") &&
      !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname) &&
      url.hostname !== "localhost" &&
      !url.hostname.endsWith(".localhost") &&
      !url.hostname.endsWith(".local")
    )
  } catch {
    return false
  }
}, "API base URL must be an HTTPS hostname without credentials, port, or query.")

export const ApiConfigSchema = z.object({
  apiName: z.string().trim().min(2).max(80),
  baseUrl: safeBaseUrlSchema,
  endpointPath: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .refine((value) => value.startsWith("/") && !value.startsWith("//")),
  queryParameters: z.record(z.string().max(100), z.string().max(500)).default({}),
  authentication: z.discriminatedUnion("method", [
    z.object({ method: z.literal("none") }).strict(),
    z
      .object({
        method: z.literal("bearer_env"),
        secretEnvName: z.string().regex(/^GAME_API_SECRET_[A-Z0-9_]{1,60}$/),
      })
      .strict(),
    z
      .object({
        method: z.literal("header_env"),
        headerName: z
          .string()
          .regex(/^[A-Za-z0-9-]{1,64}$/)
          .refine((name) => !["host", "connection", "content-length"].includes(name.toLowerCase())),
        secretEnvName: z.string().regex(/^GAME_API_SECRET_[A-Z0-9_]{1,60}$/),
      })
      .strict(),
  ]),
  responseMapping: z
    .object({
      periodField: fieldPathSchema,
      resultField: fieldPathSchema,
      timestampField: fieldPathSchema.optional(),
    })
    .strict(),
  timeoutMs: z.number().int().min(1000).max(15000).default(8000),
  retryCount: z.number().int().min(0).max(3).default(1),
}).strict()

const gameFieldsSchema = z.object({
  gameId: slugSchema,
  slug: slugSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  category: z.string().trim().min(2).max(50),
  icon: z.string().trim().max(40).default("gamepad-2"),
  artworkUrl: z.string().url().refine((value) => value.startsWith("https://")).optional(),
  status: z.enum([
    "active",
    "inactive",
    "maintenance",
    "api_unavailable",
    "configuration_incomplete",
    "archived",
  ]),
  published: z.boolean().default(false),
  adapterType: z.enum(["legacy-wingo-1m", "json-mapped"]),
  periodFormat: z.string().trim().min(1).max(120),
  resultFormat: z.enum(["number", "color_size", "string", "json"]),
  supportedResultValues: z.array(z.string().trim().min(1).max(100)).min(1).max(100),
  defaultSessionId: slugSchema.nullable().default(null),
  predictionMode: z.enum(["system", "manual"]).default("system"),
  apiConfig: ApiConfigSchema.optional(),
}).strict()

export const GameCreateSchema = gameFieldsSchema.superRefine((game, context) => {
  if (game.slug !== game.gameId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["slug"],
      message: "Game slug must match the stable game ID.",
    })
  }
  if (game.adapterType === "legacy-wingo-1m" && game.gameId !== "wingo-1m") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["adapterType"],
      message: "The legacy Win Go adapter is reserved for wingo-1m.",
    })
  }
  if (game.adapterType === "json-mapped" && !game.apiConfig) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["apiConfig"],
      message: "A validated API mapping is required for the JSON adapter.",
    })
  }
})

export const GameRecordSchema = gameFieldsSchema.extend({
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  apiStatus: z.enum(["unknown", "connected", "error"]),
  lastSuccessfulSyncAt: z.number().int().nonnegative().nullable(),
  latestResult: z.object({
    periodId: z.string().min(1).max(160),
    result: z.unknown(),
    timestamp: z.number().int().positive().nullable().default(null),
    fetchedAt: z.number().int().positive(),
  }).strict().nullable().optional(),
})

export const GameUpdateSchema = gameFieldsSchema
  .omit({ gameId: true, slug: true, predictionMode: true })
  .partial()
  .strict()

const sessionFieldsSchema = z.object({
  sessionId: slugSchema,
  gameId: slugSchema,
  name: z.string().trim().min(2).max(80),
  durationSeconds: z.number().int().min(1).max(7 * 24 * 60 * 60),
  periodFormat: z.string().trim().min(1).max(120),
  status: z.enum(["active", "inactive", "maintenance", "archived"]),
  published: z.boolean().default(false),
  predictionMode: z.enum(["system", "manual"]).optional(),
  apiConfig: ApiConfigSchema.optional(),
}).strict()

export const SessionCreateSchema = sessionFieldsSchema
export const SessionRecordSchema = sessionFieldsSchema.extend({
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  apiStatus: z.enum(["unknown", "connected", "error"]),
  lastSuccessfulSyncAt: z.number().int().nonnegative().nullable(),
  latestResult: z.object({
    periodId: z.string().min(1).max(160),
    result: z.unknown(),
    timestamp: z.number().int().positive().nullable().default(null),
    fetchedAt: z.number().int().positive(),
  }).strict().nullable().optional(),
})
export const SessionUpdateSchema = sessionFieldsSchema
  .omit({ sessionId: true, gameId: true, predictionMode: true })
  .partial()
  .strict()

export const ManualPredictionPayloadSchema = z.object({
  numberCandidates: z.array(z.string().trim().min(1).max(16)).max(10).optional(),
  colorCandidates: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  sizeCandidates: z.array(z.string().trim().min(1).max(40)).max(4).optional(),
  result: z.unknown().optional(),
}).strict().refine(
  (payload) =>
    Boolean(
      payload.numberCandidates?.length ||
      payload.colorCandidates?.length ||
      payload.sizeCandidates?.length ||
      payload.result !== undefined,
    ),
  "Enter at least one supported prediction value.",
)

export const ManualPredictionCreateSchema = z.object({
  gameId: slugSchema,
  sessionId: slugSchema,
  targetPeriodId: z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/),
  predictionPayload: ManualPredictionPayloadSchema,
  note: z.string().trim().max(1000).default(""),
  expiresAt: z.number().int().positive().nullable().default(null),
  confirmSystemOverride: z.boolean().default(false),
}).strict()

export const PlatformPredictionRecordSchema = z.object({
  predictionId: z.string().min(1).max(100),
  gameId: slugSchema,
  sessionId: slugSchema,
  targetPeriodId: z.string().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/),
  source: z.enum(["SYSTEM", "MANUAL"]),
  predictionMode: z.enum(["system", "manual"]),
  predictionPayload: ManualPredictionPayloadSchema,
  engineVersion: z.string().max(100).nullable(),
  createdBy: z.object({
    uid: z.string().min(1).max(128),
    displayName: z.string().min(1).max(120),
  }).strict().nullable(),
  note: z.string().max(1000),
  createdAt: z.number().int().positive(),
  publishedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "PENDING", "VERIFIED", "EXPIRED", "CANCELLED", "SUPERSEDED"]),
  actualResultId: z.string().max(300).nullable(),
  verificationStatus: z.enum(["WIN", "LOSS", "PENDING", "UNVERIFIED", "VOID"]),
  verifiedAt: z.number().int().positive().nullable(),
  revisionNumber: z.number().int().positive(),
  supersedesSystemPrediction: z.boolean(),
}).strict()

export type PlatformApiConfig = z.infer<typeof ApiConfigSchema>
export type PlatformGame = z.infer<typeof GameRecordSchema>
export type PlatformSession = z.infer<typeof SessionRecordSchema>
export type PlatformPredictionRecord = z.infer<typeof PlatformPredictionRecordSchema>

import { lookup } from "node:dns/promises"
import https from "node:https"
import { isIP } from "node:net"
import { ApiConfigSchema, type PlatformApiConfig } from "./schemas.ts"

export type ApiErrorCategory = "configuration" | "dns" | "network" | "timeout" | "http" | "response"

export class GameApiError extends Error {
  constructor(
    message: string,
    readonly category: ApiErrorCategory,
    readonly statusCode?: number,
  ) {
    super(message)
    this.name = "GameApiError"
  }
}

export interface NormalizedApiResult {
  periodId: string
  result: unknown
  timestamp: number | null
}

export interface FetchedApiResult extends NormalizedApiResult {
  httpStatus: number
  fetchedAt: number
}

export function isJsonContentType(value: string): boolean {
  const mediaType = value.split(";", 1)[0].trim().toLowerCase()
  // Some result feeds label JSON as octet-stream; JSON.parse still validates the body.
  return (
    mediaType === "application/json" ||
    mediaType.endsWith("+json") ||
    mediaType === "application/octet-stream"
  )
}

export function isPublicIpv4(address: string): boolean {
  const octets = address.split(".").map(Number)
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }

  const [first, second, third] = octets
  if (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 198 && (second === 18 || second === 19 || second === 51)) ||
    (first === 203 && second === 0 && third === 113)
  ) {
    return false
  }
  return true
}

async function resolvePublicAddress(hostname: string): Promise<{ address: string; family: 4 }> {
  if (isIP(hostname)) throw new GameApiError("IP-literal API hosts are not allowed.", "configuration")

  let addresses: Awaited<ReturnType<typeof lookup>>[]
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new GameApiError("The configured API host could not be resolved.", "dns")
  }

  const ipv4Addresses = addresses.filter((entry) => entry.family === 4)
  if (!ipv4Addresses.length || ipv4Addresses.some((entry) => !isPublicIpv4(entry.address))) {
    throw new GameApiError("The API host resolves to a restricted network address.", "configuration")
  }
  return { address: ipv4Addresses[0].address, family: 4 }
}

function readPath(root: unknown, path: string): unknown {
  let value = root
  for (const part of path.split(".")) {
    if (Array.isArray(value) && /^\d+$/.test(part)) {
      value = value[Number(part)]
      continue
    }
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.prototype.hasOwnProperty.call(value, part)
    ) {
      return undefined
    }
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

export function normalizeMappedResult(
  payload: unknown,
  config: PlatformApiConfig,
  now = Date.now(),
): NormalizedApiResult {
  const periodValue = readPath(payload, config.responseMapping.periodField)
  const result = readPath(payload, config.responseMapping.resultField)
  const timestampValue = config.responseMapping.timestampField
    ? readPath(payload, config.responseMapping.timestampField)
    : undefined

  if (
    (typeof periodValue !== "string" && typeof periodValue !== "number") ||
    !/^[A-Za-z0-9_-]{1,160}$/.test(String(periodValue).trim()) ||
    result === undefined ||
    result === null
  ) {
    throw new GameApiError("The response did not contain a valid mapped period and result.", "response")
  }

  let timestamp: number | null = null
  if (timestampValue !== undefined && timestampValue !== null) {
    if (typeof timestampValue === "number" && Number.isFinite(timestampValue)) {
      timestamp = timestampValue < 100_000_000_000 ? timestampValue * 1000 : timestampValue
    } else if (typeof timestampValue === "string") {
      const parsed = Date.parse(timestampValue)
      if (Number.isFinite(parsed)) timestamp = parsed
    }
    if (timestamp === null || timestamp <= 0 || timestamp > now + 10 * 60_000) {
      throw new GameApiError("The response timestamp is invalid or in the future.", "response")
    }
  }

  return { periodId: String(periodValue).trim(), result, timestamp }
}

function buildRequestUrl(config: PlatformApiConfig): URL {
  try {
    const base = new URL(config.baseUrl)
    const target = new URL(config.endpointPath, base)
    if (
      target.protocol !== "https:" ||
      target.origin !== base.origin ||
      target.username ||
      target.password ||
      target.hash
    ) {
      throw new Error("Invalid target origin.")
    }
    for (const [key, value] of Object.entries(config.queryParameters)) {
      target.searchParams.set(key, value)
    }
    return target
  } catch {
    throw new GameApiError("The API URL or endpoint is invalid.", "configuration")
  }
}

async function requestJson(
  target: URL,
  config: PlatformApiConfig,
): Promise<{ payload: unknown; status: number }> {
  const pinnedAddress = await resolvePublicAddress(target.hostname)
  const headers: Record<string, string> = { Accept: "application/json" }

  if (config.authentication.method !== "none") {
    const secret = process.env[config.authentication.secretEnvName]
    if (!secret || /[\r\n]/.test(secret)) {
      throw new GameApiError("The configured API secret is missing or invalid.", "configuration")
    }
    if (config.authentication.method === "bearer_env") {
      headers.Authorization = `Bearer ${secret}`
    } else {
      headers[config.authentication.headerName] = secret
    }
  }

  return new Promise((resolve, reject) => {
    let settled = false
    let totalBytes = 0
    const chunks: Buffer[] = []
    const fail = (error: GameApiError) => {
      if (settled) return
      settled = true
      reject(error)
    }

    const request = https.request(
      target,
      {
        method: "GET",
        headers,
        servername: target.hostname,
        lookup: (hostname, options, callback) => {
          if (hostname.toLowerCase() !== target.hostname.toLowerCase()) {
            const error = Object.assign(new Error("Unexpected API host."), { code: "EPERM" })
            callback(error, "", 4)
            return
          }
          if ("all" in options && options.all) {
            callback(null, [{ address: pinnedAddress.address, family: pinnedAddress.family }])
          } else {
            callback(null, pinnedAddress.address, pinnedAddress.family)
          }
        },
      },
      (response) => {
        const status = response.statusCode ?? 0
        if (status >= 300 && status < 400) {
          response.resume()
          fail(new GameApiError("Redirect responses are not allowed for game APIs.", "http", status))
          return
        }
        if (status < 200 || status >= 300) {
          response.resume()
          fail(new GameApiError(`The configured API returned HTTP ${status}.`, "http", status))
          return
        }

        const contentType = response.headers["content-type"] ?? ""
        if (!isJsonContentType(contentType)) {
          response.resume()
          fail(new GameApiError("The configured API did not return JSON.", "response", status))
          return
        }

        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          totalBytes += buffer.byteLength
          if (totalBytes > 1_000_000) {
            response.destroy()
            fail(new GameApiError("The API response exceeded the 1 MB safety limit.", "response", status))
            return
          }
          chunks.push(buffer)
        })
        response.on("end", () => {
          if (settled) return
          try {
            const payload: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"))
            settled = true
            resolve({ payload, status })
          } catch {
            fail(new GameApiError("The configured API returned malformed JSON.", "response", status))
          }
        })
        response.on("error", () => {
          fail(new GameApiError("The API response could not be read.", "network", status))
        })
      },
    )

    request.setTimeout(config.timeoutMs, () => {
      request.destroy(new Error("Game API request timed out."))
      fail(new GameApiError("The configured API request timed out.", "timeout"))
    })
    request.on("error", (error: NodeJS.ErrnoException) => {
      fail(
        new GameApiError(
          error.code === "ETIMEDOUT"
            ? "The configured API request timed out."
            : "The configured API could not be reached.",
          error.code === "ETIMEDOUT" ? "timeout" : "network",
        ),
      )
    })
    request.end()
  })
}

export async function fetchMappedResult(
  configInput: unknown,
  now = Date.now(),
): Promise<FetchedApiResult> {
  const parsedConfig = ApiConfigSchema.safeParse(configInput)
  if (!parsedConfig.success) {
    throw new GameApiError("The API configuration is invalid.", "configuration")
  }

  const config = parsedConfig.data
  const target = buildRequestUrl(config)
  let lastError: GameApiError | null = null

  for (let attempt = 0; attempt <= config.retryCount; attempt += 1) {
    try {
      const response = await requestJson(target, config)
      const mapped = normalizeMappedResult(response.payload, config, now)
      return { ...mapped, httpStatus: response.status, fetchedAt: now }
    } catch (error) {
      if (!(error instanceof GameApiError)) throw error
      lastError = error
      if (attempt === config.retryCount || error.category === "configuration" || error.category === "response" || error.category === "http") {
        break
      }
    }
  }

  throw lastError ?? new GameApiError("The game API request failed.", "network")
}

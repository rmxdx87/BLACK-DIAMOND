import type { GameResult } from "./types"

const API_URL = "/api/wingo-history"
const SUPPORTED_COLORS = new Set(["red", "green", "violet"] as const)
type SupportedColor = "red" | "green" | "violet"

export type HistoricalApiRecord = Readonly<Record<string, unknown>>

export interface HistoricalApiResponse {
  data: {
    list: HistoricalApiRecord[]
    pageNo: number
    totalPage: number
    totalCount: number
    /** Optional lifecycle fields exposed by some source deployments. */
    currentPeriod?: unknown
    activePeriod?: unknown
    nextPeriod?: unknown
    currentIssue?: unknown
    activeIssue?: unknown
    nextIssue?: unknown
    currentIssueNumber?: unknown
    activeIssueNumber?: unknown
    nextIssueNumber?: unknown
    nextRoundTimestamp?: unknown
  }
  code: number
  msg: string
  msgCode: number
  serviceTime: number
}

export interface NormalizedGameResult extends GameResult {
  colors: SupportedColor[]
  sum: number
  originalRecord: HistoricalApiRecord
}

export interface HistoricalPage {
  records: NormalizedGameResult[]
  pageNo: number
  totalPage: number
  totalCount: number
  serviceTime: number
  duplicateCount: number
  rejectedRecords: RejectedHistoricalRecord[]
  currentPeriodId: string | null
  activePeriodId: string | null
  nextPeriodId: string | null
  nextRoundTimestamp: number | null
  recordsReceived: number
  validRecordCount: number
}

export interface HistoryFetchResult {
  records: NormalizedGameResult[]
  pagesFetched: number
  apiRecordsReceived: number
  validRecordCount: number
  uniqueRecordCount: number
  sourceTotalCount: number
  sourceHistoryLimit: number
  invalidRecordCount: number
  duplicateCount: number
  lastServiceTime: number | null
  currentPeriodId: string | null
  activePeriodId: string | null
  nextPeriodId: string | null
  nextRoundTimestamp: number | null
  paginationIssue: string | null
}

export interface RejectedHistoricalRecord {
  index: number
  period: string | null
  reason: string
}

export class ApiResponseError extends Error {
  constructor(message: string, public readonly code?: number) {
    super(message)
    this.name = "ApiResponseError"
  }
}

function parseInteger(value: unknown, field: string): number {
  if (typeof value === "string" && !value.trim()) throw new ApiResponseError(`Missing ${field}`)
  const parsed = typeof value === "number" ? value : Number(String(value).trim())
  if (!Number.isInteger(parsed)) throw new ApiResponseError(`Invalid ${field}`)
  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function optionalPeriod(value: unknown): string | null {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim()
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value)
  return null
}

function firstPeriod(data: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const period = optionalPeriod(data[key])
    if (period) return period
  }
  return null
}

export function normalizeHistoricalRecord(input: unknown): NormalizedGameResult {
  if (!isRecord(input)) throw new ApiResponseError("Historical record must be an object")
  const record = input
  const period = typeof record.issueNumber === "string" ? record.issueNumber.trim() : ""
  if (!period) throw new ApiResponseError("Missing issueNumber/period")
  if (!/^\d+$/.test(period)) throw new ApiResponseError(`Invalid numeric issueNumber/period: ${period}`)

  const number = parseInteger(record.number, "number")
  if (number < 0 || number > 9) throw new ApiResponseError(`Number out of range for period ${period}`)

  if (typeof record.color !== "string") throw new ApiResponseError(`Missing color for period ${period}`)
  const rawColors = record.color.split(",").map((color) => color.trim().toLowerCase())
  if (rawColors.some((color) => !SUPPORTED_COLORS.has(color as SupportedColor))) {
    throw new ApiResponseError(`Invalid color membership for period ${period}`)
  }
  const colors = [...new Set(rawColors)] as SupportedColor[]
  if (colors.length === 0) throw new ApiResponseError(`No supported color for period ${period}`)

  const premium = parseInteger(record.premium, "premium")
  const sum = parseInteger(record.sum, "sum")

  return {
    period,
    number,
    color: colors[0], // Legacy UI compatibility; `colors` retains every API category.
    colors,
    premium,
    sum,
    size: null, // The API does not provide size; never infer it from number.
    timestamp: null,
    originalRecord: record,
  }
}

export function parseHistoricalApiResponse(input: unknown): HistoricalPage {
  if (!isRecord(input)) throw new ApiResponseError("API response must be an object")
  const responseCode = input.code
  if (responseCode !== 0) {
    const message = typeof input.msg === "string" ? input.msg : "API returned an unsuccessful code"
    throw new ApiResponseError(message, typeof responseCode === "number" ? responseCode : undefined)
  }
  const data = input.data
  if (!isRecord(data) || !Array.isArray(data.list)) throw new ApiResponseError("Missing data.list")

  const pageNo = parseInteger(data.pageNo, "pageNo")
  const totalPage = parseInteger(data.totalPage, "totalPage")
  const totalCount = parseInteger(data.totalCount, "totalCount")
  const serviceTime = parseInteger(input.serviceTime, "serviceTime")
  if (pageNo < 1 || totalPage < 1 || pageNo > totalPage || totalCount < 0) {
    throw new ApiResponseError("Invalid pagination metadata")
  }

  const seen = new Set<string>()
  const records: NormalizedGameResult[] = []
  const rejectedRecords: RejectedHistoricalRecord[] = []
  let duplicateCount = 0
  let validRecordCount = 0
  for (const [index, item] of data.list.entries()) {
    const periodValue = isRecord(item) && typeof item.issueNumber === "string" ? item.issueNumber.trim() : ""
    const rawPeriod = periodValue || null
    try {
      const normalized = normalizeHistoricalRecord(item)
      validRecordCount++
      if (seen.has(normalized.period)) {
        duplicateCount++
        continue
      }
      seen.add(normalized.period)
      records.push(normalized)
    } catch (error) {
      rejectedRecords.push({
        index,
        period: rawPeriod,
        reason: error instanceof Error ? error.message : "Unknown record validation error",
      })
    }
  }
  const nextRoundTimestamp = data.nextRoundTimestamp === undefined
    ? null
    : parseInteger(data.nextRoundTimestamp, "nextRoundTimestamp")
  if (nextRoundTimestamp !== null && nextRoundTimestamp <= 0) {
    throw new ApiResponseError("Invalid nextRoundTimestamp")
  }

  return {
    records,
    pageNo,
    totalPage,
    totalCount,
    serviceTime,
    duplicateCount,
    rejectedRecords,
    currentPeriodId: firstPeriod(data, ["currentPeriod", "currentIssue", "currentIssueNumber"]),
    activePeriodId: firstPeriod(data, ["activePeriod", "activeIssue", "activeIssueNumber"]),
    nextPeriodId: firstPeriod(data, ["nextPeriod", "nextIssue", "nextIssueNumber"]),
    nextRoundTimestamp,
    recordsReceived: data.list.length,
    validRecordCount,
  }
}

export class JalwaApiService {
  private static instance: JalwaApiService
  private cache = new Map<string, { data: NormalizedGameResult[]; timestamp: number; audit: Omit<HistoryFetchResult, "records" | "pagesFetched"> }>()
  private readonly cacheDuration = 10000

  static getInstance(): JalwaApiService {
    if (!JalwaApiService.instance) JalwaApiService.instance = new JalwaApiService()
    return JalwaApiService.instance
  }

  async fetchPage(pageNo = 1, signal?: AbortSignal, pageSize = 10): Promise<HistoricalPage> {
    if (!Number.isInteger(pageNo) || pageNo < 1) throw new Error("pageNo must be a positive integer")
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("pageSize must be between 1 and 1000")
    const url = new URL(API_URL, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
    url.searchParams.set("pageNo", String(pageNo))
    url.searchParams.set("pageSize", String(pageSize))

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*", "Cache-Control": "no-cache" },
      cache: "no-store",
      signal,
    })
    if (response.status === 429) throw new Error("API rate limit reached (HTTP 429). Retry after a delay.")
    if (!response.ok) throw new Error(`Historical API request failed: HTTP ${response.status}`)
    return parseHistoricalApiResponse(await response.json())
  }

  async fetchPageWithRetry(pageNo = 1, signal?: AbortSignal, pageSize = 10): Promise<HistoricalPage> {
    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError")
      try {
        return await this.fetchPage(pageNo, signal, pageSize)
      } catch (error) {
        lastError = error
        if (error instanceof Error && error.name === "AbortError") throw error
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unable to fetch historical data")
  }

  async fetchHistoryData(limit = Number.MAX_SAFE_INTEGER, signal?: AbortSignal): Promise<NormalizedGameResult[]> {
    return (await this.fetchHistoryDataWithAudit(limit, signal)).records
  }

  async fetchHistoryDataWithAudit(limit = Number.MAX_SAFE_INTEGER, signal?: AbortSignal): Promise<HistoryFetchResult> {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("History limit must be a positive safe integer")
    const cacheKey = `history_${limit}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return {
        records: cached.data.slice(0, limit),
        pagesFetched: 0,
        ...cached.audit,
      }
    }

    const pageSize = 10
    const firstPage = await this.fetchPageWithRetry(1, signal, pageSize)
    const allRecords = new Map<string, NormalizedGameResult>()
    for (const record of firstPage.records) allRecords.set(record.period, record)
    let requestsMade = 1
    let paginationIssue: string | null = null
    let apiRecordsReceived = firstPage.recordsReceived
    let validRecordCount = firstPage.validRecordCount
    let invalidRecordCount = firstPage.rejectedRecords.length
    let duplicateCount = firstPage.duplicateCount
    let lastPage = firstPage
    const effectiveLimit = Math.min(limit, firstPage.totalCount)
    const totalPages = Math.min(firstPage.totalPage, Math.ceil(effectiveLimit / pageSize))
    for (let pageNo = 2; pageNo <= totalPages && allRecords.size < effectiveLimit; pageNo++) {
      let page: HistoricalPage
      try {
        page = await this.fetchPageWithRetry(pageNo, signal, pageSize)
      } catch (error) {
        if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error
        const reason = error instanceof Error ? error.message : "Unknown pagination error"
        paginationIssue = `Could not fetch requested page ${pageNo}: ${reason}`
        break
      }
      requestsMade++
      apiRecordsReceived += page.recordsReceived
      validRecordCount += page.validRecordCount
      invalidRecordCount += page.rejectedRecords.length
      duplicateCount += page.duplicateCount
      lastPage = page

      let newRecords = 0
      for (const record of page.records) {
        if (allRecords.has(record.period)) {
          duplicateCount++
          continue
        }
        allRecords.set(record.period, record)
        newRecords++
      }
      if (page.pageNo !== pageNo) {
        paginationIssue = `Requested page ${pageNo}, but the source returned page ${page.pageNo}.`
        break
      }
      if (page.totalPage !== firstPage.totalPage || page.totalCount !== firstPage.totalCount) {
        paginationIssue = `Pagination metadata changed while fetching page ${pageNo}.`
        break
      }
      if (newRecords === 0) {
        paginationIssue = `Requested page ${pageNo}, but the source repeated records from an earlier page.`
        break
      }
    }
    const records = [...allRecords.values()]
      .sort((left, right) => comparePeriodIds(left.period, right.period))
      .slice(0, limit)
    const audit = {
      apiRecordsReceived,
      validRecordCount,
      uniqueRecordCount: records.length,
      sourceTotalCount: firstPage.totalCount,
      sourceHistoryLimit: firstPage.totalCount,
      invalidRecordCount,
      duplicateCount,
      lastServiceTime: lastPage.serviceTime,
      currentPeriodId: firstPage.currentPeriodId,
      activePeriodId: firstPage.activePeriodId,
      nextPeriodId: firstPage.nextPeriodId,
      nextRoundTimestamp: firstPage.nextRoundTimestamp,
      paginationIssue,
    }
    this.cache.set(cacheKey, { data: records, timestamp: Date.now(), audit })
    return { records, ...audit, pagesFetched: requestsMade }
  }

  async fetchLatestResult(forceRefresh = false): Promise<NormalizedGameResult | null> {
    if (forceRefresh) this.clearCache()
    const records = await this.fetchHistoryData()
    return records[0] ?? null
  }

  async forceRefreshLatest(): Promise<NormalizedGameResult | null> {
    return this.fetchLatestResult(true)
  }

  clearCache(): void { this.cache.clear() }
}

function comparePeriodIds(left: string, right: string): number {
  const normalizedLeft = left.replace(/^0+(?=\d)/, "")
  const normalizedRight = right.replace(/^0+(?=\d)/, "")
  if (normalizedLeft.length !== normalizedRight.length) return normalizedRight.length - normalizedLeft.length
  return normalizedRight.localeCompare(normalizedLeft)
}

export const apiService = JalwaApiService.getInstance()

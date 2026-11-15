"use client"

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react"
import { apiService } from "@/lib/api"
import type { GameResult } from "@/lib/types"
import { resolvePeriodLifecycle, type PeriodLifecycle } from "@/lib/period-management"

interface UseGameDataReturn {
  results: GameResult[]
  latestResult: GameResult | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  nextRoundCountdown: number
  lastSuccessfulSyncAt: number | null
  duplicateRecords: number | null
  rejectedRecordCount: number | null
  historyAudit: {
    pagesFetched: number
    apiRecordsReceived: number
    validRecordCount: number
    uniqueRecordCount: number
    sourceTotalCount: number
    sourceHistoryLimit: number
    invalidRecordCount: number
    duplicateCount: number
    paginationIssue: string | null
  } | null
  periodLifecycle: PeriodLifecycle | null
}

const REFRESH_INTERVAL_KEY = "black-diamond:refresh-seconds"
const REFRESH_INTERVAL_EVENT = "blackDiamondRefreshIntervalChanged"
const ANALYSIS_HISTORY_LIMIT = 100
let refreshPreferenceErrorLogged = false

function getRefreshPreferenceSnapshot(): string {
  try {
    const stored = localStorage.getItem(REFRESH_INTERVAL_KEY)
    return stored && ["10", "30", "60"].includes(stored) ? stored : "10"
  } catch (error) {
    if (!refreshPreferenceErrorLogged) {
      console.error("[MyHack] Could not read the data refresh preference:", error)
      refreshPreferenceErrorLogged = true
    }
    return "10"
  }
}

function subscribeToRefreshPreference(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  const handleChange = () => onChange()
  window.addEventListener(REFRESH_INTERVAL_EVENT, handleChange)
  window.addEventListener("storage", handleChange)
  return () => {
    window.removeEventListener(REFRESH_INTERVAL_EVENT, handleChange)
    window.removeEventListener("storage", handleChange)
  }
}

export function useGameData(): UseGameDataReturn {
  const [results, setResults] = useState<GameResult[]>([])
  const [latestResult, setLatestResult] = useState<GameResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextRoundCountdown, setNextRoundCountdown] = useState(0)
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<number | null>(null)
  const [duplicateRecords, setDuplicateRecords] = useState<number | null>(null)
  const [rejectedRecordCount, setRejectedRecordCount] = useState<number | null>(null)
  const [periodLifecycle, setPeriodLifecycle] = useState<PeriodLifecycle | null>(null)
  const [historyAudit, setHistoryAudit] = useState<UseGameDataReturn["historyAudit"]>(null)
  const activeRequestRef = useRef<AbortController | null>(null)
  const refreshIntervalMs = Number(useSyncExternalStore(
    subscribeToRefreshPreference,
    getRefreshPreferenceSnapshot,
    () => "10",
  )) * 1000

  const fetchData = useCallback(async (forceRefresh = false) => {
    const controller = new AbortController()
    try {
      setLoading(true)
      setError(null)

      if (forceRefresh) apiService.clearCache()
      activeRequestRef.current?.abort()
      activeRequestRef.current = controller
      const history = await apiService.fetchHistoryDataWithAudit(ANALYSIS_HISTORY_LIMIT, controller.signal)
      if (activeRequestRef.current !== controller) return
      const receivedAt = Date.now()
      const loadedResults = history.records
      setResults(loadedResults)
      setLatestResult(loadedResults[0] ?? null)
      setDuplicateRecords(history.duplicateCount)
      setRejectedRecordCount(history.invalidRecordCount)
      setHistoryAudit({
        pagesFetched: history.pagesFetched,
        apiRecordsReceived: history.apiRecordsReceived,
        validRecordCount: history.validRecordCount,
        uniqueRecordCount: history.uniqueRecordCount,
        sourceTotalCount: history.sourceTotalCount,
        sourceHistoryLimit: history.sourceHistoryLimit,
        invalidRecordCount: history.invalidRecordCount,
        duplicateCount: history.duplicateCount,
        paginationIssue: history.paginationIssue,
      })
      setPeriodLifecycle(resolvePeriodLifecycle({
        records: loadedResults,
        serviceTime: history.lastServiceTime ?? 0,
        currentPeriodId: history.currentPeriodId,
        activePeriodId: history.activePeriodId,
        nextPeriodId: history.nextPeriodId,
        nextRoundTimestamp: history.nextRoundTimestamp,
      }, "wingo-1m", receivedAt))
      setLastSuccessfulSyncAt(Date.now())
      console.log(`[v0] Game data updated - Latest period: ${loadedResults[0]?.period || "N/A"}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data"
      if (activeRequestRef.current === controller && err instanceof Error && err.name !== "AbortError") {
        setError(errorMessage)
        setPeriodLifecycle((current) => current ? {
          ...current,
          targetPeriod: null,
          targetPeriodId: null,
          nextRoundTimestamp: null,
          periodStatus: "unavailable",
          targetPeriodStatus: "unavailable",
          errorReason: `History source refresh failed: ${errorMessage}`,
          limitation: `History source refresh failed: ${errorMessage}`,
        } : null)
        console.error("[v0] Game data fetch error:", errorMessage)
      }
    } finally {
      if (activeRequestRef.current === controller) setLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  // Initialize data on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, refreshIntervalMs)

    return () => clearInterval(interval)
  }, [fetchData, refreshIntervalMs])

  useEffect(() => {
    const updateCountdown = () => {
      const targetTimestamp = periodLifecycle?.nextRoundTimestamp
      if (targetTimestamp === null || targetTimestamp === undefined) {
        setNextRoundCountdown(0)
        return
      }
      setNextRoundCountdown(Math.max(0, Math.ceil((targetTimestamp - Date.now()) / 1000)))
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [periodLifecycle?.nextRoundTimestamp])

  useEffect(() => {
    return () => activeRequestRef.current?.abort()
  }, [])

  return {
    results,
    latestResult,
    loading,
    error,
    refetch,
    nextRoundCountdown,
    lastSuccessfulSyncAt,
    duplicateRecords,
    rejectedRecordCount,
    periodLifecycle,
    historyAudit,
  }
}

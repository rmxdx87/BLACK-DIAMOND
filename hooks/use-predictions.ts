"use client"

import { useState, useCallback, useRef } from "react"
import { aiEngine } from "@/lib/ai-engine"
import type { GameStats, GameResult } from "@/lib/types"
import { usePredictionHistory } from "@/hooks/use-prediction-history"
import type { TrendPatternAnalysis } from "@/lib/trend-pattern-engine"
import { createCanonicalPrediction, createDataVersion, createLegacyPeriodVersion, getCanonicalPrediction, PREDICTION_MODEL_VERSION, settleCanonicalPrediction } from "@/lib/canonical-predictions"
import type { PredictionCandidateSnapshot } from "@/lib/types"
import type { PredictionResult } from "@/src/lib/prediction/engine"
import {
  coordinatePrediction,
  withTimeout,
  type PredictionCoordinatorOutput,
  type PredictionExecutionStatus,
} from "@/lib/prediction/coordinator"

interface UsePredictionsReturn {
  settledPrediction: (
    | {
        period: string
        number: number
        outcome: "win"
        matchedCandidate: { rank: PredictionCandidateSnapshot["rank"]; number: number }
      }
    | {
        period: string
        number: number
        outcome: "loss"
        matchedCandidate: null
      }
  ) | null
  trendAnalysis: TrendPatternAnalysis | null
  statisticalPrediction: PredictionResult | null
  canonicalCandidates: readonly PredictionCandidateSnapshot[] | null
  coordinatorOutput: PredictionCoordinatorOutput | null
  predictionStatus: PredictionExecutionStatus | null
  stats: GameStats | null
  isAnalyzing: boolean
  lastPredictionTime: number | null
  updatePredictions: (results: GameResult[]) => void
  recordPredictionResult: (actualResult: GameResult) => void
  generateNextPeriodPrediction: (targetPeriod: string, historicalResults: GameResult[], currentPeriodId: string | null) => Promise<void>
  nextPeriodNumber: string | null
  updatePeriodForNewRound: (newPeriod: string) => void
}

function getTopFourCandidates(
  localCandidates: readonly PredictionCandidateSnapshot[],
  shared?: {
    topThree?: readonly PredictionCandidateSnapshot[]
    topFour?: readonly PredictionCandidateSnapshot[]
  } | null,
): readonly PredictionCandidateSnapshot[] {
  if (shared?.topFour?.length === 4) return shared.topFour
  if (shared?.topThree?.length === 3) {
    const fourth = localCandidates.find(
      (candidate) => !shared.topThree?.some((existing) => existing.number === candidate.number),
    )
    if (fourth) return [...shared.topThree, { ...fourth, rank: 4 as const }]
  }
  return localCandidates
}

export function usePredictions(): UsePredictionsReturn {
  const [trendAnalysis, setTrendAnalysis] = useState<TrendPatternAnalysis | null>(null)
  const [statisticalPrediction, setStatisticalPrediction] = useState<PredictionResult | null>(null)
  const [canonicalCandidates, setCanonicalCandidates] = useState<readonly PredictionCandidateSnapshot[] | null>(null)
  const [coordinatorOutput, setCoordinatorOutput] = useState<PredictionCoordinatorOutput | null>(null)
  const [predictionStatus, setPredictionStatus] = useState<PredictionExecutionStatus | null>(null)
  const [stats, setStats] = useState<GameStats | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastPredictionTime, setLastPredictionTime] = useState<number | null>(null)
  const [settledPrediction, setSettledPrediction] = useState<UsePredictionsReturn["settledPrediction"]>(null)
  const [nextPeriodNumber, setNextPeriodNumber] = useState<string | null>(null)
  const [pendingPeriodNumber, setPendingPeriodNumber] = useState<string | null>(null)
  const generationRef = useRef(0)
  const { addTopFourPrediction, history, updateResultForTarget } = usePredictionHistory()

  const generateNextPeriodPrediction = useCallback(
    async (targetPeriod: string, historicalResults: GameResult[], currentPeriodId: string | null) => {
      const nextPeriod = targetPeriod.trim()
      const generation = ++generationRef.current
      setIsAnalyzing(true)
      setTrendAnalysis(null)
      setStatisticalPrediction(null)
      setCanonicalCandidates(null)
      setCoordinatorOutput(null)
      setPredictionStatus(null)
      setPendingPeriodNumber(/^\d+$/.test(nextPeriod) ? nextPeriod : null)
      setNextPeriodNumber(/^\d+$/.test(nextPeriod) ? nextPeriod : null)

      try {
        const output = coordinatePrediction({
          targetPeriod: nextPeriod,
          currentPeriodId,
          history: historicalResults,
        })
        if (generation !== generationRef.current) return
        setCoordinatorOutput(output)
        setTrendAnalysis(output.trendAnalysis)
        setStatisticalPrediction(output.statisticalPrediction)
        setCanonicalCandidates(output.candidates.slice(0, 4))
        setPredictionStatus(output.status)
        setLastPredictionTime(output.generatedAt)

        try {
          aiEngine.updateHistory(historicalResults)
          setStats(aiEngine.generateGameStats())
        } catch (error) {
          console.error("[Prediction] Historical game statistics could not be updated:", error)
        }

        if (output.status !== "SUCCESS") {
          if (output.status === "ENGINE_ERROR" || output.status === "SOURCE_ERROR") {
            console.error(`[Prediction] ${output.status}:`, output.errorReason)
          }
          return
        }

        setIsAnalyzing(false)
        const topFour = output.candidates.slice(0, 4)
        if (topFour.length !== 4) return
        const topFourMarkets = {
          color: output.trendAnalysis?.colourRankings[0]?.score === null
            ? undefined
            : output.trendAnalysis?.colourRankings[0]?.outcome,
          size: output.trendAnalysis?.sizeRankings[0]?.score === null
            ? undefined
            : output.trendAnalysis?.sizeRankings[0]?.outcome,
        }

        const dataVersion = createDataVersion(historicalResults)
        const legacyDataVersion = createLegacyPeriodVersion(historicalResults.map((result) => result.period))
        let canonical = null
        try {
          canonical = await withTimeout(
            getCanonicalPrediction({
              gameId: "wingo-1m",
              targetPeriodId: nextPeriod,
              modelVersion: PREDICTION_MODEL_VERSION,
              dataVersion,
            }, legacyDataVersion),
            5000,
            "Shared forecast lookup timed out.",
          )
        } catch (readError) {
          console.error("[Prediction] Shared forecast lookup failed; calculating a local evidence-based forecast:", readError)
        }
        if (generation !== generationRef.current) return

        if (canonical?.topThree?.length === 3) {
          const selectedCandidates = getTopFourCandidates(topFour, canonical)
          setCanonicalCandidates(selectedCandidates)
          try {
            addTopFourPrediction(selectedCandidates, nextPeriod, topFourMarkets)
          } catch (error) {
            console.error("[Prediction] Shared Top 4 forecast could not be added to local history:", error)
          }
          setLastPredictionTime(canonical.predictionCreatedAt)
          return
        }

        let stored = null
        try {
          stored = await withTimeout(
            createCanonicalPrediction({
              gameId: "wingo-1m",
              sourcePeriodId: output.trendAnalysis?.dataCutoffPeriod ?? currentPeriodId ?? "",
              targetPeriodId: nextPeriod,
              targetPeriodStatus: "active",
              periodStatus: "active",
              predictionCreatedAt: Date.now(),
              predictionTimestamp: Date.now(),
              sourceDataCutoff: output.trendAnalysis?.dataCutoffPeriod ?? currentPeriodId,
              dataVersion,
              historicalDataVersion: dataVersion,
              modelVersion: PREDICTION_MODEL_VERSION,
              predictionStatus: "active",
              topThree: topFour.slice(0, 3),
              topFour,
              sampleCount: output.sampleSize,
              lowConfidence: output.trendAnalysis?.lowConfidence ?? true,
              limitations: output.warnings,
            }),
            5000,
            "Shared forecast write timed out.",
          )
        } catch (writeError) {
          console.error("[Prediction] Could not save the shared forecast; showing this session's analysis:", writeError)
        }
        if (generation !== generationRef.current) return
        const selectedCandidates = getTopFourCandidates(topFour, stored)
        setCanonicalCandidates(selectedCandidates)
        try {
          addTopFourPrediction(selectedCandidates, nextPeriod, topFourMarkets)
        } catch (error) {
          console.error("[Prediction] Local forecast history could not be updated:", error)
        }

        console.log("[Prediction] Completed target analysis:", {
          targetPeriod: nextPeriod,
          rankedNumbers: topFour.map((candidate) => candidate.number),
          dataCutoffPeriod: output.trendAnalysis?.dataCutoffPeriod ?? currentPeriodId,
          status: output.status,
          executionStats: output.executionStats,
        })
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Prediction coordinator failed."
        console.error("[Prediction] Coordinator failed:", reason)
        if (generation === generationRef.current) {
          setPredictionStatus("ENGINE_ERROR")
          setCoordinatorOutput((current) => current ? {
            ...current,
            status: "ENGINE_ERROR",
            errorReason: reason,
            warnings: [...current.warnings, reason],
          } : null)
        }
      } finally {
        if (generation === generationRef.current) setIsAnalyzing(false)
      }
    },
    [addTopFourPrediction],
  )

  const updatePeriodForNewRound = useCallback(
    (newPeriod: string) => {
      if (pendingPeriodNumber && pendingPeriodNumber === newPeriod) {
        console.log(`[v0] New round started - updating period number to: ${newPeriod}`)
        setNextPeriodNumber(newPeriod)
        setPendingPeriodNumber(null)
      }
    },
    [pendingPeriodNumber],
  )

  const updatePredictions = useCallback(async (results: GameResult[]) => {
    if (results.length === 0) return

    // This is now only used for updating historical data and stats
    try {
      aiEngine.updateHistory(results)
      const newStats = aiEngine.generateGameStats()
      setStats(newStats)
    } catch (error) {
      console.error("Error updating historical data:", error)
    }
  }, [])

  const recordPredictionResult = useCallback(
    (actualResult: GameResult) => {
      if (!actualResult) {
        console.warn("[v0] recordPredictionResult called with null actualResult")
        return
      }

      const pendingPrediction = history.find(
        (entry) => entry.targetPeriod === actualResult.period && entry.status === "pending",
      )
      const topFour = pendingPrediction?.predictions.topFour ?? pendingPrediction?.predictions.topThree
      if (topFour && topFour.length >= 3) {
        const matchedCandidate = topFour.find((candidate) => candidate.number === actualResult.number) ?? null
        if (matchedCandidate) {
          setSettledPrediction({
            period: actualResult.period,
            number: actualResult.number,
            outcome: "win",
            matchedCandidate: { rank: matchedCandidate.rank, number: matchedCandidate.number },
          })
        } else {
          setSettledPrediction({
            period: actualResult.period,
            number: actualResult.number,
            outcome: "loss",
            matchedCandidate: null,
          })
        }
      }

      void settleCanonicalPrediction("wingo-1m", actualResult.period, PREDICTION_MODEL_VERSION, {
        period: actualResult.period,
        number: actualResult.number,
        colors: actualResult.colors ?? [actualResult.color],
      }).catch((error: unknown) => console.error("[Prediction] Could not settle the shared forecast:", error))
      updateResultForTarget(actualResult)

      if (!nextPeriodNumber) {
        console.warn("[v0] No nextPeriodNumber available for result recording")
        return
      }

      if (nextPeriodNumber === actualResult.period) {
        generationRef.current++
        console.log("[v0] Recording prediction result for period:", actualResult.period)

        try {
          setNextPeriodNumber(null)
          setPendingPeriodNumber(null)
          setTrendAnalysis(null)
          setStatisticalPrediction(null)
          setCanonicalCandidates(null)
          setCoordinatorOutput(null)
          setPredictionStatus(null)
          setIsAnalyzing(false)
        } catch (error) {
          console.error("[v0] Error in recordPredictionResult:", error)
          console.error("[v0] Error details:", {
            actualResult,
            nextPeriodNumber,
          })
        }
      } else {
        console.log(`[v0] Period mismatch - expected: ${nextPeriodNumber}, got: ${actualResult.period}`)
      }
    },
    [history, updateResultForTarget, nextPeriodNumber],
  )

  return {
    settledPrediction,
    trendAnalysis,
    statisticalPrediction,
    canonicalCandidates,
    coordinatorOutput,
    predictionStatus,
    stats,
    isAnalyzing,
    lastPredictionTime,
    updatePredictions,
    recordPredictionResult,
    generateNextPeriodPrediction,
    nextPeriodNumber,
    updatePeriodForNewRound,
  }
}

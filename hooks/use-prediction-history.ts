"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { predictionHistory } from "@/lib/prediction-history"
import type { GameResult, PredictionCandidateSnapshot, PredictionData } from "@/lib/types"

type PredictionHistoryStats = ReturnType<typeof predictionHistory.getStats>

export function usePredictionHistory() {
  const subscribe = useCallback((listener: () => void) => predictionHistory.subscribe(listener), [])
  const getRevision = useCallback(() => predictionHistory.getRevision(), [])
  const version = useSyncExternalStore(subscribe, getRevision, () => 0)
  const snapshotRevision = version === predictionHistory.getRevision() ? version : null
  const history = useMemo(() => snapshotRevision === null ? [] : predictionHistory.getHistory(), [snapshotRevision])
  const stats = useMemo<PredictionHistoryStats | null>(
    () => snapshotRevision === null ? null : predictionHistory.getStats(),
    [snapshotRevision],
  )

  const addPrediction = useCallback(
    (predictions: PredictionData) => {
      return predictionHistory.addPrediction(predictions)
    },
    [],
  )

  const addTopThreePrediction = useCallback(
    (candidates: readonly PredictionCandidateSnapshot[], targetPeriod: string) => {
      return predictionHistory.addTopThreePrediction(candidates, targetPeriod)
    },
    [],
  )

  const addTopFourPrediction = useCallback(
    (
      candidates: readonly PredictionCandidateSnapshot[],
      targetPeriod: string,
      markets?: { color?: string; size?: string },
    ) => predictionHistory.addTopFourPrediction(candidates, targetPeriod, markets),
    [],
  )

  const updateResult = useCallback(
    (predictionId: string, actualResult: GameResult) => {
      predictionHistory.updatePredictionResult(predictionId, actualResult)
    },
    [],
  )

  const updateResultForTarget = useCallback(
    (actualResult: GameResult) => predictionHistory.updatePredictionResultForTarget(actualResult),
    [],
  )

  return {
    history,
    stats,
    addPrediction,
    addTopThreePrediction,
    addTopFourPrediction,
    updateResult,
    updateResultForTarget,
  }
}

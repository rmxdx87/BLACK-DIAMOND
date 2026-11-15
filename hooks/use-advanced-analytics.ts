"use client"

import { useState, useCallback } from "react"
import { advancedAnalytics, type AdvancedStats, type BettingSimulation } from "@/lib/advanced-analytics"
import type { GameResult, PredictionData } from "@/lib/types"

interface UseAdvancedAnalyticsReturn {
  advancedStats: AdvancedStats | null
  bettingSimulations: BettingSimulation[]
  isCalculating: boolean
  updateAnalytics: (results: GameResult[]) => void
  recordPredictionResult: (prediction: PredictionData, actual: GameResult) => void
}

export function useAdvancedAnalytics(): UseAdvancedAnalyticsReturn {
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null)
  const [bettingSimulations, setBettingSimulations] = useState<BettingSimulation[]>([])
  const [isCalculating, setIsCalculating] = useState(false)

  const updateAnalytics = useCallback(async (results: GameResult[]) => {
    if (results.length === 0) return

    setIsCalculating(true)

    // Simulate calculation time for better UX
    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      const stats = advancedAnalytics.calculateAdvancedStats(results)
      const simulations = advancedAnalytics.simulateBettingStrategies(results)

      setAdvancedStats(stats)
      setBettingSimulations(simulations)
    } catch (error) {
      console.error("Error calculating advanced analytics:", error)
    } finally {
      setIsCalculating(false)
    }
  }, [])

  const recordPredictionResult = useCallback((prediction: PredictionData, actual: GameResult) => {
    advancedAnalytics.recordPrediction(prediction, actual)
  }, [])

  return {
    advancedStats,
    bettingSimulations,
    isCalculating,
    updateAnalytics,
    recordPredictionResult,
  }
}

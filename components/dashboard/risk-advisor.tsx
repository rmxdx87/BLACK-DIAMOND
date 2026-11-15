"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PredictionData, GameStats } from "@/lib/types"

interface RiskAdvisorProps {
  predictions: PredictionData | null
  stats: GameStats | null
}

export function RiskAdvisor({ predictions, stats }: RiskAdvisorProps) {
  const generateAdvice = () => {
    if (!predictions || !stats) {
      return {
        riskLevel: "UNKNOWN",
        advice: "Insufficient data for risk analysis",
        recommendations: [],
        riskColor: "text-gray-400",
      }
    }

    const avgConfidence =
      (predictions.color.confidence + predictions.size.confidence + predictions.number.confidence) / 3

    let riskLevel = "MEDIUM"
    let riskColor = "text-yellow-400"
    let advice = ""
    const recommendations: string[] = []

    if (avgConfidence >= 75) {
      riskLevel = "LOW"
      riskColor = "text-green-400"
      advice = "High confidence predictions suggest favorable conditions"
      recommendations.push("Consider higher stakes on primary predictions")
      recommendations.push("Monitor for pattern continuation")
    } else if (avgConfidence >= 60) {
      riskLevel = "MEDIUM"
      riskColor = "text-yellow-400"
      advice = "Moderate confidence levels suggest standard risk approach"
      recommendations.push("Use balanced betting strategy")
      recommendations.push("Watch for emerging patterns")
    } else {
      riskLevel = "HIGH"
      riskColor = "text-red-400"
      advice = "Low confidence indicates unpredictable conditions"
      recommendations.push("Consider lower stakes or skip this round")
      recommendations.push("Wait for clearer patterns to emerge")
    }

    // Additional recommendations based on streaks
    if (stats.streaks.color.count >= 4) {
      recommendations.push(`CAUTION: ${stats.streaks.color.type.toUpperCase()} streak of ${stats.streaks.color.count}`)
    }

    if (stats.streaks.size.count >= 3) {
      recommendations.push(`WATCH: ${stats.streaks.size.type.toUpperCase()} size pattern active`)
    }

    return {
      riskLevel,
      advice,
      recommendations,
      riskColor,
    }
  }

  const riskAnalysis = generateAdvice()

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "LOW":
        return "default"
      case "MEDIUM":
        return "secondary"
      case "HIGH":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <Card className="bg-black/80 border-green-500 backdrop-blur">
      <div className="p-6">
        <h3 className="text-lg font-mono text-green-400 mb-4 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          RISK ADVISOR
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-green-500">RISK LEVEL:</span>
            <Badge variant={getRiskBadgeVariant(riskAnalysis.riskLevel)} className="font-mono">
              {riskAnalysis.riskLevel}
            </Badge>
          </div>

          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
            <div className="font-mono text-sm text-green-300">{riskAnalysis.advice}</div>
          </div>

          {predictions && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 border border-green-500/30 rounded">
                <div className="text-xs font-mono text-green-500">COLOR</div>
                <div
                  className={`text-lg font-mono ${predictions.color.confidence >= 70 ? "text-green-400" : predictions.color.confidence >= 60 ? "text-yellow-400" : "text-red-400"}`}
                >
                  {predictions.color.confidence}%
                </div>
              </div>
              <div className="p-2 border border-green-500/30 rounded">
                <div className="text-xs font-mono text-green-500">SIZE</div>
                <div
                  className={`text-lg font-mono ${predictions.size.confidence >= 70 ? "text-green-400" : predictions.size.confidence >= 60 ? "text-yellow-400" : "text-red-400"}`}
                >
                  {predictions.size.confidence}%
                </div>
              </div>
              <div className="p-2 border border-green-500/30 rounded">
                <div className="text-xs font-mono text-green-500">NUMBER</div>
                <div
                  className={`text-lg font-mono ${predictions.number.confidence >= 70 ? "text-green-400" : predictions.number.confidence >= 60 ? "text-yellow-400" : "text-red-400"}`}
                >
                  {predictions.number.confidence}%
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="font-mono text-sm text-green-500">RECOMMENDATIONS:</div>
            {riskAnalysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-green-400 font-mono text-xs mt-1">•</span>
                <span className="font-mono text-xs text-green-300">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

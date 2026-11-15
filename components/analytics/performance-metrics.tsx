"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { AdvancedStats } from "@/lib/advanced-analytics"

interface PerformanceMetricsProps {
  stats: AdvancedStats | null
}

export function PerformanceMetrics({ stats }: PerformanceMetricsProps) {
  if (!stats) {
    return (
      <Card className="bg-black/80 border-green-500 backdrop-blur p-6">
        <h3 className="text-lg font-mono text-green-400 mb-4">PERFORMANCE METRICS</h3>
        <div className="text-center text-green-300 font-mono">CALCULATING PERFORMANCE...</div>
      </Card>
    )
  }

  const getPerformanceColor = (value: number, type: "winrate" | "roi" | "volatility") => {
    switch (type) {
      case "winrate":
        if (value >= 70) return "text-green-400"
        if (value >= 50) return "text-yellow-400"
        return "text-red-400"
      case "roi":
        if (value >= 20) return "text-green-400"
        if (value >= 0) return "text-yellow-400"
        return "text-red-400"
      case "volatility":
        if (value <= 30) return "text-green-400"
        if (value <= 60) return "text-yellow-400"
        return "text-red-400"
      default:
        return "text-green-400"
    }
  }

  const getSentimentBadge = (momentum: string) => {
    switch (momentum) {
      case "bullish":
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400">
            BULLISH
          </Badge>
        )
      case "bearish":
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-400">
            BEARISH
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">
            NEUTRAL
          </Badge>
        )
    }
  }

  return (
    <Card className="bg-black/80 border-green-500 backdrop-blur">
      <div className="p-6">
        <h3 className="text-lg font-mono text-green-400 mb-6 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          PERFORMANCE METRICS
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 border border-green-500/30 rounded">
            <div className="text-xs font-mono text-green-500 mb-1">OVERALL WIN RATE</div>
            <div className={`text-2xl font-mono ${getPerformanceColor(stats.winRate.overall, "winrate")}`}>
              {stats.winRate.overall}%
            </div>
            <Progress value={stats.winRate.overall} className="mt-2 h-1" />
          </div>

          <div className="text-center p-3 border border-green-500/30 rounded">
            <div className="text-xs font-mono text-green-500 mb-1">THEORETICAL ROI</div>
            <div
              className={`text-2xl font-mono ${getPerformanceColor(stats.profitabilityAnalysis.theoreticalROI, "roi")}`}
            >
              {stats.profitabilityAnalysis.theoreticalROI}%
            </div>
            <Progress
              value={Math.max(0, Math.min(100, stats.profitabilityAnalysis.theoreticalROI + 50))}
              className="mt-2 h-1"
            />
          </div>

          <div className="text-center p-3 border border-green-500/30 rounded">
            <div className="text-xs font-mono text-green-500 mb-1">VOLATILITY INDEX</div>
            <div className={`text-2xl font-mono ${getPerformanceColor(stats.volatilityIndex.overall, "volatility")}`}>
              {stats.volatilityIndex.overall}%
            </div>
            <Progress value={stats.volatilityIndex.overall} className="mt-2 h-1" />
          </div>

          <div className="text-center p-3 border border-green-500/30 rounded">
            <div className="text-xs font-mono text-green-500 mb-1">SHARPE RATIO</div>
            <div className="text-2xl font-mono text-cyan-400">{stats.profitabilityAnalysis.sharpeRatio}</div>
            <Progress
              value={Math.max(0, Math.min(100, (stats.profitabilityAnalysis.sharpeRatio + 2) * 25))}
              className="mt-2 h-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-3 border border-green-500/30 rounded">
            <div className="text-sm font-mono text-green-500 mb-2">CATEGORY WIN RATES</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-red-400">COLOR</span>
                <span className="text-xs font-mono text-green-300">{stats.winRate.color}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-blue-400">SIZE</span>
                <span className="text-xs font-mono text-green-300">{stats.winRate.size}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-cyan-400">NUMBER</span>
                <span className="text-xs font-mono text-green-300">{stats.winRate.number}%</span>
              </div>
            </div>
          </div>

          <div className="p-3 border border-green-500/30 rounded">
            <div className="text-sm font-mono text-green-500 mb-2">MARKET SENTIMENT</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-green-400">MOMENTUM</span>
                {getSentimentBadge(stats.marketSentiment.momentum)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-green-400">CONFIDENCE</span>
                <span className="text-xs font-mono text-green-300">{stats.marketSentiment.confidence}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-green-400">TREND STRENGTH</span>
                <span className="text-xs font-mono text-green-300">{stats.marketSentiment.trendStrength}%</span>
              </div>
            </div>
          </div>

          <div className="p-3 border border-green-500/30 rounded">
            <div className="text-sm font-mono text-green-500 mb-2">RISK METRICS</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-orange-400">MAX DRAWDOWN</span>
                <span className="text-xs font-mono text-green-300">{stats.profitabilityAnalysis.maxDrawdown}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-purple-400">RISK ADJ. RETURN</span>
                <span className="text-xs font-mono text-green-300">
                  {stats.profitabilityAnalysis.riskAdjustedReturn}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {stats.streakAnalysis.currentStreaks.length > 0 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <div className="text-sm font-mono text-yellow-400 mb-2">ACTIVE STREAKS</div>
            <div className="space-y-1">
              {stats.streakAnalysis.currentStreaks.map((streak, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-xs font-mono text-yellow-300 uppercase">
                    {streak.category} - {streak.type}
                  </span>
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                    {streak.length} IN A ROW
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { AdvancedStats } from "@/lib/advanced-analytics"

interface StreakAnalyzerProps {
  stats: AdvancedStats | null
}

export function StreakAnalyzer({ stats }: StreakAnalyzerProps) {
  if (!stats) {
    return (
      <Card className="bg-black/80 border-green-500 backdrop-blur p-6">
        <h3 className="text-lg font-mono text-green-400 mb-4">STREAK ANALYSIS</h3>
        <div className="text-center text-green-300 font-mono">ANALYZING STREAKS...</div>
      </Card>
    )
  }

  const getStreakColor = (length: number) => {
    if (length >= 5) return "text-red-400"
    if (length >= 3) return "text-yellow-400"
    return "text-green-400"
  }

  const getStreakRisk = (length: number) => {
    if (length >= 5) return "HIGH RISK"
    if (length >= 3) return "MEDIUM RISK"
    return "LOW RISK"
  }

  const getStreakBadge = (length: number) => {
    if (length >= 5) return <Badge variant="destructive">EXTREME</Badge>
    if (length >= 3) return <Badge variant="secondary">NOTABLE</Badge>
    return <Badge variant="default">NORMAL</Badge>
  }

  return (
    <Card className="bg-black/80 border-green-500 backdrop-blur">
      <div className="p-6">
        <h3 className="text-lg font-mono text-green-400 mb-6 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          STREAK ANALYSIS
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 border border-green-500/30 rounded">
            <h4 className="text-sm font-mono text-green-400 mb-3">LONGEST STREAKS (HISTORICAL)</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-mono text-green-500">COLOR STREAK</div>
                  <div
                    className={`text-lg font-mono ${getStreakColor(stats.streakAnalysis.longestColorStreak.length)} uppercase`}
                  >
                    {stats.streakAnalysis.longestColorStreak.type || "NONE"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono text-green-300">
                    {stats.streakAnalysis.longestColorStreak.length}
                  </div>
                  {getStreakBadge(stats.streakAnalysis.longestColorStreak.length)}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-mono text-green-500">SIZE STREAK</div>
                  <div
                    className={`text-lg font-mono ${getStreakColor(stats.streakAnalysis.longestSizeStreak.length)} uppercase`}
                  >
                    {stats.streakAnalysis.longestSizeStreak.type || "NONE"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono text-green-300">
                    {stats.streakAnalysis.longestSizeStreak.length}
                  </div>
                  {getStreakBadge(stats.streakAnalysis.longestSizeStreak.length)}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border border-green-500/30 rounded">
            <h4 className="text-sm font-mono text-green-400 mb-3">CURRENT ACTIVE STREAKS</h4>
            {stats.streakAnalysis.currentStreaks.length === 0 ? (
              <div className="text-center text-green-300 font-mono py-4">NO ACTIVE STREAKS</div>
            ) : (
              <div className="space-y-3">
                {stats.streakAnalysis.currentStreaks.map((streak, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-mono text-green-500 uppercase">{streak.category}</div>
                      <div className={`text-lg font-mono ${getStreakColor(streak.length)} uppercase`}>
                        {streak.type}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono text-green-300">{streak.length}</div>
                      {getStreakBadge(streak.length)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {stats.streakAnalysis.currentStreaks.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-mono text-green-400 mb-3">STREAK RISK ASSESSMENT</h4>
            <div className="space-y-2">
              {stats.streakAnalysis.currentStreaks.map((streak, index) => (
                <div key={index} className="p-3 border border-yellow-500/30 rounded bg-yellow-500/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-sm text-yellow-400 uppercase">
                      {streak.category} - {streak.type} STREAK
                    </span>
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                      {getStreakRisk(streak.length)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={Math.min(100, (streak.length / 7) * 100)} className="flex-1 h-2" />
                    <span className="font-mono text-xs text-yellow-300">{streak.length}/7</span>
                  </div>
                  <div className="text-xs font-mono text-yellow-300 mt-1">
                    {streak.length >= 5
                      ? "EXTREME: Consider opposite bet or skip round"
                      : streak.length >= 3
                        ? "CAUTION: Streak may break soon"
                        : "NORMAL: Continue with standard strategy"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
          <div className="text-xs font-mono text-green-400 mb-1">STREAK STRATEGY TIPS:</div>
          <div className="text-xs font-mono text-green-300">
            • Streaks of 3+ suggest pattern disruption is likely
            <br />• Extreme streaks (5+) often precede reversals
            <br />• Use streak data to adjust bet sizing and timing
          </div>
        </div>
      </div>
    </Card>
  )
}

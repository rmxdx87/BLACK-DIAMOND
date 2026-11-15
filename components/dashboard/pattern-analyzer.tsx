"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { GameResult } from "@/lib/types"

interface PatternAnalyzerProps {
  results: GameResult[]
}

export function PatternAnalyzer({ results }: PatternAnalyzerProps) {
  const analyzePatterns = () => {
    if (results.length < 3) return []

    const patterns: Array<{
      pattern: string
      count: number
      probability: number
      type: "color" | "size" | "number"
    }> = []

    // Analyze color patterns
    const colorPatterns: Record<string, number> = {}
    for (let i = 0; i < results.length - 2; i++) {
      const pattern = `${results[i + 2].color}-${results[i + 1].color}-${results[i].color}`
      colorPatterns[pattern] = (colorPatterns[pattern] || 0) + 1
    }

    // Analyze size patterns
    const sizePatterns: Record<string, number> = {}
    for (let i = 0; i < results.length - 2; i++) {
      const pattern = `${results[i + 2].size}-${results[i + 1].size}-${results[i].size}`
      sizePatterns[pattern] = (sizePatterns[pattern] || 0) + 1
    }

    // Get top patterns
    const topColorPatterns = Object.entries(colorPatterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([pattern, count]) => ({
        pattern: pattern.toUpperCase(),
        count,
        probability: (count / (results.length - 2)) * 100,
        type: "color" as const,
      }))

    const topSizePatterns = Object.entries(sizePatterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([pattern, count]) => ({
        pattern: pattern.toUpperCase(),
        count,
        probability: (count / (results.length - 2)) * 100,
        type: "size" as const,
      }))

    return [...topColorPatterns, ...topSizePatterns]
  }

  const patterns = analyzePatterns()

  const getPatternColor = (type: string) => {
    switch (type) {
      case "color":
        return "text-purple-400"
      case "size":
        return "text-cyan-400"
      default:
        return "text-green-400"
    }
  }

  return (
    <Card className="bg-black/80 border-green-500 backdrop-blur">
      <div className="p-6">
        <h3 className="text-lg font-mono text-green-400 mb-4 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          PATTERN ANALYSIS
        </h3>

        {patterns.length === 0 ? (
          <div className="text-center text-green-300 font-mono py-8">INSUFFICIENT DATA FOR PATTERN ANALYSIS</div>
        ) : (
          <div className="space-y-4">
            {patterns.map((pattern, index) => (
              <div key={index} className="border border-green-500/30 rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <div className={`font-mono text-sm ${getPatternColor(pattern.type)}`}>
                    {pattern.type.toUpperCase()} PATTERN
                  </div>
                  <div className="font-mono text-xs text-green-400">{pattern.count} OCCURRENCES</div>
                </div>

                <div className="font-mono text-lg text-green-300 mb-2">{pattern.pattern}</div>

                <div className="flex items-center space-x-2">
                  <Progress value={pattern.probability} className="flex-1 h-2" />
                  <span className="font-mono text-xs text-green-400 min-w-12">{pattern.probability.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded">
          <div className="text-xs font-mono text-green-400 mb-1">PATTERN LEGEND:</div>
          <div className="text-xs font-mono text-green-300">
            Patterns show the last 3 consecutive results in sequence (newest → oldest)
          </div>
        </div>
      </div>
    </Card>
  )
}

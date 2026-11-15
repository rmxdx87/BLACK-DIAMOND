"use client"

import { Card } from "@/components/ui/card"
import type { GameResult } from "@/lib/types"

interface HeatmapProps {
  results: GameResult[]
}

export function Heatmap({ results }: HeatmapProps) {
  const getNumberFrequency = () => {
    const frequency: Record<number, number> = {}
    for (let i = 0; i < 10; i++) {
      frequency[i] = 0
    }

    results.forEach((result) => {
      frequency[result.number]++
    })

    return frequency
  }

  const frequency = getNumberFrequency()
  const maxFreq = Math.max(...Object.values(frequency))
  const minFreq = Math.min(...Object.values(frequency))

  const getHeatColor = (freq: number) => {
    if (maxFreq === minFreq) return "bg-green-500/30"

    const intensity = (freq - minFreq) / (maxFreq - minFreq)

    if (intensity > 0.8) return "bg-red-500/80"
    if (intensity > 0.6) return "bg-red-500/60"
    if (intensity > 0.4) return "bg-yellow-500/60"
    if (intensity > 0.2) return "bg-green-500/40"
    return "bg-blue-500/40"
  }

  const getHeatLabel = (freq: number) => {
    if (maxFreq === minFreq) return "NORMAL"

    const intensity = (freq - minFreq) / (maxFreq - minFreq)

    if (intensity > 0.8) return "VERY HOT"
    if (intensity > 0.6) return "HOT"
    if (intensity > 0.4) return "WARM"
    if (intensity > 0.2) return "COOL"
    return "COLD"
  }

  return (
    <Card className="bg-black/80 border-green-500 backdrop-blur">
      <div className="p-6">
        <h3 className="text-lg font-mono text-green-400 mb-4 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          NUMBER HEATMAP
        </h3>

        <div className="grid grid-cols-5 gap-3 mb-4">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className={`${getHeatColor(frequency[i])} border border-green-500/30 rounded p-3 text-center transition-all duration-300 hover:scale-105`}
            >
              <div className="text-2xl font-mono text-white font-bold">{i}</div>
              <div className="text-xs font-mono text-green-300 mt-1">{frequency[i]}</div>
              <div className="text-xs font-mono text-green-400 mt-1">{getHeatLabel(frequency[i])}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center text-xs font-mono">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500/40 rounded"></div>
            <span className="text-blue-400">COLD</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500/40 rounded"></div>
            <span className="text-green-400">COOL</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500/60 rounded"></div>
            <span className="text-yellow-400">WARM</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500/60 rounded"></div>
            <span className="text-red-400">HOT</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500/80 rounded"></div>
            <span className="text-red-400">VERY HOT</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

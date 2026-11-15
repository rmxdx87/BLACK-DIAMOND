"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { BettingSimulation } from "@/lib/advanced-analytics"

interface BettingSimulatorProps {
  simulations: BettingSimulation[]
}

export function BettingSimulator({ simulations }: BettingSimulatorProps) {
  const getROIColor = (roi: number) => {
    if (roi >= 20) return "text-green-400"
    if (roi >= 0) return "text-yellow-400"
    return "text-red-400"
  }

  const getStrategyBadge = (roi: number) => {
    if (roi >= 20) return <Badge variant="default">EXCELLENT</Badge>
    if (roi >= 10) return <Badge variant="default">GOOD</Badge>
    if (roi >= 0) return <Badge variant="secondary">BREAK EVEN</Badge>
    return <Badge variant="destructive">LOSS</Badge>
  }

  return (
    <Card className="bg-black/80 border-green-500 backdrop-blur">
      <div className="p-6">
        <h3 className="text-lg font-mono text-green-400 mb-6 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          BETTING STRATEGY SIMULATOR
        </h3>

        {simulations.length === 0 ? (
          <div className="text-center text-green-300 font-mono py-8">
            INSUFFICIENT PREDICTION HISTORY FOR SIMULATION
          </div>
        ) : (
          <div className="space-y-4">
            {simulations.map((sim, index) => (
              <div key={index} className="p-4 border border-green-500/30 rounded">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-mono text-green-300">{sim.strategy}</h4>
                  {getStrategyBadge(sim.roi)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-xs font-mono text-green-500">TOTAL BETS</div>
                    <div className="text-lg font-mono text-green-300">{sim.totalBets}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-mono text-green-500">WIN RATE</div>
                    <div className="text-lg font-mono text-green-300">{sim.winRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-mono text-green-500">TOTAL PROFIT</div>
                    <div className={`text-lg font-mono ${getROIColor(sim.roi)}`}>
                      {sim.totalProfit > 0 ? "+" : ""}
                      {sim.totalProfit}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-mono text-green-500">ROI</div>
                    <div className={`text-lg font-mono ${getROIColor(sim.roi)}`}>
                      {sim.roi > 0 ? "+" : ""}
                      {sim.roi}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-green-500">WIN RATE</span>
                      <span className="text-xs font-mono text-green-300">{sim.winRate}%</span>
                    </div>
                    <Progress value={sim.winRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-green-500">SHARPE RATIO</span>
                      <span className="text-xs font-mono text-green-300">{sim.sharpeRatio}</span>
                    </div>
                    <Progress value={Math.max(0, Math.min(100, (sim.sharpeRatio + 2) * 25))} className="h-2" />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center space-x-4">
                    <span className="text-green-400">WINS: {sim.wins}</span>
                    <span className="text-red-400">LOSSES: {sim.losses}</span>
                  </div>
                  <div className="text-orange-400">MAX DRAWDOWN: {sim.maxDrawdown}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-3 bg-green-500/10 border border-green-500/30 rounded">
          <div className="text-xs font-mono text-green-400 mb-1">SIMULATION NOTES:</div>
          <div className="text-xs font-mono text-green-300">
            • Simulations based on historical prediction accuracy
            <br />• Results assume perfect execution of strategy
            <br />• Past performance does not guarantee future results
          </div>
        </div>
      </div>
    </Card>
  )
}

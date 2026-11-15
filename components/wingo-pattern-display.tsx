'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  predictSizeWithWingoRules,
  predictColorWithWingoRules,
  getWingoAnalysis,
} from '@/lib/advanced-prediction-engine'
import type { ColorType, SizeType } from '@/lib/color-size-prediction-engines'
import {
  TrendingUp,
  Repeat2,
  AlertTriangle,
  BarChart3,
  Zap,
  Info,
} from 'lucide-react'

interface WingoPatternDisplayProps {
  historicalSizes?: SizeType[]
  historicalColors?: ColorType[]
  showDetailedMetrics?: boolean
  highlightBreakRule?: boolean
}

export function WingoPatternDisplay({
  historicalSizes = [],
  historicalColors = [],
  showDetailedMetrics = true,
  highlightBreakRule = true,
}: WingoPatternDisplayProps) {
  const [activeRule, setActiveRule] = useState<'both' | 'repeat' | 'break'>('both')
  const [selectedSequence, setSelectedSequence] = useState<'size' | 'color'>('size')

  // Analyze sizes
  const sizeAnalysis = useMemo(() => {
    if (historicalSizes.length === 0) return null
    return predictSizeWithWingoRules(historicalSizes, {
      useRepeatRule: activeRule !== 'break',
      useBreakRule: activeRule !== 'repeat',
    })
  }, [historicalSizes, activeRule])

  // Analyze colors
  const colorAnalysis = useMemo(() => {
    if (historicalColors.length === 0) return null
    return predictColorWithWingoRules(historicalColors, {
      useRepeatRule: activeRule !== 'break',
      useBreakRule: activeRule !== 'repeat',
    })
  }, [historicalColors, activeRule])

  // Get detailed analysis
  const detailedAnalysis = useMemo(() => {
    const sequence = selectedSequence === 'size' ? historicalSizes : historicalColors
    if (sequence.length === 0) return null
    return getWingoAnalysis(sequence)
  }, [selectedSequence, historicalSizes, historicalColors])

  const currentAnalysis = selectedSequence === 'size' ? sizeAnalysis : colorAnalysis

  if (!currentAnalysis) {
    return (
      <Card className="w-full p-6 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-gray-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No historical data available. Add at least 3 records to analyze patterns.</p>
        </div>
      </Card>
    )
  }

  const primary = currentAnalysis.primary
  const secondary = currentAnalysis.secondary
  const isPrimaryBreak = primary.rule === 'pattern_break'

  return (
    <div className="w-full space-y-4">
      {/* Rule Toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeRule === 'both' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveRule('both')}
          className="gap-2"
        >
          <Repeat2 className="w-4 h-4" />
          Both Rules
        </Button>
        <Button
          variant={activeRule === 'repeat' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveRule('repeat')}
        >
          Repeat Pattern
        </Button>
        <Button
          variant={activeRule === 'break' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveRule('break')}
          className="gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Pattern Break
        </Button>
      </div>

      {/* Sequence Toggle */}
      {historicalSizes.length > 0 && historicalColors.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant={selectedSequence === 'size' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSequence('size')}
          >
            Size Analysis
          </Button>
          <Button
            variant={selectedSequence === 'color' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSequence('color')}
          >
            Color Analysis
          </Button>
        </div>
      )}

      {/* Main Prediction Card */}
      <Card
        className={`p-6 bg-gradient-to-br transition-all ${
          isPrimaryBreak
            ? 'from-red-900/30 to-orange-900/30 border-red-500/50'
            : 'from-emerald-900/30 to-green-900/30 border-emerald-500/50'
        }`}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">
                {isPrimaryBreak ? 'Pattern Break Detected' : 'Trend Following'}
              </p>
              <p className="text-3xl font-bold mt-2">
                <span
                  className={`px-3 py-1 rounded-lg ${
                    primary.prediction === 'Big' || primary.prediction === 'Red'
                      ? 'bg-red-500/30 text-red-300'
                      : primary.prediction === 'Small'
                        ? 'bg-blue-500/30 text-blue-300'
                        : 'bg-purple-500/30 text-purple-300'
                  }`}
                >
                  {primary.prediction}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {Math.round(primary.confidence)}%
              </p>
              <p className="text-xs text-gray-400">Confidence</p>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-3 bg-black/30 rounded-lg border border-gray-700/50">
            <p className="text-sm text-gray-300">{primary.explanation}</p>
          </div>

          {/* Streak Info */}
          {detailedAnalysis && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-400">Current Streak</p>
                <p className="text-xl font-bold text-white">
                  {detailedAnalysis.stats.currentStreak}x
                </p>
              </div>
              <div className="p-3 bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-400">Last Value</p>
                <p className="text-xl font-bold text-white">
                  {detailedAnalysis.stats.lastValue}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Secondary Rule Info */}
      {secondary && (
        <Card className="p-4 bg-slate-900/50 border-gray-700/30">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-300">
                Alternative Prediction ({secondary.rule}):
              </p>
              <p className="text-sm text-gray-400 mt-1">{secondary.explanation}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Detailed Metrics */}
      {showDetailedMetrics && detailedAnalysis && (
        <Card className="p-6 bg-slate-900/50 border-gray-700/30">
          <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Pattern Metrics
          </h3>

          <div className="space-y-3">
            {/* Sequence Display */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Recent Sequence</p>
              <div className="flex gap-2 flex-wrap">
                {detailedAnalysis.stats.length > 0 ? (
                  (selectedSequence === 'size'
                    ? historicalSizes
                    : historicalColors
                  )
                    .slice(-10)
                    .map((val, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          val === 'Big' || val === 'Red'
                            ? 'bg-red-500/30 text-red-300'
                            : val === 'Small'
                              ? 'bg-blue-500/30 text-blue-300'
                              : 'bg-purple-500/30 text-purple-300'
                        }`}
                      >
                        {val}
                      </span>
                    ))
                ) : (
                  <span className="text-gray-500">No data</span>
                )}
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">Total Records</p>
                <p className="text-lg font-bold text-white">
                  {detailedAnalysis.stats.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Most Common</p>
                <p className="text-lg font-bold text-white">
                  {detailedAnalysis.stats.mostCommon || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Pattern Entropy</p>
                <p className="text-lg font-bold text-white">
                  {detailedAnalysis.stats.entropy.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Break Threshold</p>
                <p className="text-lg font-bold text-white">5-6x</p>
              </div>
            </div>

            {/* Analysis Recommendation */}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-200">
                <span className="font-semibold">Analysis:</span> {detailedAnalysis.reason}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Rule Explanation */}
      <Card className="p-4 bg-slate-900/50 border-gray-700/30">
        <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          How These Rules Work
        </h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p>
            <span className="font-medium text-gray-300">Repeat Pattern Rule:</span> If a
            value repeats (Big → Big → Big), it predicts continuation (Big).
          </p>
          <p>
            <span className="font-medium text-gray-300">Pattern Break Rule:</span> If a
            value repeats 5-6 times, it predicts a break to the opposite (Small).
          </p>
        </div>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  Lock,
  AlertCircle,
  ChevronDown,
  Eye,
  Brain,
} from "lucide-react"

interface EngineResult {
  engineId: string
  engineName: string
  prediction: number
  confidence: number
  accuracy: number
}

interface PredictionData {
  symbol: string
  prediction: number
  confidence: number
  source: 'AI' | 'Admin'
  sourceLabel: string
  reasoning: string
  topEngines: EngineResult[]
  allEngines: EngineResult[]
  trend: 'up' | 'down' | 'sideways'
  trendStrength: number
  supportLevels: number[]
  resistanceLevels: number[]
  patterns: Array<{ type: string; confidence: number }>
  indicators: {
    rsi: number
    macd: string
    bollinger: string
  }
  accuracy: number
  timestamp: number
}

export function PredictionCardAdvanced({ data }: { data: PredictionData }) {
  const [expandedEngines, setExpandedEngines] = useState(false)
  const [showTechnicals, setShowTechnicals] = useState(false)

  const getTrendIcon = () => {
    return data.trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : data.trend === 'down' ? (
      <TrendingDown className="w-4 h-4 text-red-500" />
    ) : (
      <Zap className="w-4 h-4 text-gray-500" />
    )
  }

  const getTrendColor = () => {
    return data.trend === 'up' ? 'text-green-600' : data.trend === 'down' ? 'text-red-600' : 'text-gray-600'
  }

  return (
    <div className="space-y-4">
      {/* Main Prediction Card */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold mb-2">{data.symbol}</CardTitle>
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold font-mono ${getTrendColor()}`}>
                  ${data.prediction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon()}
                  <span className={`text-sm font-semibold ${getTrendColor()}`}>
                    {data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→'}
                    {' '}{data.trendStrength}%
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge 
                className={data.source === 'Admin' ? 'bg-purple-600' : 'bg-blue-600'}
              >
                {data.sourceLabel}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(data.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Confidence & Accuracy */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Confidence</label>
              <div className="mt-2">
                <div className="text-lg font-bold mb-1">{data.confidence}%</div>
                <Progress value={data.confidence} className="h-2" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">System Accuracy</label>
              <div className="mt-2">
                <div className="text-lg font-bold mb-1">{data.accuracy}%</div>
                <Progress value={data.accuracy} className="h-2" />
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex gap-2">
              <Brain className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-blue-900">Prediction Reasoning</div>
                <p className="text-blue-800 mt-1">{data.reasoning}</p>
              </div>
            </div>
          </div>

          {/* Top 3 Consensus Engines */}
          <div>
            <h3 className="font-semibold mb-3">Top 3 Consensus Engines</h3>
            <div className="space-y-2">
              {data.topEngines.map((engine, idx) => (
                <div key={engine.engineId} className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{idx + 1}. {engine.engineName}</div>
                    <div className="text-xs text-muted-foreground">
                      ${engine.prediction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      {engine.confidence}% confidence
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {engine.accuracy}% accuracy
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support & Resistance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Support Levels</label>
              <div className="space-y-1 mt-2">
                {data.supportLevels.map((level, idx) => (
                  <div key={idx} className="text-sm font-mono p-2 bg-gray-50 rounded">
                    ${level.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Resistance Levels</label>
              <div className="space-y-1 mt-2">
                {data.resistanceLevels.map((level, idx) => (
                  <div key={idx} className="text-sm font-mono p-2 bg-gray-50 rounded">
                    ${level.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pattern Recognition */}
          {data.patterns.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">Detected Patterns</h3>
              <div className="flex flex-wrap gap-2">
                {data.patterns.map((pattern, idx) => (
                  <Badge key={idx} variant="outline" className="capitalize">
                    {pattern.type} ({pattern.confidence}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Expandable: All Engines */}
          <button
            onClick={() => setExpandedEngines(!expandedEngines)}
            className="w-full py-2 px-3 rounded-lg border border-dashed hover:bg-gray-50 flex items-center justify-between text-sm font-medium text-muted-foreground"
          >
            <span>View All {data.allEngines.length} Engine Predictions</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedEngines ? 'rotate-180' : ''}`} />
          </button>

          {expandedEngines && (
            <div className="space-y-2 pt-2">
              {data.allEngines.map((engine) => (
                <div key={engine.engineId} className="p-2 rounded border text-xs flex justify-between">
                  <span className="font-medium">{engine.engineName}</span>
                  <span className="text-muted-foreground">
                    ${engine.prediction.toFixed(2)} • {engine.accuracy}% acc
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Technical Indicators */}
          <button
            onClick={() => setShowTechnicals(!showTechnicals)}
            className="w-full py-2 px-3 rounded-lg border border-dashed hover:bg-gray-50 flex items-center justify-between text-sm font-medium text-muted-foreground"
          >
            <span>Technical Indicators</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showTechnicals ? 'rotate-180' : ''}`} />
          </button>

          {showTechnicals && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">RSI</label>
                <div className="text-lg font-bold mt-1">{data.indicators.rsi}</div>
                <div className="text-xs text-muted-foreground">
                  {data.indicators.rsi > 70 ? '⚠ Overbought' : data.indicators.rsi < 30 ? '⚠ Oversold' : '✓ Neutral'}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">MACD</label>
                <div className="text-sm font-mono mt-1">{data.indicators.macd}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Bollinger</label>
                <div className="text-sm font-mono mt-1">{data.indicators.bollinger}</div>
              </div>
            </div>
          )}

          {/* Last Update */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last updated {new Date(data.timestamp).toLocaleTimeString()} • Next update in 2-3 seconds (throttled sync)
          </div>
        </CardContent>
      </Card>

      {/* Admin Override Notice */}
      {data.source === 'Admin' && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-purple-900">Admin Override Active</div>
                <p className="text-sm text-purple-800 mt-1">
                  This prediction was set by an administrator. AI engines are temporarily disabled.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

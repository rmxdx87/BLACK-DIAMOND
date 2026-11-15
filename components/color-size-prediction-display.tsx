'use client'

import { useState, useEffect } from 'react'
import {
  getFullColorSizeAnalysis,
  ColorType,
  SizeType,
} from '@/lib/advanced-prediction-engine'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, TrendingUp, Target, Zap } from 'lucide-react'

interface ColorSizePredictionDisplayProps {
  historicalSizes?: SizeType[]
  historicalColors?: ColorType[]
  showDetailedAnalysis?: boolean
}

export function ColorSizePredictionDisplay({
  historicalSizes = ['Big', 'Small', 'Big', 'Big', 'Small', 'Big', 'Small', 'Small'],
  historicalColors = ['Red', 'Green', 'Red', 'Violet', 'Green', 'Red', 'Green', 'Violet'],
  showDetailedAnalysis = true,
}: ColorSizePredictionDisplayProps) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      const result = getFullColorSizeAnalysis(historicalSizes, historicalColors)
      setAnalysis(result)
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [historicalSizes, historicalColors])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!analysis) return null

  const getColorBadgeStyle = (color: ColorType) => {
    switch (color) {
      case 'Red':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'Green':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'Violet':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSizeBadgeStyle = (size: SizeType) => {
    return size === 'Big' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-orange-100 text-orange-800 border-orange-300'
  }

  const confidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Size Prediction */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle>Size Prediction</CardTitle>
                <CardDescription>Consensus from 10 ML Engines</CardDescription>
              </div>
            </div>
            <Badge className="h-fit" variant="outline">
              {analysis.size.predictions.length} Engines
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge className={`text-lg px-4 py-2 ${getSizeBadgeStyle(analysis.size.consensus)}`}>
              {analysis.size.consensus}
            </Badge>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Confidence</span>
                <span className={`font-bold ${confidenceColor(analysis.size.confidence)}`}>
                  {analysis.size.confidence.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    analysis.size.confidence >= 80
                      ? 'bg-green-500'
                      : analysis.size.confidence >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${analysis.size.confidence}%` }}
                />
              </div>
            </div>
          </div>

          {/* Engine Breakdown */}
          {showDetailedAnalysis && (
            <div className="space-y-2 mt-4 pt-4 border-t">
              <button
                onClick={() => setExpandedEngine(expandedEngine === 'size' ? null : 'size')}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 w-full"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${expandedEngine === 'size' ? 'rotate-180' : ''}`}
                />
                View Individual Engine Predictions ({analysis.size.predictions.length})
              </button>

              {expandedEngine === 'size' && (
                <div className="grid gap-2 mt-3">
                  {analysis.size.predictions.map((pred: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 hover:border-blue-300"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <div>
                          <div className="font-medium text-sm">{pred.source}</div>
                          <div className="text-xs text-slate-500">{pred.value}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">{pred.confidence.toFixed(0)}%</div>
                        <div className="text-xs text-slate-400">{(pred.probability * 100).toFixed(0)}% prob</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Color Prediction */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-slate-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <CardTitle>Color Prediction</CardTitle>
                <CardDescription>Multi-class Classification from 10 Engines</CardDescription>
              </div>
            </div>
            <Badge className="h-fit" variant="outline">
              {analysis.color.predictions.length} Engines
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge className={`text-lg px-4 py-2 ${getColorBadgeStyle(analysis.color.consensus)}`}>
              {analysis.color.consensus}
            </Badge>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Confidence</span>
                <span className={`font-bold ${confidenceColor(analysis.color.confidence)}`}>
                  {analysis.color.confidence.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    analysis.color.confidence >= 80
                      ? 'bg-green-500'
                      : analysis.color.confidence >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${analysis.color.confidence}%` }}
                />
              </div>
            </div>
          </div>

          {/* Engine Breakdown */}
          {showDetailedAnalysis && (
            <div className="space-y-2 mt-4 pt-4 border-t">
              <button
                onClick={() => setExpandedEngine(expandedEngine === 'color' ? null : 'color')}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-purple-600 w-full"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${expandedEngine === 'color' ? 'rotate-180' : ''}`}
                />
                View Individual Engine Predictions ({analysis.color.predictions.length})
              </button>

              {expandedEngine === 'color' && (
                <div className="grid gap-2 mt-3">
                  {analysis.color.predictions.map((pred: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 hover:border-purple-300"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <div>
                          <div className="font-medium text-sm">{pred.source}</div>
                          <div className={`text-xs font-medium ${getColorBadgeStyle(pred.value).replace('border', '')}`}>
                            {pred.value}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">{pred.confidence.toFixed(0)}%</div>
                        <div className="text-xs text-slate-400">{(pred.probability * 100).toFixed(0)}% prob</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combined Analysis Summary */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-slate-50">
        <CardHeader>
          <CardTitle className="text-lg">Combined Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">Overall Confidence</div>
              <div className="text-2xl font-bold text-slate-900">
                {analysis.combinedConfidence.toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">Engines Used</div>
              <div className="text-2xl font-bold text-slate-900">
                {(analysis.size.predictions.length + analysis.color.predictions.length)}
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">Analysis Type</div>
              <div className="text-sm font-medium text-slate-900">Binary + Multi-class</div>
            </div>
            <div className="p-3 bg-white rounded border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">Last Updated</div>
              <div className="text-sm font-medium text-slate-900">
                {new Date(analysis.analysisTimestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

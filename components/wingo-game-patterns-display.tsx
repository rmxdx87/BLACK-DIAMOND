'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  detectGamePatterns,
  predictSizeWithGamePatterns,
  predictColorWithGamePatterns,
  type GameValue,
  type SizeType,
  type ColorType,
} from '@/lib/advanced-prediction-engine'
import { TrendingUp, Zap, Eye, AlertCircle, CheckCircle } from 'lucide-react'

interface WingoGamePatternsDisplayProps {
  historicalSizes?: SizeType[]
  historicalColors?: ColorType[]
  historicalNumbers?: number[]
  showAllPatterns?: boolean
  autoRefresh?: boolean
}

export function WingoGamePatternsDisplay({
  historicalSizes = [],
  historicalColors = [],
  historicalNumbers = [],
  showAllPatterns = true,
  autoRefresh = false,
}: WingoGamePatternsDisplayProps) {
  const [selectedType, setSelectedType] = useState<'size' | 'color' | 'numbers'>('size')

  const sizeAnalysis = useMemo(() => {
    return historicalSizes.length >= 3 ? predictSizeWithGamePatterns(historicalSizes) : null
  }, [historicalSizes])

  const colorAnalysis = useMemo(() => {
    return historicalColors.length >= 3 ? predictColorWithGamePatterns(historicalColors) : null
  }, [historicalColors])

  const numbersAnalysis = useMemo(() => {
    return historicalNumbers.length >= 3 ? detectGamePatterns(historicalNumbers) : null
  }, [historicalNumbers])

  const currentAnalysis =
    selectedType === 'size' ? sizeAnalysis : selectedType === 'color' ? colorAnalysis : numbersAnalysis

  if (!currentAnalysis) {
    return (
      <Card className="w-full border-yellow-500/20 bg-yellow-50/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="h-5 w-5" />
            <span>Need at least 3 historical records to analyze patterns</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="size">Size Patterns</TabsTrigger>
          <TabsTrigger value="color">Color Patterns</TabsTrigger>
          <TabsTrigger value="numbers">Number Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="space-y-4">
          {/* Best Match Pattern */}
          <Card className="border-2 border-blue-500/30 bg-gradient-to-r from-blue-50/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Best Match Pattern
                  </CardTitle>
                  <CardDescription>Most likely pattern detected</CardDescription>
                </div>
                {currentAnalysis.bestMatch.detected && (
                  <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                    {Math.round(currentAnalysis.bestMatch.confidence)}% Confidence
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Pattern Type</span>
                  <p className="font-semibold text-lg capitalize">
                    {currentAnalysis.bestMatch.patternType.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Next Prediction</span>
                  <p className="font-semibold text-lg text-blue-600">
                    {currentAnalysis.bestMatch.nextPrediction || 'Unpredictable'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded p-3 border border-gray-200">
                <p className="text-sm text-gray-700">{currentAnalysis.bestMatch.reasoning}</p>
              </div>

              {currentAnalysis.bestMatch.sequenceMatch.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600">Matched Sequence</span>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {currentAnalysis.bestMatch.sequenceMatch.map((val, idx) => (
                      <Badge key={idx} variant="secondary">
                        {String(val)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ensemble Prediction */}
          {currentAnalysis.ensemblePrediction !== null && (
            <Card className="border-2 border-purple-500/30 bg-gradient-to-r from-purple-50/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-600" />
                      Ensemble Prediction
                    </CardTitle>
                    <CardDescription>Combined analysis from all patterns</CardDescription>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30">
                    {Math.round(currentAnalysis.ensembleConfidence)}% Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">
                  {String(currentAnalysis.ensemblePrediction)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* All Detected Patterns */}
          {showAllPatterns && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  All Detected Patterns ({currentAnalysis.detectedPatterns.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentAnalysis.detectedPatterns
                    .filter((p) => p.confidence > 0)
                    .map((pattern, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-lg p-3 ${
                          pattern.detected
                            ? 'border-green-500/30 bg-green-50/5'
                            : 'border-gray-200 bg-gray-50/5'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {pattern.detected && <CheckCircle className="h-4 w-4 text-green-600" />}
                              <span className="font-semibold capitalize">
                                {pattern.patternType.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{pattern.reasoning}</p>
                          </div>
                          <Badge variant={pattern.detected ? 'default' : 'secondary'}>
                            {Math.round(pattern.confidence)}%
                          </Badge>
                        </div>
                        {pattern.prediction !== null && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">Predicts: </span>
                            <span className="font-semibold text-blue-600">{String(pattern.prediction)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Sequence */}
          {currentAnalysis.currentSequence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Sequence (Last 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {currentAnalysis.currentSequence.map((val, idx) => (
                    <Badge key={idx} variant="outline">
                      {String(val)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

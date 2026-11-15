'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  predictSizeWithGamePatterns, 
  predictColorWithGamePatterns,
  detectGamePatterns,
  type SizeType,
  type ColorType,
} from '@/lib/advanced-prediction-engine'
import { Play, RotateCcw, Zap, Code } from 'lucide-react'

export function GamePatternsControl() {
  const [testMode, setTestMode] = useState<'size' | 'color' | 'numbers'>('size')
  const [sizeSequence, setSizeSequence] = useState<SizeType[]>(['Big', 'Big', 'Big', 'Big', 'Big'])
  const [colorSequence, setColorSequence] = useState<ColorType[]>(['Red', 'Red', 'Red', 'Green', 'Green'])
  const [numberSequence, setNumberSequence] = useState<number[]>([1, 2, 3, 4, 5])
  const [result, setResult] = useState<any>(null)

  const testPatterns = () => {
    let analysisResult
    if (testMode === 'size') {
      analysisResult = predictSizeWithGamePatterns(sizeSequence)
    } else if (testMode === 'color') {
      analysisResult = predictColorWithGamePatterns(colorSequence)
    } else {
      analysisResult = detectGamePatterns(numberSequence)
    }
    setResult(analysisResult)
  }

  const testTeleport = () => {
    if (testMode === 'size') {
      setSizeSequence(['Big', 'Big', 'Big', 'Big', 'Big', 'Big'])
    } else {
      setColorSequence(['Red', 'Red', 'Red', 'Red', 'Red', 'Red'])
    }
  }

  const testAlternate = () => {
    if (testMode === 'size') {
      setSizeSequence(['Big', 'Small', 'Big', 'Small', 'Big'])
    } else {
      setColorSequence(['Red', 'Green', 'Red', 'Green', 'Red'])
    }
  }

  const testMirror = () => {
    if (testMode === 'size') {
      setSizeSequence(['Big', 'Big', 'Small', 'Small', 'Big', 'Big'])
    } else {
      setColorSequence(['Red', 'Red', 'Green', 'Green', 'Red'])
    }
  }

  const testSandwich = () => {
    if (testMode === 'size') {
      setSizeSequence(['Big', 'Small', 'Small', 'Big'])
    } else {
      setColorSequence(['Red', 'Green', 'Green', 'Red'])
    }
  }

  const testStaircase = () => {
    if (testMode === 'size') {
      setSizeSequence(['Big', 'Big', 'Big', 'Small', 'Small', 'Big'])
    } else {
      setColorSequence(['Red', 'Red', 'Red', 'Green', 'Green', 'Red'])
    }
  }

  const reset = () => {
    setSizeSequence(['Big', 'Big', 'Big', 'Big', 'Big'])
    setColorSequence(['Red', 'Red', 'Red', 'Green', 'Green'])
    setNumberSequence([1, 2, 3, 4, 5])
    setResult(null)
  }

  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Wingo Game Patterns - Test Console
            </CardTitle>
            <CardDescription>Test all 10 game pattern detection algorithms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={testMode} onValueChange={(v) => setTestMode(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="size">Size</TabsTrigger>
                <TabsTrigger value="color">Color</TabsTrigger>
                <TabsTrigger value="numbers">Numbers</TabsTrigger>
              </TabsList>

              <TabsContent value={testMode} className="space-y-4 mt-4">
                {/* Input Section */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Test Sequence</label>
                  <div className="bg-gray-50 rounded p-3 border border-gray-200">
                    <div className="flex gap-2 flex-wrap">
                      {testMode === 'size' && sizeSequence.map((val, idx) => (
                        <Badge key={idx} variant="secondary">
                          {val}
                        </Badge>
                      ))}
                      {testMode === 'color' && colorSequence.map((val, idx) => (
                        <Badge key={idx} variant="secondary">
                          {val}
                        </Badge>
                      ))}
                      {testMode === 'numbers' && numberSequence.map((val, idx) => (
                        <Badge key={idx} variant="secondary">
                          {val}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Test Buttons */}
                {testMode !== 'numbers' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold block">Quick Test Patterns</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={testTeleport} variant="outline" size="sm">
                        Teleport/Ladi
                      </Button>
                      <Button onClick={testAlternate} variant="outline" size="sm">
                        Alternate
                      </Button>
                      <Button onClick={testMirror} variant="outline" size="sm">
                        Mirror
                      </Button>
                      <Button onClick={testSandwich} variant="outline" size="sm">
                        Sandwich
                      </Button>
                      <Button onClick={testStaircase} variant="outline" size="sm">
                        Staircase
                      </Button>
                      <Button onClick={reset} variant="outline" size="sm">
                        Reset
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button onClick={testPatterns} className="flex-1 gap-2">
                    <Play className="h-4 w-4" />
                    Analyze Pattern
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className="border-blue-500/50 bg-blue-50/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Analysis Results</span>
                {result.bestMatch.detected && (
                  <Badge className="bg-green-500/20 text-green-700">
                    {Math.round(result.bestMatch.confidence)}% Confidence
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Best Match */}
              <div className="bg-white rounded border border-blue-200 p-4">
                <h4 className="font-semibold text-lg mb-2 capitalize">
                  {result.bestMatch.patternType.replace(/_/g, ' ')}
                </h4>
                <p className="text-sm text-gray-700 mb-3">{result.bestMatch.reasoning}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-600">Next Prediction</span>
                    <p className="font-semibold text-lg">
                      {result.bestMatch.nextPrediction || 'Unpredictable'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">Confidence</span>
                    <p className="font-semibold text-lg">
                      {Math.round(result.bestMatch.confidence)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Ensemble */}
              {result.ensemblePrediction !== null && (
                <div className="bg-purple-50 rounded border border-purple-200 p-4">
                  <h4 className="font-semibold mb-2">Ensemble Prediction</h4>
                  <p className="text-3xl font-bold text-purple-600">
                    {String(result.ensemblePrediction)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Confidence: {Math.round(result.ensembleConfidence)}%
                  </p>
                </div>
              )}

              {/* All Patterns Summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">All Patterns Summary</h4>
                <div className="grid gap-2">
                  {result.detectedPatterns
                    .filter((p: any) => p.confidence > 0)
                    .slice(0, 5)
                    .map((pattern: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <span className="text-sm capitalize">
                          {pattern.patternType.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="secondary">
                          {Math.round(pattern.confidence)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>

              {/* Code Example */}
              <div className="bg-gray-900 text-gray-100 rounded p-3 text-xs overflow-x-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-4 w-4" />
                  <span className="font-semibold">Usage Example</span>
                </div>
                <pre>{`const result = predictSizeWithGamePatterns(['Big', 'Big', 'Big'])
console.log(result.bestMatch.patternType)
console.log(result.bestMatch.prediction)
console.log(result.bestMatch.confidence)`}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pattern Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pattern Reference</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Teleport/Ladi', desc: '[A, A, A, A...] - Continuous streak' },
              { name: 'Alternate', desc: '[A, B, A, B...] - Zig-zag pattern' },
              { name: 'Mirror', desc: '[A, A, B, B...] - Paired values' },
              { name: 'Sandwich', desc: '[A, B, B, A] - Value surrounded' },
              { name: 'Staircase', desc: '[A×3, B×2, C] - Decreasing freq' },
              { name: 'Triple Break', desc: '[A, B, C] - 3+ different values' },
              { name: 'Quad Run', desc: '[A, A, A, A] - 4+ repeats' },
              { name: 'Increment', desc: '[1, 2, 3, 4] - Increasing sequence' },
              { name: 'Decrement', desc: '[4, 3, 2, 1] - Decreasing sequence' },
              { name: 'Cycle', desc: '[A, B, C, A, B, C] - Repeating cycle' },
            ].map((pattern, idx) => (
              <div key={idx} className="border rounded p-2 bg-gray-50">
                <div className="font-semibold text-xs">{pattern.name}</div>
                <div className="text-xs text-gray-600">{pattern.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

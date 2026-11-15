'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  WingoPatternSystem,
  RepeatPatternRule,
  PatternBreakRule,
} from '@/lib/wingo-pattern-rules'
import type { SizeType, ColorType } from '@/lib/color-size-prediction-engines'
import { AlertCircle, Settings, BarChart3, Zap } from 'lucide-react'

export function WingoRulesControl() {
  const [repeatRule, setRepeatRule] = useState(true)
  const [breakRule, setBreakRule] = useState(true)
  const [breakThreshold, setBreakThreshold] = useState(5)
  const [testSizeSequence, setTestSizeSequence] = useState('Big,Big,Big,Big,Big,Big')
  const [testColorSequence, setTestColorSequence] = useState('Red,Red,Red,Red,Red,Red')
  const [sizeResult, setSizeResult] = useState<any>(null)
  const [colorResult, setColorResult] = useState<any>(null)

  const testSizePrediction = () => {
    try {
      const sizes = testSizeSequence.split(',').map(s => s.trim()) as SizeType[]
      const system = new WingoPatternSystem()
      const result = system.predictSize(sizes, breakRule, repeatRule)
      setSizeResult(result)
    } catch (error) {
      setSizeResult({ error: 'Invalid input' })
    }
  }

  const testColorPrediction = () => {
    try {
      const colors = testColorSequence.split(',').map(c => c.trim()) as ColorType[]
      const system = new WingoPatternSystem()
      const result = system.predictColor(colors, breakRule, repeatRule)
      setColorResult(result)
    } catch (error) {
      setColorResult({ error: 'Invalid input' })
    }
  }

  const resetThreshold = () => {
    setBreakThreshold(5)
  }

  const generateTest = (repeats: number) => {
    setTestSizeSequence(Array(repeats).fill('Big').join(','))
    setTestColorSequence(Array(repeats).fill('Red').join(','))
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Wingo Pattern Rules Control
        </h2>
        <p className="text-gray-400">
          Configure Repeat Pattern and Pattern Break rules for Size & Color predictions
        </p>
      </div>

      {/* Rule Configuration */}
      <Card className="p-6 bg-slate-900/50 border-gray-700/30">
        <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Active Rules
        </h3>

        <div className="space-y-4">
          {/* Repeat Pattern Rule */}
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
            <div>
              <p className="font-medium text-gray-200">Repeat Pattern Rule</p>
              <p className="text-sm text-gray-400">
                Continue trend if value repeats consecutively
              </p>
            </div>
            <button
              onClick={() => setRepeatRule(!repeatRule)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                repeatRule ? 'bg-emerald-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  repeatRule ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Pattern Break Rule */}
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
            <div>
              <p className="font-medium text-gray-200">Pattern Break Rule</p>
              <p className="text-sm text-gray-400">
                Predict opposite after 5-6 consecutive repeats
              </p>
            </div>
            <button
              onClick={() => setBreakRule(!breakRule)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                breakRule ? 'bg-orange-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  breakRule ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Break Threshold Configuration */}
      <Card className="p-6 bg-slate-900/50 border-gray-700/30">
        <h3 className="font-semibold text-gray-200 mb-4">Break Threshold Setting</h3>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">
              Trigger Pattern Break After (repetitions)
            </Label>
            <div className="flex gap-3 mt-2">
              <Input
                type="number"
                min="3"
                max="10"
                value={breakThreshold}
                onChange={e => setBreakThreshold(Math.max(3, parseInt(e.target.value) || 5))}
                className="bg-gray-900 border-gray-700 text-white"
              />
              <Button variant="outline" onClick={resetThreshold}>
                Reset
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Pattern breaks predicted after {breakThreshold}+ consecutive same values
            </p>
          </div>

          {/* Threshold Examples */}
          <div className="grid grid-cols-3 gap-2">
            {[3, 5, 7].map(threshold => (
              <button
                key={threshold}
                onClick={() => setBreakThreshold(threshold)}
                className={`p-2 rounded-lg border transition-colors ${
                  breakThreshold === threshold
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {threshold}x
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Test Size Predictions */}
      <Card className="p-6 bg-slate-900/50 border-gray-700/30">
        <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Test Size Predictions
        </h3>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Size Sequence (comma-separated)</Label>
            <textarea
              value={testSizeSequence}
              onChange={e => setTestSizeSequence(e.target.value)}
              className="w-full mt-2 p-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono"
              rows={3}
              placeholder="Big,Big,Big,Big,Big"
            />
            <p className="text-xs text-gray-400 mt-1">Valid values: Big, Small</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={testSizePrediction} variant="default">
              Test Prediction
            </Button>
            <Button
              onClick={() => generateTest(3)}
              variant="outline"
              size="sm"
            >
              3x Big
            </Button>
            <Button
              onClick={() => generateTest(5)}
              variant="outline"
              size="sm"
            >
              5x Big
            </Button>
            <Button
              onClick={() => generateTest(7)}
              variant="outline"
              size="sm"
            >
              7x Big
            </Button>
          </div>

          {sizeResult && (
            <div
              className={`p-4 rounded-lg border ${
                sizeResult.error
                  ? 'bg-red-900/20 border-red-500/30'
                  : 'bg-blue-900/20 border-blue-500/30'
              }`}
            >
              {sizeResult.error ? (
                <p className="text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {sizeResult.error}
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="text-blue-200">
                    <span className="font-semibold">Prediction:</span>{' '}
                    <span className="text-lg font-bold">
                      {sizeResult.recommendation}
                    </span>
                  </p>
                  <p className="text-blue-200">
                    <span className="font-semibold">Confidence:</span>{' '}
                    {Math.round(sizeResult.combinedConfidence)}%
                  </p>
                  <p className="text-blue-300 text-xs mt-2">
                    <span className="font-semibold">Primary Rule:</span>{' '}
                    {sizeResult.primary.rule} - {sizeResult.primary.explanation}
                  </p>
                  {sizeResult.secondary && (
                    <p className="text-blue-300 text-xs">
                      <span className="font-semibold">Secondary Rule:</span>{' '}
                      {sizeResult.secondary.rule}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Test Color Predictions */}
      <Card className="p-6 bg-slate-900/50 border-gray-700/30">
        <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Test Color Predictions
        </h3>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Color Sequence (comma-separated)</Label>
            <textarea
              value={testColorSequence}
              onChange={e => setTestColorSequence(e.target.value)}
              className="w-full mt-2 p-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono"
              rows={3}
              placeholder="Red,Red,Red,Red,Red"
            />
            <p className="text-xs text-gray-400 mt-1">Valid values: Red, Green, Violet</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={testColorPrediction} variant="default">
              Test Prediction
            </Button>
            <Button
              onClick={() => setTestColorSequence(Array(3).fill('Red').join(','))}
              variant="outline"
              size="sm"
            >
              3x Red
            </Button>
            <Button
              onClick={() => setTestColorSequence(Array(5).fill('Red').join(','))}
              variant="outline"
              size="sm"
            >
              5x Red
            </Button>
            <Button
              onClick={() => setTestColorSequence(Array(7).fill('Red').join(','))}
              variant="outline"
              size="sm"
            >
              7x Red
            </Button>
          </div>

          {colorResult && (
            <div
              className={`p-4 rounded-lg border ${
                colorResult.error
                  ? 'bg-red-900/20 border-red-500/30'
                  : 'bg-purple-900/20 border-purple-500/30'
              }`}
            >
              {colorResult.error ? (
                <p className="text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {colorResult.error}
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="text-purple-200">
                    <span className="font-semibold">Prediction:</span>{' '}
                    <span className="text-lg font-bold">
                      {colorResult.recommendation}
                    </span>
                  </p>
                  <p className="text-purple-200">
                    <span className="font-semibold">Confidence:</span>{' '}
                    {Math.round(colorResult.combinedConfidence)}%
                  </p>
                  <p className="text-purple-300 text-xs mt-2">
                    <span className="font-semibold">Primary Rule:</span>{' '}
                    {colorResult.primary.rule} - {colorResult.primary.explanation}
                  </p>
                  {colorResult.secondary && (
                    <p className="text-purple-300 text-xs">
                      <span className="font-semibold">Secondary Rule:</span>{' '}
                      {colorResult.secondary.rule}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Documentation */}
      <Card className="p-6 bg-slate-900/50 border-gray-700/30">
        <h3 className="font-semibold text-gray-200 mb-4">How Wingo Rules Work</h3>

        <div className="space-y-3 text-sm text-gray-400">
          <div>
            <p className="font-semibold text-gray-300 mb-1">Repeat Pattern Rule</p>
            <p>
              Detects consecutive repeats and predicts continuation. Example: Big → Big
              → Big = Predicts Big
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-300 mb-1">Pattern Break Rule</p>
            <p>
              After {breakThreshold}+ repeats, predicts the pattern will break to opposite value.
              Example: Big → Big → Big → Big → Big → Big = Predicts Small
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-300 mb-1">Confidence Calculation</p>
            <p>
              Confidence increases with streak length (repeat rule) or number of repeats
              above threshold (break rule), capped at 90-95%
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-300 mb-1">Alternating Patterns</p>
            <p>
              Repeat Pattern Rule also detects alternating sequences: Red → Green → Red
              → Green = Predicts Red
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

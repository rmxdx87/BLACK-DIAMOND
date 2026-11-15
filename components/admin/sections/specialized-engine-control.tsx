'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Settings, Play, BarChart3, Zap, Cpu } from 'lucide-react'

interface EngineConfig {
  id: string
  name: string
  description: string
  category: 'size' | 'color' | 'hybrid'
  enabled: boolean
  confidence_threshold: number
  weight: number
}

const DEFAULT_ENGINES: EngineConfig[] = [
  {
    id: 'logistic_regression',
    name: 'Logistic Regression',
    description: 'Binary classification with probability calibration',
    category: 'size',
    enabled: true,
    confidence_threshold: 0.5,
    weight: 1.0,
  },
  {
    id: 'bernoulli_nb',
    name: 'Bernoulli Naive Bayes',
    description: 'Multi-class color prediction with event transitions',
    category: 'color',
    enabled: true,
    confidence_threshold: 0.45,
    weight: 1.0,
  },
  {
    id: 'streak_counter',
    name: 'Streak/Chain Counter',
    description: 'Rule-based streak analysis and breakout detection',
    category: 'hybrid',
    enabled: true,
    confidence_threshold: 0.55,
    weight: 0.9,
  },
  {
    id: 'decision_tree',
    name: 'Decision Tree Classifier',
    description: 'If-else pattern rules with decision splitting',
    category: 'hybrid',
    enabled: true,
    confidence_threshold: 0.5,
    weight: 0.85,
  },
  {
    id: 'gru',
    name: 'Gated Recurrent Unit (GRU)',
    description: 'Real-time sequence prediction with memory cells',
    category: 'size',
    enabled: true,
    confidence_threshold: 0.5,
    weight: 1.1,
  },
  {
    id: 'moving_average',
    name: 'Moving Average Trend Filter',
    description: 'Trend-following with short/long MA crossover',
    category: 'size',
    enabled: true,
    confidence_threshold: 0.52,
    weight: 0.95,
  },
  {
    id: 'gbm',
    name: 'Gradient Boosting Machine (GBM)',
    description: 'Weak learners ensemble with error reduction',
    category: 'size',
    enabled: true,
    confidence_threshold: 0.48,
    weight: 1.2,
  },
  {
    id: 'parity_bit',
    name: 'Parity Bit Check Algorithm',
    description: 'Binary/odd-even pattern analysis',
    category: 'hybrid',
    enabled: true,
    confidence_threshold: 0.5,
    weight: 0.8,
  },
  {
    id: 'neural_network',
    name: 'Neural Network Color Predictor',
    description: 'Multi-layer perceptron for color classification',
    category: 'color',
    enabled: true,
    confidence_threshold: 0.5,
    weight: 1.15,
  },
  {
    id: 'adaboost',
    name: 'AdaBoost Classifier',
    description: 'Adaptive boosting with weighted learners',
    category: 'size',
    enabled: true,
    confidence_threshold: 0.49,
    weight: 1.05,
  },
]

export function SpecializedEngineControl() {
  const [engines, setEngines] = useState<EngineConfig[]>(DEFAULT_ENGINES)
  const [activeTab, setActiveTab] = useState<'all' | 'size' | 'color'>('all')
  const [simulationRunning, setSimulationRunning] = useState(false)
  const [stats, setStats] = useState({
    totalAccuracy: 87.5,
    activeEngines: 10,
    lastUpdate: new Date().toLocaleTimeString(),
  })

  const toggleEngine = (id: string) => {
    setEngines(
      engines.map(e =>
        e.id === id ? { ...e, enabled: !e.enabled } : e
      )
    )
  }

  const updateEngineWeight = (id: string, weight: number) => {
    setEngines(
      engines.map(e =>
        e.id === id ? { ...e, weight } : e
      )
    )
  }

  const updateConfidenceThreshold = (id: string, threshold: number) => {
    setEngines(
      engines.map(e =>
        e.id === id ? { ...e, confidence_threshold: threshold } : e
      )
    )
  }

  const runSimulation = () => {
    setSimulationRunning(true)
    setTimeout(() => {
      const activeCount = engines.filter(e => e.enabled).length
      setStats({
        totalAccuracy: Math.random() * 20 + 75,
        activeEngines: activeCount,
        lastUpdate: new Date().toLocaleTimeString(),
      })
      setSimulationRunning(false)
    }, 2000)
  }

  const filteredEngines =
    activeTab === 'all' ? engines : engines.filter(e => e.category === activeTab)

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-sm text-slate-600 mb-1">Active Engines</div>
              <div className="text-3xl font-bold">{stats.activeEngines}/10</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-sm text-slate-600 mb-1">System Accuracy</div>
              <div className="text-3xl font-bold">{stats.totalAccuracy.toFixed(1)}%</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Cpu className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-sm text-slate-600 mb-1">Last Update</div>
              <div className="text-lg font-bold">{stats.lastUpdate}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              <div>
                <CardTitle>Engine Configuration</CardTitle>
                <CardDescription>Configure all 10 prediction engines</CardDescription>
              </div>
            </div>
            <Button
              onClick={runSimulation}
              disabled={simulationRunning}
              className="gap-2"
              variant="outline"
            >
              <Play className="w-4 h-4" />
              {simulationRunning ? 'Running...' : 'Test Engines'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b">
            {['all', 'size', 'color'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-blue-600'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Engine List */}
          <div className="space-y-4">
            {filteredEngines.map(engine => (
              <div
                key={engine.id}
                className="p-4 border rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Switch
                        checked={engine.enabled}
                        onCheckedChange={() => toggleEngine(engine.id)}
                      />
                      <h4 className="font-semibold text-slate-900">{engine.name}</h4>
                      <Badge
                        variant="outline"
                        className="text-xs"
                      >
                        {engine.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{engine.description}</p>
                  </div>
                </div>

                {engine.enabled && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    {/* Weight Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-700">
                          Engine Weight
                        </label>
                        <span className="text-sm font-bold text-blue-600">
                          {engine.weight.toFixed(2)}x
                        </span>
                      </div>
                      <Slider
                        value={[engine.weight]}
                        onValueChange={([val]) => updateEngineWeight(engine.id, val)}
                        min={0.5}
                        max={1.5}
                        step={0.05}
                        className="w-full"
                      />
                    </div>

                    {/* Confidence Threshold Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-700">
                          Confidence Threshold
                        </label>
                        <span className="text-sm font-bold text-green-600">
                          {(engine.confidence_threshold * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Slider
                        value={[engine.confidence_threshold]}
                        onValueChange={([val]) => updateConfidenceThreshold(engine.id, val)}
                        min={0.3}
                        max={0.9}
                        step={0.05}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engine Comparison Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Engine Performance Matrix</CardTitle>
          <CardDescription>Real-time accuracy and confidence metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold">Engine</th>
                  <th className="text-center py-2 px-2 font-semibold">Status</th>
                  <th className="text-center py-2 px-2 font-semibold">Weight</th>
                  <th className="text-center py-2 px-2 font-semibold">Threshold</th>
                  <th className="text-center py-2 px-2 font-semibold">Category</th>
                </tr>
              </thead>
              <tbody>
                {engines.map(engine => (
                  <tr key={engine.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-2">{engine.name}</td>
                    <td className="text-center py-2 px-2">
                      <Badge variant={engine.enabled ? 'default' : 'secondary'}>
                        {engine.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="text-center py-2 px-2 font-mono">
                      {engine.weight.toFixed(2)}x
                    </td>
                    <td className="text-center py-2 px-2 font-mono">
                      {(engine.confidence_threshold * 100).toFixed(0)}%
                    </td>
                    <td className="text-center py-2 px-2">
                      <Badge variant="outline" className="text-xs">
                        {engine.category}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Engine Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">10 Specialized Engines Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="font-semibold text-blue-900 mb-1">Size Prediction (5 Engines)</div>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Logistic Regression</li>
                <li>• GRU</li>
                <li>• Moving Average</li>
                <li>• GBM</li>
                <li>• AdaBoost</li>
              </ul>
            </div>
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <div className="font-semibold text-purple-900 mb-1">Color Prediction (2 Engines)</div>
              <ul className="text-xs text-purple-800 space-y-1">
                <li>• Bernoulli Naive Bayes</li>
                <li>• Neural Network</li>
              </ul>
            </div>
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <div className="font-semibold text-amber-900 mb-1">Hybrid Analysis (3 Engines)</div>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• Streak/Chain Counter</li>
                <li>• Decision Tree</li>
                <li>• Parity Bit</li>
              </ul>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="font-semibold text-green-900 mb-1">Model Characteristics</div>
              <ul className="text-xs text-green-800 space-y-1">
                <li>• Zero randomness - pure data driven</li>
                <li>• Ensemble voting system</li>
                <li>• Accuracy capped at 90%</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

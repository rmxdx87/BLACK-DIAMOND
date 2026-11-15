"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  TrendingUp,
  Brain,
  Target,
  Zap,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react"

interface EnginePerformance {
  engineId: string
  engineName: string
  accuracy: number
  totalPredictions: number
  correctPredictions: number
  trend: 'up' | 'down' | 'stable'
}

interface AnalyticsData {
  overallAccuracy: number
  qualityScore: number
  topEngines: EnginePerformance[]
  predictionsToday: number
  winRate: number
  averageConfidence: number
  lastUpdate: number
}

const mockData: AnalyticsData = {
  overallAccuracy: 87.5,
  qualityScore: 89,
  topEngines: [
    { engineId: 'ens-1', engineName: 'Ensemble v1', accuracy: 92, totalPredictions: 245, correctPredictions: 225, trend: 'up' },
    { engineId: 'pat-0', engineName: 'Pattern Recognition v1', accuracy: 88, totalPredictions: 234, correctPredictions: 206, trend: 'stable' },
    { engineId: 'trend-0', engineName: 'Trend Analysis v1', accuracy: 87, totalPredictions: 220, correctPredictions: 191, trend: 'down' },
  ],
  predictionsToday: 127,
  winRate: 84,
  averageConfidence: 76,
  lastUpdate: Date.now(),
}

export function PredictionAnalyticsDashboard() {
  const [selectedEngines, setSelectedEngines] = useState<string[]>([])
  const [timeframe, setTimeframe] = useState('7d')

  const toggleEngineSelection = (engineId: string) => {
    setSelectedEngines(prev =>
      prev.includes(engineId)
        ? prev.filter(id => id !== engineId)
        : [...prev, engineId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Overall Accuracy</p>
              <div className="text-3xl font-bold">{mockData.overallAccuracy}%</div>
              <Progress value={mockData.overallAccuracy} className="mt-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Quality Score</p>
              <div className="text-3xl font-bold text-green-600">{mockData.qualityScore}/100</div>
              <p className="text-xs text-green-600 mt-2">✓ Excellent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <div className="text-3xl font-bold text-blue-600">{mockData.winRate}%</div>
              <p className="text-xs text-muted-foreground mt-2">Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <div className="text-3xl font-bold">{mockData.averageConfidence}%</div>
              <p className="text-xs text-muted-foreground mt-2">{mockData.predictionsToday} predictions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="features" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features">Premium Features</TabsTrigger>
          <TabsTrigger value="comparison">Engine Comparison</TabsTrigger>
          <TabsTrigger value="backtesting">Backtesting</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* TOP 10 PREMIUM FEATURES */}
        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 1. Engine Comparison Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Engine Comparison Matrix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Compare any 2-5 engines side-by-side with detailed metrics
                </p>
                <div className="space-y-2 mb-4">
                  {mockData.topEngines.map(engine => (
                    <button
                      key={engine.engineId}
                      onClick={() => toggleEngineSelection(engine.engineId)}
                      className={`w-full text-left p-2 rounded border ${
                        selectedEngines.includes(engine.engineId)
                          ? 'bg-blue-50 border-blue-500'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{engine.engineName}</span>
                        <Badge>{engine.accuracy}%</Badge>
                      </div>
                    </button>
                  ))}
                </div>
                <Button size="sm" className="w-full">Compare Selected</Button>
              </CardContent>
            </Card>

            {/* 2. Accuracy Predictor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Accuracy Predictor AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  AI predicts which engine will be most accurate
                </p>
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-sm font-semibold text-green-900">
                      Most Likely Accurate: Ensemble v1
                    </p>
                    <p className="text-xs text-green-700 mt-1">Confidence: 94%</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Based on historical performance and current market conditions
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 3. Confidence Score Explanation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Confidence Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed breakdown of confidence score calculation
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Engine Agreement</span>
                    <span className="font-medium">+28%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Historical Accuracy</span>
                    <span className="font-medium">+24%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trend Strength</span>
                    <span className="font-medium">+18%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pattern Match</span>
                    <span className="font-medium">+12%</span>
                  </div>
                  <div className="border-t pt-2 font-bold flex justify-between">
                    <span>Total Confidence</span>
                    <span>82%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Pattern Library */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Pattern Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Visual pattern recognition with historical success rates
                </p>
                <div className="space-y-2">
                  {[
                    { name: 'Head & Shoulders', success: 72 },
                    { name: 'Double Top', success: 65 },
                    { name: 'Triangle', success: 68 },
                  ].map(p => (
                    <div key={p.name} className="flex justify-between items-center">
                      <span className="text-sm">{p.name}</span>
                      <Badge variant="outline">{p.success}% success</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 5. Trend Strength Meter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Trend Strength Meter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Visual indicator of trend reliability
                </p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Uptrend Strength</span>
                      <span className="text-sm font-bold">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <p className="text-xs text-green-600">✓ Strong uptrend detected</p>
                </div>
              </CardContent>
            </Card>

            {/* 6. Prediction Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline & History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Historical predictions with outcomes
                </p>
                <div className="space-y-2">
                  {[
                    { time: '2m ago', result: 'correct', change: '+2.3%' },
                    { time: '15m ago', result: 'correct', change: '+1.8%' },
                    { time: '45m ago', result: 'close', change: '+0.9%' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 rounded bg-gray-50">
                      <span>{item.time}</span>
                      {item.result === 'correct' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="font-mono">{item.change}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 7. Engine Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Engine Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  AI-generated insights on engine decisions
                </p>
                <div className="text-sm space-y-2">
                  <p><strong>Ensemble v1:</strong> Strong consensus on uptrend based on multi-timeframe analysis</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Generated {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 8. Smart Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Smart Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Alerts when high-confidence predictions conflict
                </p>
                <div className="space-y-2">
                  <div className="p-2 rounded bg-amber-50 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-900">⚠ Conflicting Signals</p>
                    <p className="text-xs text-amber-700 mt-1">
                      2 engines predict down, 3 predict up
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 9. Backtesting Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Backtesting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Test engine performance on historical data
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Run Backtest
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Last run: 2 hours ago • Result: 89% accuracy
                </p>
              </CardContent>
            </Card>

            {/* 10. Quality Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  System Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Overall system health metric (0-100%)
                </p>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {mockData.qualityScore}
                  </div>
                  <div className="text-xs text-green-700">EXCELLENT</div>
                  <p className="text-xs text-muted-foreground mt-3">
                    All systems optimal • 52 active engines
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engine Comparison */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Engine Comparison</CardTitle>
              <CardDescription>Side-by-side performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Engine</th>
                      <th className="text-right py-2">Accuracy</th>
                      <th className="text-right py-2">Total Preds</th>
                      <th className="text-right py-2">Correct</th>
                      <th className="text-center py-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockData.topEngines.map(engine => (
                      <tr key={engine.engineId} className="border-b hover:bg-gray-50">
                        <td className="py-3 font-medium">{engine.engineName}</td>
                        <td className="text-right">{engine.accuracy}%</td>
                        <td className="text-right">{engine.totalPredictions}</td>
                        <td className="text-right">{engine.correctPredictions}</td>
                        <td className="text-center">
                          {engine.trend === 'up' ? '📈' : engine.trend === 'down' ? '📉' : '➡️'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backtesting */}
        <TabsContent value="backtesting">
          <Card>
            <CardHeader>
              <CardTitle>Backtesting Results</CardTitle>
              <CardDescription>Historical performance analysis</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <Button size="lg">Run New Backtest</Button>
              <p className="text-muted-foreground mt-4">Last backtest: 89% accuracy on 30-day historical data</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>System Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">Best Performing Category</p>
                <p className="text-sm text-blue-800">Ensemble models achieving 89-92% accuracy consistently</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="font-semibold text-amber-900 mb-2">Recommendation</p>
                <p className="text-sm text-amber-800">Increase weight on Ensemble engines. Disable underperforming Trend Analysis variants.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

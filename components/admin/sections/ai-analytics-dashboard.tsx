"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Brain,
  TrendingUp,
  Target,
  Zap,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  AlertCircle,
  CheckCircle,
} from "lucide-react"

interface AIMetrics {
  predictionAccuracy: number
  modelPerformance: {
    markovChain: number
    patternRecognition: number
    trendAnalysis: number
    neuralNetwork: number
    statisticalRegression: number
    cyclicalAnalysis: number
  }
  realTimeStats: {
    totalPredictions: number
    correctPredictions: number
    winRate: number
    confidence: number
  }
  behaviorAnalysis: {
    userEngagement: number
    patternCompliance: number
    riskLevel: string
  }
}

export function AIAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AIMetrics>({
    predictionAccuracy: 87.5,
    modelPerformance: {
      markovChain: 89.2,
      patternRecognition: 85.7,
      trendAnalysis: 91.3,
      neuralNetwork: 88.9,
      statisticalRegression: 84.1,
      cyclicalAnalysis: 86.8,
    },
    realTimeStats: {
      totalPredictions: 1247,
      correctPredictions: 1091,
      winRate: 87.5,
      confidence: 92.3,
    },
    behaviorAnalysis: {
      userEngagement: 78.4,
      patternCompliance: 82.1,
      riskLevel: "LOW",
    },
  })

  const [isOptimizing, setIsOptimizing] = useState(false)

  const optimizeModels = async () => {
    setIsOptimizing(true)
    // Simulate AI optimization process
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setMetrics((prev) => ({
      ...prev,
      predictionAccuracy: Math.min(95, prev.predictionAccuracy + Math.random() * 5),
      modelPerformance: {
        markovChain: Math.min(95, prev.modelPerformance.markovChain + Math.random() * 3),
        patternRecognition: Math.min(95, prev.modelPerformance.patternRecognition + Math.random() * 3),
        trendAnalysis: Math.min(95, prev.modelPerformance.trendAnalysis + Math.random() * 3),
        neuralNetwork: Math.min(95, prev.modelPerformance.neuralNetwork + Math.random() * 3),
        statisticalRegression: Math.min(95, prev.modelPerformance.statisticalRegression + Math.random() * 3),
        cyclicalAnalysis: Math.min(95, prev.modelPerformance.cyclicalAnalysis + Math.random() * 3),
      },
    }))
    setIsOptimizing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400 flex items-center gap-2">
          <Brain className="h-6 w-6" />
          AI Analytics Dashboard
        </h2>
        <Button
          onClick={optimizeModels}
          disabled={isOptimizing}
          className="bg-green-600 hover:bg-green-700 text-black font-mono"
        >
          {isOptimizing ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Optimize Models
            </>
          )}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400">{metrics.predictionAccuracy.toFixed(1)}%</div>
            <Progress value={metrics.predictionAccuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400">
              {metrics.realTimeStats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-green-300/70 font-mono mt-1">
              {metrics.realTimeStats.correctPredictions}/{metrics.realTimeStats.totalPredictions}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400">
              {metrics.realTimeStats.confidence.toFixed(1)}%
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mt-2">HIGH</Badge>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Risk Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              className={`${
                metrics.behaviorAnalysis.riskLevel === "LOW"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              }`}
            >
              {metrics.behaviorAnalysis.riskLevel}
            </Badge>
            <div className="text-xs text-green-300/70 font-mono mt-2">
              Pattern Compliance: {metrics.behaviorAnalysis.patternCompliance.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList className="bg-gray-900/50 border border-green-500/30">
          <TabsTrigger
            value="models"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            AI Models
          </TabsTrigger>
          <TabsTrigger
            value="behavior"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Behavior Analysis
          </TabsTrigger>
          <TabsTrigger
            value="optimization"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Auto-Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Model Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(metrics.modelPerformance).map(([model, performance]) => (
                <div key={model} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-green-300 font-mono text-sm capitalize">
                      {model.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-green-400 font-mono font-bold">{performance.toFixed(1)}%</span>
                  </div>
                  <Progress value={performance} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  User Engagement Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-mono font-bold text-green-400 mb-2">
                  {metrics.behaviorAnalysis.userEngagement.toFixed(1)}%
                </div>
                <Progress value={metrics.behaviorAnalysis.userEngagement} className="mb-4" />
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-green-300/70">Active Sessions:</span>
                    <span className="text-green-400">247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-300/70">Avg. Session Time:</span>
                    <span className="text-green-400">12m 34s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-300/70">Prediction Usage:</span>
                    <span className="text-green-400">89.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Pattern Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-mono font-bold text-green-400 mb-2">
                  {metrics.behaviorAnalysis.patternCompliance.toFixed(1)}%
                </div>
                <Progress value={metrics.behaviorAnalysis.patternCompliance} className="mb-4" />
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-green-300/70">Following Predictions:</span>
                    <span className="text-green-400">78.4%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-300/70">Risk Adherence:</span>
                    <span className="text-green-400">91.7%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-300/70">Strategy Consistency:</span>
                    <span className="text-green-400">85.3%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Auto-Optimization Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-green-500/30 rounded">
                  <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <div className="text-green-400 font-mono font-bold">Real-time Learning</div>
                  <div className="text-green-300/70 text-sm font-mono">ACTIVE</div>
                </div>
                <div className="text-center p-4 border border-green-500/30 rounded">
                  <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <div className="text-green-400 font-mono font-bold">Pattern Adaptation</div>
                  <div className="text-green-300/70 text-sm font-mono">ENABLED</div>
                </div>
                <div className="text-center p-4 border border-green-500/30 rounded">
                  <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <div className="text-green-400 font-mono font-bold">Model Tuning</div>
                  <div className="text-green-300/70 text-sm font-mono">AUTO</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-green-400 font-mono font-bold">Recent Optimizations:</div>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                    <span className="text-green-300">Neural Network Weights Updated</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">+2.3%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                    <span className="text-green-300">Pattern Recognition Enhanced</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">+1.8%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                    <span className="text-green-300">Trend Analysis Calibrated</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">+3.1%</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

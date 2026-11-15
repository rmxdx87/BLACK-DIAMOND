"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Settings,
  Zap,
  TrendingUp,
  Brain,
  Target,
  Activity,
  BarChart3,
  Cpu,
  Gauge,
  RefreshCw,
  RotateCcw,
} from "lucide-react"

interface ModelConfig {
  markovChain: {
    enabled: boolean
    weight: number
    lookbackPeriods: number
    confidenceThreshold: number
  }
  patternRecognition: {
    enabled: boolean
    weight: number
    patternDepth: number
    minPatternLength: number
  }
  trendAnalysis: {
    enabled: boolean
    weight: number
    trendWindow: number
    momentumFactor: number
  }
  neuralNetwork: {
    enabled: boolean
    weight: number
    learningRate: number
    hiddenLayers: number
  }
  statisticalRegression: {
    enabled: boolean
    weight: number
    regressionWindow: number
    polynomialDegree: number
  }
  cyclicalAnalysis: {
    enabled: boolean
    weight: number
    cycleLength: number
    harmonicDepth: number
  }
}

interface OptimizationResults {
  currentAccuracy: number
  targetAccuracy: number
  improvementPotential: number
  optimizationStatus: "idle" | "running" | "completed" | "failed"
  lastOptimization: string
  iterations: number
}

export function AIPredictionOptimizer() {
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    markovChain: {
      enabled: true,
      weight: 18,
      lookbackPeriods: 10,
      confidenceThreshold: 75,
    },
    patternRecognition: {
      enabled: true,
      weight: 16,
      patternDepth: 5,
      minPatternLength: 3,
    },
    trendAnalysis: {
      enabled: true,
      weight: 20,
      trendWindow: 15,
      momentumFactor: 85,
    },
    neuralNetwork: {
      enabled: true,
      weight: 17,
      learningRate: 15,
      hiddenLayers: 3,
    },
    statisticalRegression: {
      enabled: true,
      weight: 15,
      regressionWindow: 20,
      polynomialDegree: 2,
    },
    cyclicalAnalysis: {
      enabled: true,
      weight: 14,
      cycleLength: 12,
      harmonicDepth: 4,
    },
  })

  const [optimizationResults, setOptimizationResults] = useState<OptimizationResults>({
    currentAccuracy: 87.5,
    targetAccuracy: 92.0,
    improvementPotential: 4.5,
    optimizationStatus: "idle",
    lastOptimization: "2 hours ago",
    iterations: 0,
  })

  const [isAutoOptimizing, setIsAutoOptimizing] = useState(false)

  const runOptimization = async () => {
    setOptimizationResults((prev) => ({ ...prev, optimizationStatus: "running", iterations: 0 }))

    // Simulate optimization process
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setOptimizationResults((prev) => ({
        ...prev,
        iterations: i,
        currentAccuracy: Math.min(95, prev.currentAccuracy + Math.random() * 0.5),
      }))
    }

    setOptimizationResults((prev) => ({
      ...prev,
      optimizationStatus: "completed",
      lastOptimization: "Just now",
      improvementPotential: Math.max(0, prev.targetAccuracy - prev.currentAccuracy),
    }))
  }

  const resetToDefaults = () => {
    setModelConfig({
      markovChain: {
        enabled: true,
        weight: 18,
        lookbackPeriods: 10,
        confidenceThreshold: 75,
      },
      patternRecognition: {
        enabled: true,
        weight: 16,
        patternDepth: 5,
        minPatternLength: 3,
      },
      trendAnalysis: {
        enabled: true,
        weight: 20,
        trendWindow: 15,
        momentumFactor: 85,
      },
      neuralNetwork: {
        enabled: true,
        weight: 17,
        learningRate: 15,
        hiddenLayers: 3,
      },
      statisticalRegression: {
        enabled: true,
        weight: 15,
        regressionWindow: 20,
        polynomialDegree: 2,
      },
      cyclicalAnalysis: {
        enabled: true,
        weight: 14,
        cycleLength: 12,
        harmonicDepth: 4,
      },
    })
  }

  const updateModelConfig = (model: keyof ModelConfig, field: string, value: any) => {
    setModelConfig((prev) => ({
      ...prev,
      [model]: {
        ...prev[model],
        [field]: value,
      },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          AI Prediction Optimizer
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={resetToDefaults}
            variant="outline"
            className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 bg-transparent"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Defaults
          </Button>
          <Button
            onClick={runOptimization}
            disabled={optimizationResults.optimizationStatus === "running"}
            className="bg-green-600 hover:bg-green-700 text-black font-mono"
          >
            {optimizationResults.optimizationStatus === "running" ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run Optimization
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Optimization Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Current Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400">
              {optimizationResults.currentAccuracy.toFixed(1)}%
            </div>
            <Progress value={optimizationResults.currentAccuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Target Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400">
              {optimizationResults.targetAccuracy.toFixed(1)}%
            </div>
            <div className="text-xs text-green-300/70 font-mono mt-1">
              +{optimizationResults.improvementPotential.toFixed(1)}% potential
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              className={`${
                optimizationResults.optimizationStatus === "running"
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  : optimizationResults.optimizationStatus === "completed"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-gray-500/20 text-gray-400 border-gray-500/30"
              }`}
            >
              {optimizationResults.optimizationStatus.toUpperCase()}
            </Badge>
            <div className="text-xs text-green-300/70 font-mono mt-1">{optimizationResults.lastOptimization}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Auto-Optimize
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                checked={isAutoOptimizing}
                onCheckedChange={setIsAutoOptimizing}
                className="data-[state=checked]:bg-green-600"
              />
              <Label className="text-green-300 font-mono text-sm">{isAutoOptimizing ? "ON" : "OFF"}</Label>
            </div>
            <div className="text-xs text-green-300/70 font-mono mt-1">Continuous learning</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList className="bg-gray-900/50 border border-green-500/30">
          <TabsTrigger
            value="models"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Model Configuration
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Advanced Settings
          </TabsTrigger>
          <TabsTrigger
            value="testing"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            A/B Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(modelConfig).map(([modelName, config]) => (
              <Card key={modelName} className="bg-gray-900/50 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-green-400 font-mono flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      {modelName.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) =>
                        updateModelConfig(modelName as keyof ModelConfig, "enabled", checked)
                      }
                      className="data-[state=checked]:bg-green-600"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-green-300 font-mono text-sm">Weight: {config.weight}%</Label>
                    <Slider
                      value={[config.weight]}
                      onValueChange={([value]) => updateModelConfig(modelName as keyof ModelConfig, "weight", value)}
                      max={30}
                      min={5}
                      step={1}
                      className="mt-2"
                      disabled={!config.enabled}
                    />
                  </div>

                  {Object.entries(config).map(([key, value]) => {
                    if (key === "enabled" || key === "weight") return null
                    return (
                      <div key={key}>
                        <Label className="text-green-300 font-mono text-sm capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}: {String(value)}
                        </Label>
                        <Slider
                          value={[value as number]}
                          onValueChange={([newValue]) =>
                            updateModelConfig(modelName as keyof ModelConfig, key, newValue)
                          }
                          max={
                            key.includes("threshold") || key.includes("factor") ? 100 : key.includes("rate") ? 50 : 25
                          }
                          min={1}
                          step={1}
                          className="mt-2"
                          disabled={!config.enabled}
                        />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Advanced Optimization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-green-400 font-mono font-bold">Performance Tuning</h3>
                  <div>
                    <Label className="text-green-300 font-mono text-sm">Optimization Frequency (minutes): 30</Label>
                    <Slider value={[30]} max={120} min={5} step={5} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-green-300 font-mono text-sm">Learning Rate Decay: 0.95</Label>
                    <Slider value={[95]} max={100} min={80} step={1} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-green-300 font-mono text-sm">Convergence Threshold: 0.01</Label>
                    <Slider value={[1]} max={5} min={1} step={1} className="mt-2" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-green-400 font-mono font-bold">Risk Management</h3>
                  <div>
                    <Label className="text-green-300 font-mono text-sm">Max Model Weight Change: 5%</Label>
                    <Slider value={[5]} max={20} min={1} step={1} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-green-300 font-mono text-sm">Rollback Threshold: 2%</Label>
                    <Slider value={[2]} max={10} min={1} step={1} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-green-300 font-mono text-sm">Safety Buffer: 10%</Label>
                    <Slider value={[10]} max={25} min={5} step={1} className="mt-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                A/B Testing Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-green-400 font-mono font-bold">Current Test: Model Weight Distribution</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-green-500/10 rounded">
                      <span className="text-green-300 font-mono">Configuration A (Current)</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">87.5%</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded">
                      <span className="text-yellow-300 font-mono">Configuration B (Test)</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">89.2%</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-green-300/70 font-mono">
                    Test Duration: 2 days, 14 hours
                    <br />
                    Sample Size: 1,247 predictions
                    <br />
                    Confidence Level: 95%
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-green-400 font-mono font-bold">Test Results</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-300/70 font-mono">Statistical Significance:</span>
                      <span className="text-green-400 font-mono">98.7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-300/70 font-mono">Improvement:</span>
                      <span className="text-green-400 font-mono">+1.7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-300/70 font-mono">Recommendation:</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">DEPLOY</Badge>
                    </div>
                  </div>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-black font-mono">
                    Deploy Configuration B
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

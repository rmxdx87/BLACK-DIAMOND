"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Settings,
  Power,
  TrendingUp,
  Brain,
  Zap,
  Target,
  Database,
  AlertCircle,
} from "lucide-react"

interface EngineConfig {
  id: string
  name: string
  category: string
  enabled: boolean
  weight: number
  accuracy: number
  status: 'healthy' | 'warning' | 'critical'
}

interface PredictionConfig {
  accuracyThreshold: number
  minConfidence: number
  updateFrequency: number
  disableOnManualOverride: boolean
  enabledEngines: number
  totalEngines: number
}

export function PredictionConfig() {
  const [config, setConfig] = useState<PredictionConfig>({
    accuracyThreshold: 85,
    minConfidence: 60,
    updateFrequency: 3,
    disableOnManualOverride: true,
    enabledEngines: 48,
    totalEngines: 52,
  })

  const [engines, setEngines] = useState<EngineConfig[]>([
    // Markov Chain
    { id: 'markov-0', name: 'Markov Chain v1', category: 'Markov', enabled: true, weight: 1.0, accuracy: 82, status: 'healthy' },
    { id: 'markov-1', name: 'Markov Chain v2', category: 'Markov', enabled: true, weight: 1.0, accuracy: 81, status: 'healthy' },
    { id: 'markov-2', name: 'Markov Chain v3', category: 'Markov', enabled: false, weight: 0.8, accuracy: 72, status: 'warning' },
    // Pattern Recognition
    { id: 'pattern-0', name: 'Pattern Recognition v1', category: 'Pattern', enabled: true, weight: 0.95, accuracy: 88, status: 'healthy' },
    { id: 'pattern-1', name: 'Pattern Recognition v2', category: 'Pattern', enabled: true, weight: 1.0, accuracy: 84, status: 'healthy' },
    { id: 'pattern-2', name: 'Pattern Recognition v3', category: 'Pattern', enabled: true, weight: 0.9, accuracy: 79, status: 'healthy' },
    // Trend Analysis
    { id: 'trend-0', name: 'Trend Analysis v1', category: 'Trend', enabled: true, weight: 1.0, accuracy: 87, status: 'healthy' },
    { id: 'trend-1', name: 'Trend Analysis v2', category: 'Trend', enabled: true, weight: 1.0, accuracy: 85, status: 'healthy' },
    { id: 'trend-2', name: 'Trend Analysis v3', category: 'Trend', enabled: false, weight: 0.7, accuracy: 65, status: 'critical' },
    // Ensemble
    { id: 'ensemble-0', name: 'Ensemble v1', category: 'Ensemble', enabled: true, weight: 1.5, accuracy: 89, status: 'healthy' },
    { id: 'ensemble-1', name: 'Ensemble v2', category: 'Ensemble', enabled: true, weight: 1.4, accuracy: 87, status: 'healthy' },
  ])

  const [features, setFeatures] = useState({
    comparisonMatrix: true,
    accuracyPredictor: true,
    confidenceExplanation: true,
    patternLibrary: true,
    trendStrengthMeter: true,
    predictionTimeline: true,
    engineInsights: true,
    smartAlerts: true,
    backtestingDashboard: true,
    qualityScore: true,
  })

  const toggleEngine = (engineId: string) => {
    setEngines(engines.map(e => 
      e.id === engineId ? { ...e, enabled: !e.enabled } : e
    ))
  }

  const updateEngineWeight = (engineId: string, newWeight: number) => {
    setEngines(engines.map(e => 
      e.id === engineId ? { ...e, weight: newWeight } : e
    ))
  }

  const enabledCount = engines.filter(e => e.enabled).length

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Accuracy Threshold</Label>
              <div className="text-3xl font-bold">{config.accuracyThreshold}%</div>
              <p className="text-sm text-green-600">↑ Target: 90% max</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Active Engines</Label>
              <div className="text-3xl font-bold">{enabledCount}/{engines.length}</div>
              <p className="text-sm text-blue-600">All variants active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">System Health</Label>
              <div className="text-3xl font-bold text-green-600">92%</div>
              <p className="text-sm text-green-600">✓ Optimal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="engines">Engine Management</TabsTrigger>
          <TabsTrigger value="premium">Premium Features</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Global Settings */}
        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Control core prediction system behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Accuracy Threshold */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Accuracy Threshold</Label>
                  <Badge>{config.accuracyThreshold}%</Badge>
                </div>
                <Slider
                  value={[config.accuracyThreshold]}
                  onValueChange={(val) => setConfig({ ...config, accuracyThreshold: val[0] })}
                  min={70}
                  max={99}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">
                  Predictions below this accuracy will be flagged for review (recommended: 85-90%)
                </p>
              </div>

              {/* Min Confidence */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between">
                  <Label>Minimum Confidence Score</Label>
                  <Badge variant="secondary">{config.minConfidence}%</Badge>
                </div>
                <Slider
                  value={[config.minConfidence]}
                  onValueChange={(val) => setConfig({ ...config, minConfidence: val[0] })}
                  min={30}
                  max={90}
                  step={5}
                />
                <p className="text-sm text-muted-foreground">
                  Predictions below this confidence will not be displayed to users
                </p>
              </div>

              {/* Update Frequency */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between">
                  <Label>Real-Time Update Frequency</Label>
                  <Badge variant="secondary">{config.updateFrequency}s</Badge>
                </div>
                <Slider
                  value={[config.updateFrequency]}
                  onValueChange={(val) => setConfig({ ...config, updateFrequency: val[0] })}
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">
                  Throttled updates to Firebase (seconds between syncs)
                </p>
              </div>

              {/* Manual Override */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Disable AI Engines on Manual Override</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      When admin creates manual prediction, automatically disable AI engines
                    </p>
                  </div>
                  <Switch
                    checked={config.disableOnManualOverride}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, disableOnManualOverride: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Pro Tip</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    For maximum accuracy, keep threshold between 85-90% and enable all 50+ engines.
                    Manual overrides should be temporary and documented.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engine Management */}
        <TabsContent value="engines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                50+ Prediction Engine Variants
              </CardTitle>
              <CardDescription>
                Manage individual engines: Enable/disable, adjust weights, monitor accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Engine Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Accuracy</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {engines.map((engine) => (
                      <TableRow key={engine.id}>
                        <TableCell className="font-medium">{engine.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{engine.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {engine.enabled ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min="0.1"
                            max="2"
                            step="0.1"
                            value={engine.weight}
                            onChange={(e) => updateEngineWeight(engine.id, parseFloat(e.target.value))}
                            className="w-16 px-2 py-1 border rounded"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {engine.accuracy}%
                            {engine.status === 'healthy' && (
                              <Badge className="bg-green-100 text-green-800" variant="outline">✓</Badge>
                            )}
                            {engine.status === 'warning' && (
                              <Badge className="bg-yellow-100 text-yellow-800" variant="outline">⚠</Badge>
                            )}
                            {engine.status === 'critical' && (
                              <Badge className="bg-red-100 text-red-800" variant="outline">✗</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={engine.enabled ? "destructive" : "default"}
                            onClick={() => toggleEngine(engine.id)}
                          >
                            {engine.enabled ? 'Disable' : 'Enable'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900">Engine Recommendations</h4>
                  <ul className="text-sm text-amber-800 mt-2 space-y-1">
                    <li>• Disable engines with &lt;70% accuracy</li>
                    <li>• Top performers should have higher weights</li>
                    <li>• Monitor ensemble variants for best overall accuracy</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Premium Features */}
        <TabsContent value="premium" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Premium Analytics Features</CardTitle>
              <CardDescription>Enable/disable advanced features (matching top expensive sites)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(features).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="capitalize font-medium">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getFeatureDescription(key)}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      setFeatures({ ...features, [key]: checked })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                <Database className="w-4 h-4 mr-2" />
                Clear Prediction Cache
              </Button>
              <Button variant="outline" className="w-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                Recompute All Accuracies
              </Button>
              <Button variant="outline" className="w-full">
                <Brain className="w-4 h-4 mr-2" />
                Reset Machine Learning Models
              </Button>
              <Button variant="destructive" className="w-full">
                Export Analytics Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getFeatureDescription(key: string): string {
  const descriptions: Record<string, string> = {
    comparisonMatrix: 'Compare predictions from 2-5 engines side-by-side',
    accuracyPredictor: 'AI predicts which engine will be most accurate',
    confidenceExplanation: 'Detailed breakdown of confidence score calculation',
    patternLibrary: 'Visual pattern recognition with historical success rates',
    trendStrengthMeter: 'Visual indicator of trend reliability',
    predictionTimeline: 'Historical predictions with outcomes',
    engineInsights: 'AI-generated insights on why engine chose prediction',
    smartAlerts: 'Notify when high-confidence predictions conflict',
    backtestingDashboard: 'Test engine performance on historical data',
    qualityScore: 'Overall system health metric (0-100%)',
  }
  return descriptions[key] || ''
}

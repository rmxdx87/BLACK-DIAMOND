"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Shield, TrendingUp, AlertTriangle, Target, Zap, Activity, BarChart3, Cpu, Bot } from "lucide-react"

interface AIFeature {
  id: string
  name: string
  description: string
  status: "active" | "inactive" | "learning"
  accuracy: number
  lastUpdate: string
  enabled: boolean
}

interface FraudAlert {
  id: string
  timestamp: string
  severity: "low" | "medium" | "high" | "critical"
  type: string
  details: string
  confidence: number
}

export function AdvancedAIFeatures() {
  const [aiFeatures, setAIFeatures] = useState<AIFeature[]>([
    {
      id: "fraud-detection",
      name: "AI Fraud Detection",
      description: "Detects suspicious betting patterns and potential fraud",
      status: "active",
      accuracy: 94.2,
      lastUpdate: "2 minutes ago",
      enabled: true,
    },
    {
      id: "pattern-learning",
      name: "AI Pattern Learning",
      description: "Continuously learns new patterns from user behavior",
      status: "learning",
      accuracy: 89.7,
      lastUpdate: "5 minutes ago",
      enabled: true,
    },
    {
      id: "risk-assessment",
      name: "AI Risk Assessment",
      description: "Evaluates risk levels for predictions and users",
      status: "active",
      accuracy: 91.8,
      lastUpdate: "1 minute ago",
      enabled: true,
    },
    {
      id: "auto-trading",
      name: "AI Auto-Trading Suggestions",
      description: "Provides intelligent trading recommendations",
      status: "active",
      accuracy: 87.3,
      lastUpdate: "3 minutes ago",
      enabled: false,
    },
    {
      id: "sentiment-analysis",
      name: "AI Market Sentiment",
      description: "Analyzes market sentiment and user emotions",
      status: "active",
      accuracy: 85.9,
      lastUpdate: "4 minutes ago",
      enabled: true,
    },
    {
      id: "behavioral-prediction",
      name: "AI Behavioral Prediction",
      description: "Predicts user behavior and preferences",
      status: "learning",
      accuracy: 88.4,
      lastUpdate: "6 minutes ago",
      enabled: true,
    },
  ])

  const [fraudAlerts] = useState<FraudAlert[]>([
    {
      id: "1",
      timestamp: "2025-01-15 12:35:22",
      severity: "high",
      type: "Unusual Betting Pattern",
      details: "User placing bets with suspicious timing patterns",
      confidence: 87.5,
    },
    {
      id: "2",
      timestamp: "2025-01-15 12:32:15",
      severity: "medium",
      type: "Multiple Account Detection",
      details: "Similar IP addresses with different user accounts",
      confidence: 73.2,
    },
    {
      id: "3",
      timestamp: "2025-01-15 12:28:45",
      severity: "critical",
      type: "Bot Activity Detected",
      details: "Automated betting behavior identified",
      confidence: 95.8,
    },
  ])

  const toggleFeature = (featureId: string) => {
    setAIFeatures(
      aiFeatures.map((feature) => (feature.id === featureId ? { ...feature, enabled: !feature.enabled } : feature)),
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "learning":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "inactive":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400 flex items-center gap-2">
          <Bot className="h-6 w-6" />
          Advanced AI Features Suite
        </h2>
        <Button className="bg-green-600 hover:bg-green-700 text-black font-mono">
          <Zap className="h-4 w-4 mr-2" />
          Optimize All Features
        </Button>
      </div>

      {/* AI Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Active Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400">
              {aiFeatures.filter((f) => f.enabled).length}
            </div>
            <div className="text-xs text-green-300/70 font-mono mt-1">of {aiFeatures.length} total</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Avg Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400">
              {(aiFeatures.reduce((acc, f) => acc + f.accuracy, 0) / aiFeatures.length).toFixed(1)}%
            </div>
            <Progress value={aiFeatures.reduce((acc, f) => acc + f.accuracy, 0) / aiFeatures.length} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Learning Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-blue-400">
              {aiFeatures.filter((f) => f.status === "learning").length}
            </div>
            <div className="text-xs text-green-300/70 font-mono mt-1">Continuously improving</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Fraud Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-red-400">{fraudAlerts.length}</div>
            <div className="text-xs text-green-300/70 font-mono mt-1">Last 24 hours</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="features" className="space-y-4">
        <TabsList className="bg-gray-900/50 border border-green-500/30">
          <TabsTrigger
            value="features"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            AI Features
          </TabsTrigger>
          <TabsTrigger value="fraud" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            Fraud Detection
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            AI Insights
          </TabsTrigger>
          <TabsTrigger
            value="automation"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiFeatures.map((feature) => (
              <Card key={feature.id} className="bg-gray-900/50 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-green-400 font-mono flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      {feature.name}
                    </span>
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={() => toggleFeature(feature.id)}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-green-300/70 font-mono text-sm">{feature.description}</p>

                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(feature.status)}>{feature.status.toUpperCase()}</Badge>
                    <span className="text-green-400 font-mono font-bold">{feature.accuracy.toFixed(1)}%</span>
                  </div>

                  <div>
                    <Label className="text-green-300 font-mono text-sm">Accuracy</Label>
                    <Progress value={feature.accuracy} className="mt-1" />
                  </div>

                  <div className="text-xs text-green-300/70 font-mono">Last Update: {feature.lastUpdate}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fraud" className="space-y-4">
          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Fraud Detection Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fraudAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getSeverityColor(alert.severity)}>{alert.severity.toUpperCase()}</Badge>
                        <span className="text-green-400 font-mono font-bold">{alert.type}</span>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {alert.confidence.toFixed(1)}% confidence
                        </Badge>
                      </div>
                      <div className="text-sm text-green-300/70 font-mono mb-1">{alert.timestamp}</div>
                      <div className="text-sm text-green-300 font-mono">{alert.details}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10 bg-transparent"
                      >
                        Investigate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                      >
                        Block
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Market Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-green-300 font-mono">Bullish Sentiment</span>
                    <span className="text-green-400 font-mono font-bold">67.3%</span>
                  </div>
                  <Progress value={67.3} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-green-300 font-mono">Bearish Sentiment</span>
                    <span className="text-red-400 font-mono font-bold">23.1%</span>
                  </div>
                  <Progress value={23.1} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-green-300 font-mono">Neutral Sentiment</span>
                    <span className="text-yellow-400 font-mono font-bold">9.6%</span>
                  </div>
                  <Progress value={9.6} className="h-2" />
                </div>

                <div className="text-sm text-green-300/70 font-mono">
                  Based on 2,847 user interactions in the last hour
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Behavioral Predictions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                    <span className="text-green-300 font-mono">High Activity Period</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">92% likely</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-500/10 rounded">
                    <span className="text-yellow-300 font-mono">User Churn Risk</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">15% risk</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-500/10 rounded">
                    <span className="text-blue-300 font-mono">New User Influx</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">78% likely</Badge>
                  </div>
                </div>

                <div className="text-sm text-green-300/70 font-mono">Predictions for next 24 hours</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                AI Automation Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-green-400 font-mono font-bold">Automated Actions</h3>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-green-300 font-mono">Auto-Block Suspicious Users</Label>
                      <div className="text-sm text-green-300/70 font-mono">
                        Automatically block users with fraud scores &gt; 85%
                      </div>
                    </div>
                    <Switch className="data-[state=checked]:bg-green-600" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-green-300 font-mono">Smart Risk Adjustment</Label>
                      <div className="text-sm text-green-300/70 font-mono">
                        Automatically adjust risk levels based on patterns
                      </div>
                    </div>
                    <Switch className="data-[state=checked]:bg-green-600" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-green-300 font-mono">Prediction Auto-Tuning</Label>
                      <div className="text-sm text-green-300/70 font-mono">
                        Continuously optimize prediction algorithms
                      </div>
                    </div>
                    <Switch className="data-[state=checked]:bg-green-600" defaultChecked />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-green-400 font-mono font-bold">Performance Metrics</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-green-300 font-mono">Automation Efficiency</span>
                      <span className="text-green-400 font-mono font-bold">94.7%</span>
                    </div>
                    <Progress value={94.7} className="h-2" />

                    <div className="flex justify-between items-center">
                      <span className="text-green-300 font-mono">False Positive Rate</span>
                      <span className="text-yellow-400 font-mono font-bold">2.3%</span>
                    </div>
                    <Progress value={2.3} className="h-2" />

                    <div className="flex justify-between items-center">
                      <span className="text-green-300 font-mono">Response Time</span>
                      <span className="text-green-400 font-mono font-bold">0.8s</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-green-500/30 pt-4">
                <h3 className="text-green-400 font-mono font-bold mb-3">Recent Automated Actions</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                    <span className="text-green-300">Blocked suspicious user (ID: 1247)</span>
                    <span className="text-green-400">2 min ago</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-500/10 rounded">
                    <span className="text-blue-300">Adjusted prediction weights</span>
                    <span className="text-blue-400">5 min ago</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-500/10 rounded">
                    <span className="text-yellow-300">Risk level increased for pattern X</span>
                    <span className="text-yellow-400">8 min ago</span>
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

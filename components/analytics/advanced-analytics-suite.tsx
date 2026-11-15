"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Users,
  DollarSign,
  Globe,
  Brain,
  Cpu,
  RefreshCw,
  Heart,
} from "lucide-react"

interface AnalyticsFeature {
  id: string
  name: string
  category:
    | "realtime"
    | "predictive"
    | "behavioral"
    | "performance"
    | "market"
    | "revenue"
    | "engagement"
    | "conversion"
  description: string
  value: number
  trend: "up" | "down" | "stable"
  status: "active" | "processing" | "error"
  enabled: boolean
}

export function AdvancedAnalyticsSuite() {
  const [features, setFeatures] = useState<AnalyticsFeature[]>([
    // Real-time Analytics (8 features)
    {
      id: "rt-1",
      name: "Live User Activity Monitor",
      category: "realtime",
      description: "Real-time user activity tracking",
      value: 1247,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "rt-2",
      name: "Real-time Prediction Accuracy",
      category: "realtime",
      description: "Live prediction performance",
      value: 89.7,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "rt-3",
      name: "Active Session Tracker",
      category: "realtime",
      description: "Current active sessions",
      value: 342,
      trend: "stable",
      status: "active",
      enabled: true,
    },
    {
      id: "rt-4",
      name: "Live Revenue Stream",
      category: "realtime",
      description: "Real-time revenue tracking",
      value: 15847,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "rt-5",
      name: "Instant Alert System",
      category: "realtime",
      description: "Real-time notifications",
      value: 23,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "rt-6",
      name: "Live Performance Metrics",
      category: "realtime",
      description: "System performance monitoring",
      value: 94.2,
      trend: "stable",
      status: "active",
      enabled: true,
    },
    {
      id: "rt-7",
      name: "Real-time Error Tracking",
      category: "realtime",
      description: "Live error monitoring",
      value: 0.3,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "rt-8",
      name: "Dynamic Load Balancer",
      category: "realtime",
      description: "Real-time load distribution",
      value: 78.5,
      trend: "stable",
      status: "active",
      enabled: true,
    },

    // Predictive Analytics (8 features)
    {
      id: "pred-1",
      name: "User Churn Prediction",
      category: "predictive",
      description: "Predicts user churn probability",
      value: 12.4,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "pred-2",
      name: "Revenue Forecasting",
      category: "predictive",
      description: "Future revenue predictions",
      value: 187500,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "pred-3",
      name: "Demand Prediction Model",
      category: "predictive",
      description: "Predicts user demand patterns",
      value: 156.7,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "pred-4",
      name: "Seasonal Trend Forecaster",
      category: "predictive",
      description: "Seasonal pattern predictions",
      value: 87.3,
      trend: "stable",
      status: "active",
      enabled: true,
    },
    {
      id: "pred-5",
      name: "Risk Assessment Predictor",
      category: "predictive",
      description: "Future risk evaluation",
      value: 23.1,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "pred-6",
      name: "Market Volatility Forecast",
      category: "predictive",
      description: "Market volatility predictions",
      value: 45.8,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "pred-7",
      name: "User Lifetime Value",
      category: "predictive",
      description: "Predicted customer LTV",
      value: 2847,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "pred-8",
      name: "Conversion Rate Predictor",
      category: "predictive",
      description: "Future conversion rates",
      value: 34.6,
      trend: "up",
      status: "active",
      enabled: true,
    },

    // Behavioral Analytics (8 features)
    {
      id: "beh-1",
      name: "User Journey Mapping",
      category: "behavioral",
      description: "Complete user journey analysis",
      value: 89.2,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "beh-2",
      name: "Engagement Pattern Analysis",
      category: "behavioral",
      description: "User engagement patterns",
      value: 76.4,
      trend: "stable",
      status: "active",
      enabled: true,
    },
    {
      id: "beh-3",
      name: "Behavioral Segmentation",
      category: "behavioral",
      description: "User behavior clustering",
      value: 8,
      trend: "stable",
      status: "active",
      enabled: true,
    },
    {
      id: "beh-4",
      name: "Click Heatmap Analytics",
      category: "behavioral",
      description: "User interaction heatmaps",
      value: 94.7,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "beh-5",
      name: "Session Flow Analysis",
      category: "behavioral",
      description: "User session pathways",
      value: 67.3,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "beh-6",
      name: "Attention Span Tracker",
      category: "behavioral",
      description: "User attention metrics",
      value: 4.2,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "beh-7",
      name: "Feature Usage Analytics",
      category: "behavioral",
      description: "Feature adoption rates",
      value: 82.1,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "beh-8",
      name: "User Preference Engine",
      category: "behavioral",
      description: "Preference learning system",
      value: 91.5,
      trend: "up",
      status: "active",
      enabled: true,
    },

    // Performance Analytics (8 features)
    {
      id: "perf-1",
      name: "System Response Time",
      category: "performance",
      description: "Average response times",
      value: 127,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "perf-2",
      name: "Database Query Optimizer",
      category: "performance",
      description: "DB performance analysis",
      value: 89.4,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "perf-3",
      name: "API Performance Monitor",
      category: "performance",
      description: "API endpoint analytics",
      value: 99.2,
      trend: "stable",
      status: "active",
      enabled: true,
    },
    {
      id: "perf-4",
      name: "Memory Usage Analyzer",
      category: "performance",
      description: "Memory consumption tracking",
      value: 67.8,
      trend: "stable",
      status: "active",
      enabled: true,
    },
    {
      id: "perf-5",
      name: "CPU Utilization Tracker",
      category: "performance",
      description: "CPU usage monitoring",
      value: 45.3,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "perf-6",
      name: "Network Latency Monitor",
      category: "performance",
      description: "Network performance tracking",
      value: 23.7,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "perf-7",
      name: "Cache Hit Rate Analyzer",
      category: "performance",
      description: "Caching efficiency metrics",
      value: 94.6,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "perf-8",
      name: "Load Balancing Optimizer",
      category: "performance",
      description: "Load distribution analysis",
      value: 87.2,
      trend: "stable",
      status: "active",
      enabled: true,
    },

    // Market Analytics (6 features)
    {
      id: "mkt-1",
      name: "Competitive Analysis Engine",
      category: "market",
      description: "Market competition tracking",
      value: 73.4,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "mkt-2",
      name: "Market Share Calculator",
      category: "market",
      description: "Market position analysis",
      value: 15.7,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "mkt-3",
      name: "Trend Sentiment Analyzer",
      category: "market",
      description: "Market sentiment tracking",
      value: 68.9,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "mkt-4",
      name: "Price Elasticity Model",
      category: "market",
      description: "Price sensitivity analysis",
      value: 1.34,
      trend: "stable",
      status: "active",
      enabled: true,
    },
    {
      id: "mkt-5",
      name: "Market Volatility Index",
      category: "market",
      description: "Market stability metrics",
      value: 34.2,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "mkt-6",
      name: "Geographic Market Analysis",
      category: "market",
      description: "Regional market insights",
      value: 42,
      trend: "up",
      status: "active",
      enabled: true,
    },

    // Revenue Analytics (6 features)
    {
      id: "rev-1",
      name: "Revenue Attribution Model",
      category: "revenue",
      description: "Revenue source tracking",
      value: 234567,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "rev-2",
      name: "Profit Margin Analyzer",
      category: "revenue",
      description: "Profitability analysis",
      value: 34.7,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "rev-3",
      name: "Customer Acquisition Cost",
      category: "revenue",
      description: "CAC calculation and tracking",
      value: 47.3,
      trend: "down",
      status: "active",
      enabled: true,
    },
    {
      id: "rev-4",
      name: "Monthly Recurring Revenue",
      category: "revenue",
      description: "MRR tracking and analysis",
      value: 89450,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "rev-5",
      name: "Revenue Per User",
      category: "revenue",
      description: "Average revenue per user",
      value: 156.8,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "rev-6",
      name: "Churn Impact Calculator",
      category: "revenue",
      description: "Revenue impact of churn",
      value: 12847,
      trend: "down",
      status: "active",
      enabled: true,
    },

    // Engagement Analytics (4 features)
    {
      id: "eng-1",
      name: "Daily Active Users",
      category: "engagement",
      description: "DAU tracking and trends",
      value: 8947,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "eng-2",
      name: "Session Duration Analyzer",
      category: "engagement",
      description: "Average session length",
      value: 12.4,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "eng-3",
      name: "Feature Adoption Rate",
      category: "engagement",
      description: "New feature usage rates",
      value: 67.3,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "eng-4",
      name: "User Retention Cohorts",
      category: "engagement",
      description: "Cohort retention analysis",
      value: 78.9,
      trend: "stable",
      status: "active",
      enabled: true,
    },

    // Conversion Analytics (4 features)
    {
      id: "conv-1",
      name: "Funnel Conversion Rates",
      category: "conversion",
      description: "Multi-step funnel analysis",
      value: 23.7,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "conv-2",
      name: "A/B Test Performance",
      category: "conversion",
      description: "Experiment result tracking",
      value: 15.4,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "conv-3",
      name: "Goal Completion Tracker",
      category: "conversion",
      description: "Conversion goal monitoring",
      value: 89.2,
      trend: "up",
      status: "active",
      enabled: true,
    },
    {
      id: "conv-4",
      name: "Attribution Modeling",
      category: "conversion",
      description: "Multi-touch attribution",
      value: 67.8,
      trend: "stable",
      status: "active",
      enabled: true,
    },
  ])

  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [refreshing, setRefreshing] = useState(false)

  const toggleFeature = (featureId: string) => {
    setFeatures(features.map((f) => (f.id === featureId ? { ...f, enabled: !f.enabled } : f)))
  }

  const refreshAnalytics = async () => {
    setRefreshing(true)
    // Simulate data refresh
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Update random values to simulate real-time changes
    setFeatures(
      features.map((f) => ({
        ...f,
        value: f.value + (Math.random() - 0.5) * f.value * 0.1,
        trend: Math.random() > 0.5 ? "up" : Math.random() > 0.5 ? "down" : "stable",
      })),
    )

    setRefreshing(false)
  }

  const filteredFeatures = features.filter((feature) => activeCategory === "all" || feature.category === activeCategory)

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-400" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-400" />
      default:
        return <Activity className="h-4 w-4 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "processing":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "error":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "realtime":
        return <Activity className="h-4 w-4" />
      case "predictive":
        return <Brain className="h-4 w-4" />
      case "behavioral":
        return <Users className="h-4 w-4" />
      case "performance":
        return <Cpu className="h-4 w-4" />
      case "market":
        return <Globe className="h-4 w-4" />
      case "revenue":
        return <DollarSign className="h-4 w-4" />
      case "engagement":
        return <Heart className="h-4 w-4" />
      case "conversion":
        return <Target className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const categoryStats = {
    realtime: features.filter((f) => f.category === "realtime").length,
    predictive: features.filter((f) => f.category === "predictive").length,
    behavioral: features.filter((f) => f.category === "behavioral").length,
    performance: features.filter((f) => f.category === "performance").length,
    market: features.filter((f) => f.category === "market").length,
    revenue: features.filter((f) => f.category === "revenue").length,
    engagement: features.filter((f) => f.category === "engagement").length,
    conversion: features.filter((f) => f.category === "conversion").length,
  }

  const formatValue = (value: number, category: string) => {
    if (category === "revenue" && value > 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    if (value > 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value > 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toFixed(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Advanced Analytics Suite (50 Features)
        </h2>
        <div className="flex items-center gap-4">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg px-4 py-2">
            {features.filter((f) => f.enabled).length} / {features.length} ACTIVE
          </Badge>
          <Button
            onClick={refreshAnalytics}
            disabled={refreshing}
            className="bg-green-600 hover:bg-green-700 text-black font-mono"
          >
            {refreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Object.entries(categoryStats).map(([category, count]) => (
          <Card
            key={category}
            className={`bg-gray-900/50 border-green-500/30 cursor-pointer transition-all duration-300 hover:border-green-400 ${
              activeCategory === category ? "border-green-400 bg-green-500/10" : ""
            }`}
            onClick={() => setActiveCategory(activeCategory === category ? "all" : category)}
          >
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center mb-2">{getCategoryIcon(category)}</div>
              <div className="text-green-400 font-mono font-bold text-lg">{count}</div>
              <div className="text-green-300/70 font-mono text-xs uppercase">{category}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFeatures.map((feature) => (
          <Card
            key={feature.id}
            className="bg-gray-900/50 border-green-500/30 hover:border-green-400 transition-all duration-300"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(feature.category)}
                  <CardTitle className="text-green-400 font-mono text-sm">{feature.name}</CardTitle>
                </div>
                <Switch
                  checked={feature.enabled}
                  onCheckedChange={() => toggleFeature(feature.id)}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-green-300/70 font-mono text-xs">{feature.description}</p>

              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(feature.status)}>{feature.status.toUpperCase()}</Badge>
                <div className="flex items-center gap-1">
                  {getTrendIcon(feature.trend)}
                  <span className="text-green-400 font-mono font-bold text-lg">
                    {formatValue(feature.value, feature.category)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-green-300/70">Performance</span>
                  <span className="text-green-400">{Math.min(100, Math.max(0, feature.value)).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, feature.value))} className="h-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-time Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-green-400 mb-2">
              {features.filter((f) => f.category === "realtime" && f.enabled).length}
            </div>
            <div className="text-green-300/70 font-mono text-sm">Active monitors</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Predictive Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-green-400 mb-2">
              {features.filter((f) => f.category === "predictive" && f.enabled).length}
            </div>
            <div className="text-green-300/70 font-mono text-sm">AI predictions</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-green-400 mb-2">
              ${(features.find((f) => f.id === "rev-1")?.value || 0 / 1000).toFixed(0)}K
            </div>
            <div className="text-green-300/70 font-mono text-sm">Total revenue</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-green-400 mb-2">
              {(features.find((f) => f.id === "eng-1")?.value || 0).toFixed(0)}
            </div>
            <div className="text-green-300/70 font-mono text-sm">Daily active users</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Settings,
  Users,
  Shield,
  Activity,
  Database,
  Globe,
  Cpu,
  HardDrive,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Zap,
  RefreshCw,
} from "lucide-react"

interface AdminFeature {
  id: string
  name: string
  category: "users" | "system" | "security" | "monitoring" | "database" | "api" | "performance" | "backup"
  description: string
  status: "active" | "inactive" | "warning" | "error"
  value: number | string
  enabled: boolean
  critical: boolean
}

export function AdminControlCenter() {
  const [features, setFeatures] = useState<AdminFeature[]>([
    // User Management Features (8 features)
    {
      id: "user-1",
      name: "User Account Manager",
      category: "users",
      description: "Complete user account administration",
      status: "active",
      value: 1247,
      enabled: true,
      critical: true,
    },
    {
      id: "user-2",
      name: "Role-Based Access Control",
      category: "users",
      description: "Granular permission management",
      status: "active",
      value: "5 Roles",
      enabled: true,
      critical: true,
    },
    {
      id: "user-3",
      name: "User Session Manager",
      category: "users",
      description: "Active session monitoring",
      status: "active",
      value: 342,
      enabled: true,
      critical: false,
    },
    {
      id: "user-4",
      name: "User Activity Logger",
      category: "users",
      description: "Comprehensive activity tracking",
      status: "active",
      value: "99.8%",
      enabled: true,
      critical: false,
    },
    {
      id: "user-5",
      name: "Bulk User Operations",
      category: "users",
      description: "Mass user management tools",
      status: "active",
      value: "Ready",
      enabled: true,
      critical: false,
    },
    {
      id: "user-6",
      name: "User Verification System",
      category: "users",
      description: "Identity verification controls",
      status: "active",
      value: 94.7,
      enabled: true,
      critical: true,
    },
    {
      id: "user-7",
      name: "User Behavior Analytics",
      category: "users",
      description: "User pattern analysis",
      status: "active",
      value: 87.3,
      enabled: true,
      critical: false,
    },
    {
      id: "user-8",
      name: "User Compliance Monitor",
      category: "users",
      description: "Regulatory compliance tracking",
      status: "active",
      value: "Compliant",
      enabled: true,
      critical: true,
    },

    // System Configuration Features (8 features)
    {
      id: "sys-1",
      name: "System Configuration Manager",
      category: "system",
      description: "Central system settings control",
      status: "active",
      value: "Optimal",
      enabled: true,
      critical: true,
    },
    {
      id: "sys-2",
      name: "Environment Variables Manager",
      category: "system",
      description: "Environment configuration control",
      status: "active",
      value: 47,
      enabled: true,
      critical: true,
    },
    {
      id: "sys-3",
      name: "Feature Flag Controller",
      category: "system",
      description: "Dynamic feature management",
      status: "active",
      value: 23,
      enabled: true,
      critical: false,
    },
    {
      id: "sys-4",
      name: "System Health Monitor",
      category: "system",
      description: "Real-time system status",
      status: "active",
      value: 98.7,
      enabled: true,
      critical: true,
    },
    {
      id: "sys-5",
      name: "Service Dependency Manager",
      category: "system",
      description: "Service relationship tracking",
      status: "active",
      value: "Stable",
      enabled: true,
      critical: true,
    },
    {
      id: "sys-6",
      name: "System Resource Allocator",
      category: "system",
      description: "Dynamic resource management",
      status: "active",
      value: 76.4,
      enabled: true,
      critical: false,
    },
    {
      id: "sys-7",
      name: "Configuration Backup System",
      category: "system",
      description: "Config versioning and backup",
      status: "active",
      value: "Latest",
      enabled: true,
      critical: true,
    },
    {
      id: "sys-8",
      name: "System Update Manager",
      category: "system",
      description: "Automated system updates",
      status: "active",
      value: "Current",
      enabled: true,
      critical: true,
    },

    // Security Control Features (8 features)
    {
      id: "sec-1",
      name: "Security Policy Manager",
      category: "security",
      description: "Comprehensive security policies",
      status: "active",
      value: "Enforced",
      enabled: true,
      critical: true,
    },
    {
      id: "sec-2",
      name: "Intrusion Detection System",
      category: "security",
      description: "Real-time threat detection",
      status: "active",
      value: 0,
      enabled: true,
      critical: true,
    },
    {
      id: "sec-3",
      name: "Firewall Configuration",
      category: "security",
      description: "Network security management",
      status: "active",
      value: "Protected",
      enabled: true,
      critical: true,
    },
    {
      id: "sec-4",
      name: "SSL Certificate Manager",
      category: "security",
      description: "Certificate lifecycle management",
      status: "active",
      value: "Valid",
      enabled: true,
      critical: true,
    },
    {
      id: "sec-5",
      name: "Access Control Lists",
      category: "security",
      description: "IP-based access control",
      status: "active",
      value: 156,
      enabled: true,
      critical: false,
    },
    {
      id: "sec-6",
      name: "Security Audit Logger",
      category: "security",
      description: "Security event logging",
      status: "active",
      value: "100%",
      enabled: true,
      critical: true,
    },
    {
      id: "sec-7",
      name: "Vulnerability Scanner",
      category: "security",
      description: "Automated security scanning",
      status: "active",
      value: "Clean",
      enabled: true,
      critical: true,
    },
    {
      id: "sec-8",
      name: "Incident Response System",
      category: "security",
      description: "Automated incident handling",
      status: "active",
      value: "Ready",
      enabled: true,
      critical: true,
    },

    // Monitoring & Logging Features (6 features)
    {
      id: "mon-1",
      name: "Real-time System Monitor",
      category: "monitoring",
      description: "Live system metrics",
      status: "active",
      value: "Online",
      enabled: true,
      critical: true,
    },
    {
      id: "mon-2",
      name: "Application Performance Monitor",
      category: "monitoring",
      description: "APM and performance tracking",
      status: "active",
      value: 94.2,
      enabled: true,
      critical: false,
    },
    {
      id: "mon-3",
      name: "Error Tracking System",
      category: "monitoring",
      description: "Centralized error monitoring",
      status: "active",
      value: 0.3,
      enabled: true,
      critical: true,
    },
    {
      id: "mon-4",
      name: "Log Aggregation System",
      category: "monitoring",
      description: "Centralized log management",
      status: "active",
      value: "2.4TB",
      enabled: true,
      critical: false,
    },
    {
      id: "mon-5",
      name: "Alert Management System",
      category: "monitoring",
      description: "Intelligent alerting",
      status: "active",
      value: 12,
      enabled: true,
      critical: true,
    },
    {
      id: "mon-6",
      name: "Custom Metrics Dashboard",
      category: "monitoring",
      description: "Customizable monitoring views",
      status: "active",
      value: "Live",
      enabled: true,
      critical: false,
    },

    // Database Management Features (6 features)
    {
      id: "db-1",
      name: "Database Connection Manager",
      category: "database",
      description: "DB connection pool management",
      status: "active",
      value: 45,
      enabled: true,
      critical: true,
    },
    {
      id: "db-2",
      name: "Query Performance Analyzer",
      category: "database",
      description: "SQL query optimization",
      status: "active",
      value: 89.7,
      enabled: true,
      critical: false,
    },
    {
      id: "db-3",
      name: "Database Backup Controller",
      category: "database",
      description: "Automated backup management",
      status: "active",
      value: "Daily",
      enabled: true,
      critical: true,
    },
    {
      id: "db-4",
      name: "Database Migration Manager",
      category: "database",
      description: "Schema migration control",
      status: "active",
      value: "v2.4.1",
      enabled: true,
      critical: true,
    },
    {
      id: "db-5",
      name: "Database Health Monitor",
      category: "database",
      description: "DB performance monitoring",
      status: "active",
      value: 97.3,
      enabled: true,
      critical: true,
    },
    {
      id: "db-6",
      name: "Data Integrity Checker",
      category: "database",
      description: "Data consistency validation",
      status: "active",
      value: "Valid",
      enabled: true,
      critical: true,
    },

    // API Management Features (6 features)
    {
      id: "api-1",
      name: "API Gateway Controller",
      category: "api",
      description: "Central API management",
      status: "active",
      value: "Online",
      enabled: true,
      critical: true,
    },
    {
      id: "api-2",
      name: "API Rate Limiter",
      category: "api",
      description: "Request rate limiting",
      status: "active",
      value: "1000/min",
      enabled: true,
      critical: false,
    },
    {
      id: "api-3",
      name: "API Authentication Manager",
      category: "api",
      description: "API security and auth",
      status: "active",
      value: "Secured",
      enabled: true,
      critical: true,
    },
    {
      id: "api-4",
      name: "API Analytics Dashboard",
      category: "api",
      description: "API usage analytics",
      status: "active",
      value: 15847,
      enabled: true,
      critical: false,
    },
    {
      id: "api-5",
      name: "API Version Manager",
      category: "api",
      description: "API versioning control",
      status: "active",
      value: "v3.2",
      enabled: true,
      critical: false,
    },
    {
      id: "api-6",
      name: "API Documentation Generator",
      category: "api",
      description: "Auto-generated API docs",
      status: "active",
      value: "Updated",
      enabled: true,
      critical: false,
    },

    // Performance Control Features (4 features)
    {
      id: "perf-1",
      name: "Performance Optimization Engine",
      category: "performance",
      description: "Automated performance tuning",
      status: "active",
      value: 92.4,
      enabled: true,
      critical: false,
    },
    {
      id: "perf-2",
      name: "Cache Management System",
      category: "performance",
      description: "Intelligent caching control",
      status: "active",
      value: 94.7,
      enabled: true,
      critical: false,
    },
    {
      id: "perf-3",
      name: "Load Balancer Controller",
      category: "performance",
      description: "Traffic distribution management",
      status: "active",
      value: "Balanced",
      enabled: true,
      critical: true,
    },
    {
      id: "perf-4",
      name: "CDN Management System",
      category: "performance",
      description: "Content delivery optimization",
      status: "active",
      value: "Global",
      enabled: true,
      critical: false,
    },

    // Backup & Recovery Features (4 features)
    {
      id: "backup-1",
      name: "Automated Backup System",
      category: "backup",
      description: "Scheduled system backups",
      status: "active",
      value: "Daily",
      enabled: true,
      critical: true,
    },
    {
      id: "backup-2",
      name: "Disaster Recovery Planner",
      category: "backup",
      description: "DR strategy management",
      status: "active",
      value: "Ready",
      enabled: true,
      critical: true,
    },
    {
      id: "backup-3",
      name: "Backup Integrity Validator",
      category: "backup",
      description: "Backup verification system",
      status: "active",
      value: "100%",
      enabled: true,
      critical: true,
    },
    {
      id: "backup-4",
      name: "Point-in-Time Recovery",
      category: "backup",
      description: "Granular recovery options",
      status: "active",
      value: "Available",
      enabled: true,
      critical: true,
    },
  ])

  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [systemStatus, setSystemStatus] = useState({
    overall: "healthy",
    uptime: "99.97%",
    activeUsers: 1247,
    systemLoad: 67.3,
    memoryUsage: 78.9,
    diskUsage: 45.2,
  })

  const toggleFeature = (featureId: string) => {
    setFeatures(features.map((f) => (f.id === featureId ? { ...f, enabled: !f.enabled } : f)))
  }

  const filteredFeatures = features.filter((feature) => activeCategory === "all" || feature.category === activeCategory)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "warning":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "error":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "inactive":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />
      case "inactive":
        return <Clock className="h-4 w-4 text-gray-400" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "users":
        return <Users className="h-4 w-4" />
      case "system":
        return <Settings className="h-4 w-4" />
      case "security":
        return <Shield className="h-4 w-4" />
      case "monitoring":
        return <Activity className="h-4 w-4" />
      case "database":
        return <Database className="h-4 w-4" />
      case "api":
        return <Globe className="h-4 w-4" />
      case "performance":
        return <Zap className="h-4 w-4" />
      case "backup":
        return <HardDrive className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const categoryStats = {
    users: features.filter((f) => f.category === "users").length,
    system: features.filter((f) => f.category === "system").length,
    security: features.filter((f) => f.category === "security").length,
    monitoring: features.filter((f) => f.category === "monitoring").length,
    database: features.filter((f) => f.category === "database").length,
    api: features.filter((f) => f.category === "api").length,
    performance: features.filter((f) => f.category === "performance").length,
    backup: features.filter((f) => f.category === "backup").length,
  }

  const criticalFeatures = features.filter((f) => f.critical && f.enabled)
  const activeFeatures = features.filter((f) => f.enabled && f.status === "active")
  const warningFeatures = features.filter((f) => f.status === "warning")
  const errorFeatures = features.filter((f) => f.status === "error")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Admin Control Center (50 Features)
        </h2>
        <div className="flex items-center gap-4">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg px-4 py-2">
            {activeFeatures.length} / {features.length} ACTIVE
          </Badge>
          <Badge
            className={`${
              systemStatus.overall === "healthy"
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
            } text-lg px-4 py-2`}
          >
            SYSTEM {systemStatus.overall.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-mono font-bold text-green-400 mb-1">{systemStatus.uptime}</div>
            <div className="text-green-300/70 font-mono text-xs">System Uptime</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-mono font-bold text-green-400 mb-1">{systemStatus.activeUsers}</div>
            <div className="text-green-300/70 font-mono text-xs">Active Users</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-mono font-bold text-green-400 mb-1">{criticalFeatures.length}</div>
            <div className="text-green-300/70 font-mono text-xs">Critical Systems</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-mono font-bold text-yellow-400 mb-1">{warningFeatures.length}</div>
            <div className="text-green-300/70 font-mono text-xs">Warnings</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-mono font-bold text-red-400 mb-1">{errorFeatures.length}</div>
            <div className="text-green-300/70 font-mono text-xs">Errors</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-mono font-bold text-cyan-400 mb-1">{systemStatus.systemLoad}%</div>
            <div className="text-green-300/70 font-mono text-xs">System Load</div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              System Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400 mb-2">{systemStatus.systemLoad}%</div>
            <Progress value={systemStatus.systemLoad} className="mb-2" />
            <div className="text-xs text-green-300/70 font-mono">CPU utilization</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400 mb-2">{systemStatus.memoryUsage}%</div>
            <Progress value={systemStatus.memoryUsage} className="mb-2" />
            <div className="text-xs text-green-300/70 font-mono">RAM utilization</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Disk Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-400 mb-2">{systemStatus.diskUsage}%</div>
            <Progress value={systemStatus.diskUsage} className="mb-2" />
            <div className="text-xs text-green-300/70 font-mono">Storage utilization</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-4">
        <TabsList className="bg-gray-900/50 border border-green-500/30 grid grid-cols-4 lg:grid-cols-9">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 font-mono text-xs"
          >
            ALL
          </TabsTrigger>
          {Object.entries(categoryStats).map(([category, count]) => (
            <TabsTrigger
              key={category}
              value={category}
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 font-mono text-xs"
            >
              {category.toUpperCase()} ({count})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map((feature) => (
              <Card
                key={feature.id}
                className={`bg-gray-900/50 border-green-500/30 hover:border-green-400 transition-all duration-300 ${
                  feature.critical ? "ring-1 ring-yellow-500/30" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(feature.category)}
                      <CardTitle className="text-green-400 font-mono text-sm">{feature.name}</CardTitle>
                      {feature.critical && <Lock className="h-3 w-3 text-yellow-400" />}
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
                    <div className="flex items-center gap-2">
                      {getStatusIcon(feature.status)}
                      <Badge className={getStatusColor(feature.status)}>{feature.status.toUpperCase()}</Badge>
                    </div>
                    <div className="text-green-400 font-mono font-bold text-sm">{feature.value}</div>
                  </div>

                  {typeof feature.value === "number" && feature.value <= 100 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-green-300/70">Performance</span>
                        <span className="text-green-400">{feature.value}%</span>
                      </div>
                      <Progress value={feature.value} className="h-1" />
                    </div>
                  )}

                  {feature.critical && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded">
                      <AlertTriangle className="h-3 w-3 text-yellow-400" />
                      <span className="text-yellow-400 font-mono text-xs">Critical System Component</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="bg-gray-900/50 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-green-400 font-mono flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button className="bg-green-600 hover:bg-green-700 text-black font-mono">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-mono">
              <Database className="h-4 w-4 mr-2" />
              Backup Now
            </Button>
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-black font-mono">
              <Eye className="h-4 w-4 mr-2" />
              System Scan
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white font-mono">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-mono">
              <Shield className="h-4 w-4 mr-2" />
              Security Check
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-black font-mono">
              <Activity className="h-4 w-4 mr-2" />
              Health Check
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSettings } from "@/contexts/settings-context"
import {
  Database,
  Plus,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Settings,
  RefreshCw,
} from "lucide-react"

interface APIEndpoint {
  id: string
  name: string
  url: string
  isActive: boolean
  isPrimary: boolean
  status: "online" | "offline" | "testing" | "unknown"
  lastTested: Date | null
  responseTime: number | null
  errorCount: number
}

interface APITestResult {
  success: boolean
  responseTime: number
  error?: string
  data?: any
}

export function APIManagement() {
  const { settings, updateSettings } = useSettings()
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([])
  const [isAddingEndpoint, setIsAddingEndpoint] = useState(false)
  const [isTesting, setIsTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, APITestResult>>({})
  const [newEndpoint, setNewEndpoint] = useState({
    name: "",
    url: "",
  })

  // Initialize endpoints from settings
  useEffect(() => {
    const primaryEndpoint: APIEndpoint = {
      id: "primary",
      name: "Primary API",
      url: settings.apiEndpoint,
      isActive: true,
      isPrimary: true,
      status: "unknown",
      lastTested: null,
      responseTime: null,
      errorCount: 0,
    }

    // Load additional endpoints from localStorage
    const storedEndpoints = localStorage.getItem("jalwa_api_endpoints")
    const additionalEndpoints: APIEndpoint[] = storedEndpoints ? JSON.parse(storedEndpoints) : []

    setEndpoints([primaryEndpoint, ...additionalEndpoints])
  }, [settings.apiEndpoint])

  const saveEndpoints = (updatedEndpoints: APIEndpoint[]) => {
    const additionalEndpoints = updatedEndpoints.filter((e) => !e.isPrimary)
    localStorage.setItem("jalwa_api_endpoints", JSON.stringify(additionalEndpoints))
    setEndpoints(updatedEndpoints)
  }

  const testAPIEndpoint = async (endpoint: APIEndpoint): Promise<APITestResult> => {
    const startTime = Date.now()

    try {
      const timestamp = Date.now()
      const testUrl = `${endpoint.url}?ts=${timestamp}&limit=10`

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Validate response format
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format: Not a JSON object")
      }

      return {
        success: true,
        responseTime,
        data: data,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  const handleTestEndpoint = async (endpointId: string) => {
    const endpoint = endpoints.find((e) => e.id === endpointId)
    if (!endpoint) return

    setIsTesting(endpointId)

    const result = await testAPIEndpoint(endpoint)

    // Update endpoint status
    const updatedEndpoints = endpoints.map((e) =>
      e.id === endpointId
        ? {
            ...e,
            status: result.success ? ("online" as const) : ("offline" as const),
            lastTested: new Date(),
            responseTime: result.responseTime,
            errorCount: result.success ? 0 : e.errorCount + 1,
          }
        : e,
    )

    saveEndpoints(updatedEndpoints)
    setTestResults((prev) => ({ ...prev, [endpointId]: result }))
    setIsTesting(null)
  }

  const handleTestAllEndpoints = async () => {
    for (const endpoint of endpoints) {
      if (endpoint.isActive) {
        await handleTestEndpoint(endpoint.id)
        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  const handleAddEndpoint = () => {
    if (!newEndpoint.name || !newEndpoint.url) {
      alert("Please fill in all fields")
      return
    }

    const endpoint: APIEndpoint = {
      id: Date.now().toString(),
      name: newEndpoint.name,
      url: newEndpoint.url,
      isActive: true,
      isPrimary: false,
      status: "unknown",
      lastTested: null,
      responseTime: null,
      errorCount: 0,
    }

    saveEndpoints([...endpoints, endpoint])
    setNewEndpoint({ name: "", url: "" })
    setIsAddingEndpoint(false)
  }

  const handleDeleteEndpoint = (endpointId: string) => {
    const endpoint = endpoints.find((e) => e.id === endpointId)
    if (endpoint?.isPrimary) {
      alert("Cannot delete primary endpoint")
      return
    }

    if (confirm("Are you sure you want to delete this endpoint?")) {
      const updatedEndpoints = endpoints.filter((e) => e.id !== endpointId)
      saveEndpoints(updatedEndpoints)
    }
  }

  const handleSetPrimary = (endpointId: string) => {
    const endpoint = endpoints.find((e) => e.id === endpointId)
    if (!endpoint) return

    // Update settings with new primary endpoint
    updateSettings({ apiEndpoint: endpoint.url })

    // Update endpoints list
    const updatedEndpoints = endpoints.map((e) => ({
      ...e,
      isPrimary: e.id === endpointId,
    }))

    saveEndpoints(updatedEndpoints)
  }

  const toggleEndpointStatus = (endpointId: string) => {
    const updatedEndpoints = endpoints.map((e) => (e.id === endpointId ? { ...e, isActive: !e.isActive } : e))
    saveEndpoints(updatedEndpoints)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "offline":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "testing":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const formatResponseTime = (time: number | null) => {
    if (time === null) return "N/A"
    return `${time}ms`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400 flex items-center gap-2">
          <Database className="h-6 w-6" />
          API Management
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleTestAllEndpoints}
            disabled={isTesting !== null}
            className="bg-blue-600 hover:bg-blue-700 text-white font-mono"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test All
          </Button>
          <Dialog open={isAddingEndpoint} onOpenChange={setIsAddingEndpoint}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-black font-mono">
                <Plus className="h-4 w-4 mr-2" />
                Add Endpoint
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-green-500/30">
              <DialogHeader>
                <DialogTitle className="text-green-400 font-mono">Add API Endpoint</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-green-300 font-mono">Endpoint Name</Label>
                  <Input
                    value={newEndpoint.name}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                    className="bg-gray-800 border-green-500/30 text-green-400 font-mono"
                    placeholder="e.g., Backup API"
                  />
                </div>
                <div>
                  <Label className="text-green-300 font-mono">API URL</Label>
                  <Input
                    value={newEndpoint.url}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, url: e.target.value })}
                    className="bg-gray-800 border-green-500/30 text-green-400 font-mono"
                    placeholder="https://api.example.com/endpoint"
                  />
                </div>
                <Button
                  onClick={handleAddEndpoint}
                  className="w-full bg-green-600 hover:bg-green-700 text-black font-mono"
                >
                  Add Endpoint
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList className="bg-gray-900/50 border border-green-500/30">
          <TabsTrigger
            value="endpoints"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Endpoints
          </TabsTrigger>
          <TabsTrigger
            value="monitoring"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Monitoring
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <div className="grid gap-4">
            {endpoints.map((endpoint) => (
              <Card key={endpoint.id} className="bg-gray-900/50 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-green-400 font-mono font-bold">{endpoint.name}</h3>
                        <Badge className={getStatusColor(endpoint.status)}>
                          {isTesting === endpoint.id ? "TESTING" : endpoint.status.toUpperCase()}
                        </Badge>
                        {endpoint.isPrimary && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">PRIMARY</Badge>
                        )}
                        {!endpoint.isActive && (
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">DISABLED</Badge>
                        )}
                      </div>
                      <p className="text-green-300/70 font-mono text-sm mb-2">{endpoint.url}</p>
                      <div className="flex items-center gap-4 text-xs font-mono text-green-400/70">
                        <span>Response Time: {formatResponseTime(endpoint.responseTime)}</span>
                        <span>Errors: {endpoint.errorCount}</span>
                        <span>Last Tested: {endpoint.lastTested ? endpoint.lastTested.toLocaleString() : "Never"}</span>
                      </div>
                      {testResults[endpoint.id] && (
                        <div className="mt-2 p-2 bg-black/30 rounded border border-green-500/20">
                          <div className="text-xs font-mono">
                            <div
                              className={`flex items-center gap-2 ${testResults[endpoint.id].success ? "text-green-400" : "text-red-400"}`}
                            >
                              {testResults[endpoint.id].success ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {testResults[endpoint.id].success ? "Test Passed" : "Test Failed"}
                            </div>
                            {testResults[endpoint.id].error && (
                              <p className="text-red-300 mt-1">{testResults[endpoint.id].error}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleTestEndpoint(endpoint.id)}
                        disabled={isTesting === endpoint.id}
                        variant="outline"
                        size="sm"
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      >
                        {isTesting === endpoint.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        onClick={() => toggleEndpointStatus(endpoint.id)}
                        variant="outline"
                        size="sm"
                        className={`${
                          endpoint.isActive
                            ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                            : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                        }`}
                      >
                        {endpoint.isActive ? "Disable" : "Enable"}
                      </Button>
                      {!endpoint.isPrimary && (
                        <>
                          <Button
                            onClick={() => handleSetPrimary(endpoint.id)}
                            variant="outline"
                            size="sm"
                            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          >
                            Set Primary
                          </Button>
                          <Button
                            onClick={() => handleDeleteEndpoint(endpoint.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Active Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono text-green-300">
                  {endpoints.filter((e) => e.isActive).length} / {endpoints.length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Online Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono text-green-300">
                  {endpoints.filter((e) => e.status === "online").length} Online
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Avg Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono text-green-300">
                  {(() => {
                    const validTimes = endpoints.filter((e) => e.responseTime !== null).map((e) => e.responseTime!)
                    const avg =
                      validTimes.length > 0 ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length) : 0
                    return `${avg}ms`
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono">API Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {endpoints.map((endpoint) => (
                  <div key={endpoint.id} className="flex items-center justify-between p-3 bg-black/30 rounded">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          endpoint.status === "online"
                            ? "bg-green-400"
                            : endpoint.status === "offline"
                              ? "bg-red-400"
                              : "bg-gray-400"
                        }`}
                      />
                      <span className="font-mono text-green-300">{endpoint.name}</span>
                    </div>
                    <div className="text-sm font-mono text-green-400/70">
                      {endpoint.responseTime ? `${endpoint.responseTime}ms` : "No data"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                <Settings className="h-5 w-5" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-green-300 font-mono">Current Primary Endpoint</Label>
                <Input
                  value={settings.apiEndpoint}
                  readOnly
                  className="bg-gray-800 border-green-500/30 text-green-400 font-mono"
                />
                <p className="text-green-400/70 font-mono text-xs mt-1">
                  To change the primary endpoint, use "Set Primary" on any endpoint above
                </p>
              </div>

              <Alert className="border-blue-500/30 bg-blue-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-blue-400 font-mono">
                  <strong>Note:</strong> Changes to the primary endpoint will affect all prediction data fetching. Make
                  sure to test endpoints before setting them as primary.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

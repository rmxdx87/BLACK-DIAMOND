"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useSettings } from "@/contexts/settings-context"
import { Download, Upload, History, RotateCcw, FileText, Database, CheckCircle, XCircle, Clock } from "lucide-react"

export function SettingsManagement() {
  const { settings, exportSettings, importSettings, getSettingsHistory, restoreFromHistory, resetSettings } =
    useSettings()

  const [importData, setImportData] = useState("")
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle")
  const [importMessage, setImportMessage] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const settingsJson = exportSettings()
    const blob = new Blob([settingsJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jalwa-settings-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      setImportStatus("error")
      setImportMessage("Please paste settings JSON data")
      return
    }

    const success = await importSettings(importData)
    if (success) {
      setImportStatus("success")
      setImportMessage("Settings imported successfully!")
      setImportData("")
    } else {
      setImportStatus("error")
      setImportMessage("Invalid settings format. Please check your JSON data.")
    }

    setTimeout(() => {
      setImportStatus("idle")
      setImportMessage("")
    }, 3000)
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setImportData(content)
      }
      reader.readAsText(file)
    }
  }

  const settingsHistory = getSettingsHistory()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400">Settings Management</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant="outline"
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button
            onClick={resetSettings}
            variant="outline"
            className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 bg-transparent"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Settings */}
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-300/70 font-mono text-sm">
              Download current settings as a JSON file for backup or sharing.
            </p>

            <div className="p-3 bg-black/30 rounded border border-green-500/20">
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-green-400">Site Name:</span>
                  <p className="text-green-300 truncate">{settings.siteName}</p>
                </div>
                <div>
                  <span className="text-green-400">API Endpoint:</span>
                  <p className="text-green-300 truncate">{settings.apiEndpoint.split("/").pop()}</p>
                </div>
                <div>
                  <span className="text-green-400">Maintenance:</span>
                  <Badge
                    className={
                      settings.isMaintenanceMode ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"
                    }
                  >
                    {settings.isMaintenanceMode ? "ON" : "OFF"}
                  </Badge>
                </div>
                <div>
                  <span className="text-green-400">Predictions:</span>
                  <Badge className="bg-green-500/20 text-green-400">
                    {Object.values(settings.predictionSettings).filter(Boolean).length} ACTIVE
                  </Badge>
                </div>
              </div>
            </div>

            <Button onClick={handleExport} className="w-full bg-green-600 hover:bg-green-700 text-black font-mono">
              <Download className="h-4 w-4 mr-2" />
              Download Settings
            </Button>
          </CardContent>
        </Card>

        {/* Import Settings */}
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-300/70 font-mono text-sm">
              Import settings from a JSON file or paste JSON data directly.
            </p>

            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <FileText className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </div>

            <Textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste settings JSON here..."
              className="bg-black/50 border-green-500/30 text-green-400 font-mono min-h-[120px] text-xs"
            />

            {importStatus !== "idle" && (
              <Alert
                className={`border-${importStatus === "success" ? "green" : "red"}-500/30 bg-${importStatus === "success" ? "green" : "red"}-500/10`}
              >
                {importStatus === "success" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertDescription
                  className={`text-${importStatus === "success" ? "green" : "red"}-400 font-mono text-sm`}
                >
                  {importMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleImport}
              disabled={!importData.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Settings History */}
      {showHistory && (
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <History className="h-5 w-5" />
              Settings History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settingsHistory.length === 0 ? (
              <p className="text-green-300/70 font-mono text-center py-4">No settings history available</p>
            ) : (
              <div className="space-y-3">
                {settingsHistory.map((historicalSettings, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-black/30 rounded border border-green-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-green-400" />
                      <div>
                        <p className="text-green-400 font-mono text-sm">Version {settingsHistory.length - index}</p>
                        <p className="text-green-300/70 font-mono text-xs">
                          {historicalSettings.siteName} •
                          {historicalSettings.isMaintenanceMode ? " Maintenance ON" : " Maintenance OFF"}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => restoreFromHistory(index)}
                      size="sm"
                      variant="outline"
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Settings Overview */}
      <Card className="bg-gray-900/50 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-green-400 font-mono flex items-center gap-2">
            <Database className="h-5 w-5" />
            Current Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 bg-black/30 rounded border border-green-500/20">
              <h4 className="text-green-400 font-mono text-sm mb-2">Basic Settings</h4>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-green-300">Site: {settings.siteName}</p>
                <p className="text-green-300">Maintenance: {settings.isMaintenanceMode ? "ON" : "OFF"}</p>
                <p className="text-green-300">Tech Message: {settings.showTechnicalMessage ? "VISIBLE" : "HIDDEN"}</p>
              </div>
            </div>

            <div className="p-3 bg-black/30 rounded border border-green-500/20">
              <h4 className="text-green-400 font-mono text-sm mb-2">Predictions</h4>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-green-300">
                  Color: {settings.predictionSettings.enableColorPrediction ? "ON" : "OFF"}
                </p>
                <p className="text-green-300">
                  Size: {settings.predictionSettings.enableSizePrediction ? "ON" : "OFF"}
                </p>
                <p className="text-green-300">
                  Number: {settings.predictionSettings.enableNumberPrediction ? "ON" : "OFF"}
                </p>
              </div>
            </div>

            <div className="p-3 bg-black/30 rounded border border-green-500/20">
              <h4 className="text-green-400 font-mono text-sm mb-2">Performance</h4>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-green-300">
                  Confidence: {Math.round(settings.predictionSettings.confidenceThreshold * 100)}%
                </p>
                <p className="text-green-300">Update: {settings.predictionSettings.updateInterval / 1000}s</p>
                <p className="text-green-300">History: {settingsHistory.length} versions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

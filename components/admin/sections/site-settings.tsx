"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useAdminSettings } from "@/hooks/use-admin-settings"
import { Save, RotateCcw, Globe, Database } from "lucide-react"

export function SiteSettings() {
  const { settings, updateSettings, resetSettings } = useAdminSettings()
  const [localSettings, setLocalSettings] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
      console.log("[v0] Settings saved successfully to Firebase")
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    resetSettings()
    setLocalSettings(settings)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400">Site Settings</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 bg-transparent"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-black font-mono"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Basic Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName" className="text-green-400 font-mono">
                Site Name
              </Label>
              <Input
                id="siteName"
                value={localSettings.siteName}
                onChange={(e) => setLocalSettings({ ...localSettings, siteName: e.target.value })}
                className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                placeholder="Enter site name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiEndpoint" className="text-green-400 font-mono">
                API Endpoint
              </Label>
              <Input
                id="apiEndpoint"
                value={localSettings.apiEndpoint}
                onChange={(e) => setLocalSettings({ ...localSettings, apiEndpoint: e.target.value })}
                className="bg-black/50 border-green-500/30 text-green-400 font-mono text-sm"
                placeholder="Enter API endpoint URL"
              />
            </div>
          </CardContent>
        </Card>

        {/* Prediction Settings */}
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <Database className="h-5 w-5" />
              Prediction Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="colorPrediction" className="text-green-400 font-mono">
                Color Prediction
              </Label>
              <Switch
                id="colorPrediction"
                checked={localSettings.predictionSettings.enableColorPrediction}
                onCheckedChange={(checked) =>
                  setLocalSettings({
                    ...localSettings,
                    predictionSettings: { ...localSettings.predictionSettings, enableColorPrediction: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sizePrediction" className="text-green-400 font-mono">
                Size Prediction
              </Label>
              <Switch
                id="sizePrediction"
                checked={localSettings.predictionSettings.enableSizePrediction}
                onCheckedChange={(checked) =>
                  setLocalSettings({
                    ...localSettings,
                    predictionSettings: { ...localSettings.predictionSettings, enableSizePrediction: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="numberPrediction" className="text-green-400 font-mono">
                Number Prediction
              </Label>
              <Switch
                id="numberPrediction"
                checked={localSettings.predictionSettings.enableNumberPrediction}
                onCheckedChange={(checked) =>
                  setLocalSettings({
                    ...localSettings,
                    predictionSettings: { ...localSettings.predictionSettings, enableNumberPrediction: checked },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidenceThreshold" className="text-green-400 font-mono">
                Confidence Threshold: {Math.round(localSettings.predictionSettings.confidenceThreshold * 100)}%
              </Label>
              <input
                id="confidenceThreshold"
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={localSettings.predictionSettings.confidenceThreshold}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    predictionSettings: {
                      ...localSettings.predictionSettings,
                      confidenceThreshold: Number.parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

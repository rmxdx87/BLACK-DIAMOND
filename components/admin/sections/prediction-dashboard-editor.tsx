"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAdminSettings } from "@/hooks/use-admin-settings"
import { Edit, Eye, Save, BarChart3, Target, TrendingUp } from "lucide-react"

export function PredictionDashboardEditor() {
  const { settings, updateSettings } = useAdminSettings()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    setIsEditing(false)
  }

  const predictionTypes = [
    {
      id: "color",
      name: "Color Prediction",
      icon: Target,
      enabled: settings.predictionSettings.enableColorPrediction,
      description: "Red, Green, Violet predictions",
    },
    {
      id: "size",
      name: "Size Prediction",
      icon: BarChart3,
      enabled: settings.predictionSettings.enableSizePrediction,
      description: "Big, Small predictions",
    },
    {
      id: "number",
      name: "Number Prediction",
      icon: TrendingUp,
      enabled: settings.predictionSettings.enableNumberPrediction,
      description: "0-9 number predictions",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400">Prediction Dashboard Editor</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            className="border-green-500/30 text-green-400 hover:bg-green-500/10"
          >
            {isEditing ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
            {isEditing ? "Preview" : "Edit"}
          </Button>
          {isEditing && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-black font-mono"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {/* Prediction Types Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {predictionTypes.map((type) => {
          const Icon = type.icon
          return (
            <Card key={type.id} className="bg-gray-900/50 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-green-400" />
                    <h3 className="font-mono text-green-400 font-bold">{type.name}</h3>
                  </div>
                  <Badge
                    variant={type.enabled ? "default" : "secondary"}
                    className={type.enabled ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                  >
                    {type.enabled ? "ACTIVE" : "DISABLED"}
                  </Badge>
                </div>
                <p className="text-green-300/70 font-mono text-sm">{type.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dashboard Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono">Display Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-green-400 font-mono">Update Interval</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.predictionSettings.updateInterval / 1000}
                  className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                  disabled={!isEditing}
                />
                <span className="text-green-300/70 font-mono text-sm">seconds</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-green-400 font-mono">
                Confidence Threshold: {Math.round(settings.predictionSettings.confidenceThreshold * 100)}%
              </Label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.predictionSettings.confidenceThreshold}
                disabled={!isEditing}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono">AI Engine Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-black/30 rounded border border-green-500/20">
                <p className="text-green-300/70 font-mono text-sm">Pattern Detection</p>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mt-1">ACTIVE</Badge>
              </div>
              <div className="text-center p-3 bg-black/30 rounded border border-green-500/20">
                <p className="text-green-300/70 font-mono text-sm">Learning Mode</p>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mt-1">ADAPTIVE</Badge>
              </div>
            </div>

            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
              <p className="text-green-400 font-mono text-sm">
                <strong>Last Update:</strong> {new Date().toLocaleTimeString()}
              </p>
              <p className="text-green-300/70 font-mono text-xs mt-1">
                AI engine is processing historical data and generating predictions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview */}
      <Card className="bg-gray-900/50 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-green-400 font-mono">Live Dashboard Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-black/30 rounded border border-green-500/20">
            <p className="text-green-300/70 font-mono text-center">Dashboard preview will be displayed here...</p>
            <p className="text-green-400 font-mono text-center mt-2">Click "Edit" to modify dashboard components</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

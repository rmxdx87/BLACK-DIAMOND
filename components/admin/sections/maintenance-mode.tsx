"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useMaintenance } from "@/hooks/use-maintenance"
import { useSettings } from "@/contexts/settings-context"
import { AlertTriangle, Shield, Save, Calendar, Clock, Zap, History, Plus, Trash2, AlertCircle } from "lucide-react"

export function MaintenanceMode() {
  const { settings, updateSettings } = useSettings()
  const {
    isMaintenanceMode,
    schedules,
    logs,
    emergencyMaintenance,
    enableMaintenance,
    disableMaintenance,
    enableEmergencyMaintenance,
    disableEmergencyMaintenance,
    addSchedule,
    removeSchedule,
    nextMaintenanceWindow,
  } = useMaintenance()

  const [localSettings, setLocalSettings] = useState({
    technicalMessage: settings.technicalMessage,
    showTechnicalMessage: settings.showTechnicalMessage,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [emergencyReason, setEmergencyReason] = useState("")
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [newSchedule, setNewSchedule] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    notifyUsers: true,
  })

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    updateSettings(localSettings)
    setIsSaving(false)
    console.log("[v0] Maintenance settings saved via settings context")
  }

  const handleEmergencyToggle = () => {
    if (emergencyMaintenance) {
      disableEmergencyMaintenance()
    } else {
      if (emergencyReason.trim()) {
        enableEmergencyMaintenance(emergencyReason)
        setEmergencyReason("")
      }
    }
  }

  const handleMaintenanceToggle = (checked: boolean) => {
    console.log("[v0] Maintenance mode toggle:", checked)
    if (checked) {
      enableMaintenance("Manual maintenance mode enabled from admin panel")
    } else {
      disableMaintenance("Manual maintenance mode disabled from admin panel")
    }
  }

  const handleAddSchedule = () => {
    if (newSchedule.title && newSchedule.startTime && newSchedule.endTime) {
      addSchedule({
        ...newSchedule,
        startTime: new Date(newSchedule.startTime),
        endTime: new Date(newSchedule.endTime),
        isActive: true,
        isRecurring: false,
      })
      setNewSchedule({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        notifyUsers: true,
      })
      setShowScheduleDialog(false)
    }
  }

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString()
  }

  const getLogIcon = (action: string) => {
    switch (action) {
      case "emergency":
        return <Zap className="h-4 w-4 text-red-400" />
      case "enabled":
        return <Shield className="h-4 w-4 text-yellow-400" />
      case "disabled":
        return <Shield className="h-4 w-4 text-green-400" />
      case "scheduled":
        return <Calendar className="h-4 w-4 text-blue-400" />
      default:
        return <Clock className="h-4 w-4 text-green-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400">Maintenance Mode</h2>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 text-black font-mono"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
        <p className="text-blue-400 font-mono text-xs">
          DEBUG: Maintenance Mode = {isMaintenanceMode ? "TRUE" : "FALSE"} | Settings Context ={" "}
          {settings.isMaintenanceMode ? "TRUE" : "FALSE"}
        </p>
      </div>

      {emergencyMaintenance && (
        <Alert className="border-red-500/30 bg-red-500/10">
          <Zap className="h-4 w-4" />
          <AlertDescription className="text-red-400 font-mono">
            <strong>EMERGENCY MAINTENANCE ACTIVE:</strong> {emergencyMaintenance.reason}
            <br />
            <span className="text-red-300/70 text-sm">
              Started: {formatDateTime(emergencyMaintenance.startTime)} by {emergencyMaintenance.user}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {isMaintenanceMode && !emergencyMaintenance && (
        <Alert className="border-yellow-500/30 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-yellow-400 font-mono">
            <strong>WARNING:</strong> Maintenance mode is currently ACTIVE. Users will see the maintenance message.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="controls" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-black/80 border border-green-500/30">
          <TabsTrigger value="controls" className="font-mono">
            Controls
          </TabsTrigger>
          <TabsTrigger value="schedule" className="font-mono">
            Schedule
          </TabsTrigger>
          <TabsTrigger value="logs" className="font-mono">
            Logs
          </TabsTrigger>
          <TabsTrigger value="settings" className="font-mono">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-900/50 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-red-400 font-mono flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Emergency Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-red-300/70 font-mono text-sm">
                  Immediately enable maintenance mode for critical issues.
                </p>

                {!emergencyMaintenance ? (
                  <div className="space-y-3">
                    <Textarea
                      value={emergencyReason}
                      onChange={(e) => setEmergencyReason(e.target.value)}
                      placeholder="Reason for emergency maintenance..."
                      className="bg-black/50 border-red-500/30 text-red-400 font-mono"
                    />
                    <Button
                      onClick={handleEmergencyToggle}
                      disabled={!emergencyReason.trim()}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-mono"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      ENABLE EMERGENCY MAINTENANCE
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleEmergencyToggle}
                    className="w-full bg-green-600 hover:bg-green-700 text-black font-mono"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    DISABLE EMERGENCY MAINTENANCE
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Regular Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/30 rounded border border-green-500/20">
                  <div>
                    <Label htmlFor="maintenanceToggle" className="text-green-400 font-mono font-bold">
                      Maintenance Mode
                    </Label>
                    <p className="text-green-300/70 font-mono text-sm mt-1">
                      {isMaintenanceMode ? "Site is in maintenance mode" : "Site is live and accessible"}
                    </p>
                  </div>
                  <Switch
                    id="maintenanceToggle"
                    checked={isMaintenanceMode}
                    onCheckedChange={handleMaintenanceToggle}
                    className="data-[state=checked]:bg-yellow-500"
                  />
                </div>

                {nextMaintenanceWindow && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                    <p className="text-blue-400 font-mono text-sm">
                      <strong>Next Scheduled:</strong> {nextMaintenanceWindow.title}
                    </p>
                    <p className="text-blue-300/70 font-mono text-xs">
                      {formatDateTime(nextMaintenanceWindow.startTime)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-black/30 rounded border border-green-500/20">
                  <p className="text-green-300/70 font-mono text-sm">Site Status</p>
                  <p className={`font-mono font-bold ${isMaintenanceMode ? "text-yellow-400" : "text-green-400"}`}>
                    {isMaintenanceMode ? "MAINTENANCE" : "ONLINE"}
                  </p>
                </div>
                <div className="text-center p-4 bg-black/30 rounded border border-green-500/20">
                  <p className="text-green-300/70 font-mono text-sm">Emergency Mode</p>
                  <p className={`font-mono font-bold ${emergencyMaintenance ? "text-red-400" : "text-green-400"}`}>
                    {emergencyMaintenance ? "ACTIVE" : "INACTIVE"}
                  </p>
                </div>
                <div className="text-center p-4 bg-black/30 rounded border border-green-500/20">
                  <p className="text-green-300/70 font-mono text-sm">Scheduled Tasks</p>
                  <p className="font-mono font-bold text-blue-400">{schedules.length}</p>
                </div>
                <div className="text-center p-4 bg-black/30 rounded border border-green-500/20">
                  <p className="text-green-300/70 font-mono text-sm">User Access</p>
                  <p className={`font-mono font-bold ${isMaintenanceMode ? "text-red-400" : "text-green-400"}`}>
                    {isMaintenanceMode ? "RESTRICTED" : "FULL ACCESS"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-mono text-green-400">Scheduled Maintenance</h3>
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-black font-mono">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-green-500/30">
                <DialogHeader>
                  <DialogTitle className="text-green-400 font-mono">Schedule Maintenance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Title</Label>
                    <Input
                      value={newSchedule.title}
                      onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                      className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                      placeholder="Maintenance title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Description</Label>
                    <Textarea
                      value={newSchedule.description}
                      onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                      className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                      placeholder="Maintenance description..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-green-400 font-mono">Start Time</Label>
                      <Input
                        type="datetime-local"
                        value={newSchedule.startTime}
                        onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                        className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-400 font-mono">End Time</Label>
                      <Input
                        type="datetime-local"
                        value={newSchedule.endTime}
                        onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                        className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddSchedule}
                    className="w-full bg-green-600 hover:bg-green-700 text-black font-mono"
                  >
                    Schedule Maintenance
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {schedules.length === 0 ? (
              <Card className="bg-gray-900/50 border-green-500/30">
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-green-400/50 mx-auto mb-4" />
                  <p className="text-green-300/70 font-mono">No scheduled maintenance</p>
                </CardContent>
              </Card>
            ) : (
              schedules.map((schedule) => (
                <Card key={schedule.id} className="bg-gray-900/50 border-green-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-green-400 font-mono font-bold">{schedule.title}</h4>
                          <Badge
                            className={
                              schedule.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                            }
                          >
                            {schedule.isActive ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                        </div>
                        <p className="text-green-300/70 font-mono text-sm mb-2">{schedule.description}</p>
                        <div className="text-green-400 font-mono text-xs">
                          <span>Start: {formatDateTime(schedule.startTime)}</span>
                          <span className="mx-2">•</span>
                          <span>End: {formatDateTime(schedule.endTime)}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeSchedule(schedule.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <h3 className="text-xl font-mono text-green-400">Maintenance Logs</h3>

          <div className="space-y-3">
            {logs.length === 0 ? (
              <Card className="bg-gray-900/50 border-green-500/30">
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 text-green-400/50 mx-auto mb-4" />
                  <p className="text-green-300/70 font-mono">No maintenance logs</p>
                </CardContent>
              </Card>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="bg-gray-900/50 border-green-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {getLogIcon(log.action)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-green-400 font-mono font-bold capitalize">{log.action}</span>
                          <span className="text-green-300/70 font-mono text-sm">{formatDateTime(log.timestamp)}</span>
                        </div>
                        <p className="text-green-300/70 font-mono text-sm">{log.reason}</p>
                        <div className="text-green-400/70 font-mono text-xs mt-1">
                          User: {log.user}
                          {log.duration && ` • Duration: ${log.duration} minutes`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-gray-900/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Technical Message Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="showTechnicalMessage" className="text-green-400 font-mono">
                  Show Technical Message
                </Label>
                <Switch
                  id="showTechnicalMessage"
                  checked={localSettings.showTechnicalMessage}
                  onCheckedChange={(checked) => setLocalSettings({ ...localSettings, showTechnicalMessage: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="technicalMessage" className="text-green-400 font-mono">
                  Message Content
                </Label>
                <Textarea
                  id="technicalMessage"
                  value={localSettings.technicalMessage}
                  onChange={(e) => setLocalSettings({ ...localSettings, technicalMessage: e.target.value })}
                  className="bg-black/50 border-green-500/30 text-green-400 font-mono min-h-[120px]"
                  placeholder="Enter technical message for users..."
                />
              </div>

              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                <p className="text-xs text-green-400/70 font-mono mb-2">Preview:</p>
                <p className="text-green-400 font-mono text-sm">{localSettings.technicalMessage || "No message set"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

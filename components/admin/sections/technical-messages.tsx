"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTechnicalMessages } from "@/hooks/use-technical-messages"
import {
  MessageSquare,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Users,
  BarChart3,
  LayoutTemplateIcon as Template,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react"

export function TechnicalMessages() {
  const {
    messages,
    activeMessages,
    templates,
    addMessage,
    updateMessage,
    deleteMessage,
    addTemplate,
    deleteTemplate,
    getAnalytics,
  } = useTechnicalMessages()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)

  const [newMessage, setNewMessage] = useState({
    title: "",
    content: "",
    type: "info" as const,
    priority: "medium" as const,
    targetAudience: "all" as const,
    dismissible: true,
    autoHide: false,
    autoHideDelay: 5000,
    startTime: "",
    endTime: "",
  })

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    title: "",
    content: "",
    type: "info" as const,
    priority: "medium" as const,
    category: "system" as const,
  })

  const analytics = getAnalytics()

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-400" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "maintenance":
        return <Zap className="h-4 w-4 text-purple-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-green-400" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "info":
        return "border-blue-500/30 bg-blue-500/10 text-blue-400"
      case "warning":
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
      case "error":
        return "border-red-500/30 bg-red-500/10 text-red-400"
      case "success":
        return "border-green-500/30 bg-green-500/10 text-green-400"
      case "maintenance":
        return "border-purple-500/30 bg-purple-500/10 text-purple-400"
      default:
        return "border-green-500/30 bg-green-500/10 text-green-400"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-gray-500/20 text-gray-400"
      case "medium":
        return "bg-blue-500/20 text-blue-400"
      case "high":
        return "bg-yellow-500/20 text-yellow-400"
      case "critical":
        return "bg-red-500/20 text-red-400"
      default:
        return "bg-green-500/20 text-green-400"
    }
  }

  const handleCreateMessage = () => {
    if (newMessage.title && newMessage.content) {
      addMessage({
        ...newMessage,
        isActive: true,
        showOnPages: ["all"],
        createdBy: "admin",
        startTime: newMessage.startTime ? new Date(newMessage.startTime) : undefined,
        endTime: newMessage.endTime ? new Date(newMessage.endTime) : undefined,
      })

      setNewMessage({
        title: "",
        content: "",
        type: "info",
        priority: "medium",
        targetAudience: "all",
        dismissible: true,
        autoHide: false,
        autoHideDelay: 5000,
        startTime: "",
        endTime: "",
      })
      setShowCreateDialog(false)
    }
  }

  const handleCreateTemplate = () => {
    if (newTemplate.name && newTemplate.title && newTemplate.content) {
      addTemplate(newTemplate)
      setNewTemplate({
        name: "",
        title: "",
        content: "",
        type: "info",
        priority: "medium",
        category: "system",
      })
      setShowTemplateDialog(false)
    }
  }

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString()
  }

  const useTemplate = (template: any) => {
    setNewMessage({
      ...newMessage,
      title: template.title,
      content: template.content,
      type: template.type,
      priority: template.priority,
    })
    setShowCreateDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-mono font-bold text-green-400">Technical Messages</h2>
        <div className="flex gap-2">
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent"
              >
                <Template className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-green-500/30 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-green-400 font-mono">Create Message Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Template Name</Label>
                    <Input
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                      placeholder="Template name..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Category</Label>
                    <Select
                      value={newTemplate.category}
                      onValueChange={(value: any) => setNewTemplate({ ...newTemplate, category: value })}
                    >
                      <SelectTrigger className="bg-black/50 border-green-500/30 text-green-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-green-500/30">
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="alert">Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-green-400 font-mono">Title</Label>
                  <Input
                    value={newTemplate.title}
                    onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                    className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                    placeholder="Message title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-green-400 font-mono">Content</Label>
                  <Textarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    className="bg-black/50 border-green-500/30 text-green-400 font-mono min-h-[100px]"
                    placeholder="Message content..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Type</Label>
                    <Select
                      value={newTemplate.type}
                      onValueChange={(value: any) => setNewTemplate({ ...newTemplate, type: value })}
                    >
                      <SelectTrigger className="bg-black/50 border-green-500/30 text-green-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-green-500/30">
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Priority</Label>
                    <Select
                      value={newTemplate.priority}
                      onValueChange={(value: any) => setNewTemplate({ ...newTemplate, priority: value })}
                    >
                      <SelectTrigger className="bg-black/50 border-green-500/30 text-green-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-green-500/30">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleCreateTemplate}
                  className="w-full bg-green-600 hover:bg-green-700 text-black font-mono"
                >
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-black font-mono">
                <Plus className="h-4 w-4 mr-2" />
                Create Message
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-green-500/30 max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-green-400 font-mono">Create Technical Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-green-400 font-mono">Title</Label>
                  <Input
                    value={newMessage.title}
                    onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                    className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                    placeholder="Message title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-green-400 font-mono">Content</Label>
                  <Textarea
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    className="bg-black/50 border-green-500/30 text-green-400 font-mono min-h-[120px]"
                    placeholder="Message content..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Type</Label>
                    <Select
                      value={newMessage.type}
                      onValueChange={(value: any) => setNewMessage({ ...newMessage, type: value })}
                    >
                      <SelectTrigger className="bg-black/50 border-green-500/30 text-green-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-green-500/30">
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Priority</Label>
                    <Select
                      value={newMessage.priority}
                      onValueChange={(value: any) => setNewMessage({ ...newMessage, priority: value })}
                    >
                      <SelectTrigger className="bg-black/50 border-green-500/30 text-green-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-green-500/30">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Target Audience</Label>
                    <Select
                      value={newMessage.targetAudience}
                      onValueChange={(value: any) => setNewMessage({ ...newMessage, targetAudience: value })}
                    >
                      <SelectTrigger className="bg-black/50 border-green-500/30 text-green-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-green-500/30">
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="users">Users Only</SelectItem>
                        <SelectItem value="admins">Admins Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">Start Time (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={newMessage.startTime}
                      onChange={(e) => setNewMessage({ ...newMessage, startTime: e.target.value })}
                      className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-green-400 font-mono">End Time (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={newMessage.endTime}
                      onChange={(e) => setNewMessage({ ...newMessage, endTime: e.target.value })}
                      className="bg-black/50 border-green-500/30 text-green-400 font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newMessage.dismissible}
                      onCheckedChange={(checked) => setNewMessage({ ...newMessage, dismissible: checked })}
                    />
                    <Label className="text-green-400 font-mono">Dismissible</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newMessage.autoHide}
                      onCheckedChange={(checked) => setNewMessage({ ...newMessage, autoHide: checked })}
                    />
                    <Label className="text-green-400 font-mono">Auto Hide</Label>
                  </div>
                </div>
                <Button
                  onClick={handleCreateMessage}
                  className="w-full bg-green-600 hover:bg-green-700 text-black font-mono"
                >
                  Create Message
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-black/80 border border-green-500/30">
          <TabsTrigger value="messages" className="font-mono">
            Messages
          </TabsTrigger>
          <TabsTrigger value="active" className="font-mono">
            Active
          </TabsTrigger>
          <TabsTrigger value="templates" className="font-mono">
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="font-mono">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {messages.length === 0 ? (
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-green-400/50 mx-auto mb-4" />
                <p className="text-green-300/70 font-mono">No messages created yet</p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card key={message.id} className="bg-gray-900/50 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getTypeIcon(message.type)}
                        <h4 className="text-green-400 font-mono font-bold">{message.title}</h4>
                        <Badge className={getPriorityColor(message.priority)}>{message.priority.toUpperCase()}</Badge>
                        <Badge
                          className={
                            message.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                          }
                        >
                          {message.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </div>
                      <p className="text-green-300/70 font-mono text-sm mb-3">{message.content}</p>
                      <div className="flex items-center gap-4 text-xs font-mono text-green-400/70">
                        <span>Views: {message.viewCount}</span>
                        <span>Dismissals: {message.dismissCount}</span>
                        <span>Created: {formatDateTime(message.createdAt)}</span>
                        {message.startTime && <span>Start: {formatDateTime(message.startTime)}</span>}
                        {message.endTime && <span>End: {formatDateTime(message.endTime)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateMessage(message.id, { isActive: !message.isActive })}
                        variant="outline"
                        size="sm"
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        {message.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        onClick={() => deleteMessage(message.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeMessages.length === 0 ? (
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardContent className="p-8 text-center">
                <Eye className="h-12 w-12 text-green-400/50 mx-auto mb-4" />
                <p className="text-green-300/70 font-mono">No active messages</p>
              </CardContent>
            </Card>
          ) : (
            activeMessages.map((message) => (
              <Alert key={message.id} className={getTypeColor(message.type)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {getTypeIcon(message.type)}
                    <AlertDescription className="font-mono">
                      <strong>{message.title}</strong>
                      <br />
                      {message.content}
                    </AlertDescription>
                  </div>
                  <Badge className={getPriorityColor(message.priority)}>{message.priority.toUpperCase()}</Badge>
                </div>
              </Alert>
            ))
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="bg-gray-900/50 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(template.type)}
                      <h4 className="text-green-400 font-mono font-bold">{template.name}</h4>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400">{template.category.toUpperCase()}</Badge>
                  </div>
                  <p className="text-green-300/70 font-mono text-sm mb-3">{template.title}</p>
                  <p className="text-green-300/50 font-mono text-xs mb-4 line-clamp-2">{template.content}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingMessage(template.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-black font-mono"
                    >
                      Use Template
                    </Button>
                    <Button
                      onClick={() => deleteTemplate(template.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardContent className="p-4 text-center">
                <MessageSquare className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-mono font-bold text-green-400">{analytics.totalMessages}</p>
                <p className="text-green-300/70 font-mono text-sm">Total Messages</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardContent className="p-4 text-center">
                <Eye className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-mono font-bold text-blue-400">{analytics.activeMessages}</p>
                <p className="text-green-300/70 font-mono text-sm">Active Messages</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-mono font-bold text-yellow-400">{analytics.totalViews}</p>
                <p className="text-green-300/70 font-mono text-sm">Total Views</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-mono font-bold text-purple-400">{analytics.totalDismissals}</p>
                <p className="text-green-300/70 font-mono text-sm">Total Dismissals</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">Messages by Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(analytics.messagesByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(type)}
                      <span className="text-green-400 font-mono capitalize">{type}</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">Messages by Priority</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(analytics.messagesByPriority).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between">
                    <span className="text-green-400 font-mono capitalize">{priority}</span>
                    <Badge className={getPriorityColor(priority)}>{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

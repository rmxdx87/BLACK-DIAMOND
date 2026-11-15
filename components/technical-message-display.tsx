"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useTechnicalMessages } from "@/hooks/use-technical-messages"
import { MessageManager } from "@/lib/message-manager"
import { X, Info, AlertTriangle, CheckCircle, XCircle, Zap } from "lucide-react"

export function TechnicalMessageDisplay() {
  const { activeMessages } = useTechnicalMessages()
  const [dismissedMessages, setDismissedMessages] = useState<string[]>([])

  useEffect(() => {
    // Load dismissed messages from localStorage
    const dismissed = localStorage.getItem("dismissed_messages")
    if (dismissed) {
      try {
        setDismissedMessages(JSON.parse(dismissed))
      } catch {
        setDismissedMessages([])
      }
    }
  }, [])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "error":
        return <XCircle className="h-4 w-4" />
      case "success":
        return <CheckCircle className="h-4 w-4" />
      case "maintenance":
        return <Zap className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "info":
        return "border-blue-500/30 bg-blue-500/10"
      case "warning":
        return "border-yellow-500/30 bg-yellow-500/10"
      case "error":
        return "border-red-500/30 bg-red-500/10"
      case "success":
        return "border-green-500/30 bg-green-500/10"
      case "maintenance":
        return "border-purple-500/30 bg-purple-500/10"
      default:
        return "border-green-500/30 bg-green-500/10"
    }
  }

  const getTextColor = (type: string) => {
    switch (type) {
      case "info":
        return "text-blue-400"
      case "warning":
        return "text-yellow-400"
      case "error":
        return "text-red-400"
      case "success":
        return "text-green-400"
      case "maintenance":
        return "text-purple-400"
      default:
        return "text-green-400"
    }
  }

  const dismissMessage = (messageId: string) => {
    const newDismissed = [...dismissedMessages, messageId]
    setDismissedMessages(newDismissed)
    localStorage.setItem("dismissed_messages", JSON.stringify(newDismissed))
    MessageManager.incrementDismissCount(messageId)
  }

  const visibleMessages = activeMessages
    .filter((message) => !dismissedMessages.includes(message.id))
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

  // Track message views
  useEffect(() => {
    visibleMessages.forEach((message) => {
      MessageManager.incrementViewCount(message.id)
    })
  }, [visibleMessages])

  if (visibleMessages.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 mb-6">
      {visibleMessages.map((message) => (
        <Alert key={message.id} className={`${getTypeColor(message.type)} relative`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {getTypeIcon(message.type)}
              <AlertDescription className={`font-mono ${getTextColor(message.type)}`}>
                <strong>{message.title}</strong>
                <br />
                {message.content}
              </AlertDescription>
            </div>
            {message.dismissible && (
              <Button
                onClick={() => dismissMessage(message.id)}
                variant="ghost"
                size="sm"
                className={`${getTextColor(message.type)} hover:bg-white/10 p-1`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {message.priority === "critical" && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </Alert>
      ))}
    </div>
  )
}

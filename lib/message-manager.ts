export interface TechnicalMessage {
  id: string
  title: string
  content: string
  type: "info" | "warning" | "error" | "success" | "maintenance"
  priority: "low" | "medium" | "high" | "critical"
  isActive: boolean
  startTime?: Date
  endTime?: Date
  targetAudience: "all" | "admins" | "users"
  showOnPages: string[]
  dismissible: boolean
  autoHide: boolean
  autoHideDelay?: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
  viewCount: number
  dismissCount: number
}

export interface MessageTemplate {
  id: string
  name: string
  title: string
  content: string
  type: TechnicalMessage["type"]
  priority: TechnicalMessage["priority"]
  category: "system" | "maintenance" | "announcement" | "alert"
}

export class MessageManager {
  private static MESSAGES_KEY = "jalwa_technical_messages"
  private static TEMPLATES_KEY = "jalwa_message_templates"
  private static ANALYTICS_KEY = "jalwa_message_analytics"

  private static defaultTemplates: MessageTemplate[] = [
    {
      id: "maintenance_scheduled",
      name: "Scheduled Maintenance",
      title: "Scheduled Maintenance Notice",
      content:
        "System maintenance is scheduled for {date} from {startTime} to {endTime}. Some features may be temporarily unavailable.",
      type: "warning",
      priority: "medium",
      category: "maintenance",
    },
    {
      id: "system_update",
      name: "System Update",
      title: "System Update Available",
      content: "A new system update has been deployed with improved performance and new features.",
      type: "info",
      priority: "low",
      category: "system",
    },
    {
      id: "emergency_alert",
      name: "Emergency Alert",
      title: "Emergency System Alert",
      content: "Critical system issue detected. Our team is working to resolve this immediately.",
      type: "error",
      priority: "critical",
      category: "alert",
    },
    {
      id: "api_issues",
      name: "API Issues",
      title: "API Connection Issues",
      content: "We are experiencing temporary API connectivity issues. Predictions may be delayed.",
      type: "warning",
      priority: "high",
      category: "system",
    },
    {
      id: "new_features",
      name: "New Features",
      title: "New Features Available",
      content: "Check out our latest features including enhanced AI predictions and improved analytics.",
      type: "success",
      priority: "low",
      category: "announcement",
    },
  ]

  static getMessages(): TechnicalMessage[] {
    try {
      const messages = localStorage.getItem(this.MESSAGES_KEY)
      return messages ? JSON.parse(messages) : []
    } catch {
      return []
    }
  }

  static getActiveMessages(): TechnicalMessage[] {
    const messages = this.getMessages()
    const now = new Date()

    return messages.filter((message) => {
      if (!message.isActive) return false

      if (message.startTime && new Date(message.startTime) > now) return false
      if (message.endTime && new Date(message.endTime) < now) return false

      return true
    })
  }

  static addMessage(
    message: Omit<TechnicalMessage, "id" | "createdAt" | "updatedAt" | "viewCount" | "dismissCount">,
  ): string {
    const messages = this.getMessages()
    const newMessage: TechnicalMessage = {
      ...message,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
      dismissCount: 0,
    }

    messages.push(newMessage)
    localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages))

    // Trigger message update event
    window.dispatchEvent(new CustomEvent("technicalMessagesUpdated", { detail: messages }))

    return newMessage.id
  }

  static updateMessage(id: string, updates: Partial<TechnicalMessage>): void {
    const messages = this.getMessages()
    const index = messages.findIndex((m) => m.id === id)

    if (index !== -1) {
      messages[index] = {
        ...messages[index],
        ...updates,
        updatedAt: new Date(),
      }
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages))
      window.dispatchEvent(new CustomEvent("technicalMessagesUpdated", { detail: messages }))
    }
  }

  static deleteMessage(id: string): void {
    const messages = this.getMessages().filter((m) => m.id !== id)
    localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages))
    window.dispatchEvent(new CustomEvent("technicalMessagesUpdated", { detail: messages }))
  }

  static incrementViewCount(id: string): void {
    const messages = this.getMessages()
    const message = messages.find((m) => m.id === id)
    if (message) {
      message.viewCount++
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages))
    }
  }

  static incrementDismissCount(id: string): void {
    const messages = this.getMessages()
    const message = messages.find((m) => m.id === id)
    if (message) {
      message.dismissCount++
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages))
    }
  }

  static getTemplates(): MessageTemplate[] {
    try {
      const templates = localStorage.getItem(this.TEMPLATES_KEY)
      return templates ? JSON.parse(templates) : this.defaultTemplates
    } catch {
      return this.defaultTemplates
    }
  }

  static addTemplate(template: Omit<MessageTemplate, "id">): string {
    const templates = this.getTemplates()
    const newTemplate: MessageTemplate = {
      ...template,
      id: Date.now().toString(),
    }

    templates.push(newTemplate)
    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates))

    return newTemplate.id
  }

  static deleteTemplate(id: string): void {
    const templates = this.getTemplates().filter((t) => t.id !== id)
    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates))
  }

  static getMessageAnalytics() {
    const messages = this.getMessages()
    const activeMessages = this.getActiveMessages()

    return {
      totalMessages: messages.length,
      activeMessages: activeMessages.length,
      messagesByType: {
        info: messages.filter((m) => m.type === "info").length,
        warning: messages.filter((m) => m.type === "warning").length,
        error: messages.filter((m) => m.type === "error").length,
        success: messages.filter((m) => m.type === "success").length,
        maintenance: messages.filter((m) => m.type === "maintenance").length,
      },
      messagesByPriority: {
        low: messages.filter((m) => m.priority === "low").length,
        medium: messages.filter((m) => m.priority === "medium").length,
        high: messages.filter((m) => m.priority === "high").length,
        critical: messages.filter((m) => m.priority === "critical").length,
      },
      totalViews: messages.reduce((sum, m) => sum + m.viewCount, 0),
      totalDismissals: messages.reduce((sum, m) => sum + m.dismissCount, 0),
    }
  }
}

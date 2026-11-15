"use client"

import { useState, useEffect } from "react"
import { MessageManager, type TechnicalMessage, type MessageTemplate } from "@/lib/message-manager"

export function useTechnicalMessages() {
  const [messages, setMessages] = useState<TechnicalMessage[]>([])
  const [activeMessages, setActiveMessages] = useState<TechnicalMessage[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load initial data
    setMessages(MessageManager.getMessages())
    setActiveMessages(MessageManager.getActiveMessages())
    setTemplates(MessageManager.getTemplates())
    setIsLoading(false)

    // Listen for message updates
    const handleMessagesUpdate = (event: CustomEvent<TechnicalMessage[]>) => {
      setMessages(event.detail)
      setActiveMessages(MessageManager.getActiveMessages())
    }

    window.addEventListener("technicalMessagesUpdated", handleMessagesUpdate as EventListener)

    return () => {
      window.removeEventListener("technicalMessagesUpdated", handleMessagesUpdate as EventListener)
    }
  }, [])

  const addMessage = (
    message: Omit<TechnicalMessage, "id" | "createdAt" | "updatedAt" | "viewCount" | "dismissCount">,
  ) => {
    return MessageManager.addMessage(message)
  }

  const updateMessage = (id: string, updates: Partial<TechnicalMessage>) => {
    MessageManager.updateMessage(id, updates)
  }

  const deleteMessage = (id: string) => {
    MessageManager.deleteMessage(id)
  }

  const addTemplate = (template: Omit<MessageTemplate, "id">) => {
    const id = MessageManager.addTemplate(template)
    setTemplates(MessageManager.getTemplates())
    return id
  }

  const deleteTemplate = (id: string) => {
    MessageManager.deleteTemplate(id)
    setTemplates(MessageManager.getTemplates())
  }

  const getAnalytics = () => {
    return MessageManager.getMessageAnalytics()
  }

  return {
    messages,
    activeMessages,
    templates,
    isLoading,
    addMessage,
    updateMessage,
    deleteMessage,
    addTemplate,
    deleteTemplate,
    getAnalytics,
  }
}

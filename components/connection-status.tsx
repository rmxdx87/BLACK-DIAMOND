"use client"

import { useState, useEffect } from "react"

interface ConnectionStatusProps {
  isConnected: boolean
  lastUpdate: number | null
  error: string | null
}

export function ConnectionStatus({ isConnected, lastUpdate, error }: ConnectionStatusProps) {
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return "NEVER"
    const seconds = Math.floor((currentTime - lastUpdate) / 1000)
    if (seconds < 60) return `${seconds}s AGO`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m AGO`
  }

  const getStatusColor = () => {
    if (error) return "text-destructive"
    if (!isConnected) return "text-amber-300"
    return "text-emerald-300"
  }

  const getStatusText = () => {
    if (error) return "ERROR"
    if (!isConnected) return "CONNECTING"
    return "ONLINE"
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <div className="flex items-center space-x-2">
        <span className="text-muted-foreground">API status</span>
        <span className={getStatusColor()}>{getStatusText()}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-muted-foreground">Last sync</span>
        <span>{getTimeSinceUpdate()}</span>
      </div>
      {error && (
        <div className="flex items-center space-x-2">
          <span className="text-destructive">Issue</span>
          <span className="max-w-32 truncate text-destructive">{error}</span>
        </div>
      )}
    </div>
  )
}

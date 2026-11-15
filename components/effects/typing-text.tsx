"use client"

import { useEffect, useState } from "react"

interface TypingTextProps {
  text: string
  speed?: number
  className?: string
  onComplete?: () => void
  showCursor?: boolean
}

export function TypingText({ text, speed = 50, className = "", onComplete, showCursor = true }: TypingTextProps) {
  const [displayText, setDisplayText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    } else if (!isComplete) {
      setIsComplete(true)
      onComplete?.()
    }
  }, [currentIndex, text, speed, onComplete, isComplete])

  return (
    <span className={className}>
      {displayText}
      {showCursor && !isComplete && <span className="animate-pulse">█</span>}
    </span>
  )
}

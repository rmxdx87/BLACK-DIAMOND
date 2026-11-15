"use client"

import { useEffect, useState } from "react"

interface ScrollingTextProps {
  text: string
  className?: string
  speed?: number
}

export function ScrollingText({ text, className = "", speed = 50 }: ScrollingTextProps) {
  const [displayText, setDisplayText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const fullText = `>>> ${text} <<<    `
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % fullText.length)
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed])

  useEffect(() => {
    const fullText = `>>> ${text} <<<    `
    const visibleLength = Math.min(50, fullText.length)
    const startIndex = currentIndex
    const endIndex = currentIndex + visibleLength

    if (endIndex > fullText.length) {
      setDisplayText(fullText.slice(startIndex) + fullText.slice(0, endIndex - fullText.length))
    } else {
      setDisplayText(fullText.slice(startIndex, endIndex))
    }
  }, [currentIndex, text])

  return (
    <div className={`font-mono overflow-hidden whitespace-nowrap ${className}`}>
      <span className="inline-block animate-pulse">{displayText}</span>
    </div>
  )
}

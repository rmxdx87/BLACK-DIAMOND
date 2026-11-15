"use client"

import { useEffect, useState } from "react"

interface GlitchTextProps {
  text: string
  className?: string
  glitchChance?: number
}

export function GlitchText({ text, className = "", glitchChance = 0.02 }: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    const glitchInterval = setInterval(() => {
      if (Math.random() < glitchChance) {
        setIsGlitching(true)

        // Create glitched version
        const glitchedText = text
          .split("")
          .map((char) => {
            if (Math.random() < 0.3) {
              return glitchChars[Math.floor(Math.random() * glitchChars.length)]
            }
            return char
          })
          .join("")

        setDisplayText(glitchedText)

        // Restore original text after short delay
        setTimeout(() => {
          setDisplayText(text)
          setIsGlitching(false)
        }, 100)
      }
    }, 100)

    return () => clearInterval(glitchInterval)
  }, [text, glitchChance])

  return (
    <span className={`${className} ${isGlitching ? "glitch" : ""}`} data-text={text}>
      {displayText}
    </span>
  )
}

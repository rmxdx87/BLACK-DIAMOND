"use client"

import { useEffect, useState } from "react"

interface EnhancedGlitchTextProps {
  text: string
  className?: string
  glitchChance?: number
  colors?: string[]
  intensity?: number
}

export function EnhancedGlitchText({
  text,
  className = "",
  glitchChance = 0.02,
  colors = ["#ff0040", "#00ffff", "#ffff00"],
  intensity = 1,
}: EnhancedGlitchTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchStyle, setGlitchStyle] = useState({})

  useEffect(() => {
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`"
    const unicodeChars = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ"

    const glitchInterval = setInterval(() => {
      if (Math.random() < glitchChance) {
        setIsGlitching(true)

        // Create multiple glitch layers
        const glitchLayers = []
        for (let i = 0; i < 3; i++) {
          const glitchedText = text
            .split("")
            .map((char) => {
              const rand = Math.random()
              if (rand < 0.1 * intensity) {
                return glitchChars[Math.floor(Math.random() * glitchChars.length)]
              } else if (rand < 0.15 * intensity) {
                return unicodeChars[Math.floor(Math.random() * unicodeChars.length)]
              }
              return char
            })
            .join("")
          glitchLayers.push(glitchedText)
        }

        setDisplayText(glitchLayers[0])

        // Random glitch effects
        const effects = {
          transform: `translate(${(Math.random() - 0.5) * 10 * intensity}px, ${(Math.random() - 0.5) * 5 * intensity}px) skew(${(Math.random() - 0.5) * 5 * intensity}deg)`,
          filter: `hue-rotate(${Math.random() * 360}deg) saturate(${1 + Math.random() * intensity})`,
          textShadow: colors
            .map(
              (color, i) =>
                `${(Math.random() - 0.5) * 5 * intensity}px ${(Math.random() - 0.5) * 5 * intensity}px 0 ${color}`,
            )
            .join(", "),
        }

        setGlitchStyle(effects)

        // Restore original text after short delay
        setTimeout(
          () => {
            setDisplayText(text)
            setIsGlitching(false)
            setGlitchStyle({})
          },
          50 + Math.random() * 100,
        )
      }
    }, 50)

    return () => clearInterval(glitchInterval)
  }, [text, glitchChance, colors, intensity])

  return (
    <span
      className={`${className} ${isGlitching ? "transition-none" : "transition-all duration-100"}`}
      style={glitchStyle}
      data-text={text}
    >
      {displayText}
    </span>
  )
}

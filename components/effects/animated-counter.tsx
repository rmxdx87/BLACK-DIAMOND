"use client"

import { useEffect, useState } from "react"

interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  suffix?: string
  prefix?: string
}

export function AnimatedCounter({
  value,
  duration = 1000,
  className = "",
  suffix = "",
  prefix = "",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value)
      return
    }

    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = Math.floor(easeOutQuart * value)

      setDisplayValue(currentValue)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

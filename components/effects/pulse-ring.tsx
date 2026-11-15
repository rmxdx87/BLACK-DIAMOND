"use client"

import { useEffect, useState } from "react"

interface PulseRingProps {
  className?: string
  color?: string
  size?: number
  duration?: number
  trigger?: boolean
}

export function PulseRing({
  className = "",
  color = "#00ff41",
  size = 100,
  duration = 1000,
  trigger = false,
}: PulseRingProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (trigger) {
      setIsAnimating(true)
      const timeout = setTimeout(() => {
        setIsAnimating(false)
      }, duration)

      return () => clearTimeout(timeout)
    }
  }, [trigger, duration])

  return (
    <div className={`relative ${className}`}>
      {isAnimating && (
        <>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border-2 opacity-75"
              style={{
                borderColor: color,
                animation: `pulseRing ${duration}ms ease-out forwards`,
                animationDelay: `${i * 200}ms`,
                width: size,
                height: size,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

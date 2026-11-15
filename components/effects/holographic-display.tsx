"use client"

import type React from "react"

import { useEffect, useState } from "react"

interface HolographicDisplayProps {
  children: React.ReactNode
  className?: string
  intensity?: number
}

export function HolographicDisplay({ children, className = "", intensity = 0.5 }: HolographicDisplayProps) {
  const [glitchActive, setGlitchActive] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.1) {
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), 150)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`relative ${className}`}
      style={{
        filter: glitchActive ? "hue-rotate(180deg) saturate(2)" : "none",
        transition: "filter 0.1s ease",
      }}
    >
      {/* Holographic scan lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 65, ${intensity * 0.1}) 2px,
            rgba(0, 255, 65, ${intensity * 0.1}) 4px
          )`,
          animation: "hologramScan 2s linear infinite",
        }}
      />

      {/* Holographic glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded"
        style={{
          boxShadow: `inset 0 0 20px rgba(0, 255, 65, ${intensity * 0.3})`,
          border: `1px solid rgba(0, 255, 65, ${intensity * 0.5})`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Holographic flicker overlay */}
      {glitchActive && (
        <div
          className="absolute inset-0 pointer-events-none bg-green-400 opacity-10 animate-pulse"
          style={{ mixBlendMode: "screen" }}
        />
      )}
    </div>
  )
}

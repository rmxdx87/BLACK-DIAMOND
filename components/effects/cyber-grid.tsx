"use client"

import { useEffect, useRef } from "react"

interface CyberGridProps {
  className?: string
  gridSize?: number
  lineColor?: string
  glowIntensity?: number
}

export function CyberGrid({
  className = "",
  gridSize = 50,
  lineColor = "#00ff41",
  glowIntensity = 0.3,
}: CyberGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set line style
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 1
      ctx.globalAlpha = glowIntensity

      // Draw vertical lines
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      // Draw horizontal lines
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Add glow effect
      ctx.shadowColor = lineColor
      ctx.shadowBlur = 10
      ctx.globalAlpha = glowIntensity * 0.5

      // Redraw for glow
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    drawGrid()

    const handleResize = () => {
      resizeCanvas()
      drawGrid()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [gridSize, lineColor, glowIntensity])

  return <canvas ref={canvasRef} className={`fixed inset-0 pointer-events-none ${className}`} style={{ zIndex: -2 }} />
}

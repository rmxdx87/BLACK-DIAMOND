"use client"

import { useEffect, useRef } from "react"

interface MatrixRainProps {
  className?: string
  density?: number
  speed?: number
}

export function MatrixRain({ className = "", density = 0.5, speed = 35 }: MatrixRainProps) {
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

    const matrix =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン".split(
        "",
      )
    const fontSize = 10
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = []

    // Initialize drops
    for (let x = 0; x < columns; x++) {
      drops[x] = (Math.random() * canvas.height) / fontSize
    }

    const draw = () => {
      // Semi-transparent black background for trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#00ff41"
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = matrix[Math.floor(Math.random() * matrix.length)]

        // Draw character
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)

        // Reset drop to top randomly
        if (drops[i] * fontSize > canvas.height && Math.random() > 1 - density) {
          drops[i] = 0
        }

        drops[i]++
      }
    }

    const interval = setInterval(draw, speed)

    const handleResize = () => {
      resizeCanvas()
      // Recalculate columns
      const newColumns = Math.floor(canvas.width / fontSize)
      drops.length = newColumns
      for (let x = drops.length; x < newColumns; x++) {
        drops[x] = (Math.random() * canvas.height) / fontSize
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener("resize", handleResize)
    }
  }, [density, speed])

  return <canvas ref={canvasRef} className={`fixed inset-0 pointer-events-none ${className}`} style={{ zIndex: -1 }} />
}

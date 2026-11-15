"use client"

import { useEffect, useState } from "react"

interface DataStreamProps {
  className?: string
  streamCount?: number
  speed?: number
}

export function DataStream({ className = "", streamCount = 5, speed = 2000 }: DataStreamProps) {
  const [streams, setStreams] = useState<Array<{ id: number; data: string; delay: number }>>([])

  useEffect(() => {
    const dataTypes = [
      "PREDICTION_DATA",
      "AI_ANALYSIS",
      "NEURAL_NETWORK",
      "PATTERN_MATCH",
      "CONFIDENCE_CALC",
      "RESULT_VERIFY",
      "DATA_SYNC",
      "ALGORITHM_RUN",
      "MATRIX_COMPUTE",
      "QUANTUM_PROC",
    ]

    const generateStreams = () => {
      const newStreams = Array.from({ length: streamCount }, (_, i) => ({
        id: i,
        data: dataTypes[Math.floor(Math.random() * dataTypes.length)],
        delay: Math.random() * 2000,
      }))
      setStreams(newStreams)
    }

    generateStreams()
    const interval = setInterval(generateStreams, speed)

    return () => clearInterval(interval)
  }, [streamCount, speed])

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`} style={{ zIndex: 1 }}>
      {streams.map((stream) => (
        <div
          key={stream.id}
          className="absolute text-green-400 font-mono text-xs opacity-60 data-stream"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${stream.delay}ms`,
            transform: `rotate(${Math.random() * 10 - 5}deg)`,
          }}
        >
          {stream.data}
        </div>
      ))}
    </div>
  )
}

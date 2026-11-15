"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useSound } from "@/hooks/use-sound"

interface PredictionCardProps {
  title: string
  prediction: string
  confidence: number
  isAnalyzing: boolean
  options: Array<{
    label: string
    value: string
    probability?: number
    color: string
  }>
  onOptionClick?: (value: string) => void
}

export function PredictionCard({
  title,
  prediction,
  confidence,
  isAnalyzing,
  options,
  onOptionClick,
}: PredictionCardProps) {
  const { play } = useSound()

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return "text-primary"
    if (conf >= 65) return "text-accent"
    return "text-destructive"
  }

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 80) return "HIGH"
    if (conf >= 65) return "MEDIUM"
    return "LOW"
  }

  const handleOptionClick = (value: string) => {
    play("button-click")
    onOptionClick?.(value)
  }

  return (
    <Card className="prediction-card">
      <div className="p-6">
        <h2 className="text-xl font-mono text-primary mb-4 flex items-center">
          <span className="w-2 h-2 bg-primary rounded-full mr-2 gentle-pulse"></span>
          {title}
        </h2>

        <div className="space-y-4">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
            {options.map((option) => (
              <Button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`${option.color} font-mono relative overflow-hidden smooth-button`}
                disabled={isAnalyzing}
              >
                {option.label}
                {option.probability && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 confidence-bar">
                    <div className="confidence-fill" style={{ width: `${option.probability}%` }} />
                  </div>
                )}
              </Button>
            ))}
          </div>

          <div className="text-center">
            {isAnalyzing ? (
              <>
                <div className="text-2xl font-mono text-primary mb-2">ANALYZING...</div>
                <Progress value={75} className="w-full h-2 confidence-bar" />
              </>
            ) : (
              <>
                <div className="text-2xl font-mono text-primary mb-2 uppercase">{prediction}</div>
                <div className="flex items-center justify-center space-x-4 mb-2">
                  <span className="text-sm font-mono text-muted-foreground">CONFIDENCE:</span>
                  <span className={`text-sm font-mono ${getConfidenceColor(confidence)}`}>
                    {getConfidenceLabel(confidence)} ({confidence}%)
                  </span>
                </div>
                <Progress value={confidence} className="w-full h-2 confidence-bar" />
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

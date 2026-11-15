export interface GameResult {
  number: number
  color: "red" | "green" | "violet"
  /** All valid API colour memberships; legacy `color` is the first category. */
  colors?: ("red" | "green" | "violet")[]
  /** API does not provide this field; null until official mapping is configured. */
  size: "big" | "small" | null
  sum?: number
  originalRecord?: Record<string, unknown>
  premium: number
  timestamp: number | null
  period: string
}

export interface ApiResponse {
  data: {
    list: Array<{
      number: number
      colour: string
      premium: number
      createTime: number
      period: string
    }>
  }
  success: boolean
  message?: string
}

export interface PredictionData {
  color: {
    prediction: "red" | "green" | "violet"
    confidence: number
    probability: { red: number; green: number; violet: number }
  }
  size: {
    prediction: "big" | "small"
    confidence: number
    probability: { big: number; small: number }
  }
  number: {
    prediction: number
    confidence: number
    probability: number[]
  }
  topThree?: PredictionCandidateSnapshot[]
}

export interface PredictionCandidateSnapshot {
  rank: 1 | 2 | 3 | 4
  number: number
  mappedColours: readonly ("red" | "green" | "violet")[] | null
  size: "big" | "small"
  score: number | null
  supportingPatternCount: number
  historicalSampleCount: number
  signalAgreement: number | null
  calibratedConfidence: number | null
}

export interface GameStats {
  hotNumbers: number[]
  coldNumbers: number[]
  streaks: {
    color: { type: string; count: number }
    size: { type: string; count: number }
  }
  patterns: {
    colorFrequency: Record<string, number>
    sizeFrequency: Record<string, number>
    numberFrequency: Record<number, number>
  }
}

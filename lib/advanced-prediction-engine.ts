/**
 * Advanced Prediction Engine with 50+ Variants
 * Combines 5 core models with 10 parameter variations each
 * PLUS 10 Specialized Binary & Multi-class Classification Engines for Color/Size
 */

import {
  ColorSizePredictionSystemEngine,
  ColorType,
  SizeType,
  BinaryPrediction,
} from './color-size-prediction-engines'
import {
  WingoPatternSystem,
  RepeatPatternRule,
  PatternBreakRule,
  quickWingoPrediction,
  getDetailedWingoAnalysis,
  type PatternAnalysis,
} from './wingo-pattern-rules'
import {
  WingoGamePatternDetector,
  type GamePatternAnalysis,
  type GameValue,
  type PatternType,
  type PatternDetection,
} from './wingo-game-patterns'

export interface EngineVariant {
  id: string
  name: string
  category: 'markov' | 'pattern' | 'trend' | 'seasonal' | 'ensemble'
  model: (data: number[], params: any) => number
  params: any
  weight: number
}

export type { ColorType, SizeType, BinaryPrediction } from './color-size-prediction-engines'

export interface PredictionResult {
  value: number
  confidence: number
  timestamp: number
  trend?: 'up' | 'down' | 'sideways'
  pattern?: string
}

export interface EnginePrediction {
  engineId: string
  engineName: string
  prediction: number
  confidence: number
  accuracy: number
  trend?: string
  pattern?: string
}

export interface AggregatedPrediction {
  average: number
  median: number
  consensus: number
  confidence: number
  topEngines: EnginePrediction[]
  allEngines: EnginePrediction[]
  source: 'AI' | 'Admin'
  timestamp: number
}

// Markov Chain Analysis - State transition probabilities
function markovChainModel(data: number[], params: any): number {
  const { lookbackPeriods = 10, states = 5 } = params
  const recentData = data.slice(-lookbackPeriods)
  
  // Normalize data into states
  const min = Math.min(...recentData)
  const max = Math.max(...recentData)
  const range = max - min || 1
  
  const stateData = recentData.map(v => Math.floor(((v - min) / range) * (states - 1)))
  
  // Calculate transition probabilities
  const transitions: Record<number, Record<number, number>> = {}
  for (let i = 0; i < stateData.length - 1; i++) {
    const from = stateData[i]
    const to = stateData[i + 1]
    if (!transitions[from]) transitions[from] = {}
    transitions[from][to] = (transitions[from][to] || 0) + 1
  }
  
  // Predict next state based on last state
  const lastState = stateData[stateData.length - 1]
  const nextStateProbs = transitions[lastState] || {}
  const nextState = Object.entries(nextStateProbs).sort(([, a], [, b]) => b - a)[0]?.[0] ?? lastState
  
  // Convert state back to value
  return min + (parseInt(nextState) / (states - 1)) * range
}

// Pattern Recognition - Historical pattern matching
function patternRecognitionModel(data: number[], params: any): number {
  const { patternDepth = 5, minPatternLength = 3 } = params
  const recentData = data.slice(-patternDepth)
  
  // Find similar historical patterns
  const patterns: Array<{ idx: number; distance: number }> = []
  
  for (let i = minPatternLength; i < data.length - patternDepth; i++) {
    const pattern = data.slice(i, i + patternDepth)
    let distance = 0
    
    for (let j = 0; j < patternDepth; j++) {
      distance += Math.abs(recentData[j] - pattern[j])
    }
    
    patterns.push({ idx: i, distance })
  }
  
  // Get top 3 similar patterns
  const topPatterns = patterns.sort((a, b) => a.distance - b.distance).slice(0, 3)
  
  // Predict based on what happened after similar patterns
  const nextValues = topPatterns.map(p => {
    const nextIdx = p.idx + patternDepth
    return nextIdx < data.length ? data[nextIdx] : data[data.length - 1]
  })
  
  return nextValues.reduce((a, b) => a + b, 0) / Math.max(nextValues.length, 1)
}

// Trend Analysis - Slope and momentum
function trendAnalysisModel(data: number[], params: any): number {
  const { trendWindow = 15, momentumFactor = 0.85 } = params
  const recentData = data.slice(-trendWindow)
  
  // Calculate simple linear regression
  const n = recentData.length
  const sumX = (n * (n - 1)) / 2
  const sumY = recentData.reduce((a, b) => a + b, 0)
  const sumXY = recentData.reduce((sum, v, i) => sum + i * v, 0)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // Project next value with momentum
  const nextIdx = n
  const trendValue = slope * nextIdx + intercept
  const lastValue = recentData[recentData.length - 1]
  
  return lastValue * momentumFactor + trendValue * (1 - momentumFactor)
}

// Seasonal Analysis - Cyclical patterns
function seasonalAnalysisModel(data: number[], params: any): number {
  const { cycleLength = 7, harmonics = 3 } = params
  const recentData = data.slice(-cycleLength)
  
  // Find seasonal component
  let seasonalValue = 0
  let sampleCount = 0
  
  for (let i = 0; i < data.length - cycleLength; i += cycleLength) {
    const cycle = data.slice(i, i + cycleLength)
    for (let j = 0; j < Math.min(harmonics, cycle.length); j++) {
      seasonalValue += cycle[j]
      sampleCount++
    }
  }
  
  seasonalValue = sampleCount > 0 ? seasonalValue / sampleCount : recentData[recentData.length - 1]
  
  // Blend with trend
  const trend = recentData.reduce((a, b) => a + b, 0) / recentData.length
  return (seasonalValue + trend) / 2
}

// Ensemble Voting - Weighted combination
function ensembleModel(data: number[], params: any): number {
  const predictions = [
    markovChainModel(data, params),
    patternRecognitionModel(data, params),
    trendAnalysisModel(data, params),
    seasonalAnalysisModel(data, params),
  ]
  
  const weights = params.weights || [0.25, 0.25, 0.25, 0.25]
  return predictions.reduce((sum, pred, i) => sum + pred * weights[i], 0)
}

// Generate 50+ engine variants
export function generateEngineVariants(): EngineVariant[] {
  const variants: EngineVariant[] = []
  let id = 0
  
  // Markov Chain variations (10 variants)
  for (let i = 0; i < 10; i++) {
    const lookbackPeriods = 5 + (i % 3) * 5
    const confidenceThreshold = 65 + (i % 5) * 5
    
    variants.push({
      id: `markov-${i}`,
      name: `Markov Chain v${i + 1}`,
      category: 'markov',
      model: (data, params) => markovChainModel(data, params),
      params: { lookbackPeriods, confidenceThreshold, states: 5 + (i % 3) },
      weight: 1,
    })
  }
  
  // Pattern Recognition variations (10 variants)
  for (let i = 0; i < 10; i++) {
    const patternDepth = 3 + (i % 5)
    const minPatternLength = 2 + (i % 3)
    
    variants.push({
      id: `pattern-${i}`,
      name: `Pattern Recognition v${i + 1}`,
      category: 'pattern',
      model: (data, params) => patternRecognitionModel(data, params),
      params: { patternDepth, minPatternLength },
      weight: 1,
    })
  }
  
  // Trend Analysis variations (10 variants)
  for (let i = 0; i < 10; i++) {
    const trendWindow = 7 + (i % 4) * 5
    const momentumFactor = 0.7 + (i % 5) * 0.06
    
    variants.push({
      id: `trend-${i}`,
      name: `Trend Analysis v${i + 1}`,
      category: 'trend',
      model: (data, params) => trendAnalysisModel(data, params),
      params: { trendWindow, momentumFactor },
      weight: 1,
    })
  }
  
  // Seasonal Analysis variations (10 variants)
  for (let i = 0; i < 10; i++) {
    const cycleLength = 5 + (i % 4) * 2
    const harmonics = 2 + (i % 3)
    
    variants.push({
      id: `seasonal-${i}`,
      name: `Seasonal Analysis v${i + 1}`,
      category: 'seasonal',
      model: (data, params) => seasonalAnalysisModel(data, params),
      params: { cycleLength, harmonics },
      weight: 1,
    })
  }
  
  // Ensemble variations (10+ variants)
  for (let i = 0; i < 12; i++) {
    const weights = [
      (0.2 + (i % 3) * 0.05),
      (0.2 + ((i + 1) % 3) * 0.05),
      (0.3 + (i % 2) * 0.05),
      (0.3 + ((i + 1) % 2) * 0.05),
    ]
    const sum = weights.reduce((a, b) => a + b, 0)
    const normalizedWeights = weights.map(w => w / sum)
    
    variants.push({
      id: `ensemble-${i}`,
      name: `Ensemble Voting v${i + 1}`,
      category: 'ensemble',
      model: (data, params) => ensembleModel(data, params),
      params: { weights: normalizedWeights },
      weight: 2, // Higher weight for ensemble
    })
  }
  
  return variants
}

// Run all engines and return aggregated prediction
export function runAllEngines(
  data: number[],
  engineVariants: EngineVariant[],
  engineAccuracies: Record<string, number>
): AggregatedPrediction {
  const predictions: EnginePrediction[] = []
  
  for (const engine of engineVariants) {
    try {
      const value = engine.model(data, engine.params)
      const accuracy = engineAccuracies[engine.id] || 0.75
      const confidence = Math.min(100, 50 + accuracy * 50)
      
      // Determine trend
      const recentData = data.slice(-5)
      const trend = recentData.reduce((a, b) => a + b) / recentData.length
      const trendDir = value > trend ? 'up' : value < trend ? 'down' : 'sideways'
      
      predictions.push({
        engineId: engine.id,
        engineName: engine.name,
        prediction: value,
        confidence,
        accuracy,
        trend: trendDir,
      })
    } catch (error) {
      console.error(`[v0] Engine ${engine.id} failed:`, error)
    }
  }
  
  // Sort by confidence and accuracy
  predictions.sort((a, b) => {
    const scoreA = a.confidence * a.accuracy
    const scoreB = b.confidence * b.accuracy
    return scoreB - scoreA
  })
  
  // Calculate aggregate metrics
  const topEngines = predictions.slice(0, 3)
  const average = predictions.reduce((sum, p) => sum + p.prediction, 0) / Math.max(predictions.length, 1)
  const sorted = predictions.map(p => p.prediction).sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const consensus = topEngines.reduce((sum, p) => sum + p.prediction, 0) / Math.max(topEngines.length, 1)
  
  // Weighted confidence
  const totalWeight = predictions.reduce((sum, p) => sum + p.confidence * p.accuracy, 0)
  const confidence = Math.min(90, Math.round(totalWeight / Math.max(predictions.length, 1)))
  
  return {
    average,
    median,
    consensus,
    confidence,
    topEngines,
    allEngines: predictions,
    source: 'AI',
    timestamp: Date.now(),
  }
}

// Calculate engine accuracy based on historical predictions
export function calculateEngineAccuracy(
  predictions: Array<{ predicted: number; actual: number; engineId: string }>
): Record<string, number> {
  const accuracies: Record<string, Record<string, number>> = {}
  
  for (const pred of predictions) {
    if (!accuracies[pred.engineId]) {
      accuracies[pred.engineId] = { correct: 0, total: 0 }
    }
    
    const errorPercentage = Math.abs(pred.predicted - pred.actual) / Math.max(Math.abs(pred.actual), 1)
    const isCorrect = errorPercentage < 0.1 // Within 10%
    
    if (isCorrect) accuracies[pred.engineId].correct++
    accuracies[pred.engineId].total++
  }
  
  const result: Record<string, number> = {}
  for (const [engineId, stats] of Object.entries(accuracies)) {
    result[engineId] = stats.total > 0 ? stats.correct / stats.total : 0.5
  }
  
  return result
}

// ============================================
// SPECIALIZED COLOR & SIZE PREDICTION SYSTEM
// ============================================

/**
 * Predict Size (Big/Small) using all 10 specialized engines
 */
export function predictSizeWithSpecializedEngines(
  historicalSizes: SizeType[]
): {
  predictions: BinaryPrediction[]
  consensus: SizeType
  confidence: number
  sources: string[]
} {
  const engine = new ColorSizePredictionSystemEngine()
  const predictions = engine.predictSize(historicalSizes)
  const { value: consensus, confidence } = engine.getConsensusSize(predictions)

  return {
    predictions,
    consensus,
    confidence,
    sources: predictions.map(p => p.source),
  }
}

/**
 * Predict Color (Red/Green/Violet) using all 10 specialized engines
 */
export function predictColorWithSpecializedEngines(
  historicalColors: ColorType[]
): {
  predictions: BinaryPrediction[]
  consensus: ColorType
  confidence: number
  sources: string[]
} {
  const engine = new ColorSizePredictionSystemEngine()
  const predictions = engine.predictColor(historicalColors)
  const { value: consensus, confidence } = engine.getConsensusColor(predictions)

  return {
    predictions,
    consensus,
    confidence,
    sources: predictions.map(p => p.source),
  }
}

/**
 * Get combined analysis from both systems
 */
export function getFullColorSizeAnalysis(
  historicalSizes: SizeType[],
  historicalColors: ColorType[]
): {
  size: ReturnType<typeof predictSizeWithSpecializedEngines>
  color: ReturnType<typeof predictColorWithSpecializedEngines>
  combinedConfidence: number
  analysisTimestamp: number
} {
  const size = predictSizeWithSpecializedEngines(historicalSizes)
  const color = predictColorWithSpecializedEngines(historicalColors)
  const combinedConfidence = (size.confidence + color.confidence) / 2

  return {
    size,
    color,
    combinedConfidence,
    analysisTimestamp: Date.now(),
  }
}

// ============================================
// WINGO-SPECIFIC PATTERN RULES
// ============================================

/**
 * Predict Size using Wingo pattern rules
 * Supports both Repeat Pattern and Pattern Break strategies
 */
export function predictSizeWithWingoRules(
  historicalSizes: SizeType[],
  options: {
    useRepeatRule?: boolean
    useBreakRule?: boolean
  } = {}
) {
  const { useRepeatRule = true, useBreakRule = true } = options
  const system = new WingoPatternSystem()
  
  return system.predictSize(historicalSizes, useBreakRule, useRepeatRule)
}

/**
 * Predict Color using Wingo pattern rules
 * Supports both Repeat Pattern and Pattern Break strategies
 */
export function predictColorWithWingoRules(
  historicalColors: ColorType[],
  options: {
    useRepeatRule?: boolean
    useBreakRule?: boolean
  } = {}
) {
  const { useRepeatRule = true, useBreakRule = true } = options
  const system = new WingoPatternSystem()
  
  return system.predictColor(historicalColors, useBreakRule, useRepeatRule)
}

/**
 * Get detailed Wingo analysis with all metrics
 */
export function getWingoAnalysis(
  sequence: (SizeType | ColorType)[]
) {
  return getDetailedWingoAnalysis(sequence)
}

/**
 * Quick Wingo prediction
 */
export function quickWingo(
  sequence: (SizeType | ColorType)[],
  ruleType: 'repeat' | 'break' | 'both' = 'both'
) {
  return quickWingoPrediction(sequence, ruleType)
}

/**
 * Export Wingo classes for advanced usage
 */
export { WingoPatternSystem, RepeatPatternRule, PatternBreakRule, type PatternAnalysis }

// ============================================
// WINGO GAME PATTERNS (All 10 Server Patterns)
// ============================================

/**
 * Analyze Wingo game patterns for Size, Color, or Numbers
 */
export function detectGamePatterns(
  sequence: GameValue[]
): GamePatternAnalysis {
  const detector = new WingoGamePatternDetector()
  return detector.analyzeSequence(sequence)
}

/**
 * Predict Size with all 10 game patterns
 */
export function predictSizeWithGamePatterns(
  sizes: SizeType[]
): GamePatternAnalysis {
  const detector = new WingoGamePatternDetector()
  return detector.predictSize(sizes)
}

/**
 * Predict Color with all 10 game patterns
 */
export function predictColorWithGamePatterns(
  colors: ColorType[]
): GamePatternAnalysis {
  const detector = new WingoGamePatternDetector()
  return detector.predictColor(colors)
}

/**
 * Predict Numbers with all 10 game patterns
 */
export function predictNumbersWithGamePatterns(
  numbers: number[]
): GamePatternAnalysis {
  const detector = new WingoGamePatternDetector()
  return detector.predictNumbers(numbers)
}

/**
 * Export pattern detector for advanced usage
 */
export {
  WingoGamePatternDetector,
  TeleportLadiPattern,
  AlternateZigZagPattern,
  MirrorDoublePattern,
  SandwichPattern,
  StaircasePattern,
  TripleBreakPattern,
  QuadRunPattern,
  IncrementPattern,
  DecrementPattern,
  CyclePattern,
  type GamePatternAnalysis,
  type PatternDetection,
  type GameValue,
  type PatternType,
} from './wingo-game-patterns'

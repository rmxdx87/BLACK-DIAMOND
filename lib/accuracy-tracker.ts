/**
 * Accuracy Tracking System with Double-Checker Validation
 * Target: Max 90% accuracy with real-time validation
 */

export interface PredictionRecord {
  id: string
  engineId: string
  predicted: number
  actual: number
  timestamp: number
  accuracy: number // 0-100, how close prediction was
  validated: boolean
  validationNotes: string
  confidence: number
}

export interface EnginePerformance {
  engineId: string
  totalPredictions: number
  correctPredictions: number
  accuracy: number // 0-100
  averageConfidence: number
  lastUpdated: number
  trend: 'improving' | 'stable' | 'declining'
  flagged: boolean // Low accuracy engine
}

export interface ValidationResult {
  valid: boolean
  confidence: number
  reason: string
  flags: string[]
  suggestedAction: 'accept' | 'flag' | 'reject'
}

export interface AccuracySummary {
  overallAccuracy: number
  ensembleAccuracy: number
  enginesAboveThreshold: number
  totalEngines: number
  averageConfidence: number
  lastUpdate: number
  qualityScore: number // 0-100
}

// In-memory storage for predictions (would use Firebase in production)
const predictionRecords: PredictionRecord[] = []
const enginePerformance: Map<string, EnginePerformance> = new Map()

/**
 * Record a prediction for later validation
 */
export function recordPrediction(
  engineId: string,
  predicted: number,
  confidence: number
): string {
  const id = `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  predictionRecords.push({
    id,
    engineId,
    predicted,
    actual: 0, // Will be updated when actual value arrives
    timestamp: Date.now(),
    accuracy: 0,
    validated: false,
    validationNotes: '',
    confidence,
  })
  
  return id
}

/**
 * Validate prediction against actual value
 */
export function validatePrediction(
  predictionId: string,
  actualValue: number
): ValidationResult {
  const record = predictionRecords.find(p => p.id === predictionId)
  
  if (!record) {
    return {
      valid: false,
      confidence: 0,
      reason: 'Prediction record not found',
      flags: ['missing_record'],
      suggestedAction: 'reject',
    }
  }
  
  record.actual = actualValue
  
  // Calculate accuracy
  const errorPercentage = Math.abs(record.predicted - actualValue) / Math.max(Math.abs(actualValue), 1)
  const accuracy = Math.max(0, 100 - errorPercentage * 100)
  record.accuracy = accuracy
  
  // Double-checker validation
  const validation = doubleCheckPrediction(record)
  
  record.validated = true
  record.validationNotes = validation.reason
  
  // Update engine performance
  updateEnginePerformance(record.engineId, accuracy, record.confidence)
  
  return validation
}

/**
 * Double-checker validation system
 */
function doubleCheckPrediction(record: PredictionRecord): ValidationResult {
  const flags: string[] = []
  let confidence = 100
  
  // Check 1: Accuracy threshold
  if (record.accuracy < 50) {
    flags.push('low_accuracy')
    confidence -= 40
  } else if (record.accuracy < 75) {
    flags.push('moderate_accuracy')
    confidence -= 15
  }
  
  // Check 2: Confidence alignment
  const confidenceMismatch = Math.abs(record.confidence - record.accuracy)
  if (confidenceMismatch > 30) {
    flags.push('confidence_mismatch')
    confidence -= 20
  }
  
  // Check 3: Compare with historical patterns
  const historicalAccuracy = getEngineHistoricalAccuracy(record.engineId)
  if (historicalAccuracy < 0.6 && record.accuracy < 65) {
    flags.push('engine_underperforming')
    confidence -= 25
  }
  
  // Check 4: Outlier detection
  const avgPrediction = getAverageEngineAccuracy()
  if (record.accuracy < avgPrediction - 20) {
    flags.push('outlier_performance')
    confidence -= 10
  }
  
  // Check 5: Time-based decay
  const timeDiff = Date.now() - record.timestamp
  const hoursSince = timeDiff / (1000 * 60 * 60)
  if (hoursSince > 24) {
    flags.push('old_prediction')
    confidence -= 5 * Math.min(5, Math.floor(hoursSince / 24))
  }
  
  confidence = Math.max(0, Math.min(100, confidence))
  
  // Determine action
  let suggestedAction: 'accept' | 'flag' | 'reject'
  if (confidence > 75 && record.accuracy > 85) {
    suggestedAction = 'accept'
  } else if (confidence > 40) {
    suggestedAction = 'flag'
  } else {
    suggestedAction = 'reject'
  }
  
  // Auto-adjust confidence if validation reveals issues
  const adjustedConfidence = Math.min(record.confidence, confidence)
  
  return {
    valid: suggestedAction !== 'reject',
    confidence: adjustedConfidence,
    reason: flags.length > 0 
      ? `Validation checks: ${flags.join(', ')}`
      : 'Prediction passed all validation checks',
    flags,
    suggestedAction,
  }
}

/**
 * Update engine performance metrics
 */
function updateEnginePerformance(engineId: string, accuracy: number, confidence: number): void {
  let perf = enginePerformance.get(engineId)
  
  if (!perf) {
    perf = {
      engineId,
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      averageConfidence: 0,
      lastUpdated: Date.now(),
      trend: 'stable',
      flagged: false,
    }
    enginePerformance.set(engineId, perf)
  }
  
  const isCorrect = accuracy > 85
  perf.totalPredictions++
  if (isCorrect) perf.correctPredictions++
  
  // Update metrics
  const oldAccuracy = perf.accuracy
  perf.accuracy = perf.totalPredictions > 0
    ? (perf.correctPredictions / perf.totalPredictions) * 100
    : 0
  
  // Update average confidence
  perf.averageConfidence = 
    (perf.averageConfidence * (perf.totalPredictions - 1) + confidence) / perf.totalPredictions
  
  perf.lastUpdated = Date.now()
  
  // Determine trend
  if (perf.accuracy > oldAccuracy + 5) {
    perf.trend = 'improving'
  } else if (perf.accuracy < oldAccuracy - 5) {
    perf.trend = 'declining'
  } else {
    perf.trend = 'stable'
  }
  
  // Flag if accuracy too low
  perf.flagged = perf.accuracy < 60
}

/**
 * Get historical accuracy for an engine
 */
export function getEngineHistoricalAccuracy(engineId: string): number {
  const perf = enginePerformance.get(engineId)
  if (!perf || perf.totalPredictions === 0) {
    return 0.5 // Default neutral
  }
  return perf.accuracy / 100
}

/**
 * Get average engine accuracy
 */
function getAverageEngineAccuracy(): number {
  if (enginePerformance.size === 0) return 75
  
  let total = 0
  let count = 0
  
  for (const perf of enginePerformance.values()) {
    if (perf.totalPredictions > 0) {
      total += perf.accuracy
      count++
    }
  }
  
  return count > 0 ? total / count : 75
}

/**
 * Get performance for all engines
 */
export function getAllEnginePerformance(): EnginePerformance[] {
  return Array.from(enginePerformance.values()).sort((a, b) => b.accuracy - a.accuracy)
}

/**
 * Get top performing engines
 */
export function getTopEngines(limit: number = 5): EnginePerformance[] {
  return getAllEnginePerformance().slice(0, limit)
}

/**
 * Get flagged engines
 */
export function getFlaggedEngines(): EnginePerformance[] {
  return getAllEnginePerformance().filter(p => p.flagged)
}

/**
 * Get accuracy summary
 */
export function getAccuracySummary(): AccuracySummary {
  const allPerformance = getAllEnginePerformance()
  const enginesAboveThreshold = allPerformance.filter(p => p.accuracy >= 85).length
  
  // Calculate overall accuracy
  let totalAccuracy = 0
  let totalCount = 0
  
  for (const perf of allPerformance) {
    if (perf.totalPredictions > 0) {
      totalAccuracy += perf.accuracy * perf.totalPredictions
      totalCount += perf.totalPredictions
    }
  }
  
  const overallAccuracy = totalCount > 0 ? totalAccuracy / totalCount : 75
  
  // Calculate ensemble accuracy (top 3 engines)
  const topThree = allPerformance.slice(0, 3)
  const ensembleAccuracy = topThree.length > 0
    ? topThree.reduce((sum, p) => sum + p.accuracy, 0) / topThree.length
    : overallAccuracy
  
  // Calculate quality score
  const accuracyScore = Math.min(90, overallAccuracy) // Cap at 90%
  const engineHealthScore = (enginesAboveThreshold / Math.max(allPerformance.length, 1)) * 100
  const qualityScore = (accuracyScore * 0.7) + (engineHealthScore * 0.3)
  
  const avgConfidence = allPerformance.length > 0
    ? allPerformance.reduce((sum, p) => sum + p.averageConfidence, 0) / allPerformance.length
    : 0
  
  return {
    overallAccuracy: Math.round(accuracyScore * 100) / 100,
    ensembleAccuracy: Math.round(ensembleAccuracy * 100) / 100,
    enginesAboveThreshold,
    totalEngines: allPerformance.length,
    averageConfidence: Math.round(avgConfidence),
    lastUpdate: Date.now(),
    qualityScore: Math.round(qualityScore * 100) / 100,
  }
}

/**
 * Get predictions for review/audit
 */
export function getPredictionsForReview(
  limit: number = 50,
  filterFlags?: string[]
): PredictionRecord[] {
  let filtered = [...predictionRecords].reverse()
  
  if (filterFlags && filterFlags.length > 0) {
    // This would need validation result attached to record
    // For now, filter by low accuracy
    filtered = filtered.filter(p => p.accuracy < 75)
  }
  
  return filtered.slice(0, limit)
}

/**
 * Clear old records (older than 90 days)
 */
export function clearOldRecords(): number {
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000)
  const initialLength = predictionRecords.length
  
  // Keep only recent records
  const recentRecords = predictionRecords.filter(p => p.timestamp > ninetyDaysAgo)
  predictionRecords.splice(0, predictionRecords.length, ...recentRecords)
  
  return initialLength - predictionRecords.length
}

/**
 * Reset performance tracking (admin action)
 */
export function resetPerformanceTracking(): void {
  enginePerformance.clear()
  console.log('[v0] Engine performance tracking reset')
}

/**
 * Get engine performance trend analysis
 */
export function getPerformanceTrends(): {
  improving: EnginePerformance[]
  stable: EnginePerformance[]
  declining: EnginePerformance[]
} {
  const all = getAllEnginePerformance()
  
  return {
    improving: all.filter(p => p.trend === 'improving'),
    stable: all.filter(p => p.trend === 'stable'),
    declining: all.filter(p => p.trend === 'declining'),
  }
}

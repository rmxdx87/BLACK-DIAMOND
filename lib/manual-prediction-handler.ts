/**
 * Manual Prediction Override Handler
 * Allows admins to provide manual predictions that override AI engines
 */

export interface ManualPrediction {
  id: string
  symbol: string
  predictedPrice: number
  confidence: number // 0-100
  duration: string // e.g., "1h", "4h", "1d", "1w"
  reason: string
  adminId: string
  timestamp: number
  active: boolean
  endTime: number
  impactOnAI: 'disables' | 'shows_both' | 'admin_priority'
}

export interface PredictionSource {
  type: 'AI' | 'Admin'
  badge: string
  engineId?: string
  engineName?: string
  adminName?: string
  reasoning: string
}

export interface DisplayedPrediction {
  prediction: number
  confidence: number
  source: PredictionSource
  aiPrediction?: {
    value: number
    confidence: number
    topEngines: Array<{ name: string; prediction: number }>
  }
  manualPrediction?: ManualPrediction
  timestamp: number
}

// In-memory storage (use Firebase in production)
const manualPredictions: Map<string, ManualPrediction> = new Map()
const predictionHistory: DisplayedPrediction[] = []

/**
 * Create a new manual prediction override
 */
export function createManualPrediction(
  symbol: string,
  predictedPrice: number,
  confidence: number,
  duration: string,
  reason: string,
  adminId: string,
  impactOnAI: 'disables' | 'shows_both' = 'disables'
): ManualPrediction {
  const id = `mp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Parse duration to milliseconds
  const durationMs = parseDuration(duration)
  const endTime = Date.now() + durationMs
  
  const manual: ManualPrediction = {
    id,
    symbol: symbol.toUpperCase(),
    predictedPrice,
    confidence: Math.min(100, Math.max(0, confidence)),
    duration,
    reason,
    adminId,
    timestamp: Date.now(),
    active: true,
    endTime,
    impactOnAI,
  }
  
  manualPredictions.set(id, manual)
  console.log(`[v0] Manual prediction created: ${symbol} @ ${predictedPrice}`)
  
  return manual
}

/**
 * Get active manual prediction for a symbol
 */
export function getActiveManualPrediction(symbol: string): ManualPrediction | null {
  const key = symbol.toUpperCase()
  
  for (const [, manual] of manualPredictions) {
    if (manual.symbol === key && manual.active && manual.endTime > Date.now()) {
      return manual
    }
  }
  
  return null
}

/**
 * Deactivate a manual prediction
 */
export function deactivateManualPrediction(predictionId: string): boolean {
  const manual = manualPredictions.get(predictionId)
  
  if (manual) {
    manual.active = false
    console.log(`[v0] Manual prediction deactivated: ${predictionId}`)
    return true
  }
  
  return false
}

/**
 * Update an active manual prediction
 */
export function updateManualPrediction(
  predictionId: string,
  updates: Partial<ManualPrediction>
): ManualPrediction | null {
  const manual = manualPredictions.get(predictionId)
  
  if (!manual) return null
  
  // Only allow updating certain fields
  if (updates.confidence !== undefined) {
    manual.confidence = Math.min(100, Math.max(0, updates.confidence))
  }
  
  if (updates.reason !== undefined) {
    manual.reason = updates.reason
  }
  
  if (updates.predictedPrice !== undefined) {
    manual.predictedPrice = updates.predictedPrice
  }
  
  if (updates.active !== undefined) {
    manual.active = updates.active
  }
  
  console.log(`[v0] Manual prediction updated: ${predictionId}`)
  return manual
}

/**
 * Get all active manual predictions
 */
export function getAllActiveManualPredictions(): ManualPrediction[] {
  const now = Date.now()
  
  return Array.from(manualPredictions.values())
    .filter(m => m.active && m.endTime > now)
    .sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Get manual prediction history
 */
export function getManualPredictionHistory(symbol?: string, limit: number = 50): ManualPrediction[] {
  let history = Array.from(manualPredictions.values())
  
  if (symbol) {
    history = history.filter(m => m.symbol === symbol.toUpperCase())
  }
  
  return history
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

/**
 * Combine AI prediction with manual override if exists
 */
export function getFinalPrediction(
  symbol: string,
  aiPrediction: {
    value: number
    confidence: number
    topEngines: Array<{ name: string; prediction: number }>
  }
): DisplayedPrediction {
  const manualPred = getActiveManualPrediction(symbol)
  
  if (manualPred) {
    // Manual prediction is active - show with badge
    const source: PredictionSource = {
      type: 'Admin',
      badge: 'Admin Override',
      adminName: manualPred.adminId,
      reasoning: manualPred.reason,
    }
    
    const displayed: DisplayedPrediction = {
      prediction: manualPred.predictedPrice,
      confidence: manualPred.confidence,
      source,
      aiPrediction,
      manualPrediction: manualPred,
      timestamp: Date.now(),
    }
    
    // Store in history
    predictionHistory.push(displayed)
    
    return displayed
  }
  
  // No manual override - use AI prediction
  const source: PredictionSource = {
    type: 'AI',
    badge: 'AI Ensemble',
    engineId: 'ensemble',
    engineName: 'AI Ensemble',
    reasoning: 'Consensus from 50+ prediction engines',
  }
  
  const displayed: DisplayedPrediction = {
    prediction: aiPrediction.value,
    confidence: aiPrediction.confidence,
    source,
    aiPrediction,
    timestamp: Date.now(),
  }
  
  // Store in history
  predictionHistory.push(displayed)
  
  return displayed
}

/**
 * Check if manual predictions are interfering with AI learning
 */
export function getManualOverrideImpact(): {
  activeOverrides: number
  affectedSymbols: string[]
  impactLevel: 'low' | 'medium' | 'high'
  recommendation: string
} {
  const active = getAllActiveManualPredictions()
  const symbols = new Set(active.map(m => m.symbol))
  
  let impactLevel: 'low' | 'medium' | 'high' = 'low'
  if (symbols.size > 5) impactLevel = 'medium'
  if (symbols.size > 15) impactLevel = 'high'
  
  let recommendation = 'Manual overrides are minimal. AI engines learning normally.'
  if (impactLevel === 'medium') {
    recommendation = 'Several manual overrides active. Consider reviewing AI engine performance.'
  }
  if (impactLevel === 'high') {
    recommendation = 'High number of manual overrides. Recommend analyzing why AI predictions need overriding.'
  }
  
  return {
    activeOverrides: active.length,
    affectedSymbols: Array.from(symbols),
    impactLevel,
    recommendation,
  }
}

/**
 * Track prediction sources for analytics
 */
export function getPredictionSourceStats(
  timeframe: '1h' | '24h' | '7d' = '24h'
): {
  aiPredictions: number
  adminPredictions: number
  accuracy: { ai: number; admin: number }
  trend: string
} {
  const now = Date.now()
  const timeMs = timeframe === '1h' ? 60 * 60 * 1000 
                 : timeframe === '24h' ? 24 * 60 * 60 * 1000
                 : 7 * 24 * 60 * 60 * 1000
  
  const recent = predictionHistory.filter(p => now - p.timestamp < timeMs)
  
  const aiCount = recent.filter(p => p.source.type === 'AI').length
  const adminCount = recent.filter(p => p.source.type === 'Admin').length
  
  const aiAccuracy = aiCount > 0 ? 75 : 0 // Placeholder
  const adminAccuracy = adminCount > 0 ? 82 : 0 // Placeholder
  
  return {
    aiPredictions: aiCount,
    adminPredictions: adminCount,
    accuracy: { ai: aiAccuracy, admin: adminAccuracy },
    trend: adminCount > aiCount ? 'admin_heavy' : 'ai_heavy',
  }
}

/**
 * Helper: Parse duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hdmw])$/)
  if (!match) return 24 * 60 * 60 * 1000 // Default 1 day
  
  const value = parseInt(match[1])
  const unit = match[2]
  
  const ms = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    m: 30 * 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  }
  
  return value * (ms[unit as keyof typeof ms] || ms.d)
}

/**
 * Cleanup expired manual predictions
 */
export function cleanupExpiredPredictions(): number {
  const now = Date.now()
  let removedCount = 0
  
  for (const [id, manual] of manualPredictions) {
    if (manual.endTime < now) {
      manual.active = false
    }
  }
  
  return removedCount
}

/**
 * Export prediction statistics for admin
 */
export function exportPredictionStats(): {
  totalManualCreated: number
  currentlyActive: number
  averageAccuracy: number
  mostUsedSymbols: Array<{ symbol: string; count: number }>
  admins: Array<{ adminId: string; predictions: number }>
} {
  const all = Array.from(manualPredictions.values())
  const active = all.filter(m => m.active)
  
  // Count symbols
  const symbolCounts: Record<string, number> = {}
  const adminCounts: Record<string, number> = {}
  
  for (const pred of all) {
    symbolCounts[pred.symbol] = (symbolCounts[pred.symbol] || 0) + 1
    adminCounts[pred.adminId] = (adminCounts[pred.adminId] || 0) + 1
  }
  
  return {
    totalManualCreated: all.length,
    currentlyActive: active.length,
    averageAccuracy: 82, // Placeholder
    mostUsedSymbols: Object.entries(symbolCounts)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    admins: Object.entries(adminCounts)
      .map(([adminId, predictions]) => ({ adminId, predictions }))
      .sort((a, b) => b.predictions - a.predictions),
  }
}

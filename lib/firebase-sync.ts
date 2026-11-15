/**
 * Firebase Real-Time Synchronization System
 * Throttled updates (2-3 seconds) for efficiency
 */

import { database } from './firebase'
import { ref, update, set, get, onValue, remove, Unsubscribe } from 'firebase/database'

interface FirebaseConfig {
  throttleMs: number // Default 2-3 seconds
  autoSync: boolean
}

const config: FirebaseConfig = {
  throttleMs: 2500,
  autoSync: true,
}

let lastSyncTime: Record<string, number> = {}
let pendingUpdates: Record<string, any> = {}
let syncTimers: Record<string, NodeJS.Timeout> = {}

/**
 * Sync prediction data to Firebase (throttled)
 */
export async function syncPredictionData(
  symbol: string,
  predictionData: any,
  force: boolean = false
): Promise<boolean> {
  if (!database) {
    console.warn('[v0] Firebase not available for sync')
    return false
  }

  const key = `pred-${symbol}`
  const now = Date.now()
  const lastSync = lastSyncTime[key] || 0

  // Check if enough time has passed
  if (!force && now - lastSync < config.throttleMs) {
    // Queue for later
    pendingUpdates[key] = { data: predictionData, timestamp: now }
    return false
  }

  try {
    const predRef = ref(database, `predictions/${symbol}/${Date.now()}`)
    await set(predRef, {
      ...predictionData,
      syncedAt: now,
      source: 'ai-engine',
    })

    lastSyncTime[key] = now
    delete pendingUpdates[key]
    console.log(`[v0] Prediction synced for ${symbol}`)
    return true
  } catch (error) {
    console.error(`[v0] Failed to sync prediction for ${symbol}:`, error)
    return false
  }
}

/**
 * Sync engine performance metrics
 */
export async function syncEnginePerformance(
  engineId: string,
  performanceData: any
): Promise<boolean> {
  if (!database) return false

  try {
    const perfRef = ref(database, `enginePerformance/${engineId}`)
    await update(perfRef, {
      ...performanceData,
      lastUpdated: Date.now(),
    })

    console.log(`[v0] Engine performance synced: ${engineId}`)
    return true
  } catch (error) {
    console.error(`[v0] Failed to sync engine performance:`, error)
    return false
  }
}

/**
 * Sync manual prediction to Firebase
 */
export async function syncManualPrediction(
  predictionId: string,
  manualData: any
): Promise<boolean> {
  if (!database) return false

  try {
    const manualRef = ref(database, `manualPredictions/${predictionId}`)
    await set(manualRef, {
      ...manualData,
      syncedAt: Date.now(),
    })

    console.log(`[v0] Manual prediction synced: ${predictionId}`)
    return true
  } catch (error) {
    console.error(`[v0] Failed to sync manual prediction:`, error)
    return false
  }
}

/**
 * Sync trend data to Firebase
 */
export async function syncTrendData(
  symbol: string,
  trendData: any
): Promise<boolean> {
  if (!database) return false

  try {
    const trendRef = ref(database, `trendData/${symbol}`)
    await set(trendRef, {
      ...trendData,
      lastAnalyzed: Date.now(),
    })

    console.log(`[v0] Trend data synced for ${symbol}`)
    return true
  } catch (error) {
    console.error(`[v0] Failed to sync trend data:`, error)
    return false
  }
}

/**
 * Listen to prediction changes in real-time
 */
export function listenToPredictions(
  symbol: string,
  callback: (data: any) => void
): Unsubscribe | null {
  if (!database) return null

  try {
    const predRef = ref(database, `predictions/${symbol}`)
    const unsubscribe = onValue(predRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        callback(data)
      }
    })

    console.log(`[v0] Listening to predictions for ${symbol}`)
    return unsubscribe
  } catch (error) {
    console.error(`[v0] Failed to listen to predictions:`, error)
    return null
  }
}

/**
 * Listen to manual predictions
 */
export function listenToManualPredictions(
  callback: (data: any) => void
): Unsubscribe | null {
  if (!database) return null

  try {
    const manualRef = ref(database, 'manualPredictions')
    const unsubscribe = onValue(manualRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val())
      }
    })

    console.log('[v0] Listening to manual predictions')
    return unsubscribe
  } catch (error) {
    console.error('[v0] Failed to listen to manual predictions:', error)
    return null
  }
}

/**
 * Listen to engine performance updates
 */
export function listenToEnginePerformance(
  callback: (data: any) => void
): Unsubscribe | null {
  if (!database) return null

  try {
    const perfRef = ref(database, 'enginePerformance')
    const unsubscribe = onValue(perfRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val())
      }
    })

    console.log('[v0] Listening to engine performance')
    return unsubscribe
  } catch (error) {
    console.error('[v0] Failed to listen to engine performance:', error)
    return null
  }
}

/**
 * Get latest predictions
 */
export async function getLatestPredictions(
  symbol: string,
  limit: number = 10
): Promise<any[]> {
  if (!database) return []

  try {
    const predRef = ref(database, `predictions/${symbol}`)
    const snapshot = await get(predRef)
    
    if (snapshot.exists()) {
      const data = snapshot.val()
      const predictions = Object.values(data).sort((a: any, b: any) => b.syncedAt - a.syncedAt)
      return predictions.slice(0, limit)
    }
    return []
  } catch (error) {
    console.error('[v0] Failed to get predictions:', error)
    return []
  }
}

/**
 * Process pending updates
 */
export async function processPendingUpdates(): Promise<void> {
  const updates = Object.entries(pendingUpdates)
  
  for (const [key, { data }] of updates) {
    const symbol = key.replace('pred-', '')
    const success = await syncPredictionData(symbol, data, true)
    
    if (success) {
      delete pendingUpdates[key]
    }
  }
}

/**
 * Batch sync multiple predictions
 */
export async function batchSyncPredictions(
  predictions: Array<{ symbol: string; data: any }>
): Promise<number> {
  if (!database) return 0

  let successCount = 0

  for (const { symbol, data } of predictions) {
    const success = await syncPredictionData(symbol, data)
    if (success) successCount++
  }

  return successCount
}

/**
 * Delete old prediction data (cleanup)
 */
export async function deleteOldPredictions(
  daysOld: number = 90
): Promise<boolean> {
  if (!database) return false

  try {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000
    const predRef = ref(database, 'predictions')
    const snapshot = await get(predRef)

    if (snapshot.exists()) {
      const data = snapshot.val()
      
      for (const symbol in data) {
        for (const timestamp in data[symbol]) {
          if (parseInt(timestamp) < cutoffTime) {
            await remove(ref(database, `predictions/${symbol}/${timestamp}`))
          }
        }
      }
    }

    console.log(`[v0] Cleaned up predictions older than ${daysOld} days`)
    return true
  } catch (error) {
    console.error('[v0] Failed to cleanup predictions:', error)
    return false
  }
}

/**
 * Get Firebase connection status
 */
export function isFirebaseConnected(): boolean {
  return !!database
}

/**
 * Set throttle configuration
 */
export function setThrottleConfig(ms: number): void {
  config.throttleMs = ms
  console.log(`[v0] Firebase throttle set to ${ms}ms`)
}

/**
 * Get sync statistics
 */
export function getSyncStats(): {
  lastSyncTimes: Record<string, number>
  pendingUpdates: number
  firebaseConnected: boolean
} {
  return {
    lastSyncTimes: lastSyncTime,
    pendingUpdates: Object.keys(pendingUpdates).length,
    firebaseConnected: isFirebaseConnected(),
  }
}

/**
 * Initialize automatic sync processing
 */
export function startAutoSync(intervalMs: number = 10000): () => void {
  const intervalId = setInterval(() => {
    processPendingUpdates().catch(err => 
      console.error('[v0] Auto-sync failed:', err)
    )
  }, intervalMs)

  return () => clearInterval(intervalId)
}

/**
 * Clear all sync data
 */
export function clearSyncData(): void {
  lastSyncTime = {}
  pendingUpdates = {}
  
  for (const timerId of Object.values(syncTimers)) {
    clearTimeout(timerId)
  }
  syncTimers = {}
  
  console.log('[v0] Sync data cleared')
}

/**
 * Real-Time Predictions Hook
 * Throttled Firebase listeners with React hooks
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  listenToPredictions,
  listenToManualPredictions,
  listenToEnginePerformance,
  isFirebaseConnected,
} from '@/lib/firebase-sync'
import type { Unsubscribe } from 'firebase/database'

export interface RealtimePredictionData {
  symbol: string
  prediction: number
  confidence: number
  source: 'AI' | 'Admin'
  timestamp: number
  isLoading: boolean
  error: string | null
}

export interface RealtimeEnginePerformance {
  engineId: string
  accuracy: number
  totalPredictions: number
  lastUpdated: number
}

/**
 * Hook for real-time prediction updates
 */
export function usePredictionListener(symbol: string) {
  const [data, setData] = useState<RealtimePredictionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!symbol) {
      setError('Symbol is required')
      return
    }

    if (!isFirebaseConnected()) {
      setError('Firebase not connected')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      unsubscribeRef.current = listenToPredictions(symbol, (newData) => {
        setData({
          symbol,
          prediction: newData.average || newData.consensus,
          confidence: newData.confidence,
          source: newData.source || 'AI',
          timestamp: newData.timestamp,
          isLoading: false,
          error: null,
        })
        setIsLoading(false)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to listen to predictions'
      setError(message)
      setIsLoading(false)
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [symbol])

  return { data, isLoading, error }
}

/**
 * Hook for manual prediction updates
 */
export function useManualPredictionListener() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!isFirebaseConnected()) {
      setError('Firebase not connected')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      unsubscribeRef.current = listenToManualPredictions((newData) => {
        setData(newData)
        setIsLoading(false)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to listen to manual predictions'
      setError(message)
      setIsLoading(false)
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  return { data, isLoading, error }
}

/**
 * Hook for engine performance updates
 */
export function useEnginePerformanceListener() {
  const [data, setData] = useState<Record<string, RealtimeEnginePerformance> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!isFirebaseConnected()) {
      setError('Firebase not connected')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      unsubscribeRef.current = listenToEnginePerformance((newData) => {
        setData(newData)
        setIsLoading(false)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to listen to engine performance'
      setError(message)
      setIsLoading(false)
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  return { data, isLoading, error }
}

/**
 * Hook for multiple symbol predictions
 */
export function useMultiplePredictions(symbols: string[]) {
  const [predictions, setPredictions] = useState<Record<string, RealtimePredictionData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubscribesRef = useRef<Record<string, Unsubscribe>>({})

  useEffect(() => {
    if (!symbols.length) {
      setError('At least one symbol is required')
      return
    }

    if (!isFirebaseConnected()) {
      setError('Firebase not connected')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    symbols.forEach(symbol => {
      try {
        const unsubscribe = listenToPredictions(symbol, (newData) => {
          setPredictions(prev => ({
            ...prev,
            [symbol]: {
              symbol,
              prediction: newData.average || newData.consensus,
              confidence: newData.confidence,
              source: newData.source || 'AI',
              timestamp: newData.timestamp,
              isLoading: false,
              error: null,
            },
          }))
        })
        if (unsubscribe) {
          unsubscribesRef.current[symbol] = unsubscribe
        } else {
          setError(`Unable to subscribe to predictions for ${symbol}`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to listen to ${symbol}`
        setError(message)
      }
    })

    setIsLoading(false)

    return () => {
      symbols.forEach(symbol => {
        if (unsubscribesRef.current[symbol]) {
          unsubscribesRef.current[symbol]()
          delete unsubscribesRef.current[symbol]
        }
      })
    }
  }, [symbols.join(',')])

  return { predictions, isLoading, error }
}

/**
 * Hook for prediction sync status
 */
export function useSyncStatus() {
  const [status, setStatus] = useState({
    connected: false,
    lastSync: 0,
    pendingUpdates: 0,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus({
        connected: isFirebaseConnected(),
        lastSync: Date.now(),
        pendingUpdates: 0, // Would fetch from sync stats
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return status
}

/**
 * Hook for real-time updates with manual control
 */
export function useRealtimePredictionWithControl(symbol: string) {
  const [data, setData] = useState<RealtimePredictionData | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  const startListening = useCallback(() => {
    if (!symbol) {
      setError('Symbol is required')
      return
    }

    if (!isFirebaseConnected()) {
      setError('Firebase not connected')
      return
    }

    try {
      unsubscribeRef.current = listenToPredictions(symbol, (newData) => {
        setData({
          symbol,
          prediction: newData.average || newData.consensus,
          confidence: newData.confidence,
          source: newData.source || 'AI',
          timestamp: newData.timestamp,
          isLoading: false,
          error: null,
        })
      })
      setIsListening(true)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start listening'
      setError(message)
      setIsListening(false)
    }
  }, [symbol])

  const stopListening = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    setIsListening(false)
  }, [])

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  return {
    data,
    isListening,
    error,
    startListening,
    stopListening,
  }
}

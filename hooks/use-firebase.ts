'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  predictions,
  users,
  adminSettings,
  gameResults,
  PredictionData,
  UserData,
  AdminSettings,
} from '@/lib/firebase-db'

// Hook for real-time predictions
export const usePredictions = () => {
  const [data, setData] = useState<Record<string, PredictionData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = predictions.subscribe((newData) => {
      setData(newData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const create = useCallback(async (predictionData: Omit<PredictionData, 'id'>) => {
    return predictions.create(predictionData)
  }, [])

  const update = useCallback(async (id: string, predictionData: Partial<PredictionData>) => {
    return predictions.update(id, predictionData)
  }, [])

  const remove = useCallback(async (id: string) => {
    return predictions.delete(id)
  }, [])

  return { data, loading, error, create, update, remove }
}

// Hook for user data
export const useUser = (userId: string | null) => {
  const [data, setData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(!!userId)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = users.subscribe(userId, (newData) => {
      setData(newData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [userId])

  const update = useCallback(async (userData: Partial<UserData>) => {
    if (!userId) return { success: false }
    return users.update(userId, userData)
  }, [userId])

  return { data, loading, error, update }
}

// Hook for admin settings
export const useAdminSettings = () => {
  const [data, setData] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = adminSettings.subscribe((newData) => {
      setData(newData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const update = useCallback(async (settings: Partial<AdminSettings>) => {
    return adminSettings.update(settings)
  }, [])

  return { data, loading, error, update }
}

// Hook for game results
export const useGameResults = () => {
  const [data, setData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = gameResults.subscribe((newData) => {
      setData(newData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const create = useCallback(async (result: any) => {
    return gameResults.create(result)
  }, [])

  return { data, loading, error, create }
}

// Hook for user predictions
export const useUserPredictions = (userId: string | null) => {
  const [data, setData] = useState<Record<string, PredictionData>>({})
  const [loading, setLoading] = useState(!!userId)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const loadUserPredictions = async () => {
      try {
        const result = await predictions.getByUser(userId)
        setData(result)
        setLoading(false)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    loadUserPredictions()

    // Subscribe to real-time updates
    const unsubscribe = predictions.subscribe((allPredictions) => {
      const userPreds = Object.entries(allPredictions)
        .filter(([_, pred]: any) => pred.userId === userId)
        .reduce((acc, [id, pred]) => ({ ...acc, [id]: pred }), {})
      setData(userPreds)
    })

    return () => unsubscribe()
  }, [userId])

  return { data, loading, error }
}

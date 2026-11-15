import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  child,
} from 'firebase/database'
import type { Database } from 'firebase/database'
import { database } from './firebase'

function requireDatabase(): Database {
  if (!database) throw new Error('Firebase Realtime Database is not initialized')
  return database
}

// Types for database operations
export interface PredictionData {
  id: string
  userId: string
  color: string
  timestamp: number
  result?: string
  amount?: number
  won?: boolean
}

export interface UserData {
  id: string
  email: string
  username: string
  balance: number
  totalBets: number
  totalWins: number
  createdAt: number
  lastActive: number
}

export interface AdminSettings {
  maintenanceMode: boolean
  maintenanceMessage: string
  minBetAmount: number
  maxBetAmount: number
  drawInterval: number
  lastUpdated: number
}

// Predictions operations
export const predictions = {
  create: async (data: Omit<PredictionData, 'id'>) => {
    try {
      const newRef = ref(requireDatabase(), `predictions/${Date.now()}`)
      await set(newRef, data)
      return { success: true, id: Date.now() }
    } catch (error) {
      console.error('Error creating prediction:', error)
      return { success: false, error }
    }
  },

  getAll: async () => {
    try {
      const snapshot = await get(ref(requireDatabase(), 'predictions'))
      return snapshot.val() || {}
    } catch (error) {
      console.error('Error getting predictions:', error)
      return {}
    }
  },

  getById: async (id: string) => {
    try {
      const snapshot = await get(ref(requireDatabase(), `predictions/${id}`))
      return snapshot.val()
    } catch (error) {
      console.error('Error getting prediction:', error)
      return null
    }
  },

  getByUser: async (userId: string) => {
    try {
      const snapshot = await get(
        query(
          ref(requireDatabase(), 'predictions'),
          orderByChild('userId'),
        )
      )
      const data = snapshot.val() || {}
      return Object.entries(data)
        .filter(([_, prediction]: any) => prediction.userId === userId)
        .reduce((acc, [id, prediction]) => ({ ...acc, [id]: prediction }), {})
    } catch (error) {
      console.error('Error getting user predictions:', error)
      return {}
    }
  },

  update: async (id: string, data: Partial<PredictionData>) => {
    try {
      await update(ref(requireDatabase(), `predictions/${id}`), data)
      return { success: true }
    } catch (error) {
      console.error('Error updating prediction:', error)
      return { success: false, error }
    }
  },

  delete: async (id: string) => {
    try {
      await remove(ref(requireDatabase(), `predictions/${id}`))
      return { success: true }
    } catch (error) {
      console.error('Error deleting prediction:', error)
      return { success: false, error }
    }
  },

  subscribe: (callback: (data: any) => void) => {
    try {
      const predictionsRef = ref(requireDatabase(), 'predictions')
      const unsubscribe = onValue(predictionsRef, (snapshot) => {
        callback(snapshot.val() || {})
      })
      return unsubscribe
    } catch (error) {
      console.error('Error subscribing to predictions:', error)
      return () => {}
    }
  },
}

// User operations
export const users = {
  create: async (id: string, data: Omit<UserData, 'id'>) => {
    try {
      await set(ref(requireDatabase(), `users/${id}`), { id, ...data })
      return { success: true }
    } catch (error) {
      console.error('Error creating user:', error)
      return { success: false, error }
    }
  },

  getById: async (id: string) => {
    try {
      const snapshot = await get(ref(requireDatabase(), `users/${id}`))
      return snapshot.val()
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  },

  update: async (id: string, data: Partial<UserData>) => {
    try {
      await update(ref(requireDatabase(), `users/${id}`), data)
      return { success: true }
    } catch (error) {
      console.error('Error updating user:', error)
      return { success: false, error }
    }
  },

  subscribe: (userId: string, callback: (data: any) => void) => {
    try {
      const userRef = ref(requireDatabase(), `users/${userId}`)
      const unsubscribe = onValue(userRef, (snapshot) => {
        callback(snapshot.val())
      })
      return unsubscribe
    } catch (error) {
      console.error('Error subscribing to user:', error)
      return () => {}
    }
  },
}

// Admin settings operations
export const adminSettings = {
  get: async () => {
    try {
      const snapshot = await get(ref(requireDatabase(), 'settings/admin'))
      return snapshot.val() || {}
    } catch (error) {
      console.error('Error getting admin settings:', error)
      return {}
    }
  },

  update: async (data: Partial<AdminSettings>) => {
    try {
      await update(ref(requireDatabase(), 'settings/admin'), {
        ...data,
        lastUpdated: Date.now(),
      })
      return { success: true }
    } catch (error) {
      console.error('Error updating admin settings:', error)
      return { success: false, error }
    }
  },

  subscribe: (callback: (data: any) => void) => {
    try {
      const settingsRef = ref(requireDatabase(), 'settings/admin')
      const unsubscribe = onValue(settingsRef, (snapshot) => {
        callback(snapshot.val() || {})
      })
      return unsubscribe
    } catch (error) {
      console.error('Error subscribing to settings:', error)
      return () => {}
    }
  },
}

// Game results operations
export const gameResults = {
  create: async (result: any) => {
    try {
      const newRef = ref(requireDatabase(), `gameResults/${Date.now()}`)
      await set(newRef, {
        ...result,
        timestamp: Date.now(),
      })
      return { success: true }
    } catch (error) {
      console.error('Error creating game result:', error)
      return { success: false, error }
    }
  },

  getLatest: async (limit = 10) => {
    try {
      const snapshot = await get(
        query(ref(requireDatabase(), 'gameResults'), limitToLast(limit))
      )
      return snapshot.val() || {}
    } catch (error) {
      console.error('Error getting latest game results:', error)
      return {}
    }
  },

  subscribe: (callback: (data: any) => void) => {
    try {
      const resultsRef = ref(requireDatabase(), 'gameResults')
      const unsubscribe = onValue(resultsRef, (snapshot) => {
        callback(snapshot.val() || {})
      })
      return unsubscribe
    } catch (error) {
      console.error('Error subscribing to game results:', error)
      return () => {}
    }
  },
}

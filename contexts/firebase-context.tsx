'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { database } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { AdminSettings } from '@/lib/admin-settings'
import { UserAccessManager } from '@/lib/user-access'
import { PaymentManager } from '@/lib/payment-manager'
import { SubscriptionManager } from '@/lib/subscription-manager'

interface FirebaseContextType {
  isConnected: boolean
  error: string | null
}

const FirebaseContext = createContext<FirebaseContextType>({
  isConnected: false,
  error: null,
})

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    if (!database) {
      setError('Firebase database not initialized. Please check your environment variables.')
      console.warn('[v0] Firebase database is not initialized')
      return
    }

    // Set database in all realtime managers
    AdminSettings.setDatabase(database)
    UserAccessManager.setDatabase(database)
    PaymentManager.setDatabase(database)
    SubscriptionManager.setDatabase(database)

    // Start global real-time sync
    const stopUserSync = UserAccessManager.startRealtimeSync()
    const stopPaymentSync = PaymentManager.startRealtimeSync()
    const stopSubscriptionSync = SubscriptionManager.startRealtimeSync()

    try {
      // Test connection to Firebase
      const connectedRef = ref(database, '.info/connected')
      const unsubscribe = onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
          setIsConnected(true)
          setError(null)
          console.log('[v0] Connected to Firebase Realtime Database')
        } else {
          setIsConnected(false)
          setError('Disconnected from Firebase')
        }
      })

      return () => {
        unsubscribe()
        stopUserSync()
        stopPaymentSync()
        stopSubscriptionSync()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[v0] Firebase connection error:', err)
    }
  }, [])

  return (
    <FirebaseContext.Provider value={{ isConnected, error }}>
      {children}
    </FirebaseContext.Provider>
  )
}

export function useFirebaseContext() {
  const context = useContext(FirebaseContext)
  if (!context) {
    throw new Error('useFirebaseContext must be used within FirebaseProvider')
  }
  return context
}

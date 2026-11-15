"use client"

import { useState, useEffect, useCallback } from "react"
import {
  PaymentManager,
  type PaymentData,
  type PaymentMethod,
  type PaymentPlan,
  type PaymentRequest,
  type PaymentRequestStatus,
} from "@/lib/payment-manager"

/**
 * Subscribes to realtime payment configuration (methods, plans, requests).
 * Any admin change syncs to every device via Firebase.
 */
export function usePaymentMethods() {
  const [data, setData] = useState<PaymentData>(() => PaymentManager.getData())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Ensure the global Firebase listener is running (no-op if the
    // FirebaseProvider already started it). We intentionally do NOT tear it
    // down on unmount so the shared listener keeps running app-wide.
    PaymentManager.startRealtimeSync()

    // Sync from the latest cache immediately, then on every update event.
    setData(PaymentManager.getData())
    setIsLoading(false)

    const handleLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<PaymentData>).detail
      setData(detail ?? PaymentManager.getData())
    }
    window.addEventListener("paymentConfigUpdated", handleLocalChange as EventListener)

    return () => {
      window.removeEventListener("paymentConfigUpdated", handleLocalChange as EventListener)
    }
  }, [])

  const addMethod = useCallback(
    (method: Omit<PaymentMethod, "id" | "createdAt" | "updatedAt">) => PaymentManager.addMethod(method),
    [],
  )
  const updateMethod = useCallback(
    (id: string, updates: Partial<Omit<PaymentMethod, "id" | "createdAt">>) =>
      PaymentManager.updateMethod(id, updates),
    [],
  )
  const deleteMethod = useCallback((id: string) => PaymentManager.deleteMethod(id), [])
  const toggleMethod = useCallback((id: string, isActive: boolean) => PaymentManager.toggleMethod(id, isActive), [])
  const updatePlan = useCallback(
    (tier: PaymentPlan["tier"], updates: Partial<Omit<PaymentPlan, "tier">>) =>
      PaymentManager.updatePlan(tier, updates),
    [],
  )
  const createRequest = useCallback(
    (request: Omit<PaymentRequest, "id" | "status" | "createdAt">) => PaymentManager.createRequest(request),
    [],
  )
  const setRequestStatus = useCallback(
    (id: string, status: PaymentRequestStatus) => PaymentManager.setRequestStatus(id, status),
    [],
  )
  const deleteRequest = useCallback((id: string) => PaymentManager.deleteRequest(id), [])

  return {
    isLoading,
    methods: data.methods,
    activeMethods: data.methods.filter((m) => m.isActive),
    plans: data.plans,
    requests: data.requests,
    addMethod,
    updateMethod,
    deleteMethod,
    toggleMethod,
    updatePlan,
    createRequest,
    setRequestStatus,
    deleteRequest,
  }
}

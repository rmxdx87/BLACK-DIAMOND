"use client"

import { useState, useEffect, useCallback } from "react"
import {
  SubscriptionManager,
  type UserSubscription,
  type SubscriptionFeatures,
  type SubscriptionTier,
} from "@/lib/subscription-manager"

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [features, setFeatures] = useState<SubscriptionFeatures>(SubscriptionManager.TIER_FEATURES.free)
  const [isLoading, setIsLoading] = useState(true)

  const loadSubscription = useCallback(() => {
    if (!userId) {
      setSubscription(null)
      setFeatures(SubscriptionManager.TIER_FEATURES.free)
      setIsLoading(false)
      return
    }

    const userSubscription = SubscriptionManager.getUserSubscription(userId)
    const userFeatures = SubscriptionManager.getUserFeatures(userId)

    setSubscription(userSubscription)
    setFeatures(userFeatures)
    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    loadSubscription()

    const handleSubscriptionsUpdated = () => {
      loadSubscription()
    }

    window.addEventListener("subscriptionsUpdated", handleSubscriptionsUpdated)
    return () => {
      window.removeEventListener("subscriptionsUpdated", handleSubscriptionsUpdated)
    }
  }, [loadSubscription])

  const canAccess = useCallback(
    (feature: keyof SubscriptionFeatures): boolean => {
      return features[feature]
    },
    [features],
  )

  const upgradeTier = useCallback(
    (newTier: SubscriptionTier): boolean => {
      if (!userId) return false
      return SubscriptionManager.updateUserTier(userId, newTier)
    },
    [userId],
  )

  const setCustomPermissions = useCallback(
    (permissions: Partial<SubscriptionFeatures>): boolean => {
      if (!userId) return false
      return SubscriptionManager.setCustomPermissions(userId, permissions)
    },
    [userId],
  )

  const extendSubscription = useCallback(
    (days: number): boolean => {
      if (!userId) return false
      return SubscriptionManager.extendSubscription(userId, days)
    },
    [userId],
  )

  const cancelSubscription = useCallback((): boolean => {
    if (!userId) return false
    return SubscriptionManager.cancelSubscription(userId)
  }, [userId])

  return {
    subscription,
    features,
    isLoading,
    canAccess,
    upgradeTier,
    setCustomPermissions,
    extendSubscription,
    cancelSubscription,
    refreshSubscription: loadSubscription,
  }
}

export function useSubscriptionStats() {
  const [stats, setStats] = useState(SubscriptionManager.getSubscriptionStats())

  const refreshStats = useCallback(() => {
    setStats(SubscriptionManager.getSubscriptionStats())
  }, [])

  useEffect(() => {
    const handleSubscriptionsUpdated = () => {
      refreshStats()
    }

    window.addEventListener("subscriptionsUpdated", handleSubscriptionsUpdated)
    return () => {
      window.removeEventListener("subscriptionsUpdated", handleSubscriptionsUpdated)
    }
  }, [refreshStats])

  return {
    stats,
    refreshStats,
  }
}

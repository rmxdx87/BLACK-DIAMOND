"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ProfitLockManager,
  type ProfitLockConfig,
  type RiskPreset,
  type UserProfitLock,
} from "@/lib/profit-lock"

export function useProfitLock(userId?: string, userName?: string) {
  const [config, setConfig] = useState<ProfitLockConfig>(() => ProfitLockManager.getConfig())
  const [state, setState] = useState<UserProfitLock | null>(() =>
    userId ? ProfitLockManager.getUser(userId) : null,
  )
  const [allUsers, setAllUsers] = useState<UserProfitLock[]>([])

  const refresh = useCallback(() => {
    setConfig(ProfitLockManager.getConfig())
    setAllUsers(ProfitLockManager.getAllUsers())
    if (userId) setState(ProfitLockManager.getUser(userId))
  }, [userId])

  useEffect(() => {
    // Kick off global sync + initial read.
    const stopSync = ProfitLockManager.startRealtimeSync()
    refresh()

    const unsubscribe = ProfitLockManager.subscribeToChanges(() => {
      refresh()
    })

    // Tick every second so lock countdowns + auto-expiry stay live.
    const interval = setInterval(() => {
      if (userId) setState(ProfitLockManager.getUser(userId))
    }, 1000)

    return () => {
      unsubscribe()
      stopSync()
      clearInterval(interval)
    }
  }, [userId, refresh])

  const setup = useCallback(
    (input: { capital: number; profitTarget: number; riskLimit: number; riskPreset?: RiskPreset }) => {
      if (!userId) return null
      const result = ProfitLockManager.setupUser(userId, userName || "User", input)
      setState(result)
      return result
    },
    [userId, userName],
  )

  const recordTrade = useCallback(
    (type: "win" | "loss", amount: number) => {
      if (!userId) return null
      const result = ProfitLockManager.recordTrade(userId, type, amount)
      setState(result)
      return result
    },
    [userId],
  )

  const requestUnlock = useCallback(
    (note?: string) => {
      if (!userId) return null
      const result = ProfitLockManager.requestUnlock(userId, note)
      setState(result)
      return result
    },
    [userId],
  )

  const reset = useCallback(() => {
    if (!userId) return
    ProfitLockManager.resetUser(userId)
    setState(null)
  }, [userId])

  // Admin actions
  const saveConfig = useCallback((partial: Partial<ProfitLockConfig>) => {
    const next = ProfitLockManager.saveConfig(partial)
    setConfig(next)
    return next
  }, [])

  const approveUnlock = useCallback((id: string) => {
    ProfitLockManager.approveUnlock(id)
  }, [])

  const denyUnlock = useCallback((id: string) => {
    ProfitLockManager.denyUnlock(id)
  }, [])

  const forceLock = useCallback((id: string, hours?: number) => {
    ProfitLockManager.forceLock(id, hours)
  }, [])

  const resetUser = useCallback((id: string) => {
    ProfitLockManager.resetUser(id)
  }, [])

  const isLocked = !!state && state.status === "locked"

  return {
    config,
    state,
    allUsers,
    isLocked,
    setup,
    recordTrade,
    requestUnlock,
    reset,
    // admin
    saveConfig,
    approveUnlock,
    denyUnlock,
    forceLock,
    resetUser,
    refresh,
  }
}

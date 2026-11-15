"use client"

import { useCallback, useEffect, useState } from "react"
import { soundManager, type SoundType, type SoundSettings } from "@/lib/sound-manager"

interface UseSoundReturn {
  play: (soundType: SoundType, volume?: number) => void
  settings: SoundSettings
  updateSettings: (settings: Partial<SoundSettings>) => void
  startAmbient: () => void
  stopAmbient: () => void
  isInitialized: boolean
  initializeAudio: () => Promise<void>
}

export function useSound(): UseSoundReturn {
  const [settings, setSettings] = useState<SoundSettings>(soundManager.getSettings())
  const [isInitialized, setIsInitialized] = useState(false)

  const play = useCallback((soundType: SoundType, volume = 1) => {
    soundManager.play(soundType, volume)
  }, [])

  const updateSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    soundManager.updateSettings(newSettings)
    setSettings(soundManager.getSettings())
  }, [])

  const startAmbient = useCallback(() => {
    soundManager.startAmbient()
  }, [])

  const stopAmbient = useCallback(() => {
    soundManager.stopAmbient()
  }, [])

  const initializeAudio = useCallback(async () => {
    try {
      await soundManager.initializeUserInteraction()
      setIsInitialized(true)

      // Start ambient sound if enabled
      if (settings.ambientEnabled) {
        soundManager.startAmbient()
      }
    } catch (error) {
      console.error("Error initializing audio:", error)
    }
  }, [settings.ambientEnabled])

  useEffect(() => {
    // Initialize audio on first user interaction
    const handleFirstInteraction = () => {
      initializeAudio()
      document.removeEventListener("click", handleFirstInteraction)
      document.removeEventListener("keydown", handleFirstInteraction)
    }

    document.addEventListener("click", handleFirstInteraction)
    document.addEventListener("keydown", handleFirstInteraction)

    return () => {
      document.removeEventListener("click", handleFirstInteraction)
      document.removeEventListener("keydown", handleFirstInteraction)
    }
  }, [initializeAudio])

  return {
    play,
    settings,
    updateSettings,
    startAmbient,
    stopAmbient,
    isInitialized,
    initializeAudio,
  }
}

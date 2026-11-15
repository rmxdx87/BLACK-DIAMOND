export type SoundType =
  | "prediction-generated"
  | "button-click"
  | "countdown-tick"
  | "result-update"
  | "login-success"
  | "logout"
  | "error"
  | "success"
  | "warning"
  | "admin-access"
  | "data-refresh"
  | "ai-analyzing"
  | "maintenance-mode"
  | "notification"
  | "ambient-hum"

export interface SoundSettings {
  enabled: boolean
  volume: number
  ambientEnabled: boolean
  ambientVolume: number
  uiSoundsEnabled: boolean
  alertSoundsEnabled: boolean
}

export class SoundManager {
  private audioContext: AudioContext | null = null
  private sounds: Map<SoundType, AudioBuffer> = new Map()
  private settings: SoundSettings = {
    enabled: true,
    volume: 0.7,
    ambientEnabled: true,
    ambientVolume: 0.3,
    uiSoundsEnabled: true,
    alertSoundsEnabled: true,
  }
  private ambientSource: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private ambientGainNode: GainNode | null = null

  constructor() {
    this.loadSettings()
    this.initializeAudioContext()
    this.generateSounds()
  }

  private loadSettings() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jalwa_sound_settings")
      if (saved) {
        try {
          this.settings = { ...this.settings, ...JSON.parse(saved) }
        } catch (error) {
          console.error("Error loading sound settings:", error)
        }
      }
    }
  }

  private saveSettings() {
    if (typeof window !== "undefined") {
      localStorage.setItem("jalwa_sound_settings", JSON.stringify(this.settings))
    }
  }

  private async initializeAudioContext() {
    if (typeof window === "undefined") return

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.ambientGainNode = this.audioContext.createGain()

      this.gainNode.connect(this.audioContext.destination)
      this.ambientGainNode.connect(this.audioContext.destination)

      this.updateVolume()
    } catch (error) {
      console.error("Error initializing audio context:", error)
    }
  }

  private generateSounds() {
    if (!this.audioContext) return

    // Generate cyberpunk-themed sounds using Web Audio API
    const sampleRate = this.audioContext.sampleRate

    // Prediction generated - ascending digital beep
    this.sounds.set("prediction-generated", this.createBeepSequence([800, 1000, 1200], 0.3, sampleRate))

    // Button click - short digital blip
    this.sounds.set("button-click", this.createBeep(600, 0.1, sampleRate))

    // Countdown tick - sharp tick
    this.sounds.set("countdown-tick", this.createTick(1200, 0.05, sampleRate))

    // Result update - notification chime
    this.sounds.set("result-update", this.createChime([400, 800], 0.4, sampleRate))

    // Login success - success melody
    this.sounds.set("login-success", this.createBeepSequence([600, 800, 1000, 1200], 0.5, sampleRate))

    // Logout - descending beep
    this.sounds.set("logout", this.createBeepSequence([1000, 800, 600], 0.4, sampleRate))

    // Error - harsh buzz
    this.sounds.set("error", this.createBuzz(200, 0.5, sampleRate))

    // Success - pleasant chime
    this.sounds.set("success", this.createChime([800, 1200], 0.3, sampleRate))

    // Warning - alert tone
    this.sounds.set("warning", this.createWarning(500, 0.4, sampleRate))

    // Admin access - special access tone
    this.sounds.set("admin-access", this.createBeepSequence([400, 600, 800, 1000, 1200], 0.6, sampleRate))

    // Data refresh - quick sweep
    this.sounds.set("data-refresh", this.createSweep(400, 1200, 0.3, sampleRate))

    // AI analyzing - processing sound
    this.sounds.set("ai-analyzing", this.createProcessing(0.8, sampleRate))

    // Maintenance mode - system alert
    this.sounds.set("maintenance-mode", this.createMaintenanceAlert(sampleRate))

    // Notification - gentle ping
    this.sounds.set("notification", this.createPing(800, 0.2, sampleRate))

    // Ambient hum - subtle background
    this.sounds.set("ambient-hum", this.createAmbientHum(sampleRate))
  }

  private createBeep(frequency: number, duration: number, sampleRate: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 3) // Exponential decay
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3
    }

    return buffer
  }

  private createBeepSequence(frequencies: number[], totalDuration: number, sampleRate: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, totalDuration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)
    const beepDuration = totalDuration / frequencies.length

    frequencies.forEach((freq, index) => {
      const startSample = Math.floor(index * beepDuration * sampleRate)
      const endSample = Math.floor((index + 1) * beepDuration * sampleRate)

      for (let i = startSample; i < endSample && i < data.length; i++) {
        const t = (i - startSample) / sampleRate
        const envelope = Math.exp(-t * 5)
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2
      }
    })

    return buffer
  }

  private createTick(frequency: number, duration: number, sampleRate: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 20) // Very sharp decay
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4
    }

    return buffer
  }

  private createChime(frequencies: number[], duration: number, sampleRate: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 2)
      let sample = 0

      frequencies.forEach((freq) => {
        sample += Math.sin(2 * Math.PI * freq * t) * envelope
      })

      data[i] = (sample * 0.2) / frequencies.length
    }

    return buffer
  }

  private createBuzz(frequency: number, duration: number, sampleRate: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 1)
      // Add harmonics for harsh buzz
      data[i] =
        (Math.sin(2 * Math.PI * frequency * t) +
          0.5 * Math.sin(2 * Math.PI * frequency * 2 * t) +
          0.3 * Math.sin(2 * Math.PI * frequency * 3 * t)) *
        envelope *
        0.2
    }

    return buffer
  }

  private createWarning(frequency: number, duration: number, sampleRate: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const modulation = 1 + 0.5 * Math.sin(2 * Math.PI * 5 * t) // 5Hz modulation
      const envelope = Math.exp(-t * 1.5)
      data[i] = Math.sin(2 * Math.PI * frequency * t) * modulation * envelope * 0.3
    }

    return buffer
  }

  private createSweep(startFreq: number, endFreq: number, duration: number, sampleRate: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const progress = t / duration
      const frequency = startFreq + (endFreq - startFreq) * progress
      const envelope = Math.exp(-t * 3)
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3
    }

    return buffer
  }

  private createProcessing(duration: number, sampleRate: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Create a processing-like sound with multiple frequencies
      const freq1 = 300 + 100 * Math.sin(2 * Math.PI * 2 * t)
      const freq2 = 600 + 200 * Math.sin(2 * Math.PI * 3 * t)
      const envelope = 0.5 + 0.3 * Math.sin(2 * Math.PI * 4 * t)

      data[i] = (Math.sin(2 * Math.PI * freq1 * t) * 0.3 + Math.sin(2 * Math.PI * freq2 * t) * 0.2) * envelope * 0.15
    }

    return buffer
  }

  private createMaintenanceAlert(sampleRate: number): AudioBuffer {
    const duration = 1.0
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Alternating high-low alert pattern
      const frequency = t % 0.5 < 0.25 ? 800 : 400
      const envelope = Math.exp(-t * 1)
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4
    }

    return buffer
  }

  private createPing(frequency: number, duration: number, sampleRate: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 4)
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.25
    }

    return buffer
  }

  private createAmbientHum(sampleRate: number): AudioBuffer {
    const duration = 10.0 // 10 second loop
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Multiple low frequencies for ambient hum
      data[i] =
        (Math.sin(2 * Math.PI * 60 * t) * 0.1 +
          Math.sin(2 * Math.PI * 120 * t) * 0.05 +
          Math.sin(2 * Math.PI * 180 * t) * 0.03 +
          (Math.random() - 0.5) * 0.02) * // Subtle noise
        0.3
    }

    return buffer
  }

  async play(soundType: SoundType, volume = 1) {
    if (!this.settings.enabled || !this.audioContext || !this.gainNode) return

    // Check specific sound type settings
    if (soundType === "button-click" && !this.settings.uiSoundsEnabled) return
    if (["error", "warning", "notification"].includes(soundType) && !this.settings.alertSoundsEnabled) return

    const buffer = this.sounds.get(soundType)
    if (!buffer) return

    try {
      // Resume audio context if suspended (required by browsers)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume()
      }

      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()

      source.buffer = buffer
      source.connect(gainNode)
      gainNode.connect(this.gainNode)

      gainNode.gain.value = this.settings.volume * volume

      try {
        source.start()
      } catch (startError) {
        // If start() fails, clean up immediately
        console.warn("Audio start failed:", startError)
        try {
          source.disconnect()
          gainNode.disconnect()
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        return
      }

      // Clean up after sound finishes
      source.onended = () => {
        try {
          source.disconnect()
          gainNode.disconnect()
        } catch (disconnectError) {
          // Ignore disconnect errors - node may already be disconnected
        }
      }
    } catch (error) {
      console.error("Error playing sound:", error)
    }
  }

  startAmbient() {
    if (!this.settings.ambientEnabled || !this.audioContext || !this.ambientGainNode) return

    this.stopAmbient()

    const buffer = this.sounds.get("ambient-hum")
    if (!buffer) return

    try {
      this.ambientSource = this.audioContext.createBufferSource()
      this.ambientSource.buffer = buffer
      this.ambientSource.loop = true
      this.ambientSource.connect(this.ambientGainNode)

      this.ambientGainNode.gain.value = this.settings.ambientVolume

      try {
        this.ambientSource.start()
      } catch (startError) {
        console.warn("Ambient sound start failed:", startError)
        this.ambientSource = null
        return
      }
    } catch (error) {
      console.error("Error starting ambient sound:", error)
      this.ambientSource = null
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      const source = this.ambientSource
      this.ambientSource = null
      try {
        source.stop()
        source.disconnect()
      } catch (error) {
        console.warn("Error stopping ambient sound:", error)
      }
    }
  }

  updateSettings(newSettings: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
    this.updateVolume()

    if (newSettings.ambientEnabled !== undefined) {
      if (newSettings.ambientEnabled) {
        this.startAmbient()
      } else {
        this.stopAmbient()
      }
    }
  }

  private updateVolume() {
    if (this.gainNode) {
      this.gainNode.gain.value = this.settings.volume
    }
    if (this.ambientGainNode) {
      this.ambientGainNode.gain.value = this.settings.ambientVolume
    }
  }

  getSettings(): SoundSettings {
    return { ...this.settings }
  }

  // Initialize user interaction (required by browsers)
  async initializeUserInteraction() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume()
    }
  }
}

export const soundManager = new SoundManager()

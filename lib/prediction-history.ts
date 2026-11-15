import type { GameResult, PredictionCandidateSnapshot, PredictionData } from "./types"
import { sizeFromNumber } from "./trend-pattern-engine.ts"

export interface PredictionHistoryEntry {
  id: string
  timestamp: number
  targetPeriod?: string
  predictions: {
    color?: { prediction: string; confidence: number }
    size?: { prediction: string; confidence: number }
    number?: { prediction: number; confidence: number }
    topThree?: PredictionCandidateSnapshot[]
    topFour?: PredictionCandidateSnapshot[]
    topFourMarkets?: { color?: string; size?: string }
  }
  actualResult?: Pick<GameResult, "color" | "colors" | "size" | "number" | "period">
  results?: {
    color?: boolean
    size?: boolean
    number?: boolean
    numberTopThree?: boolean
    numberTopFour?: boolean
    overall?: boolean
  }
  status: "pending" | "win" | "loss" | "partial"
}

function summarizeMarket(outcomes: readonly boolean[]) {
  const predictions = outcomes.length
  const wins = outcomes.filter(Boolean).length
  return {
    predictions,
    wins,
    losses: predictions - wins,
    winRate: predictions > 0 ? Math.round((wins / predictions) * 100) : null,
  }
}

export class PredictionHistoryManager {
  private static instance: PredictionHistoryManager
  private history: PredictionHistoryEntry[] = []
  private revision = 0
  private listeners = new Set<() => void>()
  private readonly STORAGE_KEY = "jalwa_prediction_history"

  static getInstance(): PredictionHistoryManager {
    if (!PredictionHistoryManager.instance) {
      PredictionHistoryManager.instance = new PredictionHistoryManager()
    }
    return PredictionHistoryManager.instance
  }

  constructor() {
    this.loadHistory()
  }

  private loadHistory(): void {
    try {
      // Check if localStorage is available (not on server)
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (stored) {
          this.history = JSON.parse(stored)
          this.revision = 1
        }
      }
    } catch (error) {
      console.error("Error loading prediction history:", error)
      this.history = []
    }
  }

  private saveHistory(): void {
    try {
      // Check if localStorage is available (not on server)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history))
      }
    } catch (error) {
      console.error("Error saving prediction history:", error)
    }
    this.revision++
    this.listeners.forEach((listener) => listener())
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getRevision(): number {
    return this.revision
  }

  addPrediction(predictions: PredictionData): string {
    const entry: PredictionHistoryEntry = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      predictions: {
        color: {
          prediction: predictions.color.prediction,
          confidence: predictions.color.confidence,
        },
        size: {
          prediction: predictions.size.prediction,
          confidence: predictions.size.confidence,
        },
        number: {
          prediction: predictions.number.prediction,
          confidence: predictions.number.confidence,
        },
        ...(predictions.topThree ? { topThree: predictions.topThree } : {}),
      },
      status: "pending",
    }

    this.history.unshift(entry)

    // Keep only last 50 predictions
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50)
    }

    this.saveHistory()
    return entry.id
  }

  addTopThreePrediction(candidates: readonly PredictionCandidateSnapshot[], targetPeriod: string): string {
    if (
      candidates.length !== 3 ||
      new Set(candidates.map((candidate) => candidate.number)).size !== 3 ||
      candidates.some((candidate, index) => candidate.rank !== index + 1 || !Number.isInteger(candidate.number) || candidate.number < 0 || candidate.number > 9)
    ) {
      throw new RangeError("A Top 3 history snapshot must contain three distinct candidates")
    }
    if (!/^\d+$/.test(targetPeriod)) throw new RangeError("A Top 3 target period must be numeric")

    const existing = this.history.find((entry) => entry.targetPeriod === targetPeriod && entry.predictions.topThree?.length === 3)
    if (existing) return existing.id

    const entry: PredictionHistoryEntry = {
      id: `pred_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
      targetPeriod,
      predictions: { topThree: candidates.map((candidate) => ({ ...candidate })) },
      status: "pending",
    }
    this.history.unshift(entry)
    if (this.history.length > 50) this.history = this.history.slice(0, 50)
    this.saveHistory()
    return entry.id
  }

  addTopFourPrediction(
    candidates: readonly PredictionCandidateSnapshot[],
    targetPeriod: string,
    markets: { color?: string; size?: string } = {},
  ): string {
    if (
      candidates.length !== 4 ||
      new Set(candidates.map((candidate) => candidate.number)).size !== 4 ||
      candidates.some((candidate, index) =>
        candidate.rank !== index + 1 ||
        !Number.isInteger(candidate.number) ||
        candidate.number < 0 ||
        candidate.number > 9,
      )
    ) {
      throw new RangeError("A Top 4 history snapshot must contain four distinct candidates")
    }
    if (!/^\d+$/.test(targetPeriod)) throw new RangeError("A Top 4 target period must be numeric")

    const existing = this.history.find((entry) =>
      entry.targetPeriod === targetPeriod &&
      (entry.predictions.topFour?.length === 4 || entry.predictions.topThree?.length === 3),
    )
    if (existing) {
      if (existing.status !== "pending" || existing.predictions.topFour?.length === 4) return existing.id
      existing.predictions.topFour = candidates.map((candidate) => ({ ...candidate }))
      existing.predictions.topFourMarkets = markets
      this.saveHistory()
      return existing.id
    }

    const entry: PredictionHistoryEntry = {
      id: `pred_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
      targetPeriod,
      predictions: {
        topFour: candidates.map((candidate) => ({ ...candidate })),
        topFourMarkets: markets,
      },
      status: "pending",
    }
    this.history.unshift(entry)
    if (this.history.length > 50) this.history = this.history.slice(0, 50)
    this.saveHistory()
    return entry.id
  }

  updatePredictionResult(predictionId: string, actualResult: GameResult): void {
    const entry = this.history.find((h) => h.id === predictionId)
    if (!entry) return
    if (entry.targetPeriod && entry.targetPeriod !== actualResult.period) {
      throw new RangeError(`Actual period ${actualResult.period} does not match prediction target ${entry.targetPeriod}`)
    }

    entry.actualResult = {
      color: actualResult.color,
      ...(actualResult.colors ? { colors: [...actualResult.colors] } : {}),
      size: actualResult.size,
      number: actualResult.number,
      period: actualResult.period,
    }

    // Calculate results
    if (entry.predictions.topFour?.length === 4) {
      const numberTopFourWin = entry.predictions.topFour.some(
        (candidate) => candidate.number === actualResult.number,
      )
      const actualColors = actualResult.colors?.length ? actualResult.colors : [actualResult.color]
      const colorWin = entry.predictions.topFourMarkets?.color === undefined
        ? undefined
        : actualColors.some((color) => color === entry.predictions.topFourMarkets?.color)
      const actualSize = actualResult.size ?? sizeFromNumber(actualResult.number)
      const sizeWin = entry.predictions.topFourMarkets?.size === undefined
        ? undefined
        : entry.predictions.topFourMarkets.size === actualSize
      entry.results = {
        numberTopFour: numberTopFourWin,
        ...(colorWin === undefined ? {} : { color: colorWin }),
        ...(sizeWin === undefined ? {} : { size: sizeWin }),
      }
      const outcomes = [numberTopFourWin, colorWin, sizeWin].filter(
        (value): value is boolean => value !== undefined,
      )
      const wins = outcomes.filter((value) => value === true).length
      entry.status = wins === outcomes.length ? "win" : wins > 0 ? "partial" : "loss"
    } else if (entry.predictions.topThree?.length === 3) {
      const numberTopThreeWin = entry.predictions.topThree.some(
        (candidate) => candidate.number === actualResult.number,
      )
      entry.results = { numberTopThree: numberTopThreeWin }
      entry.status = numberTopThreeWin ? "win" : "loss"
    } else {
      const actualColors = actualResult.colors?.length ? actualResult.colors : [actualResult.color]
      const actualSize = actualResult.size ?? sizeFromNumber(actualResult.number)
      const colorWin = entry.predictions.color
        ? actualColors.some((color) => color === entry.predictions.color?.prediction)
        : undefined
      const sizeWin = entry.predictions.size
        ? entry.predictions.size.prediction === actualSize
        : undefined
      const numberWin = entry.predictions.number
        ? entry.predictions.number.prediction === actualResult.number
        : undefined
      entry.results = {
        ...(colorWin === undefined ? {} : { color: colorWin }),
        ...(sizeWin === undefined ? {} : { size: sizeWin }),
        ...(numberWin === undefined ? {} : { number: numberWin }),
      }

      const wins = [colorWin, sizeWin, numberWin].filter((value) => value === true).length
      const measured = [colorWin, sizeWin, numberWin].filter((value) => value !== undefined).length
      entry.status = wins === measured && wins > 0 ? "win" : wins > 0 ? "partial" : "loss"
    }

    this.saveHistory()
  }

  updatePredictionResultForTarget(actualResult: GameResult): void {
    const entry = this.history.find((item) => item.targetPeriod === actualResult.period && item.status === "pending")
    if (entry) this.updatePredictionResult(entry.id, actualResult)
  }

  getHistory(): PredictionHistoryEntry[] {
    return [...this.history]
  }

  getStats() {
    const total = this.history.filter((h) => h.status !== "pending").length
    const wins = this.history.filter((h) => h.status === "win").length
    const partialWins = this.history.filter((h) => h.status === "partial").length
    const losses = this.history.filter((h) => h.status === "loss").length

    const numberOutcomes = this.history
      .map((entry) => entry.results?.numberTopFour ?? entry.results?.numberTopThree ?? entry.results?.number)
      .filter((outcome): outcome is boolean => outcome !== undefined)
    const colorOutcomes = this.history
      .map((entry) => entry.results?.color)
      .filter((outcome): outcome is boolean => outcome !== undefined)
    const sizeOutcomes = this.history
      .map((entry) => entry.results?.size)
      .filter((outcome): outcome is boolean => outcome !== undefined)
    const marketStats = {
      number: summarizeMarket(numberOutcomes),
      color: summarizeMarket(colorOutcomes),
      size: summarizeMarket(sizeOutcomes),
    }
    const topThreeEntries = this.history.filter((entry) => entry.results?.numberTopThree !== undefined)
    const topThreeHits = topThreeEntries.filter((entry) => entry.results?.numberTopThree).length
    const topFourEntries = this.history.filter((entry) => entry.results?.numberTopFour !== undefined)
    const topFourHits = topFourEntries.filter((entry) => entry.results?.numberTopFour).length

    return {
      totalPredictions: this.history.length,
      resolvedPredictions: total,
      pendingPredictions: this.history.length - total,
      total,
      wins,
      partialWins,
      losses,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      partialWinRate: total > 0 ? Math.round((partialWins / total) * 100) : 0,
      markets: marketStats,
      accuracy: {
        color: marketStats.color.winRate ?? 0,
        size: marketStats.size.winRate ?? 0,
        number: marketStats.number.winRate ?? 0,
      },
      topThreePredictions: topThreeEntries.length,
      topThreeHits,
      topThreeAccuracy: topThreeEntries.length
        ? Math.round((topThreeHits / topThreeEntries.length) * 100)
        : null,
      topFourPredictions: topFourEntries.length,
      topFourHits,
      topFourAccuracy: topFourEntries.length
        ? Math.round((topFourHits / topFourEntries.length) * 100)
        : null,
    }
  }

  clearHistory(): void {
    this.history = []
    this.saveHistory()
  }
}

export const predictionHistory = PredictionHistoryManager.getInstance()

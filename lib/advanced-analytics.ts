import type { GameResult, PredictionData } from "./types"

export interface AdvancedStats {
  winRate: {
    color: number
    size: number
    number: number
    overall: number
  }
  streakAnalysis: {
    longestColorStreak: { type: string; length: number }
    longestSizeStreak: { type: string; length: number }
    currentStreaks: Array<{ type: string; category: string; length: number }>
  }
  volatilityIndex: {
    color: number
    size: number
    number: number
    overall: number
  }
  timeBasedPatterns: {
    hourlyDistribution: Record<number, { count: number; colors: Record<string, number> }>
    periodicPatterns: Array<{ pattern: string; strength: number; nextPrediction: string }>
  }
  profitabilityAnalysis: {
    theoreticalROI: number
    riskAdjustedReturn: number
    sharpeRatio: number
    maxDrawdown: number
  }
  marketSentiment: {
    momentum: "bullish" | "bearish" | "neutral"
    confidence: number
    trendStrength: number
  }
}

export interface BettingSimulation {
  strategy: string
  totalBets: number
  wins: number
  losses: number
  winRate: number
  totalProfit: number
  roi: number
  maxDrawdown: number
  sharpeRatio: number
}

export class AdvancedAnalyticsEngine {
  private static instance: AdvancedAnalyticsEngine
  private predictionHistory: Array<{
    prediction: PredictionData
    actual: GameResult
    timestamp: number
  }> = []

  static getInstance(): AdvancedAnalyticsEngine {
    if (!AdvancedAnalyticsEngine.instance) {
      AdvancedAnalyticsEngine.instance = new AdvancedAnalyticsEngine()
    }
    return AdvancedAnalyticsEngine.instance
  }

  recordPrediction(prediction: PredictionData, actual: GameResult): void {
    this.predictionHistory.push({
      prediction,
      actual,
      timestamp: Date.now(),
    })

    // Keep only last 100 predictions for performance
    if (this.predictionHistory.length > 100) {
      this.predictionHistory = this.predictionHistory.slice(-100)
    }
  }

  calculateAdvancedStats(results: GameResult[]): AdvancedStats {
    if (results.length === 0) {
      return this.getDefaultStats()
    }

    return {
      winRate: this.calculateWinRates(),
      streakAnalysis: this.analyzeStreaks(results),
      volatilityIndex: this.calculateVolatility(results),
      timeBasedPatterns: this.analyzeTimePatterns(results),
      profitabilityAnalysis: this.analyzeProfitability(results),
      marketSentiment: this.calculateMarketSentiment(results),
    }
  }

  private calculateWinRates() {
    if (this.predictionHistory.length === 0) {
      return { color: 0, size: 0, number: 0, overall: 0 }
    }

    const colorWins = this.predictionHistory.filter((p) => p.prediction.color.prediction === p.actual.color).length
    const sizePredictions = this.predictionHistory.filter((p) => p.actual.size !== null)
    const sizeWins = sizePredictions.filter((p) => p.prediction.size.prediction === p.actual.size).length
    const numberWins = this.predictionHistory.filter((p) => p.prediction.number.prediction === p.actual.number).length

    const total = this.predictionHistory.length
    const colorRate = (colorWins / total) * 100
    const sizeRate = sizePredictions.length ? (sizeWins / sizePredictions.length) * 100 : 0
    const numberRate = (numberWins / total) * 100
    const overallRate = ((colorWins + sizeWins + numberWins) / (total * 2 + sizePredictions.length)) * 100

    return {
      color: Math.round(colorRate),
      size: Math.round(sizeRate),
      number: Math.round(numberRate),
      overall: Math.round(overallRate),
    }
  }

  private analyzeStreaks(results: GameResult[]) {
    const colorStreaks = this.findStreaks(results, "color")
    const sizeStreaks = this.findStreaks(results, "size")

    const longestColorStreak = colorStreaks.reduce((max, streak) => (streak.length > max.length ? streak : max), {
      type: "none",
      length: 0,
    })

    const longestSizeStreak = sizeStreaks.reduce((max, streak) => (streak.length > max.length ? streak : max), {
      type: "none",
      length: 0,
    })

    // Current active streaks
    const currentStreaks: Array<{ type: string; category: string; length: number }> = []
    if (results.length > 0) {
      const currentColorStreak = this.getCurrentStreak(results, "color")
      const currentSizeStreak = this.getCurrentStreak(results, "size")

      if (currentColorStreak.length > 1) {
        currentStreaks.push({
          type: currentColorStreak.type,
          category: "color",
          length: currentColorStreak.length,
        })
      }

      if (currentSizeStreak.length > 1) {
        currentStreaks.push({
          type: currentSizeStreak.type,
          category: "size",
          length: currentSizeStreak.length,
        })
      }
    }

    return {
      longestColorStreak,
      longestSizeStreak,
      currentStreaks,
    }
  }

  private findStreaks(results: GameResult[], type: "color" | "size") {
    const streaks: Array<{ type: string; length: number }> = []
    let currentStreak = { type: "", length: 0 }

    for (const result of results) {
      const value = result[type]
      if (value === null) {
        if (currentStreak.length > 1) streaks.push({ ...currentStreak })
        currentStreak = { type: "", length: 0 }
        continue
      }

      if (currentStreak.type === value) {
        currentStreak.length++
      } else {
        if (currentStreak.length > 1) {
          streaks.push({ ...currentStreak })
        }
        currentStreak = { type: value, length: 1 }
      }
    }

    if (currentStreak.length > 1) {
      streaks.push(currentStreak)
    }

    return streaks
  }

  private getCurrentStreak(results: GameResult[], type: "color" | "size") {
    if (results.length === 0) return { type: "", length: 0 }

    const firstValue = results[0][type]
    if (firstValue === null) return { type: "", length: 0 }
    let length = 1

    for (let i = 1; i < results.length; i++) {
      if (results[i][type] === firstValue) {
        length++
      } else {
        break
      }
    }

    return { type: firstValue, length }
  }

  private calculateVolatility(results: GameResult[]) {
    const recent = results.slice(0, 20)
    if (recent.length < 5) {
      return { color: 50, size: 50, number: 50, overall: 50 }
    }

    // Calculate color volatility
    const colorChanges = recent.slice(1).filter((result, i) => result.color !== recent[i].color).length
    const colorVolatility = (colorChanges / (recent.length - 1)) * 100

    // Calculate size volatility
    const knownSizePairs = recent
      .slice(1)
      .map((result, index) => ({ current: result.size, previous: recent[index].size }))
      .filter((pair) => pair.current !== null && pair.previous !== null)
    const sizeChanges = knownSizePairs.filter((pair) => pair.current !== pair.previous).length
    const sizeVolatility = knownSizePairs.length ? (sizeChanges / knownSizePairs.length) * 100 : 0

    // Calculate number volatility (standard deviation)
    const numbers = recent.map((r) => r.number)
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length
    const numberVolatility = Math.sqrt(variance) * 10 // Scale for percentage

    const overallVolatility = (colorVolatility + sizeVolatility + numberVolatility) / (knownSizePairs.length ? 3 : 2)

    return {
      color: Math.round(colorVolatility),
      size: Math.round(sizeVolatility),
      number: Math.round(numberVolatility),
      overall: Math.round(overallVolatility),
    }
  }

  private analyzeTimePatterns(results: GameResult[]) {
    const hourlyDistribution: Record<number, { count: number; colors: Record<string, number> }> = {}

    // Initialize hourly distribution
    for (let hour = 0; hour < 24; hour++) {
      hourlyDistribution[hour] = {
        count: 0,
        colors: { red: 0, green: 0, violet: 0 },
      }
    }

    // Analyze results by hour
    results.forEach((result) => {
      if (result.timestamp === null) return
      const hour = new Date(result.timestamp).getHours()
      hourlyDistribution[hour].count++
      hourlyDistribution[hour].colors[result.color]++
    })

    // Find periodic patterns
    const periodicPatterns = this.findPeriodicPatterns(results)

    return {
      hourlyDistribution,
      periodicPatterns,
    }
  }

  private findPeriodicPatterns(results: GameResult[]) {
    const patterns: Array<{ pattern: string; strength: number; nextPrediction: string }> = []

    // Analyze 3-result patterns
    for (let i = 0; i < results.length - 3; i++) {
      const pattern = `${results[i + 2].color}-${results[i + 1].color}-${results[i].color}`
      const nextResult = results[i - 1]?.color

      if (nextResult) {
        const existingPattern = patterns.find((p) => p.pattern === pattern)
        if (existingPattern) {
          existingPattern.strength++
          if (existingPattern.nextPrediction !== nextResult) {
            existingPattern.nextPrediction = "mixed"
          }
        } else {
          patterns.push({
            pattern,
            strength: 1,
            nextPrediction: nextResult,
          })
        }
      }
    }

    return patterns
      .filter((p) => p.strength > 1 && p.nextPrediction !== "mixed")
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5)
  }

  private analyzeProfitability(results: GameResult[]) {
    // Simulate different betting strategies
    const strategies = [
      { name: "color_only", odds: 3, accuracy: this.calculateWinRates().color / 100 },
      { name: "size_only", odds: 2, accuracy: this.calculateWinRates().size / 100 },
      { name: "number_only", odds: 10, accuracy: this.calculateWinRates().number / 100 },
    ]

    let bestROI = -100
    let bestSharpe = -10
    let maxDrawdown = 0

    strategies.forEach((strategy) => {
      const roi = (strategy.odds * strategy.accuracy - 1) * 100
      const sharpe = roi / Math.max(10, Math.sqrt(strategy.odds * 100)) // Risk-adjusted return
      bestROI = Math.max(bestROI, roi)
      bestSharpe = Math.max(bestSharpe, sharpe)
    })

    // Calculate theoretical max drawdown
    const volatility = this.calculateVolatility(results).overall
    maxDrawdown = Math.min(50, volatility * 0.5)

    return {
      theoreticalROI: Math.round(bestROI),
      riskAdjustedReturn: Math.round(bestSharpe),
      sharpeRatio: Math.round(bestSharpe * 10) / 10,
      maxDrawdown: Math.round(maxDrawdown),
    }
  }

  private calculateMarketSentiment(results: GameResult[]) {
    const recent = results.slice(0, 10)
    if (recent.length < 5) {
      return { momentum: "neutral" as const, confidence: 50, trendStrength: 0 }
    }

    // Analyze momentum based on color patterns
    const greenCount = recent.filter((r) => r.color === "green").length
    const redCount = recent.filter((r) => r.color === "red").length
    const violetCount = recent.filter((r) => r.color === "violet").length

    let momentum: "bullish" | "bearish" | "neutral" = "neutral"
    let confidence = 50
    let trendStrength = 0

    if (greenCount > redCount + violetCount) {
      momentum = "bullish"
      confidence = Math.min(95, 50 + (greenCount / recent.length) * 50)
      trendStrength = (greenCount / recent.length) * 100
    } else if (redCount > greenCount + violetCount) {
      momentum = "bearish"
      confidence = Math.min(95, 50 + (redCount / recent.length) * 50)
      trendStrength = (redCount / recent.length) * 100
    } else {
      const dominantColor = Math.max(greenCount, redCount, violetCount)
      trendStrength = (dominantColor / recent.length) * 100
    }

    return {
      momentum,
      confidence: Math.round(confidence),
      trendStrength: Math.round(trendStrength),
    }
  }

  simulateBettingStrategies(results: GameResult[]): BettingSimulation[] {
    const strategies = [
      {
        name: "Conservative Color",
        betOn: "color",
        minConfidence: 70,
        stake: 10,
        odds: 3,
      },
      {
        name: "Aggressive Size",
        betOn: "size",
        minConfidence: 60,
        stake: 20,
        odds: 2,
      },
      {
        name: "High Risk Number",
        betOn: "number",
        minConfidence: 50,
        stake: 5,
        odds: 10,
      },
      {
        name: "Balanced Mixed",
        betOn: "mixed",
        minConfidence: 65,
        stake: 15,
        odds: 4,
      },
    ]

    return strategies.map((strategy) => {
      let totalBets = 0
      let wins = 0
      let totalProfit = 0
      let maxDrawdown = 0
      let currentDrawdown = 0
      let peak = 0

      this.predictionHistory.forEach(({ prediction, actual }) => {
        if (strategy.betOn === "size" && actual.size === null) return

        let shouldBet = false
        let isWin = false

        switch (strategy.betOn) {
          case "color":
            shouldBet = prediction.color.confidence >= strategy.minConfidence
            isWin = prediction.color.prediction === actual.color
            break
          case "size":
            shouldBet = prediction.size.confidence >= strategy.minConfidence
            isWin = prediction.size.prediction === actual.size
            break
          case "number":
            shouldBet = prediction.number.confidence >= strategy.minConfidence
            isWin = prediction.number.prediction === actual.number
            break
          case "mixed":
            const sizeAvailable = actual.size !== null
            const avgConfidence =
              (prediction.color.confidence + prediction.number.confidence + (sizeAvailable ? prediction.size.confidence : 0)) /
              (sizeAvailable ? 3 : 2)
            shouldBet = avgConfidence >= strategy.minConfidence
            isWin =
              prediction.color.prediction === actual.color ||
              (sizeAvailable && prediction.size.prediction === actual.size) ||
              prediction.number.prediction === actual.number
            break
        }

        if (shouldBet) {
          totalBets++
          if (isWin) {
            wins++
            const profit = strategy.stake * (strategy.odds - 1)
            totalProfit += profit
            currentDrawdown = 0
          } else {
            totalProfit -= strategy.stake
            currentDrawdown += strategy.stake
          }

          if (totalProfit > peak) {
            peak = totalProfit
            currentDrawdown = 0
          }

          maxDrawdown = Math.max(maxDrawdown, currentDrawdown)
        }
      })

      const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0
      const roi = totalBets > 0 ? (totalProfit / (totalBets * strategy.stake)) * 100 : 0
      const sharpeRatio = roi / Math.max(1, Math.sqrt(maxDrawdown || 1))

      return {
        strategy: strategy.name,
        totalBets,
        wins,
        losses: totalBets - wins,
        winRate: Math.round(winRate),
        totalProfit: Math.round(totalProfit),
        roi: Math.round(roi),
        maxDrawdown: Math.round(maxDrawdown),
        sharpeRatio: Math.round(sharpeRatio * 10) / 10,
      }
    })
  }

  private getDefaultStats(): AdvancedStats {
    return {
      winRate: { color: 0, size: 0, number: 0, overall: 0 },
      streakAnalysis: {
        longestColorStreak: { type: "none", length: 0 },
        longestSizeStreak: { type: "none", length: 0 },
        currentStreaks: [],
      },
      volatilityIndex: { color: 50, size: 50, number: 50, overall: 50 },
      timeBasedPatterns: {
        hourlyDistribution: {},
        periodicPatterns: [],
      },
      profitabilityAnalysis: {
        theoreticalROI: 0,
        riskAdjustedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      },
      marketSentiment: {
        momentum: "neutral",
        confidence: 50,
        trendStrength: 0,
      },
    }
  }
}

export const advancedAnalytics = AdvancedAnalyticsEngine.getInstance()

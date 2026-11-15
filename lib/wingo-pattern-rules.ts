/**
 * Wingo-Specific Pattern Recognition Rules
 * 2 Main Strategies:
 * 1. Repeat Pattern Rule (Trend Following)
 * 2. Pattern Break Rule (Opposite Bet)
 */

import { ColorType, SizeType } from './color-size-prediction-engines'

export interface PatternAnalysis {
  currentSequence: (SizeType | ColorType)[]
  patternType: 'repeat' | 'alternate' | 'random' | 'mixed'
  repeatCount: number
  shouldBreak: boolean
  prediction: SizeType | ColorType
  confidence: number
  rule: 'repeat_pattern' | 'pattern_break'
  explanation: string
}

// ============================================
// RULE 1: REPEAT PATTERN RULE (TREND FOLLOWING)
// ============================================
export class RepeatPatternRule {
  /**
   * Detects if a value is repeating consecutively
   * and predicts continuation
   */
  analyzeRepeatPattern(sequence: (SizeType | ColorType)[]): PatternAnalysis {
    if (sequence.length === 0) {
      return this.defaultAnalysis('repeat_pattern')
    }

    const lastValue = sequence[sequence.length - 1]
    let repeatCount = 1

    // Count consecutive repeats from the end
    for (let i = sequence.length - 2; i >= 0; i--) {
      if (sequence[i] === lastValue) {
        repeatCount++
      } else {
        break
      }
    }

    // Confidence increases with repeat count (up to 95%)
    const confidence = Math.min(50 + repeatCount * 10, 95)

    return {
      currentSequence: sequence.slice(-5), // Last 5 elements
      patternType: 'repeat',
      repeatCount,
      shouldBreak: false,
      prediction: lastValue,
      confidence,
      rule: 'repeat_pattern',
      explanation: `Pattern "${lastValue}" repeated ${repeatCount} time(s). Following trend, predicting: ${lastValue}`,
    }
  }

  /**
   * Predict Size based on repeat pattern
   */
  predictSize(sizes: SizeType[]): PatternAnalysis {
    return this.analyzeRepeatPattern(sizes)
  }

  /**
   * Predict Color based on repeat pattern
   */
  predictColor(colors: ColorType[]): PatternAnalysis {
    return this.analyzeRepeatPattern(colors)
  }

  /**
   * Detect and continue alternate patterns (Red -> Green -> Red -> Green)
   */
  analyzeAlternatePattern(
    sequence: (SizeType | ColorType)[]
  ): PatternAnalysis | null {
    if (sequence.length < 3) return null

    const last3 = sequence.slice(-3)
    
    // Check if last 3 follow alternating pattern
    if (last3.length === 3) {
      // Pattern: A -> B -> A (alternating)
      if (last3[0] === last3[2] && last3[0] !== last3[1]) {
        const nextValue = last3[1] // B
        const confidence = Math.min(80, 95)

        return {
          currentSequence: sequence.slice(-5),
          patternType: 'alternate',
          repeatCount: 2,
          shouldBreak: false,
          prediction: nextValue,
          confidence,
          rule: 'repeat_pattern',
          explanation: `Alternating pattern detected: ${last3[0]} -> ${last3[1]} -> ${last3[0]}. Next: ${nextValue}`,
        }
      }
    }

    return null
  }

  private defaultAnalysis(rule: 'repeat_pattern' | 'pattern_break'): PatternAnalysis {
    return {
      currentSequence: [],
      patternType: 'random',
      repeatCount: 0,
      shouldBreak: false,
      prediction: 'Big',
      confidence: 50,
      rule,
      explanation: 'Insufficient data for pattern analysis',
    }
  }
}

// ============================================
// RULE 2: PATTERN BREAK RULE (OPPOSITE BET)
// ============================================
export class PatternBreakRule {
  private readonly BREAK_THRESHOLD = 5 // After 5-6 repeats, predict break

  /**
   * Detects when pattern has repeated too many times
   * and predicts it will break (opposite value)
   */
  analyzePatternBreak(sequence: (SizeType | ColorType)[]): PatternAnalysis {
    if (sequence.length < this.BREAK_THRESHOLD) {
      return this.defaultAnalysis()
    }

    const lastValue = sequence[sequence.length - 1]
    let repeatCount = 1

    // Count consecutive repeats from the end
    for (let i = sequence.length - 2; i >= 0; i--) {
      if (sequence[i] === lastValue) {
        repeatCount++
      } else {
        break
      }
    }

    // Check if we should predict a break
    if (repeatCount >= this.BREAK_THRESHOLD) {
      const breakPrediction = this.getOppositeValue(lastValue)
      const confidence = Math.min(60 + (repeatCount - this.BREAK_THRESHOLD) * 8, 90)

      return {
        currentSequence: sequence.slice(-10),
        patternType: 'repeat',
        repeatCount,
        shouldBreak: true,
        prediction: breakPrediction,
        confidence,
        rule: 'pattern_break',
        explanation: `Pattern "${lastValue}" repeated ${repeatCount} times (≥${this.BREAK_THRESHOLD}). Predicting break to: ${breakPrediction}`,
      }
    }

    // Not enough repeats for break rule
    return this.defaultAnalysis()
  }

  /**
   * Get opposite value for Size
   */
  private getOppositeValue(value: SizeType | ColorType): SizeType | ColorType {
    if (value === 'Big') return 'Small'
    if (value === 'Small') return 'Big'
    if (value === 'Red') return 'Green'
    if (value === 'Green') return 'Red'
    if (value === 'Violet') return 'Red' // Default fallback
    return 'Big'
  }

  /**
   * Predict Size with pattern break logic
   */
  predictSize(sizes: SizeType[]): PatternAnalysis {
    return this.analyzePatternBreak(sizes)
  }

  /**
   * Predict Color with pattern break logic
   */
  predictColor(colors: ColorType[]): PatternAnalysis {
    return this.analyzePatternBreak(colors)
  }

  /**
   * Check if current streak warrants a break
   */
  shouldPredictBreak(sequence: (SizeType | ColorType)[]): boolean {
    if (sequence.length < this.BREAK_THRESHOLD) return false

    const lastValue = sequence[sequence.length - 1]
    let repeatCount = 1

    for (let i = sequence.length - 2; i >= 0; i--) {
      if (sequence[i] === lastValue) {
        repeatCount++
      } else {
        break
      }
    }

    return repeatCount >= this.BREAK_THRESHOLD
  }

  /**
   * Get break threshold
   */
  getBreakThreshold(): number {
    return this.BREAK_THRESHOLD
  }

  private defaultAnalysis(): PatternAnalysis {
    return {
      currentSequence: [],
      patternType: 'random',
      repeatCount: 0,
      shouldBreak: false,
      prediction: 'Big',
      confidence: 50,
      rule: 'pattern_break',
      explanation: 'Not enough repeats to trigger pattern break rule',
    }
  }
}

// ============================================
// COMBINED WINGO PATTERN SYSTEM
// ============================================
export class WingoPatternSystem {
  private repeatRule: RepeatPatternRule
  private breakRule: PatternBreakRule

  constructor() {
    this.repeatRule = new RepeatPatternRule()
    this.breakRule = new PatternBreakRule()
  }

  /**
   * Analyze and predict using both rules
   * Returns the best prediction based on conditions
   */
  analyzeFull(
    sequence: (SizeType | ColorType)[],
    useBreakRule: boolean = true,
    useRepeatRule: boolean = true
  ): {
    primary: PatternAnalysis
    secondary: PatternAnalysis | null
    recommendation: SizeType | ColorType
    combinedConfidence: number
  } {
    let primary: PatternAnalysis
    let secondary: PatternAnalysis | null = null

    // Check pattern break rule first (more specific)
    if (useBreakRule && this.breakRule.shouldPredictBreak(sequence)) {
      primary = this.breakRule.analyzePatternBreak(sequence)
      if (useRepeatRule) {
        secondary = this.repeatRule.analyzeRepeatPattern(sequence)
      }
    } else if (useRepeatRule) {
      // Default to repeat pattern rule
      primary = this.repeatRule.analyzeRepeatPattern(sequence)
      secondary = null
    } else {
      return {
        primary: this.getDefaultAnalysis(),
        secondary: null,
        recommendation: 'Big',
        combinedConfidence: 50,
      }
    }

    const combinedConfidence =
      secondary !== null
        ? (primary.confidence + secondary.confidence) / 2
        : primary.confidence

    return {
      primary,
      secondary,
      recommendation: primary.prediction,
      combinedConfidence,
    }
  }

  /**
   * Predict Size using Wingo rules
   */
  predictSize(
    sizes: SizeType[],
    useBreakRule: boolean = true,
    useRepeatRule: boolean = true
  ) {
    return this.analyzeFull(sizes, useBreakRule, useRepeatRule)
  }

  /**
   * Predict Color using Wingo rules
   */
  predictColor(
    colors: ColorType[],
    useBreakRule: boolean = true,
    useRepeatRule: boolean = true
  ) {
    return this.analyzeFull(colors, useBreakRule, useRepeatRule)
  }

  /**
   * Get statistics about the sequence
   */
  getSequenceStats(sequence: (SizeType | ColorType)[]) {
    if (sequence.length === 0) {
      return {
        length: 0,
        lastValue: null,
        currentStreak: 0,
        mostCommon: null,
        entropy: 0,
      }
    }

    const lastValue = sequence[sequence.length - 1]
    let currentStreak = 1

    for (let i = sequence.length - 2; i >= 0; i--) {
      if (sequence[i] === lastValue) {
        currentStreak++
      } else {
        break
      }
    }

    // Calculate frequency
    const frequency: Record<string, number> = {}
    sequence.forEach(val => {
      frequency[val as string] = (frequency[val as string] || 0) + 1
    })

    const mostCommon = Object.entries(frequency).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0]

    // Calculate entropy (diversity measure)
    let entropy = 0
    Object.values(frequency).forEach(count => {
      const p = count / sequence.length
      if (p > 0) {
        entropy -= p * Math.log2(p)
      }
    })

    return {
      length: sequence.length,
      lastValue,
      currentStreak,
      mostCommon,
      entropy: Math.round(entropy * 100) / 100,
    }
  }

  private getDefaultAnalysis(): PatternAnalysis {
    return {
      currentSequence: [],
      patternType: 'random',
      repeatCount: 0,
      shouldBreak: false,
      prediction: 'Big',
      confidence: 50,
      rule: 'repeat_pattern',
      explanation: 'Insufficient data',
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Quick prediction using Wingo rules
 */
export function quickWingoPrediction(
  sequence: (SizeType | ColorType)[],
  ruleType: 'repeat' | 'break' | 'both' = 'both'
): {
  prediction: SizeType | ColorType
  confidence: number
  rule: string
} {
  const system = new WingoPatternSystem()

  const useBreak = ruleType === 'break' || ruleType === 'both'
  const useRepeat = ruleType === 'repeat' || ruleType === 'both'

  const analysis = system.analyzeFull(sequence, useBreak, useRepeat)

  return {
    prediction: analysis.recommendation,
    confidence: analysis.combinedConfidence,
    rule: analysis.primary.rule,
  }
}

/**
 * Get detailed analysis with all metrics
 */
export function getDetailedWingoAnalysis(
  sequence: (SizeType | ColorType)[]
): {
  repeatAnalysis: PatternAnalysis
  breakAnalysis: PatternAnalysis
  stats: ReturnType<WingoPatternSystem['getSequenceStats']>
  recommendation: SizeType | ColorType
  reason: string
} {
  const system = new WingoPatternSystem()
  const repeatRule = new RepeatPatternRule()
  const breakRule = new PatternBreakRule()

  const repeatAnalysis = repeatRule.analyzeRepeatPattern(sequence)
  const breakAnalysis = breakRule.analyzePatternBreak(sequence)
  const stats = system.getSequenceStats(sequence)

  // Determine best recommendation
  let recommendation: SizeType | ColorType
  let reason: string

  if (breakRule.shouldPredictBreak(sequence)) {
    recommendation = breakAnalysis.prediction
    reason = `Pattern break after ${stats.currentStreak} consecutive ${stats.lastValue}s`
  } else {
    recommendation = repeatAnalysis.prediction
    reason = `Continuing trend of ${stats.lastValue}`
  }

  return {
    repeatAnalysis,
    breakAnalysis,
    stats,
    recommendation,
    reason,
  }
}

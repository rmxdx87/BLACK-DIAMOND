/**
 * Wingo Game Pattern Detection System
 * Detects all server-based patterns: Teleport, Alternate, Mirror, Sandwich, Staircase, etc.
 * These patterns are identified by API data analysis for real-time predictions
 */

import { ColorType, SizeType } from './color-size-prediction-engines'

// Type definitions
export type GameValue = SizeType | ColorType | number
export type PatternType = 
  | 'teleport_ladi'
  | 'alternate_zigzag'
  | 'mirror_double'
  | 'sandwich'
  | 'staircase'
  | 'triple_break'
  | 'quad_run'
  | 'increment'
  | 'decrement'
  | 'cycle'
  | 'unknown'

export interface PatternDetection {
  detected: boolean
  patternType: PatternType
  confidence: number // 0-100
  prediction: GameValue | null
  reasoning: string
  sequenceMatch: GameValue[]
  nextPrediction: string
}

export interface GamePatternAnalysis {
  currentSequence: GameValue[]
  detectedPatterns: PatternDetection[]
  bestMatch: PatternDetection
  ensemblePrediction: GameValue | null
  ensembleConfidence: number
}

// ============================================
// PATTERN 1: TELEPORT/LADI (Continuous Streak)
// ============================================
export class TeleportLadiPattern {
  /**
   * Pattern: [A, A, A, A, A...] - Same value repeats 4+ times
   * Prediction: Continue with same value
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 4) {
      return { detected: false, patternType: 'teleport_ladi', confidence: 0, prediction: null, reasoning: 'Insufficient data', sequenceMatch: [], nextPrediction: '' }
    }

    const lastValue = sequence[sequence.length - 1]
    let repeatCount = 1

    // Count consecutive repeats from end
    for (let i = sequence.length - 2; i >= 0 && sequence[i] === lastValue; i--) {
      repeatCount++
    }

    const isDetected = repeatCount >= 4
    const confidence = isDetected ? Math.min(50 + repeatCount * 8, 95) : 0

    return {
      detected: isDetected,
      patternType: 'teleport_ladi',
      confidence,
      prediction: isDetected ? lastValue : null,
      reasoning: `Continuous streak: "${lastValue}" appeared ${repeatCount} times consecutively`,
      sequenceMatch: sequence.slice(-repeatCount),
      nextPrediction: isDetected ? String(lastValue) : 'N/A',
    }
  }
}

// ============================================
// PATTERN 2: ALTERNATE (Zig-Zag / Jumper)
// ============================================
export class AlternateZigZagPattern {
  /**
   * Pattern: [A, B, A, B, A, B...] - Values alternate between two
   * Prediction: Next should be the other value
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 4) {
      return { detected: false, patternType: 'alternate_zigzag', confidence: 0, prediction: null, reasoning: 'Insufficient data', sequenceMatch: [], nextPrediction: '' }
    }

    const last4 = sequence.slice(-4)
    
    // Check alternating pattern: A-B-A-B
    const isAlternating = 
      last4.length >= 4 &&
      last4[0] === last4[2] &&
      last4[1] === last4[3] &&
      last4[0] !== last4[1]

    if (isAlternating) {
      const prediction = last4[1] // Since last was A, next should be B
      return {
        detected: true,
        patternType: 'alternate_zigzag',
        confidence: 85,
        prediction,
        reasoning: `Alternating pattern detected: ${last4[0]}-${last4[1]}-${last4[0]}-${last4[1]}`,
        sequenceMatch: last4,
        nextPrediction: String(prediction),
      }
    }

    // Check if last 3 follow alternating pattern (less confident)
    const last3 = sequence.slice(-3)
    if (last3.length >= 3 && last3[0] === last3[2] && last3[0] !== last3[1]) {
      const prediction = last3[1]
      return {
        detected: true,
        patternType: 'alternate_zigzag',
        confidence: 70,
        prediction,
        reasoning: `Partial alternating pattern: ${last3[0]}-${last3[1]}-${last3[0]}`,
        sequenceMatch: last3,
        nextPrediction: String(prediction),
      }
    }

    return { detected: false, patternType: 'alternate_zigzag', confidence: 0, prediction: null, reasoning: 'No alternating pattern', sequenceMatch: [], nextPrediction: '' }
  }
}

// ============================================
// PATTERN 3: MIRROR (Double Alternate / 2-2 Pattern)
// ============================================
export class MirrorDoublePattern {
  /**
   * Pattern: [A, A, B, B, A, A...] - Pairs of same values alternate
   * Prediction: If A-A-B seen, next should be B (to complete B-B pair)
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 4) {
      return { detected: false, patternType: 'mirror_double', confidence: 0, prediction: null, reasoning: 'Insufficient data', sequenceMatch: [], nextPrediction: '' }
    }

    const last4 = sequence.slice(-4)

    // Check if pattern is: A-A-B-B
    if (last4.length === 4 && 
        last4[0] === last4[1] && 
        last4[2] === last4[3] && 
        last4[0] !== last4[2]) {
      
      // Next should continue with either more B (if streak just started) or A (if completing cycle)
      const prediction = last4[2] // B - complete the B-B pair if only 1 B seen
      return {
        detected: true,
        patternType: 'mirror_double',
        confidence: 80,
        prediction,
        reasoning: `Mirror pattern (2-2): ${last4[0]}-${last4[0]}-${last4[2]}-${last4[2]}. Completing pair with ${prediction}`,
        sequenceMatch: last4,
        nextPrediction: String(prediction),
      }
    }

    // Check pattern A-A-B (incomplete pair)
    const last3 = sequence.slice(-3)
    if (last3.length === 3 && last3[0] === last3[1] && last3[0] !== last3[2]) {
      const prediction = last3[2] // B - complete B-B pair
      return {
        detected: true,
        patternType: 'mirror_double',
        confidence: 75,
        prediction,
        reasoning: `Mirror pattern starting: ${last3[0]}-${last3[0]}-${last3[2]}. Next: ${prediction} to complete pair`,
        sequenceMatch: last3,
        nextPrediction: String(prediction),
      }
    }

    return { detected: false, patternType: 'mirror_double', confidence: 0, prediction: null, reasoning: 'No mirror pattern', sequenceMatch: [], nextPrediction: '' }
  }
}

// ============================================
// PATTERN 4: SANDWICH (1-2-1 Pattern)
// ============================================
export class SandwichPattern {
  /**
   * Pattern: [A, B, B, A] or [B, A, A, B] - Value surrounded by another
   * Prediction: Complete the sandwich or start new pattern
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 4) {
      return { detected: false, patternType: 'sandwich', confidence: 0, prediction: null, reasoning: 'Insufficient data', sequenceMatch: [], nextPrediction: '' }
    }

    const last4 = sequence.slice(-4)

    // Check pattern: A-B-B-A
    if (last4.length === 4 && 
        last4[0] === last4[3] && 
        last4[1] === last4[2] && 
        last4[0] !== last4[1]) {
      
      return {
        detected: true,
        patternType: 'sandwich',
        confidence: 78,
        prediction: last4[0], // Could restart with A
        reasoning: `Sandwich pattern complete: ${last4[0]}-${last4[1]}-${last4[1]}-${last4[0]}. Likely restart.`,
        sequenceMatch: last4,
        nextPrediction: String(last4[0]),
      }
    }

    // Check incomplete sandwich: A-B-B
    const last3 = sequence.slice(-3)
    if (last3.length === 3 && last3[1] === last3[2] && last3[0] !== last3[1]) {
      const prediction = last3[0] // Complete the sandwich with A
      return {
        detected: true,
        patternType: 'sandwich',
        confidence: 72,
        prediction,
        reasoning: `Sandwich pattern incomplete: ${last3[0]}-${last3[1]}-${last3[1]}-?. Completing with ${prediction}`,
        sequenceMatch: last3,
        nextPrediction: String(prediction),
      }
    }

    return { detected: false, patternType: 'sandwich', confidence: 0, prediction: null, reasoning: 'No sandwich pattern', sequenceMatch: [], nextPrediction: '' }
  }
}

// ============================================
// PATTERN 5: STAIRCASE (3-2-1 Pattern)
// ============================================
export class StaircasePattern {
  /**
   * Pattern: [A, A, A, B, B, C] or reverse - Decreasing frequency
   * Prediction: Next value in sequence
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 6) {
      return { detected: false, patternType: 'staircase', confidence: 0, prediction: null, reasoning: 'Insufficient data', sequenceMatch: [], nextPrediction: '' }
    }

    const last6 = sequence.slice(-6)

    // Check descending staircase: A-A-A-B-B-C
    if (last6.length === 6 && 
        last6[0] === last6[1] && 
        last6[1] === last6[2] &&
        last6[3] === last6[4] &&
        last6[0] !== last6[3] &&
        last6[3] !== last6[5]) {
      
      return {
        detected: true,
        patternType: 'staircase',
        confidence: 70,
        prediction: last6[5], // Likely continue with next in pattern
        reasoning: `Staircase pattern: ${last6[0]}×3, ${last6[3]}×2, ${last6[5]}×1`,
        sequenceMatch: last6,
        nextPrediction: `Next in sequence (${last6[5]})`,
      }
    }

    return { detected: false, patternType: 'staircase', confidence: 0, prediction: null, reasoning: 'No staircase pattern', sequenceMatch: [], nextPrediction: '' }
  }
}

// ============================================
// PATTERN 6: TRIPLE BREAK (3+ different values in quick succession)
// ============================================
export class TripleBreakPattern {
  /**
   * Pattern: [A, B, C, D...] - 3+ different consecutive values
   * Prediction: Complex - might return to previous or continue random
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 3) {
      return { detected: false, patternType: 'triple_break', confidence: 0, prediction: null, reasoning: 'Insufficient data', sequenceMatch: [], nextPrediction: '' }
    }

    const last3 = sequence.slice(-3)

    // Check if all 3 are different
    if (last3[0] !== last3[1] && last3[1] !== last3[2] && last3[0] !== last3[2]) {
      return {
        detected: true,
        patternType: 'triple_break',
        confidence: 55,
        prediction: null, // Unpredictable
        reasoning: `Triple break detected: ${last3[0]}-${last3[1]}-${last3[2]}. Pattern disrupted, returning to recent value likely.`,
        sequenceMatch: last3,
        nextPrediction: 'Unpredictable - Pattern disrupted',
      }
    }

    return { detected: false, patternType: 'triple_break', confidence: 0, prediction: null, reasoning: 'No triple break', sequenceMatch: [], nextPrediction: '' }
  }
}

// ============================================
// PATTERN 7: QUAD RUN (4+ consecutive repeats)
// ============================================
export class QuadRunPattern {
  /**
   * Pattern: [A, A, A, A+] - 4 or more consecutive same values
   * Prediction: Might break after quad
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 4) {
      return { detected: false, patternType: 'quad_run', confidence: 0, prediction: null, reasoning: 'Insufficient data', sequenceMatch: [], nextPrediction: '' }
    }

    const lastValue = sequence[sequence.length - 1]
    let repeatCount = 1

    for (let i = sequence.length - 2; i >= 0 && sequence[i] === lastValue; i--) {
      repeatCount++
    }

    if (repeatCount >= 4) {
      // After 4+ repeats, pattern might break
      const oppositeValue = this.getOpposite(lastValue)
      return {
        detected: true,
        patternType: 'quad_run',
        confidence: 65,
        prediction: oppositeValue,
        reasoning: `Quad run detected: "${lastValue}" appeared ${repeatCount} times. Pattern might break to ${oppositeValue}`,
        sequenceMatch: sequence.slice(-repeatCount),
        nextPrediction: `Break to ${oppositeValue}`,
      }
    }

    return { detected: false, patternType: 'quad_run', confidence: 0, prediction: null, reasoning: 'No quad run', sequenceMatch: [], nextPrediction: '' }
  }

  private getOpposite(value: GameValue): GameValue {
    if (value === 'Big' || value === 'Small') {
      return value === 'Big' ? 'Small' : 'Big'
    }
    if (value === 'Red' || value === 'Green' || value === 'Violet') {
      const colors: ColorType[] = ['Red', 'Green', 'Violet']
      const idx = colors.indexOf(value as ColorType)
      return colors[(idx + 1) % colors.length]
    }
    return value
  }
}

// ============================================
// PATTERN 8: INCREMENT (Increasing sequence in numbers)
// ============================================
export class IncrementPattern {
  /**
   * Pattern: [1, 2, 3, 4...] or in values - sequential increase
   * Prediction: Next value in sequence
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 3 || typeof sequence[0] !== 'number') {
      return { detected: false, patternType: 'increment', confidence: 0, prediction: null, reasoning: 'Not numeric data', sequenceMatch: [], nextPrediction: '' }
    }

    const last3 = sequence.slice(-3) as number[]

    const diff1 = last3[1] - last3[0]
    const diff2 = last3[2] - last3[1]

    if (diff1 > 0 && diff1 === diff2) {
      const nextValue = last3[2] + diff1
      return {
        detected: true,
        patternType: 'increment',
        confidence: 75,
        prediction: nextValue,
        reasoning: `Increment pattern: +${diff1} each step`,
        sequenceMatch: last3,
        nextPrediction: String(nextValue),
      }
    }

    return { detected: false, patternType: 'increment', confidence: 0, prediction: null, reasoning: 'No increment pattern', sequenceMatch: [], nextPrediction: '' }
  }
}

// ============================================
// PATTERN 9: DECREMENT (Decreasing sequence)
// ============================================
export class DecrementPattern {
  /**
   * Pattern: [4, 3, 2, 1...] or in values - sequential decrease
   * Prediction: Next value in sequence
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 3 || typeof sequence[0] !== 'number') {
      return { detected: false, patternType: 'decrement', confidence: 0, prediction: null, reasoning: 'Not numeric data', sequenceMatch: [], nextPrediction: '' }
    }

    const last3 = sequence.slice(-3) as number[]

    const diff1 = last3[0] - last3[1]
    const diff2 = last3[1] - last3[2]

    if (diff1 > 0 && diff1 === diff2) {
      const nextValue = last3[2] - diff1
      return {
        detected: true,
        patternType: 'decrement',
        confidence: 75,
        prediction: nextValue,
        reasoning: `Decrement pattern: -${diff1} each step`,
        sequenceMatch: last3,
        nextPrediction: String(nextValue),
      }
    }

    return { detected: false, patternType: 'decrement', confidence: 0, prediction: null, reasoning: 'No decrement pattern', sequenceMatch: [], nextPrediction: '' }
  }
}

// ============================================
// PATTERN 10: CYCLE (Returns to previous state)
// ============================================
export class CyclePattern {
  /**
   * Pattern: [A, B, C, A, B, C...] - Repeating cycle of 3 values
   * Prediction: Next in cycle
   */
  detect(sequence: GameValue[]): PatternDetection {
    if (sequence.length < 6) {
      return { detected: false, patternType: 'cycle', confidence: 0, prediction: null, reasoning: 'Insufficient data', sequenceMatch: [], nextPrediction: '' }
    }

    const last6 = sequence.slice(-6)

    // Check if pattern repeats every 3: A-B-C-A-B-C
    if (last6.length === 6 &&
        last6[0] === last6[3] &&
        last6[1] === last6[4] &&
        last6[2] === last6[5]) {
      
      const nextValue = last6[0] // Restart cycle
      return {
        detected: true,
        patternType: 'cycle',
        confidence: 80,
        prediction: nextValue,
        reasoning: `Cycle pattern: ${last6[0]}-${last6[1]}-${last6[2]}-${last6[3]}-${last6[4]}-${last6[5]} (repeats every 3)`,
        sequenceMatch: last6,
        nextPrediction: String(nextValue),
      }
    }

    return { detected: false, patternType: 'cycle', confidence: 0, prediction: null, reasoning: 'No cycle pattern', sequenceMatch: [], nextPrediction: '' }
  }
}

// ============================================
// MAIN PATTERN DETECTION SYSTEM
// ============================================
export class WingoGamePatternDetector {
  private patterns: Array<{ detect: (seq: GameValue[]) => PatternDetection }> = [
    new TeleportLadiPattern(),
    new AlternateZigZagPattern(),
    new MirrorDoublePattern(),
    new SandwichPattern(),
    new StaircasePattern(),
    new TripleBreakPattern(),
    new QuadRunPattern(),
    new IncrementPattern(),
    new DecrementPattern(),
    new CyclePattern(),
  ]

  /**
   * Detect all patterns in a sequence
   */
  analyzeSequence(sequence: GameValue[]): GamePatternAnalysis {
    const detectedPatterns = this.patterns
      .map(p => p.detect(sequence))
      .sort((a, b) => b.confidence - a.confidence)

    const bestMatch = detectedPatterns[0] || { detected: false, patternType: 'unknown', confidence: 0, prediction: null, reasoning: 'No patterns detected', sequenceMatch: [], nextPrediction: '' }

    // Ensemble prediction: use highest confidence detected pattern
    const detectedWithPrediction = detectedPatterns.filter(p => p.detected && p.prediction !== null)
    const ensemblePrediction = detectedWithPrediction.length > 0 ? detectedWithPrediction[0].prediction : null
    const ensembleConfidence = detectedWithPrediction.length > 0 ? detectedWithPrediction[0].confidence : 0

    return {
      currentSequence: sequence.slice(-10),
      detectedPatterns,
      bestMatch,
      ensemblePrediction,
      ensembleConfidence,
    }
  }

  /**
   * Quick prediction for Size (Big/Small)
   */
  predictSize(sizes: SizeType[]): GamePatternAnalysis {
    return this.analyzeSequence(sizes)
  }

  /**
   * Quick prediction for Color (Red/Green/Violet)
   */
  predictColor(colors: ColorType[]): GamePatternAnalysis {
    return this.analyzeSequence(colors)
  }

  /**
   * Quick prediction for Numbers
   */
  predictNumbers(numbers: number[]): GamePatternAnalysis {
    return this.analyzeSequence(numbers)
  }
}

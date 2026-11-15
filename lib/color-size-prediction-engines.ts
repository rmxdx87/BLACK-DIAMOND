/**
 * 10 Specialized Engines for Size (Big/Small) & Color (Red/Green/Violet) Prediction
 * Binary & Multi-class Classification Models
 * No randomness - Pure pattern/data driven analysis
 */

export type ColorType = 'Red' | 'Green' | 'Violet'
export type SizeType = 'Big' | 'Small'

export interface BinaryPrediction {
  value: SizeType | ColorType
  confidence: number // 0-100
  probability: number // 0-1
  source: string
}

export interface SequenceData {
  colors: ColorType[]
  sizes: SizeType[]
  timestamps: number[]
}

export interface AnalysisMetrics {
  streakLength: number
  streakType: 'color' | 'size'
  entropy: number
  diversity: number
  pattern: string
}

// ============================================
// 1. LOGISTIC REGRESSION ENGINE
// ============================================
export class LogisticRegressionEngine {
  private weights: Record<string, number> = {}
  private bias: number = 0

  predict(
    features: Record<string, number>,
    historicalWeights?: Record<string, number>
  ): BinaryPrediction {
    const weights = historicalWeights || this.weights
    let sum = this.bias

    for (const [key, value] of Object.entries(features)) {
      sum += (weights[key] || 0) * value
    }

    const probability = 1 / (1 + Math.exp(-sum))
    const value = probability > 0.5 ? 'Big' : 'Small'

    return {
      value: value as SizeType,
      probability,
      confidence: Math.abs(probability - 0.5) * 200, // 0-100
      source: 'Logistic Regression',
    }
  }

  trainFromData(data: SizeType[], iterations: number = 100): void {
    // Simple gradient descent training
    const n = data.length
    if (n < 2) return

    const features = {
      sequence_momentum: 0,
      change_rate: 0,
      consistency: 0,
    }

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 1; i < n; i++) {
        const isPrevBig = data[i - 1] === 'Big' ? 1 : 0
        const isCurrBig = data[i] === 'Big' ? 1 : 0

        features['sequence_momentum'] = isPrevBig * 0.7
        features['change_rate'] = isPrevBig === isCurrBig ? 1 : -1
        features['consistency'] = data.filter((v, idx) => idx > 0 && v === data[idx - 1]).length / (n - 1)

        const prediction = this.predict(features).probability
        const error = isCurrBig - prediction

        // Update weights
        for (const [key, value] of Object.entries(features)) {
          this.weights[key] = (this.weights[key] || 0) + 0.01 * error * value
        }
        this.bias += 0.01 * error
      }
    }
  }
}

// ============================================
// 2. BERNOULLI NAIVE BAYES ENGINE
// ============================================
export class BernoulliNaiveBayesEngine {
  private colorProbabilities: Record<ColorType, number> = {
    Red: 0.33,
    Green: 0.33,
    Violet: 0.34,
  }
  private transitions: Record<string, Record<string, number>> = {}

  predictNextColor(
    previousColors: ColorType[],
    count: number = 5
  ): BinaryPrediction {
    if (previousColors.length === 0) {
      return {
        value: 'Red',
        confidence: 33,
        probability: 0.33,
        source: 'Bernoulli Naive Bayes',
      }
    }

    const lastColor = previousColors[previousColors.length - 1]
    const transitionKey = `${lastColor}_next`

    // Calculate conditional probabilities
    const colorProbs: Record<ColorType, number> = { Red: 0.33, Green: 0.33, Violet: 0.34 }

    // Apply Bayes theorem: P(color|previous) = P(previous|color) * P(color) / P(previous)
    const transitions = this.getTransitionProbabilities(previousColors)

    let maxProb = 0
    let predictedColor: ColorType = 'Red'

    for (const color of ['Red', 'Green', 'Violet'] as ColorType[]) {
      const condProb = (transitions[`${lastColor}→${color}`] || 0.33) * this.colorProbabilities[color]
      if (condProb > maxProb) {
        maxProb = condProb
        predictedColor = color
      }
    }

    return {
      value: predictedColor,
      confidence: Math.min(100, maxProb * 300),
      probability: maxProb,
      source: 'Bernoulli Naive Bayes',
    }
  }

  private getTransitionProbabilities(colors: ColorType[]): Record<string, number> {
    const trans: Record<string, number> = {}
    for (let i = 0; i < colors.length - 1; i++) {
      const key = `${colors[i]}→${colors[i + 1]}`
      trans[key] = (trans[key] || 0) + 1
    }

    // Normalize
    const total = Object.values(trans).reduce((a, b) => a + b, 0) || 1
    for (const key of Object.keys(trans)) {
      trans[key] = trans[key] / total
    }

    return trans
  }
}

// ============================================
// 3. STREAK/CHAIN COUNTER ENGINE
// ============================================
export class StreakChainCounterEngine {
  analyzeStreaks(data: (SizeType | ColorType)[]): BinaryPrediction {
    if (data.length < 2) {
      return {
        value: 'Big',
        confidence: 0,
        probability: 0.5,
        source: 'Streak Counter',
      }
    }

    const streaks: Array<{ value: string; length: number; breakout: boolean }> = []
    let currentStreak = data[0]
    let streakLength = 1

    for (let i = 1; i < data.length; i++) {
      if (data[i] === currentStreak) {
        streakLength++
      } else {
        streaks.push({ value: currentStreak, length: streakLength, breakout: false })
        currentStreak = data[i]
        streakLength = 1
      }
    }
    streaks.push({ value: currentStreak, length: streakLength, breakout: false })

    // Analyze streak patterns
    const currentStreakInfo = streaks[streaks.length - 1]
    const avgStreakLength = streaks.reduce((sum, s) => sum + s.length, 0) / streaks.length
    const maxHistoricalStreak = Math.max(...streaks.map(s => s.length))

    // Rules
    let prediction: SizeType = 'Big'
    let confidence = 50

    // Rule 1: If streak is unusually long, predict breakout (opposite value)
    if (currentStreakInfo.length > avgStreakLength * 1.5) {
      prediction = currentStreakInfo.value === 'Big' ? 'Small' : 'Big'
      confidence = Math.min(100, (currentStreakInfo.length / maxHistoricalStreak) * 100)
    }
    // Rule 2: If streak is short, predict continuation
    else if (currentStreakInfo.length < avgStreakLength * 0.7) {
      prediction = currentStreakInfo.value as SizeType
      confidence = 70
    }
    // Rule 3: Normal streak length, predict continuation with moderate confidence
    else {
      prediction = currentStreakInfo.value as SizeType
      confidence = 60
    }

    return {
      value: prediction,
      confidence,
      probability: confidence / 100,
      source: 'Streak Chain Counter',
    }
  }
}

// ============================================
// 4. DECISION TREE CLASSIFIER ENGINE
// ============================================
export class DecisionTreeClassifierEngine {
  private tree: any = null

  buildTreeRules(data: SizeType[]): void {
    // Simple decision tree rules based on patterns
    const patterns = this.extractPatterns(data)
    this.tree = {
      rules: [
        // If last 3 items are all same, continue with 80% confidence
        {
          condition: (seq: SizeType[]) => seq.slice(-3).every(v => v === seq[seq.length - 1]),
          prediction: (seq: SizeType[]) => seq[seq.length - 1],
          confidence: 80,
        },
        // If alternating pattern detected, continue alternation
        {
          condition: (seq: SizeType[]) => this.isAlternating(seq.slice(-5)),
          prediction: (seq: SizeType[]) => seq[seq.length - 1] === 'Big' ? 'Small' : 'Big',
          confidence: 75,
        },
        // If rare value appears after common value, predict rare
        {
          condition: (seq: SizeType[]) => {
            const last = seq[seq.length - 1]
            const freq = seq.filter(v => v === last).length / seq.length
            return freq > 0.7
          },
          prediction: (seq: SizeType[]) => seq[seq.length - 1] === 'Big' ? 'Small' : 'Big',
          confidence: 70,
        },
      ],
    }
  }

  predict(data: SizeType[]): BinaryPrediction {
    if (!this.tree) this.buildTreeRules(data)

    for (const rule of this.tree.rules) {
      if (rule.condition(data)) {
        return {
          value: rule.prediction(data),
          confidence: rule.confidence,
          probability: rule.confidence / 100,
          source: 'Decision Tree',
        }
      }
    }

    return {
      value: data[data.length - 1],
      confidence: 50,
      probability: 0.5,
      source: 'Decision Tree',
    }
  }

  private isAlternating(seq: (SizeType | ColorType)[]): boolean {
    if (seq.length < 2) return false
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] === seq[i - 1]) return false
    }
    return true
  }

  private extractPatterns(data: SizeType[]): any[] {
    return []
  }
}

// ============================================
// 5. GATED RECURRENT UNIT (GRU) ENGINE
// ============================================
export class GRUPredictionEngine {
  private hiddenState: number[] = []
  private weights: Record<string, number[]> = {
    Wz: [0.1, 0.2, 0.15],
    Wr: [0.12, 0.18, 0.14],
    Wh: [0.11, 0.19, 0.13],
  }

  predict(sequence: SizeType[], hiddenSize: number = 3): BinaryPrediction {
    if (sequence.length === 0) {
      return { value: 'Big', confidence: 50, probability: 0.5, source: 'GRU' }
    }

    // Initialize hidden state
    this.hiddenState = Array(hiddenSize).fill(0)

    // Process sequence
    for (const item of sequence) {
      const input = item === 'Big' ? 1 : 0
      this.hiddenState = this.gruCell(input, this.hiddenState)
    }

    // Make prediction from hidden state
    const output = this.hiddenState.reduce((a, b) => a + b, 0) / hiddenSize
    const prediction: SizeType = output > 0.5 ? 'Big' : 'Small'
    const confidence = Math.abs(output - 0.5) * 200

    return {
      value: prediction,
      confidence: Math.min(100, confidence),
      probability: Math.abs(output),
      source: 'GRU',
    }
  }

  private gruCell(input: number, hiddenState: number[]): number[] {
    const resetGate = this.sigmoid(
      input * this.weights.Wr[0] + hiddenState.reduce((a, b) => a + b, 0) / hiddenState.length * this.weights.Wr[1]
    )
    const updateGate = this.sigmoid(
      input * this.weights.Wz[0] + hiddenState.reduce((a, b) => a + b, 0) / hiddenState.length * this.weights.Wz[1]
    )

    const newHidden = this.tanh(
      input * this.weights.Wh[0] + (resetGate * hiddenState.reduce((a, b) => a + b, 0) / hiddenState.length) * this.weights.Wh[1]
    )

    return hiddenState.map((h, i) => (1 - updateGate) * newHidden + updateGate * h)
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x))
  }

  private tanh(x: number): number {
    return Math.tanh(x)
  }
}

// ============================================
// 6. MOVING AVERAGE TREND FILTER ENGINE
// ============================================
export class MovingAverageTrendFilterEngine {
  predictWithMA(data: number[], shortPeriod: number = 10, longPeriod: number = 20): BinaryPrediction {
    if (data.length < longPeriod) {
      return { value: 'Big', confidence: 50, probability: 0.5, source: 'MA Trend Filter' }
    }

    const shortMA = this.calculateMA(data.slice(-shortPeriod), shortPeriod)
    const longMA = this.calculateMA(data.slice(-longPeriod), longPeriod)

    // Signal: if shortMA > longMA, trend is up
    const trendStrength = Math.abs(shortMA - longMA) / longMA

    if (shortMA > longMA) {
      return {
        value: 'Big',
        confidence: Math.min(100, trendStrength * 200),
        probability: trendStrength,
        source: 'MA Trend Filter',
      }
    } else {
      return {
        value: 'Small',
        confidence: Math.min(100, trendStrength * 200),
        probability: trendStrength,
        source: 'MA Trend Filter',
      }
    }
  }

  private calculateMA(data: number[], period: number): number {
    return data.slice(-period).reduce((a, b) => a + b, 0) / period
  }
}

// ============================================
// 7. GRADIENT BOOSTING MACHINE (GBM) ENGINE
// ============================================
export class GradientBoostingMachineEngine {
  private trees: Array<{ threshold: number; prediction: SizeType }> = []
  private learningRate: number = 0.1

  trainFromData(data: SizeType[]): void {
    this.trees = []
    let residuals: number[] = data.map(v => (v === 'Big' ? 1 : 0))

    for (let iteration = 0; iteration < 5; iteration++) {
      const threshold = residuals.reduce<number>((a, b) => a + b, 0) / residuals.length
      const prediction: SizeType = threshold > 0.5 ? 'Big' : 'Small'

      this.trees.push({ threshold, prediction })

      // Update residuals
      residuals = residuals.map(
        (r, i) => r - this.learningRate * (data[i] === prediction ? 1 : 0)
      )
    }
  }

  predict(data: SizeType[]): BinaryPrediction {
    if (this.trees.length === 0) this.trainFromData(data)

    let prediction = 0
    for (const tree of this.trees) {
      prediction += this.learningRate * (tree.prediction === 'Big' ? 1 : 0)
    }

    const avgPrediction = prediction / this.trees.length
    const value = avgPrediction > 0.5 ? 'Big' : 'Small'
    const confidence = Math.abs(avgPrediction - 0.5) * 200

    return {
      value,
      confidence: Math.min(100, confidence),
      probability: avgPrediction,
      source: 'GBM',
    }
  }
}

// ============================================
// 8. PARITY BIT CHECK ALGORITHM ENGINE
// ============================================
export class ParityBitCheckEngine {
  analyzePatterns(sequence: (SizeType | ColorType)[], values: Record<string, number>): BinaryPrediction {
    if (sequence.length === 0) {
      return { value: 'Big', confidence: 50, probability: 0.5, source: 'Parity Bit' }
    }

    // Convert to binary and check parity
    const binary = sequence.map(v => (v === 'Big' || v === 'Red' ? 1 : 0))
    const sum = binary.reduce<number>((a, b) => a + b, 0)

    const isEven = sum % 2 === 0
    const lastValue = sequence[sequence.length - 1]

    // Parity rule: predict based on odd/even pattern
    let prediction: SizeType = 'Big'
    let confidence = 65

    // If sum is even and last is Big, might continue
    if (isEven && (lastValue === 'Big' || lastValue === 'Red')) {
      prediction = 'Big'
    } else if (!isEven && (lastValue === 'Small' || lastValue === 'Green')) {
      prediction = 'Small'
    } else {
      prediction = lastValue === 'Big' || lastValue === 'Red' ? 'Small' : 'Big'
      confidence = 55
    }

    return {
      value: prediction,
      confidence,
      probability: confidence / 100,
      source: 'Parity Bit Check',
    }
  }
}

// ============================================
// 9. NEURAL NETWORK COLOR PREDICTOR
// ============================================
export class NeuralNetworkColorPredictorEngine {
  private inputWeights: number[] = [0.1, 0.2, 0.15, 0.12]
  private hiddenWeights: number[] = [0.3, 0.25, 0.28]
  private outputWeights: number[] = [0.4, 0.35, 0.38]

  predictColor(colors: ColorType[]): BinaryPrediction {
    if (colors.length === 0) {
      return { value: 'Red', confidence: 33, probability: 0.33, source: 'Neural Network' }
    }

    // Input layer: encode colors
    const input = this.encodeColors(colors)

    // Hidden layer
    const hidden = input.map((val, i) => this.relu(val * this.inputWeights[i % this.inputWeights.length]))

    // Output layer
    const output = hidden.map((val, i) => this.sigmoid(val * this.outputWeights[i % this.outputWeights.length]))

    // Classify to color
    const maxIdx = output.indexOf(Math.max(...output))
    const colors_list: ColorType[] = ['Red', 'Green', 'Violet']
    const predictedColor = colors_list[maxIdx % 3]

    return {
      value: predictedColor,
      confidence: Math.min(100, output[maxIdx] * 100),
      probability: output[maxIdx],
      source: 'Neural Network',
    }
  }

  private encodeColors(colors: ColorType[]): number[] {
    return colors.map(c => (c === 'Red' ? 1 : c === 'Green' ? 0.5 : 0.33))
  }

  private relu(x: number): number {
    return Math.max(0, x)
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x))
  }
}

// ============================================
// 10. ADABOOST CLASSIFIER ENGINE
// ============================================
export class AdaBoostClassifierEngine {
  private weakLearners: Array<{
    threshold: number
    alpha: number
  }> = []

  trainFromData(data: SizeType[]): void {
    this.weakLearners = []
    const n = data.length
    let weights = Array(n).fill(1 / n)
    const numIterations = 5

    for (let iteration = 0; iteration < numIterations; iteration++) {
      // Simple weak learner: split by count
      const weighted0 = data
        .map((v, i) => (v === 'Big' ? weights[i] : 0))
        .reduce((a, b) => a + b, 0)
      const weighted1 = data
        .map((v, i) => (v === 'Small' ? weights[i] : 0))
        .reduce((a, b) => a + b, 0)

      const threshold = weighted0 > weighted1 ? 0.5 : -0.5
      const prediction = threshold > 0 ? 'Big' : 'Small'

      // Calculate error
      const error = data
        .map((v, i) => (v !== prediction ? weights[i] : 0))
        .reduce((a, b) => a + b, 0)

      if (error >= 0.5) continue

      const alpha = 0.5 * Math.log((1 - error) / (error + 1e-10))
      this.weakLearners.push({ threshold, alpha })

      // Update weights
      weights = weights.map((w, i) => {
        const pred = threshold > 0 ? 'Big' : 'Small'
        const correct = data[i] === pred ? 1 : -1
        return w * Math.exp(-alpha * correct)
      })

      // Normalize weights
      const sum = weights.reduce((a, b) => a + b, 0)
      weights = weights.map(w => w / sum)
    }
  }

  predict(data: SizeType[]): BinaryPrediction {
    if (this.weakLearners.length === 0) this.trainFromData(data)

    let weightedSum = 0
    for (const learner of this.weakLearners) {
      const pred = learner.threshold > 0 ? 1 : 0
      weightedSum += learner.alpha * pred
    }

    const value = weightedSum > 0 ? 'Big' : 'Small'
    const confidence = Math.min(100, Math.abs(weightedSum) * 50)

    return {
      value,
      confidence,
      probability: Math.abs(weightedSum),
      source: 'AdaBoost',
    }
  }
}

// ============================================
// UNIFIED PREDICTOR - Combines all 10 engines
// ============================================
export class ColorSizePredictionSystemEngine {
  private engines = {
    logisticRegression: new LogisticRegressionEngine(),
    bernoulliNB: new BernoulliNaiveBayesEngine(),
    streakCounter: new StreakChainCounterEngine(),
    decisionTree: new DecisionTreeClassifierEngine(),
    gru: new GRUPredictionEngine(),
    movingAverage: new MovingAverageTrendFilterEngine(),
    gbm: new GradientBoostingMachineEngine(),
    parityBit: new ParityBitCheckEngine(),
    neuralNetwork: new NeuralNetworkColorPredictorEngine(),
    adaBoost: new AdaBoostClassifierEngine(),
  }

  predictSize(data: SizeType[]): BinaryPrediction[] {
    const predictions: BinaryPrediction[] = []

    // Train models
    this.engines.gbm.trainFromData(data)
    this.engines.adaBoost.trainFromData(data)
    this.engines.decisionTree.buildTreeRules(data)

    // Get predictions from each engine
    predictions.push(this.engines.streakCounter.analyzeStreaks(data))
    predictions.push(this.engines.decisionTree.predict(data))
    predictions.push(this.engines.gru.predict(data))
    predictions.push(this.engines.gbm.predict(data))
    predictions.push(this.engines.parityBit.analyzePatterns(data, {}))
    predictions.push(this.engines.adaBoost.predict(data))

    return predictions
  }

  predictColor(colors: ColorType[]): BinaryPrediction[] {
    const predictions: BinaryPrediction[] = []

    predictions.push(this.engines.bernoulliNB.predictNextColor(colors))
    predictions.push(this.engines.neuralNetwork.predictColor(colors))
    predictions.push(this.engines.streakCounter.analyzeStreaks(colors))
    predictions.push(this.engines.decisionTree.predict(colors as any))
    predictions.push(this.engines.parityBit.analyzePatterns(colors, {}))

    return predictions
  }

  getConsensusSize(predictions: BinaryPrediction[]): { value: SizeType; confidence: number } {
    const bigCount = predictions.filter(p => p.value === 'Big').length
    const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0)

    const value = bigCount > predictions.length / 2 ? 'Big' : 'Small'
    const confidence = Math.min(100, totalConfidence / predictions.length)

    return { value, confidence }
  }

  getConsensusColor(predictions: BinaryPrediction[]): { value: ColorType; confidence: number } {
    const colorCounts: Record<ColorType, number> = { Red: 0, Green: 0, Violet: 0 }
    const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0)

    predictions.forEach(p => {
      if (['Red', 'Green', 'Violet'].includes(p.value as any)) {
        colorCounts[p.value as ColorType]++
      }
    })

    const value = (Object.entries(colorCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Red') as ColorType
    const confidence = Math.min(100, totalConfidence / predictions.length)

    return { value, confidence }
  }
}

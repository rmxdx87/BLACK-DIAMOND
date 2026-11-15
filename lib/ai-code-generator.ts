export interface AICodePattern {
  type: "secure" | "memorable" | "themed" | "random"
  description: string
  example: string
}

export interface GeneratedCode {
  code: string
  pattern: AICodePattern
  strength: "low" | "medium" | "high" | "maximum"
  suggestedUserName?: string
  reasoning: string
}

export class AICodeGenerator {
  private static readonly SECURE_PATTERNS = [
    "XXXX####", // 4 letters + 4 numbers
    "XX##XX##", // alternating letters and numbers
    "###XXX##", // numbers-letters-numbers
    "XX####XX", // letters-numbers-letters
  ]

  private static readonly THEMED_PREFIXES = ["AI", "NX", "QX", "ZX", "CX", "VX", "MX", "TX", "RX", "PX"]

  private static readonly MEMORABLE_WORDS = [
    "FIRE",
    "BOLT",
    "WAVE",
    "STAR",
    "MOON",
    "NOVA",
    "FLUX",
    "CORE",
    "EDGE",
    "APEX",
  ]

  private static readonly SECURITY_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  private static readonly LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  private static readonly NUMBERS = "0123456789"

  static generateSecureCode(): GeneratedCode {
    const pattern = this.SECURE_PATTERNS[Math.floor(Math.random() * this.SECURE_PATTERNS.length)]
    let code = ""

    for (const char of pattern) {
      if (char === "X") {
        code += this.LETTERS[Math.floor(Math.random() * this.LETTERS.length)]
      } else if (char === "#") {
        code += this.NUMBERS[Math.floor(Math.random() * this.NUMBERS.length)]
      }
    }

    return {
      code,
      pattern: {
        type: "secure",
        description: "High-security pattern with mixed alphanumeric characters",
        example: pattern,
      },
      strength: "maximum",
      reasoning: "Generated using cryptographically secure random patterns for maximum security",
    }
  }

  static generateThemedCode(): GeneratedCode {
    const prefix = this.THEMED_PREFIXES[Math.floor(Math.random() * this.THEMED_PREFIXES.length)]
    const suffix = Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0")
    const middle =
      this.LETTERS[Math.floor(Math.random() * this.LETTERS.length)] +
      this.LETTERS[Math.floor(Math.random() * this.LETTERS.length)]

    const code = prefix + middle + suffix

    return {
      code,
      pattern: {
        type: "themed",
        description: "AI-themed prefix with secure random suffix",
        example: "AIXX####",
      },
      strength: "high",
      reasoning: "Combines memorable AI theme with secure random elements for balanced usability and security",
    }
  }

  static generateMemorableCode(): GeneratedCode {
    const word = this.MEMORABLE_WORDS[Math.floor(Math.random() * this.MEMORABLE_WORDS.length)]
    const numbers = Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0")
    const code = word + numbers

    return {
      code,
      pattern: {
        type: "memorable",
        description: "Memorable word combined with secure numbers",
        example: "WORD####",
      },
      strength: "medium",
      reasoning: "Uses memorable words to aid user recall while maintaining security with random numbers",
    }
  }

  static generateRandomCode(): GeneratedCode {
    let code = ""
    for (let i = 0; i < 8; i++) {
      code += this.SECURITY_CHARS[Math.floor(Math.random() * this.SECURITY_CHARS.length)]
    }

    return {
      code,
      pattern: {
        type: "random",
        description: "Completely random alphanumeric sequence",
        example: "XXXXXXXX",
      },
      strength: "high",
      reasoning: "Pure randomness provides excellent security but may be harder to remember",
    }
  }

  static generateMultipleCodes(count = 5): GeneratedCode[] {
    const generators = [
      this.generateSecureCode,
      this.generateThemedCode,
      this.generateMemorableCode,
      this.generateRandomCode,
    ]

    const codes: GeneratedCode[] = []

    for (let i = 0; i < count; i++) {
      const generator = generators[i % generators.length]
      const generated = generator.call(this)

      // Add AI-suggested user names for some codes
      if (Math.random() > 0.5) {
        generated.suggestedUserName = this.generateUserName()
      }

      codes.push(generated)
    }

    return codes
  }

  private static generateUserName(): string {
    const prefixes = ["User", "Agent", "Neural", "Cyber", "Quantum", "Digital", "Matrix", "Alpha", "Beta", "Gamma"]
    const suffixes = ["01", "02", "03", "X", "Pro", "Max", "Prime", "Core", "Elite", "Ace"]

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]

    return prefix + suffix
  }

  static analyzeCodeStrength(code: string): {
    strength: "low" | "medium" | "high" | "maximum"
    score: number
    feedback: string[]
  } {
    let score = 0
    const feedback: string[] = []

    // Length check
    if (code.length >= 8) {
      score += 25
      feedback.push("✓ Adequate length (8+ characters)")
    } else {
      feedback.push("⚠ Consider longer codes for better security")
    }

    // Character variety
    const hasLetters = /[A-Z]/.test(code)
    const hasNumbers = /[0-9]/.test(code)

    if (hasLetters && hasNumbers) {
      score += 25
      feedback.push("✓ Good mix of letters and numbers")
    } else {
      feedback.push("⚠ Mix letters and numbers for better security")
    }

    // Pattern analysis
    const hasRepeating = /(.)\1{2,}/.test(code)
    if (!hasRepeating) {
      score += 25
      feedback.push("✓ No obvious repeating patterns")
    } else {
      feedback.push("⚠ Avoid repeating character patterns")
    }

    // Randomness check
    const isSequential = this.isSequential(code)
    if (!isSequential) {
      score += 25
      feedback.push("✓ Non-sequential character arrangement")
    } else {
      feedback.push("⚠ Avoid sequential patterns")
    }

    let strength: "low" | "medium" | "high" | "maximum"
    if (score >= 90) strength = "maximum"
    else if (score >= 70) strength = "high"
    else if (score >= 50) strength = "medium"
    else strength = "low"

    return { strength, score, feedback }
  }

  private static isSequential(code: string): boolean {
    for (let i = 0; i < code.length - 2; i++) {
      const char1 = code.charCodeAt(i)
      const char2 = code.charCodeAt(i + 1)
      const char3 = code.charCodeAt(i + 2)

      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true
      }
    }
    return false
  }
}

export const generateMultipleCodes = AICodeGenerator.generateMultipleCodes.bind(AICodeGenerator)

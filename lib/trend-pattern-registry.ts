import {
  TREND_PATTERN_FAMILY_METADATA,
  TREND_PATTERN_ROWS,
} from "./trend-pattern-catalog-data.ts"

export type PatternCategory = keyof typeof TREND_PATTERN_FAMILY_METADATA
export type PatternProfile =
  | "very_low"
  | "low"
  | "below_avg"
  | "slightly_below"
  | "balanced"
  | "slightly_above"
  | "above_avg"
  | "high"
  | "very_high"
  | "extreme"

export type PatternMarket = "number" | "colour" | "size" | "cross"

export interface PatternOverride {
  enabled?: boolean
  weight?: number
}

export type PatternOverrides = Readonly<Record<string, PatternOverride>>

export interface PatternFamilyConfig {
  market: PatternMarket
  featureType: string
  scoringCluster: string
  contributesToNumberRanking: boolean
}

export interface PatternDefinition {
  patternId: string
  patternName: string
  category: PatternCategory
  lookbackWindow: number
  threshold: number
  profile: PatternProfile
  featureType: string
  featureDefinition: string
  candidateScoring: string
  outputFields: string
  market: PatternMarket
  scoringCluster: string
  contributesToNumberRanking: boolean
  enabled: boolean
  weight: number
}

export const PATTERN_FAMILY_CONFIG: Readonly<Record<PatternCategory, PatternFamilyConfig>> = {
  COLOR_FREQUENCY: { market: "colour", featureType: "membership-frequency", scoringCluster: "colour-distribution", contributesToNumberRanking: false },
  COLOR_MOMENTUM: { market: "colour", featureType: "membership-momentum", scoringCluster: "colour-momentum", contributesToNumberRanking: false },
  COLOR_STREAK: { market: "colour", featureType: "membership-streak", scoringCluster: "colour-streak", contributesToNumberRanking: false },
  COLOR_TRANSITION: { market: "colour", featureType: "membership-transition", scoringCluster: "colour-transition", contributesToNumberRanking: false },
  CROSS_FEATURE: { market: "cross", featureType: "cross-feature-agreement", scoringCluster: "cross-feature", contributesToNumberRanking: false },
  NUMBER_COLDNESS: { market: "number", featureType: "coldness-watchlist", scoringCluster: "number-frequency", contributesToNumberRanking: false },
  NUMBER_ENTROPY: { market: "number", featureType: "distribution-entropy", scoringCluster: "diagnostics", contributesToNumberRanking: false },
  NUMBER_FREQUENCY: { market: "number", featureType: "frequency", scoringCluster: "number-frequency", contributesToNumberRanking: true },
  NUMBER_GAP: { market: "number", featureType: "circular-gap-transition", scoringCluster: "number-transition", contributesToNumberRanking: true },
  NUMBER_HALVES: { market: "size", featureType: "big-small-balance", scoringCluster: "size-distribution", contributesToNumberRanking: true },
  NUMBER_MOMENTUM: { market: "number", featureType: "momentum", scoringCluster: "number-frequency", contributesToNumberRanking: true },
  NUMBER_NEIGHBOUR: { market: "number", featureType: "neighbour-transition", scoringCluster: "number-transition", contributesToNumberRanking: true },
  NUMBER_PAIR: { market: "number", featureType: "pair-transition", scoringCluster: "number-transition", contributesToNumberRanking: true },
  NUMBER_PARITY: { market: "number", featureType: "parity-transition", scoringCluster: "number-transition", contributesToNumberRanking: true },
  NUMBER_RECENCY: { market: "number", featureType: "recency-weighted-frequency", scoringCluster: "number-frequency", contributesToNumberRanking: true },
  NUMBER_STREAK: { market: "number", featureType: "streak-context", scoringCluster: "number-streak", contributesToNumberRanking: true },
  NUMBER_TRIPLET: { market: "number", featureType: "triplet-transition", scoringCluster: "number-transition", contributesToNumberRanking: true },
  SIZE_FREQUENCY: { market: "size", featureType: "frequency", scoringCluster: "size-distribution", contributesToNumberRanking: true },
  SIZE_STREAK: { market: "size", featureType: "streak-context", scoringCluster: "size-streak", contributesToNumberRanking: true },
  SIZE_TRANSITION: { market: "size", featureType: "transition", scoringCluster: "size-transition", contributesToNumberRanking: true },
}

export const PATTERN_PROFILE_ORDER: readonly PatternProfile[] = [
  "very_low",
  "low",
  "below_avg",
  "slightly_below",
  "balanced",
  "slightly_above",
  "above_avg",
  "high",
  "very_high",
  "extreme",
]

const PATTERN_DEFINITIONS: readonly Omit<PatternDefinition, "enabled" | "weight">[] =
  TREND_PATTERN_ROWS.split("\n").map((row) => {
    const [patternId, categoryValue, windowValue, profileValue, thresholdValue] = row.split("|")
    const category = categoryValue as PatternCategory
    const familyMetadata = TREND_PATTERN_FAMILY_METADATA[category]
    const familyConfig = PATTERN_FAMILY_CONFIG[category]

    return {
      patternId,
      patternName: familyMetadata.patternName,
      category,
      lookbackWindow: Number(windowValue),
      threshold: Number(thresholdValue),
      profile: profileValue as PatternProfile,
      featureType: familyConfig.featureType,
      featureDefinition: familyMetadata.featureDefinition,
      candidateScoring: familyMetadata.candidateScoring,
      outputFields: familyMetadata.outputFields,
      market: familyConfig.market,
      scoringCluster: familyConfig.scoringCluster,
      contributesToNumberRanking: familyConfig.contributesToNumberRanking,
    }
  })

if (PATTERN_DEFINITIONS.length !== 2000) {
  throw new Error(`Expected 2000 trend patterns, received ${PATTERN_DEFINITIONS.length}`)
}

export const TREND_PATTERN_COUNT = PATTERN_DEFINITIONS.length

export function createPatternRegistry(overrides: PatternOverrides = {}): PatternDefinition[] {
  return PATTERN_DEFINITIONS.map((pattern) => {
    const override = overrides[pattern.patternId]
    const weight = override?.weight ?? 1
    if (!Number.isFinite(weight) || weight < 0 || weight > 10) {
      throw new RangeError(`Pattern ${pattern.patternId} weight must be between 0 and 10`)
    }

    return {
      ...pattern,
      enabled: override?.enabled ?? true,
      weight,
    }
  })
}

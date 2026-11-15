import type { GameResult } from "../types"

export type ResearchMarket = "colour" | "bigSmall" | "number"
export type ResearchColor = "red" | "green" | "violet"
export type BigSmallOutcome = "big" | "small"
export type ResearchOutcome =
  | { market: "colour"; value: readonly ResearchColor[] }
  | { market: "bigSmall"; value: BigSmallOutcome }
  | { market: "number"; value: number }

export type BotFamily =
  | "colour-intelligence"
  | "big-small-intelligence"
  | "number-intelligence"
  | "pattern-recognition"
  | "statistical-intelligence"
  | "time-cycle-intelligence"
  | "advanced-research-intelligence"
  | "meta-intelligence"

export type BotExecutionStatus = "voted" | "abstained" | "unavailable" | "failed"

export interface HistoricalCutoff {
  targetPeriod: string
  /** Latest source period allowed in the strategy input. */
  beforePeriod: string
}

export interface FeatureEvidence<T = unknown> {
  feature: string
  market: ResearchMarket
  value: T
  windowSize: number
  sampleSize: number
  dataCutoffPeriod: string | null
  limitations: readonly string[]
}

export interface StrategyEvidence {
  windowSize: number
  sampleSize: number
  dataCutoffPeriod: string
  supportingMetrics: Readonly<Record<string, number | string | boolean | null>>
  limitations: readonly string[]
}

export interface StrategyContext {
  market: ResearchMarket
  targetPeriod: string
  cutoff: HistoricalCutoff
  history: readonly GameResult[]
  /** Set only after the official size rule has been verified and configured. */
  bigSmallRuleVerified: boolean
}

export interface BotVote {
  botId: string
  strategyVersion: string
  targetPeriod: string
  market: ResearchMarket
  vote: ResearchOutcome | null
  alternatives: readonly ResearchOutcome[]
  evidence: StrategyEvidence
  status: BotExecutionStatus
  abstentionReason: string | null
  executionDurationMs: number
}

export interface BotDefinition {
  id: string
  name: string
  family: BotFamily
  market: ResearchMarket
  strategyId: string
  description: string
  requiredFeatures: readonly string[]
  minimumSampleSize: number
  analysisWindow: number
  strategyVersion: string
  implementationStatus: "active" | "unavailable"
  unavailableReason: string | null
}

export interface MarketConsensus {
  market: ResearchMarket
  leadingOutcome: ResearchOutcome | null
  runnerUpOutcome: ResearchOutcome | null
  registeredBots: number
  eligibleBots: number
  participatingBots: number
  abstainingBots: number
  failedBots: number
  unavailableBots: number
  votesByOutcome: Readonly<Record<string, number>>
  voteShare: number | null
  familyVoteShare: Readonly<Record<BotFamily, number>>
  voteMargin: number | null
  disagreement: number | null
  evidenceCoverage: number
  status:
    | "strong_historical_agreement"
    | "moderate_agreement"
    | "low_agreement"
    | "high_disagreement"
    | "insufficient_evidence"
    | "not_available"
  limitations: readonly string[]
}

export interface ConsensusReport {
  targetPeriod: string
  createdAt: string
  dataCutoffPeriod: string | null
  markets: Readonly<Record<ResearchMarket, MarketConsensus>>
  botVotes: readonly BotVote[]
  limitations: readonly string[]
}

export interface HistoricalValidationIssue {
  code:
    | "invalid_period"
    | "invalid_number"
    | "invalid_colour"
    | "duplicate_period"
    | "missing_source_field"
    | "invalid_timestamp"
    | "source_inconsistency"
    | "ordering_violation"
  field: string | null
  message: string
}

export interface HistoricalRecordValidation {
  status: "accepted" | "rejected"
  record: GameResult | null
  issues: readonly HistoricalValidationIssue[]
}

export interface PredictionSnapshot {
  id: string
  targetPeriod: string
  createdAt: string
  dataCutoffPeriod: string | null
  strategyVersions: Readonly<Record<string, string>>
  report: ConsensusReport
  immutable: true
}

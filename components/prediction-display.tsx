"use client"

import { Activity, Clock3, ShieldAlert } from "lucide-react"
import type { TrendPatternAnalysis } from "@/lib/trend-pattern-engine"
import type { PredictionCandidateSnapshot } from "@/lib/types"
import type { PredictionResult } from "@/src/lib/prediction/engine"
import type { EngineExecutionStatistic, PredictionExecutionStatus } from "@/lib/prediction/coordinator"

interface DisplayCandidate {
  rank: number
  number: number
  size: "big" | "small"
  mappedColours: readonly string[] | null
  score: number | null
  supportingPatternCount: number
  historicalSampleCount: number
  signalAgreement: number | null
  calibratedConfidence: number | null
}

interface PredictionDisplayProps {
  analysis: TrendPatternAnalysis | null
  statisticalPrediction?: PredictionResult | null
  canonicalCandidates?: readonly PredictionCandidateSnapshot[] | null
  nextPeriodNumber: string | null
  timeRemaining: number
  countdownAvailable: boolean
  isAnalyzing: boolean
  periodStatus: "active" | "upcoming" | "settled" | "unavailable"
  periodErrorReason: string | null
  periodLimitation: string | null
  historyPaginationIssue: string | null
  executionStatus: PredictionExecutionStatus | null
  executionStats: {
    patterns: EngineExecutionStatistic
    statisticalFrequency: EngineExecutionStatistic
    agents: EngineExecutionStatistic
  } | null
  executionWarnings: readonly string[]
  generatedAt: number | null
}

function formatScore(value: number | null): string {
  return value === null ? "Insufficient evidence" : value.toFixed(3)
}

function formatAgreement(value: number | null): string {
  return value === null ? "Unavailable" : `${(value * 100).toFixed(0)}% of supporting signals`
}

function formatCountdown(value: number): string {
  const seconds = Math.max(0, Math.floor(value))
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

function formatEvidence(value: PredictionResult["numbers"]["evidence"] | undefined): string {
  if (!value) return "Not available"
  if (value === "LEVEL_1_STRONGER_EVIDENCE") return "Level 1 · stronger historical evidence"
  if (value === "LEVEL_2_MODERATE_EVIDENCE") return "Level 2 · moderate historical evidence"
  return "Level 3 · low historical evidence"
}

export function PredictionDisplay({
  analysis,
  statisticalPrediction = null,
  canonicalCandidates = null,
  nextPeriodNumber,
  timeRemaining,
  countdownAvailable,
  isAnalyzing,
  periodStatus,
  periodErrorReason,
  periodLimitation,
  historyPaginationIssue,
  executionStatus,
  executionStats,
  executionWarnings,
  generatedAt,
}: PredictionDisplayProps) {
  const candidates: DisplayCandidate[] = []
  const addCandidate = (candidate: Omit<DisplayCandidate, "rank">) => {
    if (candidates.length >= 4 || candidates.some((existing) => existing.number === candidate.number)) return
    candidates.push({ ...candidate, rank: candidates.length + 1 })
  }
  analysis?.rankings.filter((candidate) => candidate.score !== null).slice(0, 4).forEach((candidate) => {
    addCandidate({
      number: candidate.number,
      size: candidate.size,
      mappedColours: candidate.mappedColours,
      score: candidate.score,
      supportingPatternCount: candidate.supportingPatternCount,
      historicalSampleCount: candidate.historicalSampleCount,
      signalAgreement: candidate.signalAgreement,
      calibratedConfidence: candidate.calibratedConfidence,
    })
  })
  canonicalCandidates?.forEach((candidate) => addCandidate(candidate))
  statisticalPrediction?.numbers.candidates.slice(0, 4).forEach((candidate) => {
    addCandidate({
      number: candidate.value,
      size: candidate.value <= 4 ? "small" : "big",
      mappedColours: null,
      score: candidate.score,
      supportingPatternCount: 0,
      historicalSampleCount: candidate.sampleSize,
      signalAgreement: null,
      calibratedConfidence: null,
    })
  })
  const colourLead = analysis?.colourRankings[0]
  const sizeLead = analysis?.sizeRankings[0]
  const colourOutcome = colourLead?.score === null ? null : colourLead?.outcome ?? null
  const sizeOutcome = sizeLead?.score === null ? null : sizeLead?.outcome ?? null
  const canDisplayCandidates = nextPeriodNumber !== null && periodStatus !== "unavailable" && periodStatus !== "settled"
  const limitedEvidence = Boolean(analysis?.lowConfidence)
  const confidenceUncalibrated = candidates.some((candidate) => candidate.calibratedConfidence === null)
  const showConfidenceNote = limitedEvidence || confidenceUncalibrated
  const analyzedRecordCount = analysis?.includedRecordCount ?? statisticalPrediction?.totalRecords

  return (
    <section className="w-full min-w-0 rounded-2xl border border-border bg-card/80 p-3 shadow-xl shadow-black/10 sm:p-5" aria-label="Prediction">
      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Next round</p>
          <h2 className="text-lg font-semibold">Prediction</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-75">
          <div className="min-w-0 rounded-lg border border-border/70 bg-background/50 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Target period</p>
            <p className="mt-1 truncate font-mono text-xs font-semibold sm:text-sm" title={nextPeriodNumber ?? undefined}>{nextPeriodNumber ?? (periodErrorReason ? "Resolution failed" : "Unavailable")}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-primary/25 bg-primary/8 px-2.5 py-2">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><Clock3 className="h-3 w-3" />Time remaining</p>
            <p className="mt-0.5 font-mono text-xl font-bold leading-none tracking-[0.05em] text-primary" aria-live="off">
              {countdownAvailable ? formatCountdown(timeRemaining) : "--:--"}
            </p>
          </div>
        </div>
      </div>
      {periodErrorReason && <p role="alert" className="mb-3 rounded-lg border border-destructive/25 bg-destructive/6 px-3 py-2 text-xs text-destructive">{periodErrorReason}</p>}

      {canDisplayCandidates && candidates.length > 0 && showConfidenceNote && (
        <p className="mb-2 text-[10px] text-amber-200" role="status">
          {limitedEvidence ? "Limited historical evidence" : "Confidence not calibrated"}
          {analyzedRecordCount === undefined ? "" : ` · ${analyzedRecordCount} records`}
        </p>
      )}
      {canDisplayCandidates && candidates.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-1.5" aria-label="Colour and size trends">
          <MarketSummary label="Colour" outcome={colourOutcome} />
          <MarketSummary label="Size" outcome={sizeOutcome} />
        </div>
      )}
      <div>
        {canDisplayCandidates && candidates.length > 0 ? (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3" aria-label="Top four number candidates">
            {candidates.map((candidate, index) => (
              <article
                key={`${candidate.number}-${candidate.rank}`}
                className={`min-w-0 rounded-xl border p-2 text-center sm:p-4 ${index === 0
                  ? "border-primary/40 bg-primary/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "border-border/70 bg-background/40"}`}
                aria-label={`Rank ${candidate.rank} candidate number ${candidate.number}`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">#{candidate.rank}</p>
                <p className={`mt-0.5 text-2xl font-bold leading-tight tracking-tight sm:text-4xl ${index === 0 ? "text-primary" : "text-foreground"}`}>{candidate.number}</p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">{candidate.size}</p>
              </article>
            ))}
          </div>
        ) : isAnalyzing && nextPeriodNumber !== null ? (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3" role="status" aria-label="Refreshing ranked candidates">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} aria-hidden="true" className="h-20 rounded-xl border border-border/70 bg-background/30 p-2 sm:h-28 sm:p-4">
                <div className="mx-auto h-2 w-6 rounded-full bg-muted/60" />
                <div className="mx-auto mt-3 h-8 w-8 rounded-lg bg-muted/60 sm:h-10 sm:w-10" />
                <div className="mx-auto mt-2 h-2 w-10 rounded-full bg-muted/40" />
              </div>
            ))}
            <p className="sr-only">Refreshing candidate evidence. The current forecast is not available yet.</p>
          </div>
        ) : (
          <div className="flex min-h-20 items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/6 px-3 py-3" role="status">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{executionStatus ?? "INSUFFICIENT_DATA"} · No prediction</h3>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {analysis?.limitations[0] ?? "Valid historical evidence is not available yet."}
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground" role="status">
        <Activity className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-pulse text-primary" : ""}`} />
        {isAnalyzing ? "Updating prediction…" : `${periodStatus} · ${analysis?.includedRecordCount ?? statisticalPrediction?.totalRecords ?? 0} records`}
      </p>

      <details className="mt-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Analysis details</summary>
        <div className="mt-3 space-y-3">
          {canDisplayCandidates && candidates.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {candidates.map((candidate) => (
                <div key={`evidence-${candidate.number}`} className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="mb-2 text-xs font-semibold">#{candidate.rank} · Number {candidate.number}</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    <CandidateFact label="Model size" value={candidate.size.toUpperCase()} />
                    <CandidateFact label="Colour mapping" value={candidate.mappedColours?.length ? candidate.mappedColours.join(" + ") : "Unverified"} />
                    <CandidateFact label="Relative score" value={formatScore(candidate.score)} />
                    <CandidateFact label="Supporting patterns" value={String(candidate.supportingPatternCount)} />
                    <CandidateFact label="Historical sample" value={String(candidate.historicalSampleCount)} />
                    <CandidateFact label="Signal agreement" value={formatAgreement(candidate.signalAgreement)} />
                    <CandidateFact label="Calibrated confidence" value={candidate.calibratedConfidence === null ? "Not calibrated" : `${candidate.calibratedConfidence}%`} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {canDisplayCandidates && candidates.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              <MarketLead
                label="Colour membership trend"
                outcome={colourLead?.score === null ? null : colourLead?.outcome ?? null}
                score={colourLead?.score ?? null}
                supportingPatterns={colourLead?.supportingPatternCount ?? 0}
              />
              <MarketLead
                label="BIG / SMALL trend"
                outcome={sizeLead?.score === null ? null : sizeLead?.outcome ?? null}
                score={sizeLead?.score ?? null}
                supportingPatterns={sizeLead?.supportingPatternCount ?? 0}
              />
            </div>
          )}
          {canDisplayCandidates && statisticalPrediction && (
            <section className="rounded-xl border border-border/70 bg-background/40 p-3" aria-label="Historical frequency analysis">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">Historical frequency analysis</h3>
                <span className="text-xs text-muted-foreground">{statisticalPrediction.totalRecords} records</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Top numbers · weighted score</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatEvidence(statisticalPrediction.numbers.evidence)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {statisticalPrediction.numbers.candidates.slice(0, 4).map((candidate) => (
                      <span key={candidate.value} className="rounded-md border border-border px-2 py-1 font-mono text-sm">
                        {candidate.value} <span className="text-xs text-muted-foreground">{candidate.score}%</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Colour frequency</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatEvidence(statisticalPrediction.colors.evidence)}</p>
                  <p className="mt-2 text-sm font-medium">{statisticalPrediction.colors.primary.value} · {statisticalPrediction.colors.primary.score}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">Alternative: {statisticalPrediction.colors.alternative.value} · {statisticalPrediction.colors.alternative.score}%</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">BIG / SMALL frequency</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatEvidence(statisticalPrediction.sizes.evidence)}</p>
                  <p className="mt-2 text-sm font-medium">{statisticalPrediction.sizes.primary.value} · {statisticalPrediction.sizes.primary.score}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">Alternative: {statisticalPrediction.sizes.alternative.value} · {statisticalPrediction.sizes.alternative.score}%</p>
                </div>
              </div>
            </section>
          )}
          {periodLimitation && <p className="text-xs text-amber-200">{periodLimitation}</p>}
          {historyPaginationIssue && <p className="text-xs text-amber-200">History source limitation: {historyPaginationIssue}</p>}
          {executionStats && (
            <div className="grid gap-2 rounded-xl border border-border/70 bg-background/40 p-3 text-[10px] text-muted-foreground sm:grid-cols-3" aria-label="Engine execution statistics">
              <EngineStat label="Pattern definitions" stat={executionStats.patterns} />
              <EngineStat label="Statistical frequency" stat={executionStats.statisticalFrequency} />
              <EngineStat label="Registered agents/bots" stat={executionStats.agents} />
            </div>
          )}
          {executionWarnings.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-[10px] text-muted-foreground">
              {executionWarnings.slice(0, 4).map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          )}
          {generatedAt !== null && <p className="text-[10px] text-muted-foreground">Generated {new Date(generatedAt).toLocaleString()}</p>}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Scores are relative pattern evidence, not probabilities. Colour membership is analyzed independently of number-to-colour mapping; confidence is withheld until calibrated with held-out forecasts.
            {limitedEvidence ? " The available history is below the model's evidence threshold." : confidenceUncalibrated ? " Candidate confidence has not been calibrated." : ""}
          </p>
        </div>
      </details>
    </section>
  )
}

function EngineStat({ label, stat }: { label: string; stat: EngineExecutionStatistic }) {
  return (
    <div>
      <p className="font-semibold uppercase tracking-wider">{label}</p>
      <p className="mt-1">
        Defined {stat.defined} · Registered {stat.registered} · Executable {stat.executable} · Executed {stat.executed} · Valid output {stat.validOutput} · Evidence {stat.evidenceOutput} · Failed {stat.failed} · Duplicates {stat.duplicates} · Disconnected {stat.disconnected} · Records processed {stat.recordsProcessed}
      </p>
    </div>
  )
}

function CandidateFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-background/40 px-2 py-1.5" title={`${label}: ${value}`}>
      <p className="text-[9px] font-semibold uppercase leading-tight tracking-wider text-muted-foreground [overflow-wrap:anywhere]">{label}</p>
      <p className="text-[11px] font-medium leading-snug text-foreground [overflow-wrap:anywhere]">{value}</p>
    </div>
  )
}

function MarketSummary({ label, outcome }: { label: string; outcome: string | null }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background/40 px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label} trend</p>
      <p className="mt-0.5 truncate text-sm font-bold uppercase text-primary">
        {outcome ?? "Not enough data"}
      </p>
    </div>
  )
}

function MarketLead({
  label,
  outcome,
  score,
  supportingPatterns,
}: {
  label: string
  outcome: string | null
  score: number | null
  supportingPatterns: number
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label} · independent pattern evidence</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="text-lg font-semibold capitalize">{outcome ?? "Insufficient evidence"}</p>
        <p className="font-mono text-xs text-muted-foreground">{formatScore(score)}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{supportingPatterns} supporting patterns · not a probability</p>
    </div>
  )
}

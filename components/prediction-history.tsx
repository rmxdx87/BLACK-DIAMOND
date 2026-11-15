"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePredictionHistory } from "@/hooks/use-prediction-history"
import { Activity, Check, Clock, Target, TrendingUp, X } from "lucide-react"
import { sizeFromNumber } from "@/lib/trend-pattern-engine"

const COLOR_STYLES = {
  red: "border-rose-400/35 bg-rose-400/10 text-rose-200",
  green: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
  violet: "border-violet-400/35 bg-violet-400/10 text-violet-200",
} as const

export function PredictionHistory() {
  const { history, stats } = usePredictionHistory()
  const numberDetails = [
    stats?.topFourPredictions ? `Top 4: ${stats.topFourHits}/${stats.topFourPredictions}` : null,
    stats?.topThreePredictions ? `Legacy Top 3: ${stats.topThreeHits}/${stats.topThreePredictions}` : null,
  ].filter((detail): detail is string => detail !== null).join(" · ")

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "win":
        return <Check className="w-4 h-4 text-green-400" />
      case "loss":
        return <X className="w-4 h-4 text-red-400" />
      case "partial":
        return <TrendingUp className="w-4 h-4 text-yellow-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "win":
        return "border-emerald-400/35 text-emerald-200"
      case "loss":
        return "border-rose-400/35 text-rose-200"
      case "partial":
        return "border-amber-400/35 text-amber-200"
      default:
        return "border-border/70 text-muted-foreground"
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="min-w-0 border-border/70 bg-card/85 shadow-xl shadow-black/10 backdrop-blur-xl">
      <div className="p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              Prediction Win/Loss history
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">See which forecasts won, partially matched, or lost.</p>
          </div>
        </div>

        {stats && (
          <details className="mb-4 rounded-lg border border-border/60 bg-background/25 px-3 py-2" aria-label="Prediction history statistics">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Performance details · {stats.resolvedPredictions} settled
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <HistoryMetric label="Stored" value={String(stats.totalPredictions)} />
                <HistoryMetric label="Pending" value={String(stats.pendingPredictions)} />
                <HistoryMetric label="Full wins" value={String(stats.wins)} />
                <HistoryMetric label="Win rate" value={`${stats.winRate}%`} />
                <HistoryMetric label="Partial wins" value={String(stats.partialWins)} />
                <HistoryMetric label="Losses" value={String(stats.losses)} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Counts cover the latest 50 forecasts stored in this browser. Market rates use resolved predictions only.
              </p>
              <OverallOutcomeBar
                wins={stats.wins}
                partialWins={stats.partialWins}
                losses={stats.losses}
                total={stats.resolvedPredictions}
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <MarketBreakdown label="Number prediction" stats={stats.markets.number} detail={numberDetails} />
                <MarketBreakdown label="Colour prediction" stats={stats.markets.color} />
                <MarketBreakdown label="Size prediction" stats={stats.markets.size} />
              </div>
            </div>
          </details>
        )}

        {/* History List */}
        <div className="min-w-0 space-y-3">
          {history.length === 0 ? (
            <div className="py-8 text-center">
              <Target className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
              <div className="font-medium">No predictions yet</div>
              <div className="mt-1 text-xs text-muted-foreground">Resolved forecasts will appear here.</div>
            </div>
          ) : (
            history.map((entry) => {
              const candidates = entry.predictions.topFour ?? entry.predictions.topThree
              const isTopFour = entry.predictions.topFour?.length === 4
              const matchedCandidate = entry.actualResult
                ? candidates?.find((candidate) => candidate.number === entry.actualResult?.number)
                : undefined
              const actualColors = entry.actualResult?.colors?.length
                ? entry.actualResult.colors
                : entry.actualResult
                  ? [entry.actualResult.color]
                  : []
              const predictedColor = entry.predictions.topFourMarkets?.color ?? entry.predictions.color?.prediction
              const predictedSize = entry.predictions.topFourMarkets?.size ?? entry.predictions.size?.prediction

              return (
                <article key={entry.id} className={`rounded-xl border bg-background/35 p-3 sm:p-4 ${getStatusColor(entry.status)}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusIcon(entry.status)}
                      <span className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
                      <Badge variant="outline" className={`text-[10px] ${getStatusColor(entry.status)}`}>{entry.status.toUpperCase()}</Badge>
                    </div>
                    <div className="min-w-0 text-xs text-muted-foreground">Target: <span className="break-all font-mono">{entry.targetPeriod ?? entry.actualResult?.period ?? "—"}</span></div>
                  </div>

                  {candidates?.length ? (
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                      {candidates.map((candidate) => (
                        <div key={candidate.rank} className="min-w-0 rounded-lg border border-border/70 bg-background/45 p-2 text-center">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">#{candidate.rank}</p>
                          <p className="mt-0.5 text-xl font-bold leading-tight sm:text-2xl">{candidate.number}</p>
                          <p className="mt-1 truncate text-[9px] text-muted-foreground">{candidate.size.toUpperCase()}</p>
                          {entry.actualResult && candidate.number === entry.actualResult.number && (
                            <p className="mt-1 text-[9px] font-semibold text-emerald-300">Hit</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                      <HistoryValue label="Predicted color" value={entry.predictions.color?.prediction.toUpperCase() ?? "—"} result={entry.results?.color} />
                      <HistoryValue label="Predicted size" value={entry.predictions.size?.prediction.toUpperCase() ?? "—"} result={entry.results?.size} />
                      <HistoryValue label="Predicted number" value={String(entry.predictions.number?.prediction ?? "—")} result={entry.results?.number} />
                    </div>
                  )}

                  {candidates?.length && (predictedColor || predictedSize) ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {predictedColor && (
                        <HistoryValue
                          label="Predicted colour"
                          value={predictedColor.toUpperCase()}
                          result={entry.actualResult ? entry.results?.color : undefined}
                        />
                      )}
                      {predictedSize && (
                        <HistoryValue
                          label="Predicted size"
                          value={predictedSize.toUpperCase()}
                          result={entry.actualResult ? entry.results?.size : undefined}
                        />
                      )}
                    </div>
                  ) : null}

                  {entry.actualResult && (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 sm:grid-cols-4">
                      <HistoryValue label="Actual number" value={String(entry.actualResult.number)} />
                      <div className="min-w-0 rounded-lg border border-border/60 bg-background/40 p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actual colors</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {actualColors.map((color) => (
                            <span key={color} className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${COLOR_STYLES[color]}`}>{color}</span>
                          ))}
                        </div>
                      </div>
                      <HistoryValue
                        label="Actual size (derived)"
                        value={sizeFromNumber(entry.actualResult.number).toUpperCase()}
                        result={!entry.predictions.topFourMarkets?.size && !entry.predictions.size
                          ? undefined
                          : entry.results?.size}
                      />
                      {candidates?.length && (
                        <HistoryValue
                          label={isTopFour ? "Top 4 number match" : "Legacy Top 3 match"}
                          value={matchedCandidate
                            ? `Rank ${matchedCandidate.rank} · #${matchedCandidate.number}`
                            : `No rank matched · actual ${entry.actualResult.number}`}
                          result={Boolean(matchedCandidate)}
                        />
                      )}
                    </div>
                  )}

                  {candidates?.length ? (
                    <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      {isTopFour ? "Number hit is counted when the actual number matches any of the four ranked candidates." : "This stored forecast is legacy Top 3 data; a fourth candidate was not recorded."}
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>Confidence</span>
                      <span className="font-mono">
                        C:{entry.predictions.color?.confidence ?? "—"}% · S:{entry.predictions.size?.confidence ?? "—"}% · N:{entry.predictions.number?.confidence ?? "—"}%
                      </span>
                    </div>
                  )}
                  {!entry.actualResult && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />Waiting for the verified result.</p>}
                </article>
              )
            })
          )}
        </div>
      </div>
    </Card>
  )
}

function HistoryValue({
  label,
  value,
  result,
}: {
  label: string
  value: string
  result?: boolean
}) {
  const resultClass = result === undefined ? "" : result ? "text-emerald-300" : "text-rose-300"

  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-background/40 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground [overflow-wrap:anywhere]">{label}</p>
      <p className={`mt-1 text-xs font-semibold [overflow-wrap:anywhere] ${resultClass}`}>{value}</p>
    </div>
  )
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-primary">{value}</div>
    </div>
  )
}

function MarketBreakdown({
  label,
  stats,
  detail,
}: {
  label: string
  stats: { predictions: number; wins: number; losses: number; winRate: number | null }
  detail?: string
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-background/40 p-3 sm:p-4" aria-label={`${label} results`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">{label}</h4>
          <p className="mt-1 text-[10px] text-muted-foreground">{stats.predictions} evaluated</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Win percentage</p>
          <p className="text-xl font-semibold text-primary">{stats.winRate === null ? "—" : `${stats.winRate}%`}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
        <MarketOutcome label="Pass / wins" value={stats.wins} className="text-emerald-300" />
        <MarketOutcome label="Losses" value={stats.losses} className="text-rose-300" />
      </div>
      {detail && <p className="mt-2 text-[10px] text-muted-foreground">{detail}</p>}
    </section>
  )
}

function MarketOutcome({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${className}`}>{value}</p>
    </div>
  )
}

function OverallOutcomeBar({
  wins,
  partialWins,
  losses,
  total,
}: {
  wins: number
  partialWins: number
  losses: number
  total: number
}) {
  const outcomes = [
    { label: "Full wins", value: wins, className: "bg-emerald-400" },
    { label: "Partial wins", value: partialWins, className: "bg-amber-400" },
    { label: "Losses", value: losses, className: "bg-rose-400" },
  ]
  const description = outcomes.map(({ label, value }) => `${label}: ${value}`).join(", ")

  return (
    <section className="rounded-xl border border-border/70 bg-background/40 p-3" aria-label={`Overall outcomes: ${description}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <h4 className="font-semibold">Overall outcome mix</h4>
        <span className="text-muted-foreground">{total} settled</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted/50" aria-hidden="true">
        {outcomes.map(({ label, value, className }) => (
          <div
            key={label}
            className={className}
            style={{ width: total > 0 ? `${(value / total) * 100}%` : "0%" }}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">{description}</p>
    </section>
  )
}

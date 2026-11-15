"use client"

import { useMemo } from "react"
import { Activity, Database, GitBranch } from "lucide-react"
import { analyzeHistoricalSequences } from "@/lib/intelligence/sequences"
import type { GameResult } from "@/lib/types"

const MARKET_LABELS = {
  number: "Number sequence",
  size: "BIG / SMALL sequence",
  "colour-combination": "Combined colour outcome",
} as const

export function SequenceExplorer({ results }: { results: GameResult[] }) {
  const analysis = useMemo(() => analyzeHistoricalSequences(results), [results])

  return (
    <div className="space-y-5">
      <section className="dashboard-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Observed history</p>
            <h2 className="text-lg font-semibold">Sequence contexts</h2>
          </div>
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Database className="h-4 w-4" />{analysis.includedRecordCount} eligible records</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {(["number", "size", "colour-combination"] as const).map((market) => {
            const marketSequences = analysis.sequences.filter((sequence) => sequence.market === market)
            return (
              <article key={market} className="rounded-xl border border-border/70 bg-background/40 p-4">
                <h3 className="mb-3 text-sm font-semibold">{MARKET_LABELS[market]}</h3>
                {marketSequences.length ? (
                  <ul className="space-y-3">
                    {marketSequences.map((sequence) => (
                      <li key={`${market}-${sequence.contextLength}`} className="border-t border-border/50 pt-3 first:border-0 first:pt-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs leading-relaxed">{sequence.context.join(" → ")}</span>
                          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{sequence.status}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">Earlier exact-context occurrences: {sequence.historicalSupport}</p>
                        {sequence.nextOutcomes.length > 0 && (
                          <p className="mt-1 text-xs text-foreground">
                            Observed next outcomes: {sequence.nextOutcomes.slice(0, 3).map((item) => `${item.outcome} (${item.count})`).join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">At least three records are needed to compare contexts.</p>}
              </article>
            )
          })}
        </div>
      </section>

      <section className="dashboard-card p-5">
        <div className="mb-4 flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /><h2 className="font-semibold">Observed pattern breaks</h2></div>
        {analysis.patternBreaks.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {analysis.patternBreaks.map((patternBreak) => (
              <div key={patternBreak.market} className="rounded-xl border border-border/70 bg-background/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{MARKET_LABELS[patternBreak.market]}</p>
                <p className="mt-2 text-sm">
                  {patternBreak.previousOutcome} repeated {patternBreak.previousStreakLength}×, then {patternBreak.latestOutcome}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {patternBreak.status === "observed-break" ? "Observed break" : patternBreak.status === "continuing" ? "Sequence continuing" : "Insufficient preceding context"}
                  {" · "}historical comparable contexts: {patternBreak.historicalSupport}
                </p>
                {patternBreak.historicalBreakRate !== null && <p className="mt-1 text-xs text-muted-foreground">Earlier break share: {(patternBreak.historicalBreakRate * 100).toFixed(0)}% (descriptive)</p>}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No eligible completed sequence is available.</p>}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
          <Activity className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>Colour sequences use the exact combined membership outcome, such as <code>red+violet</code>. This is distinct from individual colour membership.</p>
            {analysis.limitations.map((limitation) => <p key={limitation} className="mt-1">{limitation}</p>)}
          </div>
        </div>
      </section>
    </div>
  )
}

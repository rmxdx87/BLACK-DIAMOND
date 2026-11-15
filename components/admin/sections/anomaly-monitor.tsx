"use client"

import { useMemo } from "react"
import { Activity, AlertTriangle, Database, ShieldAlert } from "lucide-react"
import { detectHistoricalAnomalies } from "@/lib/intelligence/anomalies"
import type { GameResult } from "@/lib/types"

export function AnomalyMonitor({
  results,
  duplicateRecords,
}: {
  results: GameResult[]
  duplicateRecords: number | null
}) {
  const report = useMemo(
    () => detectHistoricalAnomalies(results, { duplicatePeriodCount: duplicateRecords ?? undefined }),
    [results, duplicateRecords],
  )

  return (
    <section className="dashboard-card space-y-5 p-5 sm:p-6">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Current scan</p>
        <h2 className="text-xl font-semibold">Historical anomaly monitor</h2>
        <p className="mt-2 text-sm text-muted-foreground">Screening signals from loaded source records only. A statistical signal does not establish cause or manipulation.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Eligible records" value={report.includedRecordCount} icon={Database} />
        <SummaryTile label="Invalid records excluded" value={report.invalidRecordCount} icon={ShieldAlert} />
        <SummaryTile label="Duplicate periods" value={report.duplicatePeriodCount} icon={AlertTriangle} />
        <SummaryTile label="Signals this scan" value={report.events.length} icon={Activity} />
      </div>

      {report.events.length ? (
        <div className="space-y-3" aria-live="polite">
          {report.events.map((event) => (
            <article key={event.eventId} className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{event.feature.replaceAll("-", " ")}</h3>
                <span className="rounded-full border border-amber-400/30 px-2.5 py-1 text-[10px] font-semibold uppercase text-amber-200">{event.severity}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Affected period</dt><dd className="mt-0.5 font-mono">{event.affectedPeriod}</dd></div>
                <div><dt className="text-muted-foreground">Observed / baseline</dt><dd className="mt-0.5">{event.observed} · {event.baseline}</dd></div>
                <div><dt className="text-muted-foreground">Deviation statistic</dt><dd className="mt-0.5">{event.deviation?.toFixed(2) ?? "Not measured"}</dd></div>
                <div><dt className="text-muted-foreground">Verification</dt><dd className="mt-0.5">{event.verificationStatus}</dd></div>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{event.evidence}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
          No configured anomaly threshold was crossed in this scan.
        </div>
      )}

      <div className="rounded-xl border border-border/70 bg-background/40 p-4">
        <p className="flex items-center gap-2 text-sm font-medium"><ShieldAlert className="h-4 w-4 text-primary" />Scope and limitations</p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
          {report.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Scan timestamp: {new Date(report.scannedAt).toLocaleString()} · Events are not persisted between scans.</p>
      </div>
    </section>
  )
}

function SummaryTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Activity
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-4">
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

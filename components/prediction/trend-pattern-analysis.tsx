"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Search,
  ShieldAlert,
} from "lucide-react"
import type { GameResult } from "@/lib/types"
import {
  analyzeTrendPatterns,
  runTrendWalkForwardBacktestAsync,
  type TrendPatternAnalysis as Analysis,
  type WalkForwardBacktest,
} from "@/lib/trend-pattern-engine"
import {
  PATTERN_FAMILY_CONFIG,
  TREND_PATTERN_COUNT,
  createPatternRegistry,
  type PatternCategory,
  type PatternOverride,
  type PatternOverrides,
} from "@/lib/trend-pattern-registry"

const PREFERENCES_KEY = "my-hack-trend-pattern-preferences"
const PAGE_SIZE = 12

interface TrendPreferences {
  patternOverrides: PatternOverrides
  categoryWeights: Partial<Record<PatternCategory, number>>
}

interface StoredTrendPreferences {
  patternOverrides?: Record<string, PatternOverride>
  categoryWeights?: Partial<Record<PatternCategory, number>>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function loadPreferences(): TrendPreferences {
  if (typeof window === "undefined") return { patternOverrides: {}, categoryWeights: {} }
  try {
    const stored = window.localStorage.getItem(PREFERENCES_KEY)
    if (!stored) return { patternOverrides: {}, categoryWeights: {} }
    const parsed: unknown = JSON.parse(stored)
    if (!isRecord(parsed)) throw new TypeError("Saved trend preferences must be an object")

    const value = parsed as StoredTrendPreferences
    const patternOverrides: Record<string, PatternOverride> = {}
    if (value.patternOverrides && isRecord(value.patternOverrides)) {
      for (const [patternId, rawOverride] of Object.entries(value.patternOverrides)) {
        if (!isRecord(rawOverride)) continue
        const override: PatternOverride = {}
        if (typeof rawOverride.enabled === "boolean") override.enabled = rawOverride.enabled
        if (
          typeof rawOverride.weight === "number" &&
          Number.isFinite(rawOverride.weight) &&
          rawOverride.weight >= 0 &&
          rawOverride.weight <= 10
        ) {
          override.weight = rawOverride.weight
        }
        if (Object.keys(override).length) patternOverrides[patternId] = override
      }
    }

    const categoryWeights: Partial<Record<PatternCategory, number>> = {}
    if (value.categoryWeights && isRecord(value.categoryWeights)) {
      for (const [category, weight] of Object.entries(value.categoryWeights)) {
        if (
          category in PATTERN_FAMILY_CONFIG &&
          typeof weight === "number" &&
          Number.isFinite(weight) &&
          weight >= 0 &&
          weight <= 10
        ) {
          categoryWeights[category as PatternCategory] = weight
        }
      }
    }
    return { patternOverrides, categoryWeights }
  } catch (error) {
    console.error("Could not load saved trend-pattern preferences:", error)
    return { patternOverrides: {}, categoryWeights: {} }
  }
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`
}

function formatSignedPercent(value: number | null): string {
  if (value === null) return "—"
  const percent = value * 100
  return `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
    </div>
  )
}

function AccuracyCard({ label, metric }: { label: string; metric: { predictions: number; hits: number; accuracy: number | null } }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{formatPercent(metric.accuracy)}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">{metric.hits}/{metric.predictions} held-out forecasts</p>
    </div>
  )
}

export function TrendPatternAnalysis({ results }: { results: GameResult[] }) {
  const [preferences, setPreferences] = useState<TrendPreferences>(loadPreferences)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<PatternCategory | "">("")
  const [windowFilter, setWindowFilter] = useState<number | "">("")
  const [enabledFilter, setEnabledFilter] = useState<"all" | "enabled" | "disabled">("all")
  const [page, setPage] = useState(1)
  const [backtest, setBacktest] = useState<{
    result: WalkForwardBacktest
    configurationKey: string
  } | null>(null)
  const [backtestError, setBacktestError] = useState<string | null>(null)
  const [backtestRunning, setBacktestRunning] = useState(false)
  const backtestController = useRef<AbortController | null>(null)

  const registry = useMemo(
    () => createPatternRegistry(preferences.patternOverrides),
    [preferences.patternOverrides],
  )
  const analysis: Analysis = useMemo(
    () =>
      analyzeTrendPatterns(results, {
        targetPeriod: null,
        overrides: preferences.patternOverrides,
        categoryWeights: preferences.categoryWeights,
      }),
    [results, preferences],
  )
  const evaluationById = useMemo(
    () => new Map(analysis.evaluations.map((evaluation) => [evaluation.patternId, evaluation])),
    [analysis.evaluations],
  )
  const preferenceKey = JSON.stringify(preferences)
  const dataKey = results.map((result) => result.period).join("|")
  const activeBacktest =
    backtest?.configurationKey === `${preferenceKey}:${dataKey}` ? backtest.result : null

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.error("Could not save trend-pattern preferences:", error)
    }
  }, [preferences])

  useEffect(() => () => backtestController.current?.abort(), [])

  const filteredPatterns = useMemo(() => {
    const query = search.trim().toLowerCase()
    return registry.filter((pattern) => {
      const evaluation = evaluationById.get(pattern.patternId)
      const matchesQuery =
        !query ||
        pattern.patternId.toLowerCase().includes(query) ||
        pattern.patternName.toLowerCase().includes(query) ||
        pattern.category.toLowerCase().includes(query)
      const matchesCategory = !categoryFilter || pattern.category === categoryFilter
      const matchesWindow = !windowFilter || pattern.lookbackWindow === windowFilter
      const matchesEnabled =
        enabledFilter === "all" ||
        (enabledFilter === "enabled" && pattern.enabled) ||
        (enabledFilter === "disabled" && !pattern.enabled)
      return matchesQuery && matchesCategory && matchesWindow && matchesEnabled && Boolean(evaluation)
    })
  }, [registry, evaluationById, search, categoryFilter, windowFilter, enabledFilter])

  const pageCount = Math.max(1, Math.ceil(filteredPatterns.length / PAGE_SIZE))
  const visiblePatterns = filteredPatterns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const sufficientEvaluations = analysis.evaluations.filter(
    (evaluation) => evaluation.dataSufficiency === "sufficient",
  )
  const strongSignals = sufficientEvaluations.filter(
    (evaluation) => evaluation.signal !== null && Math.abs(evaluation.signal) >= 0.5,
  ).length
  const weakSignals = sufficientEvaluations.filter(
    (evaluation) => evaluation.signal !== null && Math.abs(evaluation.signal) < 0.1,
  ).length

  const updatePattern = (patternId: string, patch: PatternOverride) => {
    setPreferences((current) => {
      const existing = current.patternOverrides[patternId] ?? {}
      const nextOverride = { ...existing, ...patch }
      const patternOverrides = { ...current.patternOverrides }
      if (nextOverride.enabled === true && nextOverride.weight === 1) delete patternOverrides[patternId]
      else patternOverrides[patternId] = nextOverride
      return { ...current, patternOverrides }
    })
  }

  const updateCategoryWeight = (category: PatternCategory, weight: number) => {
    setPreferences((current) => {
      const categoryWeights = { ...current.categoryWeights }
      if (weight === 1) delete categoryWeights[category]
      else categoryWeights[category] = weight
      return { ...current, categoryWeights }
    })
  }

  const runBacktest = async () => {
    setBacktestError(null)
    setBacktestRunning(true)
    backtestController.current?.abort()
    const controller = new AbortController()
    backtestController.current = controller
    try {
      const result = await runTrendWalkForwardBacktestAsync(results, {
        overrides: preferences.patternOverrides,
        categoryWeights: preferences.categoryWeights,
        signal: controller.signal,
      })
      if (!controller.signal.aborted) {
        setBacktest({ result, configurationKey: `${preferenceKey}:${dataKey}` })
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        console.error("Walk-forward backtest failed:", error)
        setBacktestError(error instanceof Error ? error.message : "Unable to run the backtest")
      }
    } finally {
      if (backtestController.current === controller) {
        backtestController.current = null
        setBacktestRunning(false)
      }
    }
  }

  const resetPreferences = () => {
    const defaults = { patternOverrides: {}, categoryWeights: {} }
    setPreferences(defaults)
    try {
      window.localStorage.removeItem(PREFERENCES_KEY)
    } catch (error) {
      console.error("Could not reset trend-pattern preferences:", error)
    }
  }

  const familyEntries = Object.entries(PATTERN_FAMILY_CONFIG) as [PatternCategory, (typeof PATTERN_FAMILY_CONFIG)[PatternCategory]][]
  const uniqueWindows = [...new Set(registry.map((pattern) => pattern.lookbackWindow))].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      <section className="bd-analysis-surface rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-blue-50/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-700">Trend analysis lab</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">2,000-pattern research engine</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
              All inputs are completed source results. Scores are relative evidence, not probabilities or guarantees.
            </p>
          </div>
          <button
            type="button"
            onClick={runBacktest}
            disabled={backtestRunning || results.length < 6}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 ${backtestRunning ? "animate-pulse" : ""}`} />
            {backtestRunning ? "Backtesting…" : "Run walk-forward backtest"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard label="Patterns" value={String(analysis.patternCount)} detail={`${analysis.activePatternCount} enabled · ${analysis.disabledPatternCount} disabled`} />
          <MetricCard label="With evidence" value={String(sufficientEvaluations.length)} detail="At current data cutoff" />
          <MetricCard label="Strong signals" value={String(strongSignals)} detail="Absolute relative score ≥ 0.50" />
          <MetricCard label="Weak signals" value={String(weakSignals)} detail="Absolute relative score < 0.10" />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
          <span>{analysis.includedRecordCount} valid completed results loaded</span>
          <span>Data cutoff: {analysis.dataCutoffPeriod ?? "Unavailable"}</span>
          <span>Target period: Not supplied</span>
          <span>{analysis.evaluatedPatternCount} pattern definitions processed</span>
        </div>

        {analysis.lowConfidence && (
          <div role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">LOW CONFIDENCE — descriptive evidence only</p>
              <p className="mt-1 leading-relaxed">A supported Top 3 is withheld when fewer than three candidates have eligible evidence. Out-of-sample rank hit rates require at least 30 forecasts.</p>
            </div>
          </div>
        )}
        {analysis.limitations.map((limitation) => (
          <p key={limitation} className="mt-2 text-[10px] leading-relaxed text-slate-500">{limitation}</p>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Top 3 candidate numbers</h3>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Candidates are ranked from normalized family evidence; related variants are averaged, not counted as independent votes.</p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Next period not supplied</span>
        </div>
        {analysis.topThree.length ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {analysis.topThree.map((candidate, index) => {
              const calibration = activeBacktest?.calibrationByRank[(index + 1) as 1 | 2 | 3]
              return (
                <article key={candidate.number} className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Rank {index + 1}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-500">{candidate.size.toUpperCase()}</span>
                  </div>
                  <p className="mt-1 text-3xl font-black text-slate-900">{candidate.number}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Candidate colour: {candidate.mappedColours?.join(" + ") ?? "Unknown — no verified mapping"}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-blue-100 pt-2">
                    <div><p className="text-[9px] text-slate-500">Evidence score</p><p className="text-xs font-bold text-slate-800">{candidate.score?.toFixed(3) ?? "—"}</p></div>
                    <div><p className="text-[9px] text-slate-500">Signal agreement</p><p className="text-xs font-bold text-slate-800">{formatPercent(candidate.signalAgreement)}</p></div>
                    <div><p className="text-[9px] text-slate-500">Supporting variants</p><p className="text-xs font-bold text-slate-800">{candidate.supportingPatternCount}</p></div>
                    <div><p className="text-[9px] text-slate-500">Historical sample</p><p className="text-xs font-bold text-slate-800">{candidate.historicalSampleCount}</p></div>
                  </div>
                  <p className="mt-2 text-[9px] text-slate-500">
                    {calibration?.hitRate === null || !calibration
                      ? "Calibrated rank hit rate unavailable"
                      : `Out-of-sample rank hit rate ${(calibration.hitRate * 100).toFixed(1)}% · n=${calibration.sampleCount}`}
                  </p>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
            No supported Top 3 yet. More completed historical records are required.
          </p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">Number analysis</h3>
          <p className="mt-1 text-[10px] text-slate-500">Observed frequency, recent momentum and time since last seen.</p>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {Array.from({ length: 10 }, (_, number) => {
              const count = analysis.numberTrends.counts[number] ?? 0
              const momentum = analysis.numberTrends.momentum[number]
              const gap = analysis.numberTrends.gaps[number]
              return (
                <div key={number} className="rounded-lg bg-slate-50 p-2 text-center">
                  <p className="text-sm font-extrabold text-slate-800">{number}</p>
                  <p className="text-[9px] text-slate-500">{count}×</p>
                  <p className="text-[8px] text-slate-500">{formatSignedPercent(momentum)}</p>
                  <p className="text-[8px] text-slate-400">{gap === null ? "not seen" : `${gap} ago`}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[9px]">
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Hot: {analysis.numberTrends.hotNumbers.join(", ") || "—"}</span>
            <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">Cold: {analysis.numberTrends.coldNumbers.join(", ") || "—"}</span>
            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Longest gaps: {analysis.numberTrends.overdueNumbers.join(", ") || "—"}</span>
          </div>
          <p className="mt-2 text-[9px] text-slate-500">“Overdue” means only that a number has not appeared recently; it does not mean the number is due.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">Colour analysis</h3>
          <p className="mt-1 text-[10px] text-slate-500">API-reported memberships; a result may contain multiple colours.</p>
          <div className="mt-3 space-y-3">
            {analysis.colourTrends.outcomes.map((item) => (
              <div key={item.colour}>
                <div className="mb-1 flex justify-between text-[10px]">
                  <span className="font-semibold capitalize text-slate-700">{item.colour}</span>
                  <span className="text-slate-500">{item.membershipCount} memberships · {formatPercent(item.shareOfResults)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${item.colour === "red" ? "bg-rose-500" : item.colour === "green" ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${Math.min(100, (item.shareOfResults ?? 0) * 100)}%` }} />
                </div>
                <p className="mt-1 text-[9px] text-slate-500">Recent momentum {formatSignedPercent(item.recentMomentum)} · current membership streak {item.currentStreak} · transition support {item.transitionSupport}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[9px] leading-relaxed text-slate-500">Membership shares are per result and may sum above 100%. Exact combined outcomes are tracked separately.</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(analysis.colourTrends.combinedOutcomeCounts).slice(0, 6).map(([outcome, count]) => (
              <span key={outcome} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-600">{outcome || "unknown"} · {count}</span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
          <h3 className="text-sm font-bold text-slate-900">BIG / SMALL analysis</h3>
          <p className="mt-1 text-[10px] text-slate-500">Derived from your rule: SMALL 0–4; BIG 5–9. Source records remain unchanged.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {analysis.sizeTrends.outcomes.map((item) => (
              <div key={item.size} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-800">{item.size}</span>
                  <span className="text-xs font-semibold text-blue-700">{item.count} · {formatPercent(item.share)}</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Current streak {item.currentStreak} · next-transition support {item.transitionSupport}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Walk-forward backtest</h3>
            <p className="mt-1 text-[10px] text-slate-500">Each forecast uses only records before its target period; results use the currently loaded history.</p>
          </div>
          {backtestRunning && <span role="status" className="text-[10px] font-semibold text-blue-700">Calculating held-out forecasts…</span>}
        </div>
        {backtestError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{backtestError}</p>}
        {activeBacktest ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <AccuracyCard label="Number Top 1" metric={activeBacktest.numberTop1} />
              <AccuracyCard label="Number Top 3" metric={activeBacktest.numberTop3} />
              <AccuracyCard label="Colour membership" metric={activeBacktest.colourTop1Membership} />
              <AccuracyCard label="BIG / SMALL" metric={activeBacktest.sizeTop1} />
            </div>
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold text-slate-700">Number frequency baseline comparison</p>
              <p className="mt-1 text-[10px] text-slate-600">
                Top 1 {formatPercent(activeBacktest.numberFrequencyBaselineTop1.accuracy)} · Top 3 {formatPercent(activeBacktest.numberFrequencyBaselineTop3.accuracy)} · {activeBacktest.evaluatedForecasts} evaluated / {activeBacktest.skippedForecasts} skipped forecasts
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <details className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-[11px] font-bold text-slate-700">Category performance</summary>
                <div className="mt-2 space-y-1">
                  {Object.entries(activeBacktest.categoryPerformance).map(([category, metric]) => (
                    <p key={category} className="flex justify-between gap-2 text-[10px] text-slate-600"><span>{category}</span><span>{formatPercent(metric.accuracy)} · n={metric.predictions}</span></p>
                  ))}
                </div>
              </details>
              <details className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-[11px] font-bold text-slate-700">Window performance</summary>
                <div className="mt-2 space-y-1">
                  {Object.entries(activeBacktest.windowPerformance).sort(([left], [right]) => Number(left) - Number(right)).map(([window, metric]) => (
                    <p key={window} className="flex justify-between gap-2 text-[10px] text-slate-600"><span>{window} record window</span><span>{formatPercent(metric.accuracy)} · n={metric.predictions}</span></p>
                  ))}
                </div>
              </details>
            </div>
            {activeBacktest.limitations.map((limitation) => (
              <p key={limitation} className="mt-2 text-[9px] leading-relaxed text-slate-500">{limitation}</p>
            ))}
          </>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
            {backtest ? "The data or configuration changed; rerun the backtest for current settings." : "No accuracy is claimed before a walk-forward backtest is run."}
          </p>
        )}
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">Category weights</summary>
        <p className="mt-1 text-[10px] text-slate-500">Weights scale a family within its evidence cluster. Related window/profile variants are normalized before cluster aggregation.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {familyEntries.map(([category]) => (
            <label key={category} className="space-y-1 text-[9px] font-semibold text-slate-600">
              <span className="block truncate">{category}</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                aria-label={`${category} weight`}
                value={preferences.categoryWeights[category] ?? 1}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isFinite(value) && value >= 0 && value <= 10) updateCategoryWeight(category, value)
                }}
                className="h-8 w-full rounded-md border border-slate-200 px-2 text-xs text-slate-800"
              />
            </label>
          ))}
        </div>
        <button type="button" onClick={resetPreferences} className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50">Reset all pattern settings</button>
      </details>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Pattern explorer</h3>
            <p className="mt-1 text-[10px] text-slate-500">Search IDs, categories or names; adjust each pattern’s enabled state and weight.</p>
          </div>
          <span className="text-[10px] text-slate-500">{filteredPatterns.length} matching patterns</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <label className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search ID, name or category" className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-xs text-slate-800 outline-none focus:border-blue-500" />
          </label>
          <select aria-label="Filter by pattern category" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value as PatternCategory | ""); setPage(1) }} className="h-9 rounded-lg border border-slate-200 px-2 text-xs text-slate-700">
            <option value="">All categories</option>
            {familyEntries.map(([category]) => <option key={category} value={category}>{category}</option>)}
          </select>
          <div className="flex gap-2">
            <select aria-label="Filter by lookback window" value={windowFilter} onChange={(event) => { setWindowFilter(event.target.value ? Number(event.target.value) : ""); setPage(1) }} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-700">
              <option value="">All windows</option>
              {uniqueWindows.map((window) => <option key={window} value={window}>{window} rounds</option>)}
            </select>
            <select aria-label="Filter by enabled status" value={enabledFilter} onChange={(event) => { setEnabledFilter(event.target.value as typeof enabledFilter); setPage(1) }} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-700">
              <option value="all">All</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {visiblePatterns.map((pattern) => {
            const evaluation = evaluationById.get(pattern.patternId)
            const performance = activeBacktest?.patternPerformance[pattern.patternId]
            return (
              <article key={pattern.patternId} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-blue-700">{pattern.patternId}</span>
                    <span className="text-[10px] font-semibold text-slate-700">{pattern.patternName}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] text-slate-500">{pattern.category}</span>
                  </div>
                  <p className="mt-1 text-[9px] leading-relaxed text-slate-500" title={pattern.featureDefinition}>
                    Window {pattern.lookbackWindow} · threshold {pattern.threshold} · {pattern.profile} · {pattern.featureType}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-500">
                    {evaluation?.dataSufficiency === "sufficient"
                      ? `Signal ${evaluation.signal?.toFixed(2) ?? "—"} · ${evaluation.direction} · n=${evaluation.sampleCount}`
                      : `${evaluation?.dataSufficiency.replaceAll("_", " ") ?? "unavailable"} · sample ${evaluation?.sampleCount ?? 0}`}
                    {performance && performance.predictions > 0
                      ? ` · OOS ${formatPercent(performance.accuracy)} (${performance.predictions})`
                      : ""}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                  <input type="checkbox" checked={pattern.enabled} onChange={(event) => updatePattern(pattern.patternId, { enabled: event.target.checked })} />
                  Enabled
                </label>
                <label className="flex items-center gap-1 text-[9px] text-slate-500">
                  Weight
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    aria-label={`${pattern.patternId} weight`}
                    value={pattern.weight}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (Number.isFinite(value) && value >= 0 && value <= 10) updatePattern(pattern.patternId, { weight: value })
                    }}
                    className="h-7 w-16 rounded border border-slate-200 px-1.5 text-xs text-slate-800"
                  />
                </label>
              </article>
            )
          })}
          {!visiblePatterns.length && <p className="p-5 text-center text-xs text-slate-500">No patterns match these filters.</p>}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px] text-slate-500">Showing {visiblePatterns.length} of {filteredPatterns.length} · catalog {TREND_PATTERN_COUNT}</p>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous pattern page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-[10px] text-slate-600">Page {page}/{pageCount}</span>
            <button type="button" aria-label="Next pattern page" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
    </div>
  )
}

"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Activity, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Clock3, Database, RefreshCw, ShieldAlert, Wifi, WifiOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AccessLogin } from "@/components/user-access/access-login"
import { useAdminSettings } from "@/hooks/use-admin-settings"
import { useGameData } from "@/hooks/use-game-data"
import { useUserAccess } from "@/hooks/use-user-access"
import { useSettings } from "@/contexts/settings-context"
import { buildHistoricalFeatureSnapshot } from "@/lib/intelligence/features"
import { TrendPatternAnalysis } from "@/components/prediction/trend-pattern-analysis"
import type { GameResult } from "@/lib/types"

type ScreenTab = "draws" | "plans" | "news"
type PlanTab = "bigSmall" | "colour" | "fiveNumbers" | "sevenNumbers"

const COLORS = {
  red: { label: "Red", dot: "bg-rose-500", text: "text-rose-600" },
  green: { label: "Green", dot: "bg-emerald-500", text: "text-emerald-600" },
  violet: { label: "Violet", dot: "bg-violet-500", text: "text-violet-600" },
} as const

const PLAN_TABS: { id: PlanTab; label: string }[] = [
  { id: "bigSmall", label: "B/S" },
  { id: "colour", label: "Color" },
  { id: "fiveNumbers", label: "5 Nums" },
  { id: "sevenNumbers", label: "7 Nums" },
]

const subscribeToMountedState = () => () => {}
const getMountedSnapshot = () => true
const getServerMountedSnapshot = () => false

function getColors(result: GameResult): ("red" | "green" | "violet")[] {
  return result.colors?.length ? result.colors : [result.color]
}

function formatCountdown(value: number): string {
  const seconds = Math.max(0, Math.floor(value))
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

function ResultNumber({ result }: { result: GameResult }) {
  const colors = getColors(result)
  const primary = COLORS[colors[0] ?? "violet"]
  const gradient = colors.length > 1
    ? `linear-gradient(135deg, ${colors.map((color) => ({ red: "#f43f5e", green: "#10b981", violet: "#8b5cf6" })[color]).join(", ")})`
    : undefined

  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-bold text-white shadow-sm ${gradient ? "" : primary.dot}`}
      style={gradient ? { background: gradient } : undefined}
      aria-label={`Number ${result.number}; ${colors.join(" and ")}`}
    >
      {result.number}
    </span>
  )
}

function ConnectionNotice({
  loading,
  error,
  refreshedAt,
  onRefresh,
}: {
  loading: boolean
  error: string | null
  refreshedAt: number | null
  onRefresh: () => void
}) {
  return (
    <section className="flex items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm" aria-live="polite">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${error ? "bg-rose-100 text-rose-600" : "bg-sky-100 text-sky-700"}`}>
          {error ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">{error ? "Data connection issue" : loading && !refreshedAt ? "Connecting to source…" : "Historical source"}</p>
          <p className="truncate text-[11px] text-slate-500">
            {error || (refreshedAt ? `Updated ${new Date(refreshedAt).toLocaleTimeString()}` : "Waiting for first successful response")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh historical results"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </button>
    </section>
  )
}

export function WinGo1mPredictionPage() {
  const { isLoading: userLoading, login, isLoggedIn } = useUserAccess()
  const { settings: adminSettings } = useAdminSettings()
  const { settings } = useSettings()
  const {
    results,
    latestResult,
    loading,
    error,
    refetch,
    nextRoundCountdown,
    lastSuccessfulSyncAt,
    duplicateRecords,
    rejectedRecordCount,
    periodLifecycle,
  } = useGameData()
  const [activeTab, setActiveTab] = useState<ScreenTab>("draws")
  const [activePlan, setActivePlan] = useState<PlanTab>("colour")
  const [gamePickerOpen, setGamePickerOpen] = useState(false)
  const [periodSearch, setPeriodSearch] = useState("")
  const [numberFilter, setNumberFilter] = useState("")
  const [colorFilter, setColorFilter] = useState("")
  const [historyPage, setHistoryPage] = useState(1)
  const mounted = useSyncExternalStore(
    subscribeToMountedState,
    getMountedSnapshot,
    getServerMountedSnapshot,
  )

  const featureSnapshot = useMemo(() => {
    if (!latestResult) return null
    return buildHistoricalFeatureSnapshot(results, latestResult.period, { windowSize: 50 })
  }, [latestResult, results])

  const filteredResults = useMemo(() => results.filter((result) => {
    const matchesPeriod = result.period.toLowerCase().includes(periodSearch.trim().toLowerCase())
    const matchesNumber = numberFilter === "" || result.number === Number(numberFilter)
    const matchesColor = colorFilter === "" || getColors(result).includes(colorFilter as "red" | "green" | "violet")
    return matchesPeriod && matchesNumber && matchesColor
  }), [results, periodSearch, numberFilter, colorFilter])
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filteredResults.length / pageSize))
  const visibleResults = filteredResults.slice((historyPage - 1) * pageSize, historyPage * pageSize)

  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setHistoryPage(1)
  }

  const rankedNumbers = featureSnapshot
    ? Object.entries(featureSnapshot.features.numberDistribution.value.counts)
        .sort(([leftNumber, leftCount], [rightNumber, rightCount]) => rightCount - leftCount || Number(leftNumber) - Number(rightNumber))
    : []
  const numberLimit = activePlan === "fiveNumbers" ? 5 : 7
  const canShowCountdown = Boolean(lastSuccessfulSyncAt && !error && latestResult && periodLifecycle?.targetPeriodId)
  const colorDistribution = featureSnapshot?.features.colorMembershipDistribution.value

  if (!mounted || userLoading) {
    return <main className="grid min-h-screen place-items-center bg-[#f1f3f8] p-6 text-sm text-slate-600">Loading access…</main>
  }

  if (!isLoggedIn && adminSettings.requireAccessCode) {
    return <AccessLogin onLogin={login} />
  }

  if (settings.isMaintenanceMode) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f1f3f8] p-6 text-center">
        <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Scheduled maintenance</h1>
          <p className="mt-3 text-sm text-slate-600">{settings.technicalMessage || "The service is temporarily unavailable."}</p>
          <Link href="/admin" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Admin access</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="black-diamond-surface min-h-screen px-0 text-slate-900 sm:px-4 sm:py-5">
      <div className="wingo-mobile-shell relative mx-auto flex min-h-screen w-full max-w-130 flex-col overflow-hidden shadow-xl sm:min-h-[calc(100vh-2.5rem)] sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 text-white">
          <Link href="/" className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/20 text-sm font-black">M</span>
            <span className="truncate text-lg font-bold tracking-tight">My Hack</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Account
            </Link>
            <span className="rounded-full bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold" aria-label="Language: English">EN</span>
          </div>
        </header>

        <section className="wingo-hero relative mx-3 overflow-hidden rounded-[22px] border border-white/50 px-5 py-4 shadow-sm">
          <div aria-hidden="true" className="pointer-events-none absolute -right-7 -top-8 h-36 w-36 rounded-full border-18 border-blue-200/35" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-13 right-16 h-28 w-28 rounded-full bg-cyan-200/30 blur-xl" />
          <div className="relative max-w-71.25">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">WinGo 1M · Research view</p>
            <h1 className="mt-1 text-[21px] font-extrabold leading-tight text-[#32499d]">Historical results, clearly presented</h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">Actual source data only. Past outcomes do not guarantee future results.</p>
          </div>
        </section>

        <section className="mx-3 mt-3 grid grid-cols-[0.9fr_1.1fr] gap-2.5" aria-label="Game period and countdown">
          <div className="flex min-w-0 items-center gap-2 rounded-[18px] border border-white/80 bg-white/95 p-3 shadow-sm">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-orange-300 to-blue-500 text-white shadow-inner">
              <span className="text-lg font-black">1M</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold leading-tight text-slate-800">Win Go<br />1min</p>
              <button
                type="button"
                onClick={() => setGamePickerOpen(true)}
                className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                aria-haspopup="dialog"
              >
                more <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-[18px] border border-white/80 bg-white/95 px-3 py-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500">Time remaining</p>
              <p className="mt-1 text-[10px] text-slate-400">{canShowCountdown ? "Source-clock estimate" : latestResult ? "Waiting for source period ID" : "Waiting for live data"}</p>
            </div>
            <p className="font-mono text-[25px] font-bold tracking-[0.08em] text-rose-500" aria-live="off">
              {canShowCountdown ? formatCountdown(nextRoundCountdown) : "--:--"}
            </p>
          </div>
        </section>

        <div className="mx-3 mt-3 flex items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/65 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Clock3 className="h-4 w-4 shrink-0 text-blue-700" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Current source period</p>
              <p className="truncate font-mono text-xs font-bold text-slate-800">{latestResult?.period ?? (loading ? "Loading…" : "Unavailable")}</p>
            </div>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Next period</p>
            <p className="text-xs font-semibold text-slate-700">Not supplied</p>
          </div>
        </div>

        <ConnectionNotice loading={loading} error={error} refreshedAt={lastSuccessfulSyncAt} onRefresh={() => void refetch()} />

        <section className="mx-3 mb-3 mt-3 flex-1 rounded-[20px] border border-white/90 bg-white/95 p-3.5 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-700">
                {activeTab === "draws" ? "Verified source" : activeTab === "plans" ? "Analysis status" : "Updates"}
              </p>
              <h2 className="mt-0.5 text-base font-extrabold text-slate-800">
                {activeTab === "draws" ? "Draws" : activeTab === "plans" ? "Plans" : "News"}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
              {activeTab === "draws" ? <Database className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
              {activeTab === "draws" ? `${results.length} loaded` : "Source-backed"}
            </span>
          </div>

          {activeTab === "draws" && (
            <div className="space-y-3">
              {latestResult && (
                <section className="wingo-result-surface rounded-2xl bg-linear-to-r from-blue-50 to-indigo-50 p-3.5" aria-label="Latest actual result">
                  <div className="flex items-center gap-3">
                    <ResultNumber result={latestResult} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Latest actual result</p>
                      <p className="truncate font-mono text-xs font-semibold text-slate-700">Period {latestResult.period}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {getColors(latestResult).map((color) => (
                          <span key={color} className={`inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold ${COLORS[color].text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${COLORS[color].dot}`} />{COLORS[color].label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-slate-500">Big / Small</p>
                      <p className="text-xs font-bold text-slate-500">{latestResult.size ?? "Unknown"}</p>
                    </div>
                  </div>
                </section>
              )}

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="space-y-1 text-[10px] font-semibold text-slate-500">
                  Period
                  <input value={periodSearch} onChange={(event) => changeFilter(setPeriodSearch)(event.target.value)} placeholder="Search period" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="space-y-1 text-[10px] font-semibold text-slate-500">
                  Number
                  <select value={numberFilter} onChange={(event) => changeFilter(setNumberFilter)(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    <option value="">All numbers</option>
                    {Array.from({ length: 10 }, (_, number) => <option key={number} value={number}>{number}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-[10px] font-semibold text-slate-500">
                  Colour
                  <select value={colorFilter} onChange={(event) => changeFilter(setColorFilter)(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    <option value="">All colours</option>
                    {Object.entries(COLORS).map(([color, definition]) => <option key={color} value={color}>{definition.label}</option>)}
                  </select>
                </label>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">Per-result dates are unavailable because the source does not supply timestamps. Size remains unknown unless provided by a verified source rule.</p>

              {loading && results.length === 0 ? (
                <div className="space-y-2" aria-label="Loading historical results">
                  {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-14.5 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />)}
                </div>
              ) : visibleResults.length ? (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {visibleResults.map((result) => (
                    <article key={result.period} className="flex items-center gap-3 px-2.5 py-2.5">
                      <ResultNumber result={result} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[11px] font-semibold text-slate-700">{result.period}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">Actual number {result.number} · size {result.size ?? "unknown"}</p>
                      </div>
                      <div className="flex max-w-22.5 flex-wrap justify-end gap-1">
                        {getColors(result).map((color) => <span key={color} title={COLORS[color].label} className={`h-2.5 w-2.5 rounded-full ${COLORS[color].dot}`} />)}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">{loading ? "Loading actual results…" : results.length ? "No results match these filters" : "No actual results available"}</p>
                  <p className="mt-1 text-xs text-slate-500">{error ? "Check the connection and retry." : "Only records returned by the configured source are shown."}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-500">{filteredResults.length} matching · {results.length} loaded</p>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Previous results page" disabled={historyPage <= 1} onClick={() => setHistoryPage((page) => page - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-14 text-center text-[10px] text-slate-600">Page {historyPage}/{pageCount}</span>
                  <button type="button" aria-label="Next results page" disabled={historyPage >= pageCount} onClick={() => setHistoryPage((page) => page + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                <span>Duplicates skipped: {duplicateRecords ?? "—"}</span>
                <span>Rejected in latest response: {rejectedRecordCount ?? "—"}</span>
              </div>
            </div>
          )}

          {activeTab === "plans" && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Analysis market">
                {PLAN_TABS.map((tab) => (
                  <button key={tab.id} type="button" role="tab" aria-selected={activePlan === tab.id} onClick={() => setActivePlan(tab.id)} className={`min-h-9 rounded-lg px-1 text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-blue-600 ${activePlan === tab.id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div role="tabpanel" className="space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Agent consensus unavailable</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-800">The 150-agent registry, independent votes, saved prediction snapshots and correlation checks are not implemented. This view will not simulate votes or label history as a prediction.</p>
                    </div>
                  </div>
                </div>

                <TrendPatternAnalysis results={results} />

                {activePlan === "bigSmall" ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-800">Big / Small is unavailable</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">The current source does not provide size, and an official classification rule is not configured. Outcomes remain unknown; no size prediction is shown.</p>
                  </div>
                ) : activePlan === "colour" ? (
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800">Historical colour membership</p>
                      <span className="text-[10px] text-slate-500">Before latest period</span>
                    </div>
                    {colorDistribution && colorDistribution.sampleSize > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(COLORS).map(([color, definition]) => {
                          const count = colorDistribution.counts[color] ?? 0
                          const share = colorDistribution.shares[color]
                          return (
                            <div key={color} className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${definition.dot}`} />
                              <span className="w-12 text-xs font-semibold text-slate-700">{definition.label}</span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${definition.dot}`} style={{ width: `${Math.min(100, (share ?? 0) * 100)}%` }} /></div>
                              <span className="w-16 text-right text-[10px] text-slate-600">{count} · {share === null ? "—" : `${(share * 100).toFixed(1)}%`}</span>
                            </div>
                          )
                        })}
                        <p className="pt-1 text-[10px] leading-relaxed text-slate-500">A result may include multiple colours. Shares are among colour memberships, not mutually exclusive result probabilities.</p>
                      </div>
                    ) : <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Historical sample is not yet available.</p>}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800">Historical number frequency</p>
                      <span className="text-[10px] text-slate-500">Not a prediction</span>
                    </div>
                    {featureSnapshot && featureSnapshot.includedRecordCount > 0 ? (
                      <div className="grid grid-cols-5 gap-2">
                        {rankedNumbers.slice(0, numberLimit).map(([number, count], index) => (
                          <div key={number} className="rounded-xl bg-slate-50 px-2 py-2 text-center">
                            <span className="block text-[9px] font-bold text-blue-700">#{index + 1}</span>
                            <span className="block text-lg font-extrabold text-slate-800">{number}</span>
                            <span className="block text-[9px] text-slate-500">{count} times</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Historical sample is not yet available.</p>}
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Ranked only by observed frequency before the latest actual result. This is descriptive and has no claim of predictive probability.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-lg bg-slate-50 p-2.5"><span className="block text-slate-500">Eligible agents</span><strong className="mt-0.5 block text-slate-700">Unavailable</strong></div>
                  <div className="rounded-lg bg-slate-50 p-2.5"><span className="block text-slate-500">Target period</span><strong className="mt-0.5 block text-slate-700">Not supplied</strong></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "news" && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
              <p className="text-sm font-bold text-slate-700">No news source connected</p>
              <p className="mt-1 text-xs text-slate-500">Updates will appear here only when a verified source is configured.</p>
            </div>
          )}
        </section>

        <nav className="sticky bottom-0 z-10 mx-3 mb-3 grid grid-cols-3 rounded-2xl border border-white/80 bg-white/95 p-1 shadow-lg backdrop-blur" aria-label="WinGo 1M sections">
          {(["draws", "plans", "news"] as const).map((tab) => (
            <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => setActiveTab(tab)} className={`min-h-11 rounded-xl text-sm font-extrabold capitalize transition focus-visible:outline-2 focus-visible:outline-blue-600 ${activeTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"}`}>
              {tab}
            </button>
          ))}
        </nav>

        <Dialog open={gamePickerOpen} onOpenChange={setGamePickerOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Game schedule</DialogTitle>
              <DialogDescription>Only the verified Win Go 1min history source is connected in My Hack.</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800" aria-current="true">Win Go 1min · Current section</div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Activity,
  Bell,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Crown,
  Database,
  Download,
  Gem,
  LayoutDashboard,
  LineChart,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  PanelLeft,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  UserRound,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Ruler,
} from "lucide-react"
import { useGameData } from "@/hooks/use-game-data"
import { usePredictions } from "@/hooks/use-predictions"
import { useAdvancedAnalytics } from "@/hooks/use-advanced-analytics"
import { useUserAccess } from "@/hooks/use-user-access"
import { useSubscription } from "@/hooks/use-subscription"
import { useSound } from "@/hooks/use-sound"
import { useSettings } from "@/contexts/settings-context"
import { useAdminSettings } from "@/hooks/use-admin-settings"
import { useTheme } from "@/contexts/theme-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { AccessLogin } from "@/components/user-access/access-login"
import { SubscriptionUpgrade } from "@/components/subscription/subscription-upgrade"
import { PredictionDisplay } from "@/components/prediction-display"
import { PredictionHistory } from "@/components/prediction-history"
import { GameSessionSelector } from "@/components/platform/game-session-selector"
import { DynamicGameResult } from "@/components/platform/dynamic-game-result"
import { DynamicGamePrediction } from "@/components/platform/dynamic-game-prediction"
import { TechnicalMessageDisplay } from "@/components/technical-message-display"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { Heatmap } from "@/components/dashboard/heatmap"
import { PerformanceMetrics } from "@/components/analytics/performance-metrics"
import { FrequencyChart } from "@/components/charts/frequency-chart"
import { TrendChart } from "@/components/charts/trend-chart"
import { ConnectionStatus } from "@/components/connection-status"
import { ProfitLockPanel } from "@/components/profit-lock/profit-lock-panel"
import { useProfitLock } from "@/hooks/use-profit-lock"
import { AnimatedCounter } from "@/components/effects/animated-counter"
import { TrendPatternAnalysis } from "@/components/prediction/trend-pattern-analysis"
import { SequenceExplorer } from "@/components/analytics/sequence-explorer"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { GameResult } from "@/lib/types"
import { sizeFromNumber } from "@/lib/trend-pattern-engine"
import { analyzeHistoricalSequences } from "@/lib/intelligence/sequences"
import { detectHistoricalAnomalies } from "@/lib/intelligence/anomalies"

type View = "dashboard" | "predictions" | "history" | "analytics" | "advanced" | "charts" | "notifications" | "settings" | "profile" | "pattern-intelligence" | "colour-analytics" | "size-analytics" | "backtesting" | "sequence-explorer"

type DashboardPreferences = {
  visibleWidgets: string[]
  widgetOrder: string[]
}

type AlertPreferences = {
  newResult: boolean
  syncFailure: boolean
  selectedColor: string
}

const DASHBOARD_WIDGETS = [
  { id: "prediction", label: "Latest prediction" },
  { id: "command", label: "Live source overview" },
  { id: "actual", label: "Latest actual result" },
  { id: "stats", label: "Performance overview" },
]

const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Prediction Panel", icon: LayoutDashboard },
  { id: "analytics", label: "Analysis", icon: BarChart3 },
  { id: "predictions", label: "Prediction", icon: Sparkles },
  { id: "history", label: "History", icon: Clock3 },
  { id: "pattern-intelligence", label: "Pattern intelligence", icon: Brain },
  { id: "colour-analytics", label: "Colour analytics", icon: Activity },
  { id: "size-analytics", label: "Size analytics", icon: Ruler },
  { id: "sequence-explorer", label: "Sequence explorer", icon: Activity },
  { id: "backtesting", label: "Backtesting", icon: LineChart },
  { id: "advanced", label: "Advanced analytics", icon: Database },
  { id: "charts", label: "Charts", icon: LineChart },
  { id: "notifications", label: "Smart alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "profile", label: "Profile", icon: UserRound },
]

const NAV_GROUPS: { label: string; ids: View[] }[] = [
  { label: "Overview", ids: ["dashboard", "predictions", "history"] },
  {
    label: "Intelligence",
    ids: ["analytics", "pattern-intelligence", "colour-analytics", "size-analytics", "sequence-explorer", "backtesting", "advanced", "charts"],
  },
  { label: "Account", ids: ["notifications", "settings", "profile"] },
]

const THEME_PRESETS = [
  { id: "black-diamond", label: "Black Diamond", accent: "#914eff", isDark: true },
  { id: "neon-purple", label: "Cyber Purple", accent: "#9b8cff", isDark: true },
  { id: "neon-blue", label: "Neon Blue", accent: "#38bdf8", isDark: true },
  { id: "aurora", label: "Emerald", accent: "#34d399", isDark: true },
  { id: "midnight", label: "Midnight", accent: "#9b8cff", isDark: true },
  { id: "glassmorphism", label: "Light", accent: "#6366f1", isDark: false },
]

const EMPTY_DASHBOARD_PREFERENCES: DashboardPreferences = {
  visibleWidgets: DASHBOARD_WIDGETS.map(({ id }) => id),
  widgetOrder: DASHBOARD_WIDGETS.map(({ id }) => id),
}

const LEGACY_DEFAULT_WIDGET_ORDER = ["command", "prediction", "actual", "stats"]

const DEFAULT_ALERTS: AlertPreferences = {
  newResult: false,
  syncFailure: false,
  selectedColor: "",
}

function getColorMemberships(result: GameResult): string[] {
  return result.colors?.length ? result.colors : [result.color]
}

function formatPeriod(period: string | null | undefined): string {
  if (!period) return "—"
  return period.length > 3 ? period.slice(-3) : period
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0")
  const secs = (seconds % 60).toString().padStart(2, "0")
  return `${mins}:${secs}`
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export default function JalwaPredictionTool() {
  const { settings } = useSettings()
  const { settings: adminSettings } = useAdminSettings()
  const { currentUser, isLoading: userLoading, login, logout, isLoggedIn } = useUserAccess()
  const { subscription, canAccess } = useSubscription(currentUser?.userId)
  const { results, latestResult, loading, error, refetch, nextRoundCountdown, lastSuccessfulSyncAt, duplicateRecords, periodLifecycle, historyAudit } = useGameData()
  const {
    trendAnalysis,
    statisticalPrediction,
    canonicalCandidates,
    coordinatorOutput,
    predictionStatus,
    settledPrediction,
    stats,
    isAnalyzing,
    updatePredictions,
    recordPredictionResult,
    generateNextPeriodPrediction,
    nextPeriodNumber,
  } = usePredictions()
  const displayedTargetPeriod = periodLifecycle?.targetPeriod ?? null
  const { advancedStats, isCalculating, updateAnalytics } = useAdvancedAnalytics()
  const { play, settings: soundSettings, updateSettings: updateSoundSettings } = useSound()
  const { isLocked: profitLocked } = useProfitLock(currentUser?.userId, currentUser?.name)
  const { currentThemeId, setPersonalPreferences } = useTheme()

  const [activeView, setActiveView] = useState<View>("dashboard")
  const [selectedGameId, setSelectedGameId] = useState("wingo-1m")
  const [selectedSessionId, setSelectedSessionId] = useState("1m")
  const isLegacyPredictionSession = selectedGameId === "wingo-1m" && selectedSessionId === "1m"
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [motionEnabled, setMotionEnabled] = useState(true)
  const [dataRefreshSeconds, setDataRefreshSeconds] = useState(10)
  const [dashboardPreferences, setDashboardPreferences] = useState(EMPTY_DASHBOARD_PREFERENCES)
  const [alerts, setAlerts] = useState(DEFAULT_ALERTS)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default")
  const [accentColor, setAccentColor] = useState("#914eff")
  const [historySearch, setHistorySearch] = useState("")
  const [historyColor, setHistoryColor] = useState("")
  const [historyNumber, setHistoryNumber] = useState("")
  const [historyPage, setHistoryPage] = useState(1)
  const [analyticsWindow, setAnalyticsWindow] = useState(20)
  const [mounted, setMounted] = useState(false)
  const [accessTransition, setAccessTransition] = useState(false)
  const [lastAlertedPeriod, setLastAlertedPeriod] = useState<string | null>(null)
  const [resultReveal, setResultReveal] = useState<(
    | {
        period: string
        number: number
        outcome: "win"
        matchedCandidate: { rank: number; number: number }
      }
    | {
        period: string
        number: number
        outcome: "loss"
        matchedCandidate: null
      }
  ) | null>(null)
  const lastSeenPeriod = useRef<string | null>(null)
  const lastRecordedPeriod = useRef<string | null>(null)
  const lastCelebratedPeriod = useRef<string | null>(null)
  const lastSyncError = useRef<string | null>(null)

  useEffect(() => {
    setMounted(true)
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission)
    } else {
      setNotificationPermission("unsupported")
    }

    try {
      const savedDashboard = localStorage.getItem("myhack:dashboard")
      if (savedDashboard) {
        const parsed = JSON.parse(savedDashboard) as Partial<DashboardPreferences>
        const visibleWidgets = Array.isArray(parsed.visibleWidgets)
          ? DASHBOARD_WIDGETS.map(({ id }) => id).filter((id) => parsed.visibleWidgets?.includes(id))
          : EMPTY_DASHBOARD_PREFERENCES.visibleWidgets
        const storedOrder = Array.isArray(parsed.widgetOrder) ? parsed.widgetOrder : []
        const isLegacyDefaultOrder = storedOrder.length === LEGACY_DEFAULT_WIDGET_ORDER.length
          && LEGACY_DEFAULT_WIDGET_ORDER.every((id, index) => storedOrder[index] === id)
        const preferredOrder = isLegacyDefaultOrder
          ? EMPTY_DASHBOARD_PREFERENCES.widgetOrder
          : storedOrder
        const widgetOrder = [
          ...preferredOrder.filter((id) => DASHBOARD_WIDGETS.some((widget) => widget.id === id)),
          ...DASHBOARD_WIDGETS.map(({ id }) => id).filter((id) => !preferredOrder.includes(id)),
        ]
        setDashboardPreferences({ visibleWidgets, widgetOrder })
      }

      const savedAlerts = localStorage.getItem("myhack:alerts")
      if (savedAlerts) {
        const parsed = JSON.parse(savedAlerts) as Partial<AlertPreferences>
        setAlerts({
          newResult: typeof parsed.newResult === "boolean" ? parsed.newResult : false,
          syncFailure: typeof parsed.syncFailure === "boolean" ? parsed.syncFailure : false,
          selectedColor: ["red", "green", "violet"].includes(parsed.selectedColor ?? "") ? parsed.selectedColor! : "",
        })
      }

      const savedTheme = localStorage.getItem("myhack:theme-preferences")
      if (savedTheme) {
        const parsed = JSON.parse(savedTheme) as { accent?: string }
        if (parsed.accent && /^#[\da-f]{6}$/i.test(parsed.accent)) setAccentColor(parsed.accent)
      }

      const savedSidebarState = localStorage.getItem("black-diamond:sidebar-collapsed")
      if (savedSidebarState === "true") setSidebarCollapsed(true)
      const savedMotion = localStorage.getItem("black-diamond:motion-enabled")
      if (savedMotion === "false") setMotionEnabled(false)
      const savedRefreshInterval = Number(localStorage.getItem("black-diamond:refresh-seconds"))
      if ([10, 30, 60].includes(savedRefreshInterval)) setDataRefreshSeconds(savedRefreshInterval)
    } catch (loadError) {
      console.error("[MyHack] Could not load saved dashboard preferences:", loadError)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem("black-diamond:sidebar-collapsed", String(sidebarCollapsed))
  }, [mounted, sidebarCollapsed])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.classList.toggle("motion-disabled", !motionEnabled)
    localStorage.setItem("black-diamond:motion-enabled", String(motionEnabled))
  }, [motionEnabled, mounted])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem("black-diamond:refresh-seconds", String(dataRefreshSeconds))
    window.dispatchEvent(new CustomEvent("blackDiamondRefreshIntervalChanged", {
      detail: dataRefreshSeconds * 1000,
    }))
  }, [dataRefreshSeconds, mounted])

  useEffect(() => {
    if (mounted) localStorage.setItem("myhack:dashboard", JSON.stringify(dashboardPreferences))
  }, [dashboardPreferences, mounted])

  useEffect(() => {
    if (mounted) localStorage.setItem("myhack:alerts", JSON.stringify(alerts))
  }, [alerts, mounted])

  useEffect(() => {
    if (!settledPrediction || lastCelebratedPeriod.current === settledPrediction.period) return
    lastCelebratedPeriod.current = settledPrediction.period
    setResultReveal(settledPrediction)
  }, [settledPrediction])

  useEffect(() => {
    if (!resultReveal) return
    const timeoutId = window.setTimeout(() => setResultReveal(null), 7000)
    return () => window.clearTimeout(timeoutId)
  }, [resultReveal])

  useEffect(() => {
    if (results.length > 0 && !loading) {
      updatePredictions(results)
      updateAnalytics(results)
    }
  }, [results, loading, updatePredictions, updateAnalytics])

  useEffect(() => {
    if (latestResult && nextPeriodNumber === latestResult.period && lastRecordedPeriod.current !== latestResult.period) {
      lastRecordedPeriod.current = latestResult.period
      recordPredictionResult(latestResult)
    }
  }, [latestResult, nextPeriodNumber, recordPredictionResult])

  useEffect(() => {
    if (periodLifecycle?.targetPeriodId && periodLifecycle.targetPeriodId !== nextPeriodNumber && results.length > 0) {
      void generateNextPeriodPrediction(periodLifecycle.targetPeriodId, results, periodLifecycle.latestCompletedPeriodId)
    }
  }, [periodLifecycle?.targetPeriodId, periodLifecycle?.latestCompletedPeriodId, nextPeriodNumber, results, generateNextPeriodPrediction])

  useEffect(() => {
    if (!latestResult) return
    if (lastSeenPeriod.current === null) {
      lastSeenPeriod.current = latestResult.period
      return
    }
    if (lastSeenPeriod.current === latestResult.period) return

    lastSeenPeriod.current = latestResult.period
    const colorMatches = alerts.selectedColor && getColorMemberships(latestResult).includes(alerts.selectedColor)
    if (!alerts.newResult && !colorMatches) return

    setLastAlertedPeriod(latestResult.period)
    if (notificationPermission === "granted") {
      new Notification("New result available", {
        body: `Period ${formatPeriod(latestResult.period)} · ${latestResult.number} · ${getColorMemberships(latestResult).join(" + ")}`,
      })
    }
  }, [latestResult, alerts, notificationPermission])

  useEffect(() => {
    if (!error) {
      lastSyncError.current = null
      return
    }
    if (error === lastSyncError.current) return
    lastSyncError.current = error
    if (alerts.syncFailure && notificationPermission === "granted") {
      new Notification("Data synchronization failed", { body: error })
    }
  }, [error, alerts.syncFailure, notificationPermission])

  const toggleWidget = (widgetId: string, checked: boolean) => {
    setDashboardPreferences((current) => ({
      ...current,
      visibleWidgets: checked
        ? [...current.visibleWidgets, widgetId]
        : current.visibleWidgets.filter((id) => id !== widgetId),
    }))
  }

  const moveWidget = (widgetId: string, direction: -1 | 1) => {
    setDashboardPreferences((current) => {
      const index = current.widgetOrder.indexOf(widgetId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.widgetOrder.length) return current
      const widgetOrder = [...current.widgetOrder]
      ;[widgetOrder[index], widgetOrder[target]] = [widgetOrder[target], widgetOrder[index]]
      return { ...current, widgetOrder }
    })
  }

  const applyTheme = (themeId: string, selectedAccent = accentColor) => {
    const preset = THEME_PRESETS.find((item) => item.id === themeId)
    if (!preset) return
    setAccentColor(selectedAccent)
    setPersonalPreferences({ themeId, isDark: preset.isDark, accent: selectedAccent })
  }

  const filteredResults = useMemo(() => {
    const query = historySearch.trim().toLowerCase()
    return results.filter((result) => {
      const matchesSearch = !query || result.period.toLowerCase().includes(query)
      const matchesColor = !historyColor || getColorMemberships(result).includes(historyColor)
      const matchesNumber = !historyNumber || result.number === Number(historyNumber)
      return matchesSearch && matchesColor && matchesNumber
    })
  }, [results, historySearch, historyColor, historyNumber])
  const analyticsResults = useMemo(() => results.slice(0, analyticsWindow), [results, analyticsWindow])
  const sequenceAnalysis = useMemo(
    () => analyzeHistoricalSequences(results, { targetPeriod: displayedTargetPeriod }),
    [results, displayedTargetPeriod],
  )
  const anomalyReport = useMemo(
    () => detectHistoricalAnomalies(results, { duplicatePeriodCount: duplicateRecords ?? 0 }),
    [results, duplicateRecords],
  )
  const derivedSizeCounts = useMemo(() => results.reduce(
    (counts, result) => {
      counts[sizeFromNumber(result.number)] += 1
      return counts
    },
    { big: 0, small: 0 },
  ), [results])
  const colourCounts = useMemo(() => results.reduce(
    (counts, result) => {
      getColorMemberships(result).forEach((colour) => { counts[colour] = (counts[colour] ?? 0) + 1 })
      return counts
    },
    {} as Record<string, number>,
  ), [results])

  const historyPageSize = 10
  const pageCount = Math.max(1, Math.ceil(filteredResults.length / historyPageSize))
  const visibleHistory = filteredResults.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)

  useEffect(() => {
    setHistoryPage(1)
  }, [historySearch, historyColor, historyNumber])

  const exportHistory = () => {
    const rows = [
      ["period", "number", "color_memberships", "size", "sum"],
      ...filteredResults.map((item) => [
        item.period,
        item.number,
        getColorMemberships(item).join("|"),
        sizeFromNumber(item.number),
        item.sum ?? "",
      ]),
    ]
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "myhack-history.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported")
      return
    }
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  const notifyActual = (result: GameResult | null) => {
    if (!result) return null
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-accent" />
        Period {formatPeriod(result.period)} · {result.number} · {getColorMemberships(result).join(" + ")}
      </div>
    )
  }

  const dashboardWidgets: Record<string, React.ReactNode> = {
    command: (
      <section className="dashboard-card command-hero p-5 sm:p-6" aria-labelledby="prediction-panel-title">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Win Go 1M · live intelligence</p>
            <h2 id="prediction-panel-title" className="text-xl font-semibold">Prediction Panel · Win Go 1M</h2>
            <p className="mt-2 text-sm text-muted-foreground">Multi-engine historical analysis and next-period candidate ranking.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh data
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricTile label="Current period" value={latestResult?.period ?? "Waiting for data"} icon={Activity} />
          <MetricTile label="Next round" value={periodLifecycle?.targetPeriod && periodLifecycle.nextRoundTimestamp !== null ? formatCountdown(nextRoundCountdown) : "--:--"} icon={Clock3} />
          <MetricTile label="API connection" value={error ? "Issue detected" : loading ? "Connecting" : "Available"} icon={error ? WifiOff : Wifi} />
          <MetricTile label="Latest sync" value={lastSuccessfulSyncAt ? new Date(lastSuccessfulSyncAt).toLocaleTimeString() : "Not synced yet"} icon={RefreshCw} />
          <MetricTile label="Loaded records" value={results.length} icon={Database} />
        </div>
        {historyAudit && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4" aria-label="Historical source audit">
            <span>API RECORDS RECEIVED: {historyAudit.apiRecordsReceived}</span>
            <span>VALID RECORDS: {historyAudit.validRecordCount}</span>
            <span>UNIQUE RECORDS: {historyAudit.uniqueRecordCount}</span>
            <span>RECORDS PROCESSED BY ENGINES: {coordinatorOutput?.recordsProcessedByEngines ?? 0}</span>
            <span>RECORDS REJECTED: {historyAudit.invalidRecordCount}</span>
            <span>DUPLICATES REMOVED: {historyAudit.duplicateCount}</span>
            <span>SOURCE ADVERTISED: {historyAudit.sourceTotalCount}</span>
            <span>PAGES FETCHED: {historyAudit.pagesFetched || "cached"}</span>
            {historyAudit.paginationIssue && <span role="alert" className="col-span-full text-destructive">PAGINATION INCOMPLETE: {historyAudit.paginationIssue}</span>}
          </div>
        )}
        {periodLifecycle?.errorReason && <p role="alert" className="mt-3 text-sm text-destructive">PERIOD ERROR: {periodLifecycle.errorReason}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 p-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Latest actual result</p>
            {notifyActual(latestResult)}
          </div>
          <ConnectionStatus isConnected={!loading && !error} lastUpdate={lastSuccessfulSyncAt} error={error} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IntelligenceTile label="Number intelligence" value={trendAnalysis?.topThree[0] ? `Top ${trendAnalysis.topThree[0].number}` : "Insufficient data"} detail={`${results.length ? Math.max(...Object.values(colourCounts).map((value) => value), 0) : 0} colour memberships · ${trendAnalysis?.topThree.length ?? 0}/3 ranked`} tone="cyan" />
          <IntelligenceTile label="Colour intelligence" value={latestResult ? getColorMemberships(latestResult).join(" + ") : "Pending"} detail={`R ${colourCounts.red ?? 0} · G ${colourCounts.green ?? 0} · V ${colourCounts.violet ?? 0}`} tone="violet" />
          <IntelligenceTile label="Size intelligence" value={latestResult ? sizeFromNumber(latestResult.number).toUpperCase() : "UNKNOWN"} detail={`BIG ${derivedSizeCounts.big} · SMALL ${derivedSizeCounts.small}`} tone="emerald" />
          <IntelligenceTile label="Engine integrity" value={anomalyReport.events.length ? "WATCH" : "NORMAL"} detail={`${sequenceAnalysis.includedRecordCount} verified · ${anomalyReport.events.length} anomaly event(s)`} tone={anomalyReport.events.length ? "amber" : "emerald"} />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-xl border border-border/70 bg-background/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sequence intelligence</p><span className="text-[10px] uppercase tracking-wider text-muted-foreground">descriptive evidence</span></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[{ label: "SIZE", market: "size" as const }, { label: "COLOUR", market: "colour-combination" as const }, { label: "NUMBER", market: "number" as const }].map(({ label, market }) => {
                const sequence = sequenceAnalysis.sequences.find((item) => item.market === market && item.contextLength === 2)
                const breakEvent = sequenceAnalysis.patternBreaks.find((item) => item.market === market)
                return <div key={market} className="rounded-lg border border-border/60 bg-background/50 p-3"><p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 truncate font-mono text-sm">{sequence?.context.join(" → ") || "UNCONFIRMED"}</p><p className="mt-1 text-[11px] text-muted-foreground">{breakEvent?.status === "observed-break" ? "Pattern break observed" : `${sequence?.historicalSupport ?? 0} historical matches`}</p></div>
              })}
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/40 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Source monitoring</p><p className="mt-2 text-lg font-semibold">{anomalyReport.events.length ? "WATCH" : "NORMAL"}</p><p className="mt-1 text-xs text-muted-foreground">{anomalyReport.events[0]?.evidence ?? "No configured anomaly threshold crossed in the available verified records."}</p></div>
        </div>
        {error && <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p>}
      </section>
    ),
    prediction: (
      <div className="space-y-3">
        <GameSessionSelector
          selectedGameId={selectedGameId}
          selectedSessionId={selectedSessionId}
          onChange={(gameId, sessionId) => {
            setSelectedGameId(gameId)
            setSelectedSessionId(sessionId)
          }}
        />
        {isLegacyPredictionSession ? (
          <>
            <PredictionDisplay analysis={trendAnalysis} statisticalPrediction={statisticalPrediction} canonicalCandidates={canonicalCandidates} nextPeriodNumber={displayedTargetPeriod} timeRemaining={periodLifecycle && periodLifecycle.nextRoundTimestamp !== null ? nextRoundCountdown : 0} countdownAvailable={Boolean(periodLifecycle && periodLifecycle.periodStatus === "active" && periodLifecycle.nextRoundTimestamp !== null)} isAnalyzing={isAnalyzing} periodStatus={periodLifecycle?.periodStatus ?? "unavailable"} periodErrorReason={periodLifecycle?.errorReason ?? null} periodLimitation={periodLifecycle?.limitation ?? null} historyPaginationIssue={historyAudit?.paginationIssue ?? null} executionStatus={predictionStatus} executionStats={coordinatorOutput?.executionStats ?? null} executionWarnings={coordinatorOutput?.warnings ?? []} generatedAt={coordinatorOutput?.generatedAt ?? null} />
            {canAccess("historicalData") && <PredictionHistory />}
          </>
        ) : (
          <>
            <DynamicGamePrediction key={`prediction:${selectedGameId}:${selectedSessionId}`} gameId={selectedGameId} sessionId={selectedSessionId} />
            <DynamicGameResult key={`result:${selectedGameId}:${selectedSessionId}`} gameId={selectedGameId} sessionId={selectedSessionId} />
          </>
        )}
      </div>
    ),
    actual: (
      <section className="dashboard-card p-5 sm:p-6">
        <SectionHeading eyebrow="Verified data" title="Most recent result" />
        {latestResult ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Period" value={latestResult.period} icon={Clock3} />
            <MetricTile label="Number" value={latestResult.number} icon={Activity} />
            <MetricTile label="Colour memberships" value={getColorMemberships(latestResult).join(" + ")} icon={Sparkles} />
            <MetricTile label="Size (derived)" value={sizeFromNumber(latestResult.number).toUpperCase()} icon={Database} />
          </div>
        ) : <EmptyState title="No result available" description="The source has not returned a result yet." />}
      </section>
    ),
    stats: (
      <section className="dashboard-card p-5 sm:p-6">
        <SectionHeading eyebrow="Real-time metrics" title="Recent performance" />
        <StatsGrid stats={stats} />
      </section>
    ),
  }

  const sortedDashboardWidgets = dashboardPreferences.widgetOrder
    .filter((id) => dashboardPreferences.visibleWidgets.includes(id))
    .filter((id) => id === "prediction")
    .map((id) => <div key={id} className={`dashboard-widget dashboard-widget--${id}`}>{dashboardWidgets[id]}</div>)
    .filter(Boolean)

  const pageContent: Record<View, React.ReactNode> = {
    dashboard: (
      <div className="dashboard-overview space-y-5 page-enter">
        <PageHeading eyebrow="Prediction" title="Prediction Panel" description="Next-round prediction and recent history for the selected session." />
        {sortedDashboardWidgets.length ? <div className="dashboard-widget-grid">{sortedDashboardWidgets}</div> : (
          <EmptyState title="Your dashboard is clear" description="Choose widgets in Settings to restore your Prediction Panel." />
        )}
      </div>
    ),
    predictions: (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Prediction" title="Prediction" description="Predictions and history for the selected session." />
        <GameSessionSelector
          selectedGameId={selectedGameId}
          selectedSessionId={selectedSessionId}
          onChange={(gameId, sessionId) => {
            setSelectedGameId(gameId)
            setSelectedSessionId(sessionId)
          }}
        />
        {isLegacyPredictionSession ? (
          <>
            <PredictionDisplay analysis={trendAnalysis} statisticalPrediction={statisticalPrediction} canonicalCandidates={canonicalCandidates} nextPeriodNumber={displayedTargetPeriod} timeRemaining={periodLifecycle && periodLifecycle.nextRoundTimestamp !== null ? nextRoundCountdown : 0} countdownAvailable={Boolean(periodLifecycle && periodLifecycle.periodStatus === "active" && periodLifecycle.nextRoundTimestamp !== null)} isAnalyzing={isAnalyzing} periodStatus={periodLifecycle?.periodStatus ?? "unavailable"} periodErrorReason={periodLifecycle?.errorReason ?? null} periodLimitation={periodLifecycle?.limitation ?? null} historyPaginationIssue={historyAudit?.paginationIssue ?? null} executionStatus={predictionStatus} executionStats={coordinatorOutput?.executionStats ?? null} executionWarnings={coordinatorOutput?.warnings ?? []} generatedAt={coordinatorOutput?.generatedAt ?? null} />
            {canAccess("historicalData") && <PredictionHistory />}
          </>
        ) : (
          <>
            <DynamicGamePrediction key={`prediction:${selectedGameId}:${selectedSessionId}`} gameId={selectedGameId} sessionId={selectedSessionId} />
            <DynamicGameResult key={`result:${selectedGameId}:${selectedSessionId}`} gameId={selectedGameId} sessionId={selectedSessionId} />
          </>
        )}
      </div>
    ),
    history: (
      <div className="space-y-4 page-enter">
        <PageHeading
          eyebrow="History"
          title="Recent results"
          description={isLegacyPredictionSession ? "Search and review verified results and recorded predictions." : "Latest result for the selected session."}
        />
        <GameSessionSelector
          selectedGameId={selectedGameId}
          selectedSessionId={selectedSessionId}
          onChange={(gameId, sessionId) => {
            setSelectedGameId(gameId)
            setSelectedSessionId(sessionId)
          }}
        />
        {isLegacyPredictionSession ? (
          <>
            <section className="dashboard-card p-3 sm:p-5">
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="min-w-0 space-y-1.5 text-xs text-muted-foreground">
                  Period
                  <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" /><Input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search period…" className="pl-9" /></div>
                </label>
                <label className="min-w-0 space-y-1.5 text-xs text-muted-foreground">
                  Colour
                  <select value={historyColor} onChange={(event) => setHistoryColor(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">All colours</option><option value="red">Red</option><option value="green">Green</option><option value="violet">Violet</option>
                  </select>
                </label>
                <label className="min-w-0 space-y-1.5 text-xs text-muted-foreground">
                  Number
                  <select value={historyNumber} onChange={(event) => setHistoryNumber(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">All numbers</option>{Array.from({ length: 10 }, (_, number) => <option key={number} value={number}>{number}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{filteredResults.length} matching · {results.length} loaded</p>
                <Button variant="outline" size="sm" onClick={exportHistory} disabled={!filteredResults.length} className="gap-2"><Download className="h-4 w-4" />Export CSV</Button>
              </div>
              <div className="mt-3 space-y-2 sm:hidden">
                {visibleHistory.map((result) => (
                  <article key={result.period} className="rounded-lg border border-border/70 bg-background/35 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">{result.period}</p>
                      <p className="text-xl font-bold text-primary">{result.number}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
                      <span className="capitalize">{getColorMemberships(result).join(" + ")}</span>
                      <span>{sizeFromNumber(result.number).toUpperCase()}</span>
                      {result.sum !== undefined && <span>Sum {result.sum}</span>}
                    </div>
                  </article>
                ))}
                {!visibleHistory.length && <p className="py-8 text-center text-sm text-muted-foreground">{loading ? "Loading results…" : "No results match these filters."}</p>}
              </div>
              <div className="mt-3 hidden overflow-x-auto rounded-lg border border-border/70 sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Period</th><th className="px-4 py-3">Number</th><th className="px-4 py-3">Colour</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">Sum</th></tr></thead>
                  <tbody className="divide-y divide-border/60">
                    {visibleHistory.map((result) => <tr key={result.period} className="transition-colors hover:bg-muted/30"><td className="px-4 py-3 font-mono">{result.period}</td><td className="px-4 py-3 font-semibold text-accent">{result.number}</td><td className="px-4 py-3 capitalize">{getColorMemberships(result).join(" + ")}</td><td className="px-4 py-3 capitalize">{sizeFromNumber(result.number)}</td><td className="px-4 py-3">{result.sum ?? "—"}</td></tr>)}
                    {!visibleHistory.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{loading ? "Loading source records…" : "No results match these filters."}</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button aria-label="Previous page" variant="outline" size="icon" disabled={historyPage <= 1} onClick={() => setHistoryPage((page) => page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="min-w-24 text-center text-xs text-muted-foreground">Page {historyPage} of {pageCount}</span>
                <Button aria-label="Next page" variant="outline" size="icon" disabled={historyPage >= pageCount} onClick={() => setHistoryPage((page) => page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </section>
            {canAccess("historicalData") ? <PredictionHistory /> : <SubscriptionUpgrade currentTier={subscription?.tier || "free"} feature="historicalData" />}
          </>
        ) : (
          <DynamicGameResult key={`history:${selectedGameId}:${selectedSessionId}`} gameId={selectedGameId} sessionId={selectedSessionId} />
        )}
      </div>
    ),
    analytics: (
      <div className="space-y-5 page-enter">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeading eyebrow="Advanced analytics lab" title="Data patterns" description={`${analyticsResults.length} loaded records · counts summarize this sample, not the underlying odds.`} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">Sample window<select value={analyticsWindow} onChange={(event) => setAnalyticsWindow(Number(event.target.value))} className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"><option value={10}>Latest 10</option><option value={20}>Latest 20</option><option value={50}>Latest 50</option></select></label>
        </div>
        {!results.length ? <EmptyState title="Waiting for source data" description="Analytics will appear after the live history API responds." /> : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="dashboard-card p-5"><SectionHeading eyebrow="Distribution" title="Number frequency" /><FrequencyChart results={analyticsResults} type="number" /></section>
              <section className="dashboard-card p-5"><SectionHeading eyebrow="Membership distribution" title="Colour frequency" /><FrequencyChart results={analyticsResults} type="color" /><p className="mt-2 text-xs text-muted-foreground">Counts show each colour membership; one result may contribute to multiple colours.</p></section>
            </div>
            <section className="dashboard-card p-5"><SectionHeading eyebrow="Heatmap" title="Historical number frequency" /><Heatmap results={analyticsResults} /></section>
            <section className="dashboard-card p-5">
              <SectionHeading eyebrow="Evidence, not certainty" title="Historical sample context" />
              {trendAnalysis?.topThree.length === 3 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {trendAnalysis.topThree.map((candidate, index) => <EvidenceTile key={candidate.number} label={`Rank ${index + 1} number ${candidate.number} in loaded history`} count={results.filter((result) => result.number === candidate.number).length} total={results.length} />)}
                  <EvidenceTile label="Source records loaded" count={results.length} total={results.length} />
                </div>
              ) : <EmptyState title="Ranking not ready" description="The engine only displays a Top 4 when each candidate has supporting pattern evidence." />}
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Candidate history counts are descriptive frequencies, not future probabilities. Number-to-colour mapping is unavailable and is not inferred.</p>
            </section>
          </>
        )}
      </div>
    ),
    advanced: (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Advanced analytics" title="Performance and trends" description="Derived from loaded results and locally recorded prediction outcomes." />
        {canAccess("advancedAnalytics") ? (
          <>
            {advancedStats ? <PerformanceMetrics stats={advancedStats} /> : <EmptyState title="Analytics are calculating" description={isCalculating ? "Processing the latest history…" : "Load source records to calculate these metrics."} />}
            <section className="dashboard-card p-5"><SectionHeading eyebrow="Historical series" title="Number trend" /><TrendChart results={analyticsResults} type="number" /></section>
          </>
        ) : <div className="dashboard-card p-6 text-center"><LockKeyhole className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-semibold">Advanced analytics access required</h2><p className="mx-auto mb-4 mt-2 max-w-md text-sm text-muted-foreground">Upgrade to unlock the existing advanced performance metrics.</p><SubscriptionUpgrade currentTier={subscription?.tier || "free"} feature="advancedAnalytics" /></div>}
      </div>
    ),
    charts: (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Visual analysis" title="Charts" description="Frequency and trend views based on the loaded API records." />
        {canAccess("charts") ? (
          results.length ? <div className="grid gap-4 xl:grid-cols-2">
            <section className="dashboard-card p-5"><SectionHeading eyebrow="Distribution" title="Number frequency" /><FrequencyChart results={analyticsResults} type="number" /></section>
            <section className="dashboard-card p-5"><SectionHeading eyebrow="Trend" title="Recent numbers" /><TrendChart results={analyticsResults} type="number" /></section>
          </div> : <EmptyState title="No chart data yet" description="Charts render when the live history source returns records." />
        ) : <div className="dashboard-card p-6 text-center"><LockKeyhole className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-semibold">Charts access required</h2><SubscriptionUpgrade currentTier={subscription?.tier || "free"} feature="charts" /></div>}
      </div>
    ),
    "pattern-intelligence": (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Pattern intelligence" title="2,000-pattern research engine" description="Inspect enabled patterns, relative evidence, and the walk-forward results calculated from loaded source history." />
        <div className="black-diamond-surface"><TrendPatternAnalysis results={results} /></div>
      </div>
    ),
    "colour-analytics": (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Market analysis" title="Colour analytics" description="Colour membership counts are sourced from returned records; combined outcomes and overlapping membership are not treated as the same measure." />
        {!results.length ? <EmptyState title="Waiting for colour data" description="This view will use real source records as soon as history is available." /> : (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="dashboard-card p-5"><SectionHeading eyebrow="Membership distribution" title="Colour frequency" /><FrequencyChart results={analyticsResults} type="color" /><p className="mt-3 text-xs text-muted-foreground">A result may belong to more than one colour. Membership percentages may total over 100%.</p></section>
            <section className="dashboard-card p-5"><SectionHeading eyebrow="Historical series" title="Colour transitions" /><TrendChart results={analyticsResults} type="color" /></section>
          </div>
        )}
      </div>
    ),
    "size-analytics": (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Market analysis" title="Size analytics" description="Derived from the supplied rule: SMALL = 0–4 and BIG = 5–9. Source records remain unchanged." />
        <SizeAnalyticsView results={analyticsResults} />
      </div>
    ),
    "sequence-explorer": (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Historical sequence analysis" title="Sequence explorer" description="Inspect prior contexts, their recorded next outcomes and observed streak breaks. Sequences remain descriptive evidence, not guarantees." />
        <SequenceExplorer results={results} />
      </div>
    ),
    backtesting: (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Out-of-sample evaluation" title="Backtesting" description="Run the existing walk-forward evaluation using prior completed records only. Accuracy is reported only when enough held-out forecasts exist." />
        <div className="black-diamond-surface"><TrendPatternAnalysis results={results} /></div>
      </div>
    ),
    notifications: (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Smart alert center" title="Notifications" description="Configure local alerts. Browser permission is requested only when you choose to enable it." />
        <section className="dashboard-card space-y-5 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-semibold">Browser notification permission</h2><p className="mt-1 text-sm text-muted-foreground">Current state: {notificationPermission}</p></div><Button onClick={() => void requestNotificationPermission()} disabled={notificationPermission === "unsupported" || notificationPermission === "granted"}>{notificationPermission === "granted" ? <><Check className="mr-2 h-4 w-4" />Enabled</> : "Enable browser notifications"}</Button></div>
          <AlertToggle checked={alerts.newResult} onCheckedChange={(checked) => setAlerts((current) => ({ ...current, newResult: checked }))} title="New result" description="Notify when a new period is returned by the API." />
          <AlertToggle checked={alerts.syncFailure} onCheckedChange={(checked) => setAlerts((current) => ({ ...current, syncFailure: checked }))} title="Synchronization failure" description="Notify when a new API request fails." />
          <div className="flex flex-col gap-3 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Selected colour membership</p><p className="mt-1 text-sm text-muted-foreground">Alert when a result includes this colour.</p></div><select aria-label="Alert colour" value={alerts.selectedColor} onChange={(event) => setAlerts((current) => ({ ...current, selectedColor: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Off</option><option value="red">Red</option><option value="green">Green</option><option value="violet">Violet</option></select></div>
          {lastAlertedPeriod && <p role="status" className="text-sm text-muted-foreground">Last alert condition matched period {lastAlertedPeriod}.</p>}
          {notificationPermission === "denied" && <p role="status" className="text-sm text-amber-300">Browser notifications are blocked. You can change this in your browser’s site permissions.</p>}
        </section>
      </div>
    ),
    settings: (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Preferences" title="Settings" description="Personal dashboard and appearance preferences are saved in this browser." />
        <section className="dashboard-card p-5">
          <SectionHeading eyebrow="Smart dashboard builder" title="Arrange your overview" />
          <div className="space-y-2">
            {dashboardPreferences.widgetOrder.map((widgetId, index) => {
              const widget = DASHBOARD_WIDGETS.find((item) => item.id === widgetId)
              if (!widget) return null
              return <div key={widgetId} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3"><label className="flex min-w-0 items-center gap-3 text-sm"><Switch checked={dashboardPreferences.visibleWidgets.includes(widgetId)} onCheckedChange={(checked) => toggleWidget(widgetId, checked)} /><span>{widget.label}</span></label><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Move ${widget.label} up`} disabled={index === 0} onClick={() => moveWidget(widgetId, -1)}><ChevronLeft className="h-4 w-4 rotate-90" /></Button><Button variant="ghost" size="icon" aria-label={`Move ${widget.label} down`} disabled={index === dashboardPreferences.widgetOrder.length - 1} onClick={() => moveWidget(widgetId, 1)}><ChevronRight className="h-4 w-4 rotate-90" /></Button></div></div>
            })}
          </div>
        </section>
        <section className="dashboard-card p-5">
          <SectionHeading eyebrow="Theme studio" title="Appearance" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEME_PRESETS.map((preset) => <button key={preset.id} onClick={() => applyTheme(preset.id)} aria-pressed={currentThemeId === preset.id} className={`rounded-xl border p-4 text-left transition-colors hover:border-primary ${currentThemeId === preset.id ? "border-primary bg-primary/10" : "border-border bg-background/40"}`}><span className="mb-3 block h-8 rounded-md" style={{ background: `linear-gradient(120deg, ${preset.accent}, ${preset.id === "glassmorphism" ? "#dbeafe" : "#101726"})` }} /><span className="flex items-center justify-between font-medium">{preset.label}{currentThemeId === preset.id && <Check className="h-4 w-4 text-primary" />}</span></button>)}
          </div>
          <label className="mt-5 flex items-center gap-3 text-sm"><span>Accent colour</span><input aria-label="Accent colour" type="color" value={accentColor} onChange={(event) => applyTheme(currentThemeId, event.target.value)} className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-1" /><span className="font-mono text-xs text-muted-foreground">{accentColor}</span></label>
          <p className="mt-3 text-xs text-muted-foreground">Theme preference is local to this browser and does not change the admin-managed site theme.</p>
        </section>
        <section className="dashboard-card p-5">
          <SectionHeading eyebrow="Motion and sound" title="Interaction preferences" />
          <AlertToggle checked={soundSettings.enabled} onCheckedChange={(enabled) => updateSoundSettings({ enabled })} title="Interface sounds" description="Play subtle sound effects for interface interactions." />
          <AlertToggle checked={motionEnabled} onCheckedChange={setMotionEnabled} title="Interface motion" description="Use subtle transitions and panel entrances. Turn this off for a static interface." />
          <label className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span><span className="block font-medium text-foreground">Data refresh interval</span><span className="text-xs text-muted-foreground">Applies to live history polling in this browser.</span></span>
            <select value={dataRefreshSeconds} onChange={(event) => setDataRefreshSeconds(Number(event.target.value))} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value={10}>Every 10 seconds</option>
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every minute</option>
            </select>
          </label>
          <p className="mt-4 text-xs text-muted-foreground">Reduced-motion preferences from your operating system are always respected.</p>
        </section>
      </div>
    ),
    profile: (
      <div className="space-y-5 page-enter">
        <PageHeading eyebrow="Account" title="Profile" description="Your current access and plan details." />
        <section className="dashboard-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary"><UserRound className="h-6 w-6" /></div><div><h2 className="text-lg font-semibold">{currentUser?.name ?? "Guest"}</h2><p className="text-sm text-muted-foreground">{currentUser?.userId === "guest" ? "Guest session" : "Authorized user"}</p></div></div>
            {subscription && <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><Crown className="h-3.5 w-3.5" />{subscription.tier.toUpperCase()}</span>}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricTile label="Access status" value={isLoggedIn ? "Active" : "Guest"} icon={Shield} />
            <MetricTile label="Subscription" value={subscription?.tier ?? "Free"} icon={Crown} />
          </div>
          {subscription?.endDate && <p className="mt-4 text-sm text-muted-foreground">Plan ends {new Date(subscription.endDate).toLocaleDateString()}.</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {subscription?.tier === "free" && <SubscriptionUpgrade currentTier="free" />}
            {isLoggedIn && currentUser?.userId !== "guest" && <Button variant="outline" onClick={() => { logout(); setActiveView("dashboard") }} className="gap-2"><LogOut className="h-4 w-4" />Sign out</Button>}
          </div>
        </section>
        <section className="dashboard-card p-5"><SectionHeading eyebrow="Admin access" title="Administrative tools" /><p className="mb-4 text-sm text-muted-foreground">The admin area uses the existing admin sign-in flow.</p><Button asChild variant="outline"><Link href="/admin"><Shield className="mr-2 h-4 w-4" />Open admin sign in</Link></Button></section>
      </div>
    ),
  }

  if (!mounted || userLoading) return <LoadingScreen />

  if ((!isLoggedIn && adminSettings.requireAccessCode) || accessTransition) {
    return <AccessLogin onLogin={(accessCode) => {
      const result = login(accessCode)
      if (result.success) {
        play("login-success", 0.8)
        setAccessTransition(true)
        window.setTimeout(() => setAccessTransition(false), 900)
      }
      return result
    }} isTransitioning={accessTransition} />
  }

  if (settings.isMaintenanceMode) {
    return <main className="grid min-h-screen place-items-center p-6 text-center"><section className="dashboard-card max-w-lg p-8"><Shield className="mx-auto mb-4 h-10 w-10 text-primary" /><h1 className="text-2xl font-semibold">Scheduled maintenance</h1><p className="mt-3 text-muted-foreground">{settings.technicalMessage || "The service is temporarily unavailable."}</p><Button asChild className="mt-6"><Link href="/admin">Admin access</Link></Button></section></main>
  }

  const activeItem = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0]

  return (
    <div className="black-diamond-surface min-h-screen text-foreground">
      {resultReveal && (
        <aside
          key={resultReveal.period}
          className={`result-reveal result-reveal--${resultReveal.outcome}`}
          role="status"
          aria-live="polite"
        >
          <span className="result-reveal__icon" aria-hidden="true">
            {resultReveal.outcome === "win" ? <Check className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <strong>{resultReveal.outcome === "win" ? `WIN · RANK ${resultReveal.matchedCandidate.rank} HIT` : "LOSS · TOP 4 MISS"}</strong>
            <span className="mt-1 block text-xs text-white/65">
              {resultReveal.outcome === "win"
                ? `Rank ${resultReveal.matchedCandidate.rank} · Number ${resultReveal.matchedCandidate.number} matched result ${resultReveal.number}`
                : `Verified result ${resultReveal.number} did not match ranks 1–4`}
              {" · "}Period {formatPeriod(resultReveal.period)}
            </span>
            <span className="mt-1 block text-[10px] text-white/45">Forecast outcome only · not a financial result</span>
          </span>
        </aside>
      )}
      {profitLocked && <div className="fixed inset-0 z-60 grid place-items-center overflow-y-auto bg-background/85 p-4 backdrop-blur-md"><div className="my-auto w-full max-w-lg pt-10"><ProfitLockPanel userId={currentUser?.userId} userName={currentUser?.name} /></div></div>}
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside className={`glass-panel bd-sidebar sticky top-0 hidden h-screen shrink-0 border-y-0 border-l-0 px-3 py-5 transition-[width] duration-200 lg:flex lg:flex-col ${sidebarCollapsed ? "lg:w-21" : "lg:w-68"}`} aria-label="Main navigation">
          <div className={`mb-7 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between gap-2"}`}>
            <Link href="/" title="BLACK DIAMOND home" className="flex min-w-0 items-center gap-3 rounded-xl p-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Gem className="h-5 w-5" /></span>
              {!sidebarCollapsed && <span className="min-w-0"><span className="block truncate text-[11px] font-bold tracking-[0.16em]">BLACK DIAMOND</span><span className="text-[10px] tracking-wide text-muted-foreground">ELITE ANALYTICS TERMINAL</span></span>}
            </Link>
            {!sidebarCollapsed && <button type="button" onClick={() => setSidebarCollapsed(true)} aria-label="Collapse sidebar" title="Collapse sidebar" aria-expanded={!sidebarCollapsed} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"><PanelLeft className="h-4 w-4" /></button>}
          </div>
          {sidebarCollapsed && <button type="button" onClick={() => setSidebarCollapsed(false)} aria-label="Expand sidebar" title="Expand sidebar" aria-expanded={false} className="mb-5 mx-auto grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"><PanelLeft className="h-4 w-4" /></button>}
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Workspace sections">
            {NAV_GROUPS.map(({ label: groupLabel, ids }) => (
              <div key={groupLabel} className="space-y-1">
                {!sidebarCollapsed && <p className="bd-nav-group__label">{groupLabel}</p>}
                {NAV_ITEMS.filter(({ id }) => ids.includes(id)).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveView(id)}
                    aria-label={label}
                    title={sidebarCollapsed ? label : undefined}
                    aria-current={activeView === id ? "page" : undefined}
                    className={`flex min-h-10 w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition-colors ${sidebarCollapsed ? "justify-center" : "gap-3"} ${activeView === id ? "border-primary/20 bg-primary/10 text-primary shadow-[inset_2px_0_0_var(--primary)]" : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
                    {!sidebarCollapsed && id === "notifications" && error && <span className="h-2 w-2 rounded-full bg-destructive" />}
                  </button>
                ))}
              </div>
            ))}
            <div className="space-y-1 pt-3">
              {!sidebarCollapsed && <p className="bd-nav-group__label">Live experience</p>}
              <Link href="/wingo-1m" title={sidebarCollapsed ? "WinGo 1M" : undefined} className={`flex min-h-10 items-center rounded-lg border border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
                <Activity className="h-4 w-4 shrink-0" />{!sidebarCollapsed && <span>WinGo 1M</span>}
              </Link>
            </div>
          </nav>
          <div className="mt-auto space-y-3">
            <div className={`rounded-xl border border-border bg-background/40 p-3 ${sidebarCollapsed ? "flex justify-center" : ""}`} title={sidebarCollapsed ? error || "Source connected" : undefined}>
              <div className={`flex items-center text-xs font-medium ${sidebarCollapsed ? "justify-center" : "gap-2"}`}><span className={`h-2 w-2 shrink-0 rounded-full ${error ? "bg-destructive" : loading ? "bg-amber-300" : "bg-emerald-400"}`} />{!sidebarCollapsed && (error ? "Data source issue" : loading ? "Syncing source" : "Source connected")}</div>
              {!sidebarCollapsed && <p className="mt-2 truncate text-[10px] text-muted-foreground">{error || `Last sync: ${lastSuccessfulSyncAt ? new Date(lastSuccessfulSyncAt).toLocaleTimeString() : "not yet"}`}</p>}
            </div>
            <div className={`flex items-center rounded-xl border border-border p-2.5 ${sidebarCollapsed ? "justify-center" : "gap-2"}`}>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><UserRound className="h-4 w-4" /></div>
              {!sidebarCollapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{currentUser?.name ?? "Guest"}</p><p className="text-[10px] uppercase text-muted-foreground">{subscription?.tier ?? "free"} plan</p></div>}
              {currentUser?.userId !== "guest" && <button aria-label="Sign out" onClick={logout} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="h-4 w-4" /></button>}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <header className="bd-topbar sticky top-0 z-30 border-b border-border/70 bg-background/75 backdrop-blur-xl">
            <div className="flex min-h-17 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <p className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-primary sm:block">BLACK DIAMOND · PRIVATE ANALYTICS TERMINAL</p>
                <h1 className="truncate text-base font-semibold tracking-wide sm:text-lg">{activeItem.label}</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex"><span className={`h-2 w-2 rounded-full ${error ? "bg-destructive" : "bg-emerald-400"}`} />{error ? "Sync issue" : "Live source"}</span>
                <Button aria-label={soundSettings.enabled ? "Disable sounds" : "Enable sounds"} variant="ghost" size="icon" onClick={() => updateSoundSettings({ enabled: !soundSettings.enabled })}>{soundSettings.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button>
                <Button aria-label="Notifications" variant="ghost" size="icon" onClick={() => setActiveView("notifications")} className="relative"><Bell className="h-4 w-4" />{error && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}</Button>
                <Button aria-label="Open profile" variant="ghost" size="icon" onClick={() => setActiveView("profile")} className="lg:hidden"><UserRound className="h-4 w-4" /></Button>
              </div>
            </div>
          </header>

          <main className="bd-main mx-auto max-w-360 space-y-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            {activeView !== "dashboard" && activeView !== "predictions" && activeView !== "history" && (
              <>
                <div className="bd-sync-strip flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-lg ${error ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}>{error ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}</span><div className="min-w-0"><p className="text-sm font-medium">{error ? "API synchronization issue" : "Live data connection"}</p><p className="truncate text-xs text-muted-foreground">{error || (lastSuccessfulSyncAt ? `Updated ${new Date(lastSuccessfulSyncAt).toLocaleTimeString()}` : "Waiting for the first successful sync")}</p></div></div>
                  <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">{duplicateRecords === null ? "Duplicate count unavailable" : `${duplicateRecords} duplicate records skipped`}</span><Button variant="outline" size="sm" onClick={() => void refetch()} disabled={loading} className="gap-2"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Sync now</span></Button></div>
                </div>
                {settings.showTechnicalMessage && <div className="dashboard-card p-3 text-sm"><TechnicalMessageDisplay /></div>}
              </>
            )}
            {activeView !== "dashboard" && activeView !== "predictions" && activeView !== "history" && (
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground lg:hidden"><ChevronDown className="h-3.5 w-3.5" />{activeItem.label}</div>
            )}
            <div className={`page-view page-view--${activeView}`}>{pageContent[activeView]}</div>
            <footer className="border-t border-border/70 pt-3 text-[10px] text-muted-foreground">
              <p>Past outcomes do not guarantee future results.</p>
            </footer>
          </main>
        </div>
      </div>

      <nav className="bd-mobile-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-border bg-background/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        {NAV_ITEMS.slice(0, 4).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveView(id)} aria-current={activeView === id ? "page" : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[9px] transition-colors ${activeView === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}><Icon className="h-4 w-4" /><span className="max-w-full truncate">{label}</span></button>)}
        <button type="button" onClick={() => setMobileMoreOpen(true)} aria-label="More navigation options" aria-expanded={mobileMoreOpen} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[9px] transition-colors ${NAV_ITEMS.slice(4).some(({ id }) => id === activeView) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}><MoreHorizontal className="h-4 w-4" /><span>More</span></button>
      </nav>

      <Sheet open={mobileMoreOpen} onOpenChange={setMobileMoreOpen}>
        <SheetContent side="bottom" className="max-h-[78svh] rounded-t-2xl border-border bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle className="text-left tracking-wide">Workspace</SheetTitle>
            <SheetDescription className="text-left">Choose a Black Diamond terminal section.</SheetDescription>
          </SheetHeader>
          <nav className="mt-5 grid grid-cols-2 gap-2" aria-label="More workspace sections">
            {NAV_ITEMS.slice(4).map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => { setActiveView(id); setMobileMoreOpen(false) }} aria-current={activeView === id ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left text-xs font-medium ${activeView === id ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-background/50 text-muted-foreground"}`}>
                <Icon className="h-4 w-4 shrink-0" />{label}
              </button>
            ))}
            <Link href="/wingo-1m" onClick={() => setMobileMoreOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background/50 px-3 text-xs font-medium text-muted-foreground"><Activity className="h-4 w-4" />WinGo 1M</Link>
          </nav>
        </SheetContent>
      </Sheet>

    </div>
  )
}

function MetricTile({ label, value, icon: Icon }: { label: string; value: ReactNode; icon: typeof Activity }) {
  return <div className="rounded-xl border border-border/70 bg-background/40 p-3.5"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary/80" /></div><p className="truncate text-sm font-semibold sm:text-base">{typeof value === "number" ? <AnimatedCounter value={value} /> : value}</p></div>
}

function IntelligenceTile({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "cyan" | "violet" | "emerald" | "amber" }) {
  const toneClass = {
    cyan: "text-primary",
    violet: "text-chart-4",
    emerald: "text-chart-3",
    amber: "text-yellow-300",
  }[tone]
  return <div className="rounded-xl border border-border/70 bg-background/40 p-3.5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className={`mt-2 text-sm font-semibold ${toneClass}`}>{value}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</p></div>
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="mb-4"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p><h2 className="text-lg font-semibold">{title}</h2></div>
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p></header>
}

function EvidenceTile({ label, count, total }: { label: string; count: number; total: number }) {
  return <div className="rounded-xl border border-border/70 bg-background/40 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{count}<span className="text-sm font-normal text-muted-foreground"> / {total}</span></p></div>
}

function AlertToggle({ checked, onCheckedChange, title, description }: { checked: boolean; onCheckedChange: (checked: boolean) => void; title: string; description: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4"><div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} /></div>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="dashboard-card grid min-h-40 place-items-center p-6 text-center"><div><Database className="mx-auto mb-3 h-6 w-6 text-muted-foreground" /><h3 className="font-medium">{title}</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p></div></div>
}

function SizeAnalyticsView({ results }: { results: GameResult[] }) {
  const counts = results.reduce(
    (totals, result) => {
      totals[sizeFromNumber(result.number)] += 1
      return totals
    },
    { big: 0, small: 0 },
  )
  const knownCount = counts.big + counts.small

  if (!results.length) {
    return (
      <section className="dashboard-card p-6">
        <SectionHeading eyebrow="Derived analysis" title="Size distribution unavailable" />
        <p className="text-sm leading-relaxed text-muted-foreground">No eligible source records are loaded for size analysis.</p>
      </section>
    )
  }

  return (
    <section className="dashboard-card p-5">
      <SectionHeading eyebrow="Derived analysis" title="BIG / SMALL distribution" />
      <div className="grid gap-3 sm:grid-cols-2">
        {(["big", "small"] as const).map((size) => (
          <div key={size} className="rounded-xl border border-border bg-background/45 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{size}</p>
            <p className="mt-2 text-2xl font-semibold">{counts[size]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{((counts[size] / knownCount) * 100).toFixed(1)}% of {knownCount} derived size values</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Derived from numbers using SMALL = 0–4 and BIG = 5–9; the raw API history is not modified.</p>
    </section>
  )
}

function LoadingScreen() {
  return <main className="grid min-h-screen place-items-center p-6"><div className="dashboard-card w-full max-w-sm animate-pulse p-6"><div className="mb-5 h-5 w-40 rounded bg-muted" /><div className="mb-3 h-12 rounded bg-muted" /><div className="h-12 rounded bg-muted" /><p className="mt-4 text-center text-xs text-muted-foreground">Restoring your workspace…</p></div></main>
}

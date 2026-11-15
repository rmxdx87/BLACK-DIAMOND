"use client"

import { useEffect, useState } from "react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useFirebaseContext } from "@/contexts/firebase-context"
import { UserAccessManager } from "@/lib/user-access"
import { useGameData } from "@/hooks/use-game-data"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SiteSettings } from "./sections/site-settings"
import { MaintenanceMode } from "./sections/maintenance-mode"
import { PredictionDashboardEditor } from "./sections/prediction-dashboard-editor"
import { SettingsManagement } from "./sections/settings-management"
import { TechnicalMessages } from "./sections/technical-messages"
import { AICodeGenerator } from "./sections/ai-code-generator"
import { UserManagement } from "./sections/user-management"
import { AIAnalyticsDashboard } from "./sections/ai-analytics-dashboard"
import { AIPredictionOptimizer } from "./sections/ai-prediction-optimizer"
import { SecurityManagement } from "./sections/security-management"
import { AdminCredentials } from "./sections/admin-credentials"
import { AdminAccounts } from "./sections/admin-accounts"
import { AdvancedAIFeatures } from "./sections/advanced-ai-features"
import { APIManagement } from "./sections/api-management"
import { AccessControl } from "./sections/access-control"
import { SubscriptionManagement } from "./sections/subscription-management"
import { PaymentManagement } from "./sections/payment-management"
import { SystemMonitoring } from "./sections/system-monitoring"
import { AdvancedControls } from "./sections/advanced-controls"
import { RevenueAnalytics } from "./sections/revenue-analytics"
import { ProfitLockControl } from "./sections/profit-lock-control"
import { PredictionControlCenter } from "./sections/prediction-control-center"
import { PredictionConfig } from "./sections/prediction-config"
import { SpecializedEngineControl } from "./sections/specialized-engine-control"
import { WingoRulesControl } from "./sections/wingo-rules-control"
import { GamePatternsControl } from "./sections/game-patterns-control"
import { ThemeManager } from "./sections/theme-manager"
import { AnomalyMonitor } from "./sections/anomaly-monitor"
import { MusicControl } from "./sections/music-control"
import { GameManagement } from "./sections/game-management"
import { SessionManagement } from "./sections/session-management"
import { ApiIntegrationCenter } from "./sections/api-integration-center"
import { PlatformAuditLog } from "./sections/platform-audit-log"
import {
  Settings,
  LogOut,
  Shield,
  Database,
  AlertTriangle,
  Edit,
  MessageSquare,
  Activity,
  Cog,
  Brain,
  Users,
  User,
  Bot,
  Crown,
  Monitor,
  DollarSign,
  Lock,
  Sliders,
  CreditCard,
  Zap,
  Cpu,
  Palette,
  PanelLeft,
  Music2,
  ChevronDown,
  Gamepad2,
  Timer,
  Network,
} from "lucide-react"

const ADMIN_NAV_GROUPS = [
  {
    label: "Games & APIs",
    ids: ["game-management", "session-management", "api-integration"],
  },
  {
    label: "Operations",
    ids: ["overview", "music-control", "system-monitoring", "api-health", "anomaly-monitor"],
  },
  {
    label: "Prediction & AI",
    ids: ["predictions", "prediction-config", "manual-predictions", "advanced-controls", "specialized-engines", "wingo-rules", "game-patterns", "ai-analytics", "ai-optimizer", "ai-features"],
  },
  {
    label: "People & revenue",
    ids: ["users", "access-control", "credentials", "admin-accounts", "subscription-management", "payment-management", "profit-lock", "revenue-analytics"],
  },
  {
    label: "Site & security",
    ids: ["settings", "management", "theme-manager", "maintenance", "messages", "security", "platform-audit-log", "api", "ai-codes"],
  },
]

export function AdminDashboard() {
  const { session, logout } = useAdminAuth()
  const { isConnected, error: firebaseError } = useFirebaseContext()
  const { results, error: apiError, loading: apiLoading, refetch, lastSuccessfulSyncAt, duplicateRecords } = useGameData()
  const [activeSection, setActiveSection] = useState("overview")
  const [userCount, setUserCount] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const menuItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "game-management", label: "Game Management", icon: Gamepad2 },
    { id: "session-management", label: "Session Management", icon: Timer },
    { id: "api-integration", label: "API Integration Center", icon: Network },
    { id: "music-control", label: "Music Control", icon: Music2 },
    { id: "advanced-controls", label: "Advanced Controls", icon: Sliders },
    { id: "system-monitoring", label: "System Monitoring", icon: Monitor },
    { id: "api-health", label: "API & Data Health", icon: Database },
    { id: "anomaly-monitor", label: "Anomaly Monitoring", icon: AlertTriangle },
    { id: "revenue-analytics", label: "Revenue Analytics", icon: DollarSign },
    { id: "subscription-management", label: "Subscription Management", icon: Crown },
    { id: "payment-management", label: "Payment Control", icon: CreditCard },
    { id: "access-control", label: "Access Control", icon: Lock },
    { id: "profit-lock", label: "Profit Lock", icon: Lock },
    { id: "ai-analytics", label: "AI Analytics", icon: Brain },
    { id: "ai-optimizer", label: "AI Optimizer", icon: Settings },
    { id: "ai-features", label: "Advanced AI Features", icon: Bot },
    { id: "prediction-config", label: "Prediction Config", icon: Zap },
    { id: "manual-predictions", label: "Prediction Control Center", icon: Edit },
    { id: "specialized-engines", label: "Specialized Engines (10)", icon: Cpu },
    { id: "wingo-rules", label: "Wingo Pattern Rules", icon: Brain },
    { id: "game-patterns", label: "Wingo Game Patterns (10)", icon: Zap },
    { id: "theme-manager", label: "Theme Manager", icon: Palette },
    { id: "security", label: "Security Management", icon: Shield },
    { id: "platform-audit-log", label: "Platform Audit Log", icon: Shield },
    { id: "credentials", label: "Admin Credentials", icon: User },
    { id: "admin-accounts", label: "Admin Accounts", icon: Users },
    { id: "settings", label: "Site Settings", icon: Settings },
    { id: "management", label: "Settings Management", icon: Cog },
    { id: "ai-codes", label: "AI Code Generator", icon: Brain },
    { id: "users", label: "User Management", icon: Users },
    { id: "api", label: "API Management", icon: Database },
    { id: "maintenance", label: "Maintenance Mode", icon: AlertTriangle },
    { id: "messages", label: "Technical Messages", icon: MessageSquare },
    { id: "predictions", label: "Prediction Dashboard", icon: Edit },
  ]
  const isViewer = session?.user.role === "viewer"
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.id === "admin-accounts" && session?.user.role !== "super_admin") return false
    if (item.id === "platform-audit-log" && session?.user.role === "admin") return false
    return true
  })

  useEffect(() => {
    const refreshUserCount = () => setUserCount(UserAccessManager.getUsers().length)
    refreshUserCount()
    window.addEventListener("usersUpdated", refreshUserCount)
    return () => window.removeEventListener("usersUpdated", refreshUserCount)
  }, [])

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Control center</p>
              <h2 className="text-2xl font-semibold">System overview</h2>
              <p className="mt-2 text-sm text-muted-foreground">Live connection and local access-control information.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Card className="dashboard-card p-5">
                <CardTitle className="mb-3 flex items-center gap-2 text-sm font-medium"><Database className="h-4 w-4 text-primary" />Firebase Realtime Database</CardTitle>
                <Badge variant="outline" className={isConnected ? "border-emerald-400/30 text-emerald-300" : "border-amber-400/30 text-amber-300"}>{isConnected ? "CONNECTED" : "DISCONNECTED"}</Badge>
                {firebaseError && <p className="mt-2 text-xs text-muted-foreground">{firebaseError}</p>}
              </Card>
              <Card className="dashboard-card p-5">
                <CardTitle className="mb-3 flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4 text-primary" />Access user records</CardTitle>
                <p className="text-2xl font-semibold">{userCount}</p><p className="mt-1 text-xs text-muted-foreground">Records in the existing access manager</p>
              </Card>
              <Card className="dashboard-card p-5">
                <CardTitle className="mb-3 flex items-center gap-2 text-sm font-medium"><Shield className="h-4 w-4 text-primary" />Current role</CardTitle>
                <p className="text-base font-semibold">{session?.user.role.replace("_", " ") ?? "Unknown"}</p><p className="mt-1 text-xs text-muted-foreground">Existing admin session</p>
              </Card>
              <Card className="dashboard-card p-5">
                <CardTitle className="mb-3 flex items-center gap-2 text-sm font-medium"><Activity className="h-4 w-4 text-primary" />Admin modules</CardTitle>
                <p className="text-2xl font-semibold">{menuItems.length}</p><p className="mt-1 text-xs text-muted-foreground">Available control sections</p>
              </Card>
              <Card className="dashboard-card p-5">
                <CardTitle className="mb-3 flex items-center gap-2 text-sm font-medium"><Database className="h-4 w-4 text-primary" />History API</CardTitle>
                <p className="text-base font-semibold">{apiError ? "Error" : apiLoading ? "Syncing" : results.length ? "Responding" : "No data"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{apiError ?? `${results.length} records loaded`}</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Button
                onClick={() => setActiveSection("advanced-controls")}
                variant="outline"
                className="h-16 justify-start gap-3 text-left"
              >
                <Sliders className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">Advanced controls</div>
                  <div className="text-xs text-muted-foreground">System configuration</div>
                </div>
              </Button>

              <Button
                onClick={() => setActiveSection("subscription-management")}
                variant="outline"
                className="h-16 justify-start gap-3 text-left"
              >
                <Crown className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">Subscriptions</div>
                  <div className="text-xs text-muted-foreground">Manage user tiers</div>
                </div>
              </Button>

              <Button
                onClick={() => setActiveSection("api-health")}
                variant="outline"
                className="h-16 justify-start gap-3 text-left"
              >
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">API & data health</div>
                  <div className="text-xs text-muted-foreground">Sync and import observations</div>
                </div>
              </Button>
            </div>
          </div>
        )
      case "advanced-controls":
        return <AdvancedControls />
      case "music-control":
        return <MusicControl />
      case "game-management":
        return <GameManagement />
      case "session-management":
        return <SessionManagement />
      case "api-integration":
        return <ApiIntegrationCenter />
      case "system-monitoring":
        return <SystemMonitoring />
      case "api-health":
        return (
          <section className="dashboard-card space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Data health monitor</p><h2 className="text-xl font-semibold">API & import status</h2><p className="mt-2 text-sm text-muted-foreground">Observed from the configured live history endpoint; no sample data is used.</p></div>
              <Button variant="outline" onClick={() => void refetch()} disabled={apiLoading} className="gap-2"><Activity className={`h-4 w-4 ${apiLoading ? "animate-spin" : ""}`} />Sync now</Button>
            </div>
            {apiError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{apiError}</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-background/40 p-4"><p className="text-xs text-muted-foreground">API status</p><p className="mt-2 font-semibold">{apiError ? "Error" : apiLoading ? "Syncing" : results.length ? "Responding" : "No data"}</p></div>
              <div className="rounded-xl border border-border/70 bg-background/40 p-4"><p className="text-xs text-muted-foreground">Last successful sync</p><p className="mt-2 font-semibold">{lastSuccessfulSyncAt ? new Date(lastSuccessfulSyncAt).toLocaleString() : "Not yet"}</p></div>
              <div className="rounded-xl border border-border/70 bg-background/40 p-4"><p className="text-xs text-muted-foreground">Loaded records</p><p className="mt-2 font-semibold">{results.length}</p></div>
              <div className="rounded-xl border border-border/70 bg-background/40 p-4"><p className="text-xs text-muted-foreground">Duplicate records skipped</p><p className="mt-2 font-semibold">{duplicateRecords ?? "Not measured"}</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 p-4"><p className="font-medium">Rejected record count</p><p className="mt-1 text-sm text-muted-foreground">Not available: invalid records currently fail response validation instead of being persisted as an audit event.</p></div>
              <div className="rounded-xl border border-border/70 p-4"><p className="font-medium">Import audit history</p><p className="mt-1 text-sm text-muted-foreground">Not available: there is no server-side import audit store in this deployment.</p></div>
            </div>
          </section>
        )
      case "anomaly-monitor":
        return <AnomalyMonitor results={results} duplicateRecords={duplicateRecords} />
      case "revenue-analytics":
        return <RevenueAnalytics />
      case "subscription-management":
        return <SubscriptionManagement />
      case "payment-management":
        return <PaymentManagement />
      case "access-control":
        return <AccessControl />
      case "profit-lock":
        return <ProfitLockControl />
      case "ai-analytics":
        return <AIAnalyticsDashboard />
      case "ai-optimizer":
        return <AIPredictionOptimizer />
      case "ai-features":
        return <AdvancedAIFeatures />
      case "prediction-config":
        return <PredictionConfig />
      case "manual-predictions":
        return <PredictionControlCenter />
      case "specialized-engines":
        return <SpecializedEngineControl />
      case "wingo-rules":
        return <WingoRulesControl />
      case "game-patterns":
        return <GamePatternsControl />
      case "theme-manager":
        return <ThemeManager />
      case "security":
        return <SecurityManagement />
      case "platform-audit-log":
        return <PlatformAuditLog />
      case "credentials":
        return <AdminCredentials />
      case "admin-accounts":
        return session?.user.role === "super_admin" ? <AdminAccounts /> : null
      case "settings":
        return <SiteSettings />
      case "management":
        return <SettingsManagement />
      case "ai-codes":
        return <AICodeGenerator />
      case "users":
        return <UserManagement />
      case "maintenance":
        return <MaintenanceMode />
      case "messages":
        return <TechnicalMessages />
      case "predictions":
        return <PredictionDashboardEditor />
      case "api":
        return <APIManagement />
      default:
        return null
    }
  }

  const activeLabel = visibleMenuItems.find((item) => item.id === activeSection)?.label ?? "Overview"

  return (
    <div className="black-diamond-surface min-h-screen text-foreground">
      <header className="bd-admin-topbar sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="flex min-h-17 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Shield className="h-5 w-5" /></span>
            <div><p className="text-[11px] font-bold tracking-[0.16em]">BLACK DIAMOND</p><p className="text-xs text-muted-foreground">Admin control center</p></div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{session?.user.username}</p>
              <Badge variant="outline" className="text-[10px]">
                {session?.user.role.replace("_", " ").toUpperCase()}
              </Badge>
            </div>

            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className={`mx-auto grid min-h-[calc(100vh-68px)] max-w-[1680px] transition-[grid-template-columns] duration-200 ${sidebarCollapsed ? "lg:grid-cols-[84px_minmax(0,1fr)]" : "lg:grid-cols-[272px_minmax(0,1fr)]"}`}>
        <aside className="bd-admin-sidebar hidden border-r border-border/70 bg-sidebar/70 lg:block">
          <div className="sticky top-17 max-h-[calc(100vh-68px)] overflow-y-auto p-3">
            <button type="button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label={sidebarCollapsed ? "Expand admin sidebar" : "Collapse admin sidebar"} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} className={`mb-3 flex h-10 items-center rounded-lg border border-border/70 text-muted-foreground transition hover:bg-muted hover:text-primary ${sidebarCollapsed ? "w-full justify-center" : "w-full justify-end px-3"}`}>
              <PanelLeft className="h-4 w-4" />
            </button>
            <ul className="space-y-3">
              {ADMIN_NAV_GROUPS.map(({ label, ids }) => (
                <li key={label} className="list-none">
                  {!sidebarCollapsed && <p className="bd-admin-nav-group__label">{label}</p>}
                  <ul className="space-y-1">
                    {visibleMenuItems.filter((item) => ids.includes(item.id)).map((item) => {
                      const Icon = item.icon
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setActiveSection(item.id)}
                            title={sidebarCollapsed ? item.label : undefined}
                            aria-label={item.label}
                            aria-current={activeSection === item.id ? "page" : undefined}
                            className={`flex min-h-10 w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition-colors ${sidebarCollapsed ? "justify-center" : "gap-3"} ${
                              activeSection === item.id
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!sidebarCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="bd-admin-main min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-5 lg:hidden">
            <Button type="button" variant="outline" onClick={() => setMobileNavOpen(true)} className="h-12 w-full justify-between gap-3 rounded-xl border-primary/20 bg-card/80 px-4">
              <span className="flex min-w-0 items-center gap-3"><PanelLeft className="h-4 w-4 shrink-0 text-primary" /><span className="truncate text-left">{activeLabel}</span></span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </div>
          <div className="mb-5 hidden lg:block"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Administration</p><h1 className="text-2xl font-semibold">{activeLabel}</h1></div>
          {isViewer && (
            <p role="status" className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              Viewer mode is read-only. You can inspect the panel but cannot perform changes.
            </p>
          )}
          <fieldset disabled={isViewer} inert={isViewer} className="m-0 min-w-0 border-0 p-0">
            <div className="page-enter">{renderActiveSection()}</div>
          </fieldset>
        </main>
      </div>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(88vw,360px)] overflow-y-auto border-r-primary/20 bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle className="text-left tracking-wide">Admin control</SheetTitle>
            <SheetDescription className="text-left">Choose an existing administration section.</SheetDescription>
          </SheetHeader>
          <nav className="mt-5 space-y-5" aria-label="Admin sections">
            {ADMIN_NAV_GROUPS.map(({ label, ids }) => (
              <section key={label}>
                <h2 className="bd-admin-nav-group__label">{label}</h2>
                <div className="space-y-1">
                  {visibleMenuItems.filter((item) => ids.includes(item.id)).map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveSection(item.id)
                          setMobileNavOpen(false)
                        }}
                        aria-current={activeSection === item.id ? "page" : undefined}
                        className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                          activeSection === item.id
                            ? "border-primary/25 bg-primary/10 text-primary"
                            : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}

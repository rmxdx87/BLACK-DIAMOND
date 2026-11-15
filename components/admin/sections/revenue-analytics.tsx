"use client"

import { BarChart3, Crown, Shield, Star, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useSubscriptionStats } from "@/hooks/use-subscription"

const tiers = [
  { id: "free", label: "Free", icon: Users },
  { id: "basic", label: "Basic", icon: Shield },
  { id: "premium", label: "Premium", icon: Star },
  { id: "vip", label: "VIP", icon: Crown },
] as const

export function RevenueAnalytics() {
  const { stats } = useSubscriptionStats()
  const activeTierCount = Object.values(stats.tierDistribution).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-5">
      <header>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Subscription overview</p>
        <h2 className="text-2xl font-semibold">Revenue analytics</h2>
        <p className="mt-2 text-sm text-muted-foreground">Current subscription records only; no transaction ledger or verified payment totals are connected.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="dashboard-card p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-sm text-muted-foreground">Subscription records</p><Users className="h-4 w-4 text-primary" /></div>
          <p className="text-2xl font-semibold">{stats.totalUsers}</p>
          <p className="mt-1 text-xs text-muted-foreground">All tiers and inactive records</p>
        </Card>
        <Card className="dashboard-card p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-sm text-muted-foreground">Active subscriptions</p><Crown className="h-4 w-4 text-primary" /></div>
          <p className="text-2xl font-semibold">{stats.activeSubscriptions}</p>
          <p className="mt-1 text-xs text-muted-foreground">Current stored status</p>
        </Card>
        <Card className="dashboard-card p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-sm text-muted-foreground">Tier distribution total</p><BarChart3 className="h-4 w-4 text-primary" /></div>
          <p className="text-2xl font-semibold">{activeTierCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Active subscription records</p>
        </Card>
      </div>

      <section className="dashboard-card p-5">
        <h3 className="mb-4 font-semibold">Active users by tier</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tiers.map(({ id, label, icon: Icon }) => (
            <div key={id} className="rounded-xl border border-border/70 bg-background/40 p-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">{label}</span><Icon className="h-4 w-4 text-primary" /></div>
              <p className="text-2xl font-semibold">{stats.tierDistribution[id]}</p>
              <p className="mt-1 text-xs text-muted-foreground">active subscriptions</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card p-5">
        <h3 className="font-semibold">Monetary reporting is unavailable</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The current subscription manager has no payment transaction ledger, currency configuration, refunds, or reconciled payment history.
          Revenue, conversion, churn, and annual projections are therefore not calculated or shown.
        </p>
      </section>
    </div>
  )
}

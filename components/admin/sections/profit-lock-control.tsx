"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProfitLock } from "@/hooks/use-profit-lock"
import type { ProfitLockConfig, RiskPreset } from "@/lib/profit-lock"
import { Lock, ShieldAlert, CheckCircle, XCircle, Clock, Trash2, AlertTriangle, Sliders } from "lucide-react"

type ToggleKey = keyof Pick<
  ProfitLockConfig,
  | "systemEnabled"
  | "autoLockOnTarget"
  | "stopLossGuard"
  | "requireApproval"
  | "autoApproveUnlock"
  | "compoundingMode"
  | "lossRecoveryAlerts"
  | "emergencyGlobalLock"
>

type NumberKey = keyof Pick<
  ProfitLockConfig,
  | "lockDurationHours"
  | "maxProfitTargetPercent"
  | "minCapital"
  | "dailyProfitCapPercent"
  | "tradeCooldownSeconds"
  | "maxTradesPerSession"
>

const TOGGLE_FEATURES: { key: ToggleKey; label: string; desc: string }[] = [
  { key: "systemEnabled", label: "Profit Lock System", desc: "Master switch for the entire profit-lock feature" },
  { key: "autoLockOnTarget", label: "Auto-Lock on Target", desc: "Lock the panel automatically when profit target is hit" },
  { key: "stopLossGuard", label: "Stop-Loss Guard", desc: "Lock when a user's loss reaches their risk limit" },
  { key: "requireApproval", label: "Unlock Needs Approval", desc: "Early unlock requires admin approval" },
  { key: "autoApproveUnlock", label: "Auto-Approve Unlock", desc: "Instantly approve every unlock request" },
  { key: "compoundingMode", label: "Compounding Mode", desc: "Reinvest profit into the working balance" },
  { key: "lossRecoveryAlerts", label: "Loss Recovery Alerts", desc: "Warn users when close to their stop-loss" },
  { key: "emergencyGlobalLock", label: "Emergency Global Lock", desc: "Instantly lock every user's panel" },
]

const NUMBER_FEATURES: { key: NumberKey; label: string; desc: string; min: number; max: number }[] = [
  { key: "lockDurationHours", label: "Lock Duration (hours)", desc: "How long the panel stays locked", min: 1, max: 168 },
  { key: "maxProfitTargetPercent", label: "Max Target (% of capital)", desc: "Cap on profit target users can set", min: 5, max: 500 },
  { key: "minCapital", label: "Min Capital", desc: "Minimum capital required to activate", min: 0, max: 100000 },
  { key: "dailyProfitCapPercent", label: "Daily Profit Cap (%)", desc: "Daily profit that also triggers a lock", min: 0, max: 500 },
  { key: "tradeCooldownSeconds", label: "Trade Cooldown (sec)", desc: "Minimum seconds between trades", min: 0, max: 3600 },
  { key: "maxTradesPerSession", label: "Max Trades / Session", desc: "Force a lock after this many trades", min: 1, max: 1000 },
]

const RISK_PRESETS: RiskPreset[] = ["conservative", "balanced", "aggressive"]

function formatMoney(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`
}

function timeLeft(lockUntil?: number) {
  if (!lockUntil) return "—"
  const ms = lockUntil - Date.now()
  if (ms <= 0) return "expired"
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

export function ProfitLockControl() {
  const { config, allUsers, saveConfig, approveUnlock, denyUnlock, forceLock, resetUser } = useProfitLock()

  const pending = allUsers.filter((u) => u.unlockStatus === "pending")
  const locked = allUsers.filter((u) => u.status === "locked")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-mono font-bold text-green-400 flex items-center gap-2">
          <Lock className="h-6 w-6" />
          Profit Lock Control (15 Features)
        </h2>
        <div className="flex items-center gap-3">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono">{allUsers.length} USERS</Badge>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono">{locked.length} LOCKED</Badge>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono">
            {pending.length} PENDING
          </Badge>
        </div>
      </div>

      {/* Pending unlock requests */}
      <Card className="bg-gray-900/50 border-yellow-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-yellow-400 font-mono text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Pending Unlock Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-green-300/60 font-mono text-sm">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((u) => (
                <div
                  key={u.userId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border border-yellow-500/30 bg-black/30 p-3"
                >
                  <div className="font-mono text-sm">
                    <div className="text-green-300 font-bold">{u.name}</div>
                    <div className="text-green-300/60 text-xs">
                      Profit {formatMoney(u.realizedProfit)} · {u.lockReason}
                    </div>
                    {u.unlockNote && <div className="text-yellow-300/80 text-xs mt-1">&quot;{u.unlockNote}&quot;</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveUnlock(u.userId)}
                      className="bg-green-600/20 border border-green-500 text-green-400 hover:bg-green-600/40 font-mono"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => denyUnlock(u.userId)}
                      className="bg-red-600/20 border border-red-500 text-red-400 hover:bg-red-600/40 font-mono"
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature toggles */}
      <Card className="bg-gray-900/50 border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Feature Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TOGGLE_FEATURES.map((f) => (
            <div
              key={f.key}
              className={`flex items-center justify-between gap-3 rounded border p-3 ${
                f.key === "emergencyGlobalLock"
                  ? "border-red-500/40 bg-red-500/5"
                  : "border-green-500/20 bg-black/30"
              }`}
            >
              <div className="font-mono">
                <div className={`text-sm font-bold ${f.key === "emergencyGlobalLock" ? "text-red-400" : "text-green-300"}`}>
                  {f.label}
                </div>
                <div className="text-green-300/50 text-xs">{f.desc}</div>
              </div>
              <Switch
                checked={config[f.key]}
                onCheckedChange={(checked) => saveConfig({ [f.key]: checked })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Numeric settings */}
      <Card className="bg-gray-900/50 border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Limits &amp; Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NUMBER_FEATURES.map((f) => (
            <div key={f.key}>
              <Label className="text-green-300/70 font-mono text-xs">{f.label}</Label>
              <Input
                type="number"
                value={config[f.key]}
                min={f.min}
                max={f.max}
                onChange={(e) => saveConfig({ [f.key]: Number(e.target.value) })}
                className="font-mono bg-black/40 border-green-500/30 text-green-300"
              />
              <p className="text-green-300/40 font-mono text-[10px] mt-1">{f.desc}</p>
            </div>
          ))}
          <div>
            <Label className="text-green-300/70 font-mono text-xs">Default Risk Preset</Label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {RISK_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => saveConfig({ defaultRiskPreset: p })}
                  className={`rounded border px-2 py-2 font-mono text-[11px] uppercase transition-colors ${
                    config.defaultRiskPreset === p
                      ? "border-green-500 bg-green-500/20 text-green-400"
                      : "border-green-500/20 bg-black/30 text-green-300/60 hover:bg-green-500/10"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All users */}
      <Card className="bg-gray-900/50 border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-400 font-mono text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            User Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allUsers.length === 0 ? (
            <p className="text-green-300/60 font-mono text-sm">No active profit-lock sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {allUsers.map((u) => (
                <div
                  key={u.userId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border border-green-500/20 bg-black/30 p-3"
                >
                  <div className="font-mono text-sm">
                    <div className="text-green-300 font-bold flex items-center gap-2">
                      {u.name}
                      <Badge
                        className={`text-[10px] font-mono ${
                          u.status === "locked"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-green-500/20 text-green-400 border-green-500/30"
                        }`}
                      >
                        {u.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-green-300/60 text-xs">
                      Cap {formatMoney(u.capital)} · P/L {formatMoney(u.realizedProfit)} · Target{" "}
                      {formatMoney(u.profitTarget)}
                      {u.status === "locked" && ` · unlocks in ${timeLeft(u.lockUntil)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.status !== "locked" && (
                      <Button
                        size="sm"
                        onClick={() => forceLock(u.userId)}
                        className="bg-red-600/20 border border-red-500 text-red-400 hover:bg-red-600/40 font-mono"
                      >
                        <Lock className="h-4 w-4 mr-1" /> Lock
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => resetUser(u.userId)}
                      className="bg-gray-600/20 border border-gray-500 text-gray-300 hover:bg-gray-600/40 font-mono"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Reset
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

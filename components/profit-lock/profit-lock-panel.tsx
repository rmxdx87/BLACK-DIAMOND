"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useProfitLock } from "@/hooks/use-profit-lock"
import { ProfitLockManager, type RiskPreset } from "@/lib/profit-lock"
import { Lock, ShieldCheck, TrendingUp, TrendingDown, Target, AlertTriangle, RotateCcw } from "lucide-react"

interface ProfitLockPanelProps {
  userId?: string
  userName?: string
}

const RISK_PRESETS: { id: RiskPreset; label: string; hint: string }[] = [
  { id: "conservative", label: "Conservative", hint: "Low target, tight stop-loss" },
  { id: "balanced", label: "Balanced", hint: "Moderate target & risk" },
  { id: "aggressive", label: "Aggressive", hint: "High target, wide stop-loss" },
]

function formatMoney(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00"
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function ProfitLockPanel({ userId, userName }: ProfitLockPanelProps) {
  const { config, state, setup, recordTrade, requestUnlock, reset } = useProfitLock(userId, userName)

  const [capital, setCapital] = useState("")
  const [profitTarget, setProfitTarget] = useState("")
  const [riskLimit, setRiskLimit] = useState("")
  const [preset, setPreset] = useState<RiskPreset>(config.defaultRiskPreset)
  const [tradeAmount, setTradeAmount] = useState("")
  const [formError, setFormError] = useState("")
  const [unlockNote, setUnlockNote] = useState("")

  const applyPreset = (p: RiskPreset) => {
    setPreset(p)
    const cap = Number(capital)
    if (cap > 0) {
      const limits = ProfitLockManager.riskPresetLimits(p, cap)
      setProfitTarget(String(limits.profitTarget))
      setRiskLimit(String(limits.riskLimit))
    }
  }

  const handleSetup = () => {
    setFormError("")
    const cap = Number(capital)
    const target = Number(profitTarget)
    const risk = Number(riskLimit)

    if (!cap || cap < config.minCapital) {
      setFormError(`Minimum capital is ${formatMoney(config.minCapital)}`)
      return
    }
    if (!target || target <= 0) {
      setFormError("Enter a valid profit target")
      return
    }
    const maxTarget = (config.maxProfitTargetPercent / 100) * cap
    if (target > maxTarget) {
      setFormError(`Profit target can't exceed ${config.maxProfitTargetPercent}% of capital (${formatMoney(maxTarget)})`)
      return
    }
    if (!risk || risk <= 0) {
      setFormError("Enter a valid risk / stop-loss amount")
      return
    }
    setup({ capital: cap, profitTarget: target, riskLimit: risk, riskPreset: preset })
  }

  const handleTrade = (type: "win" | "loss") => {
    const amount = Number(tradeAmount)
    if (!amount || amount <= 0) {
      setFormError("Enter a trade amount")
      return
    }
    setFormError("")
    recordTrade(type, amount)
    setTradeAmount("")
  }

  const targetPct = useMemo(() => {
    if (!state || state.profitTarget <= 0) return 0
    return Math.max(0, Math.min(100, (state.realizedProfit / state.profitTarget) * 100))
  }, [state])

  const riskPct = useMemo(() => {
    if (!state || state.riskLimit <= 0) return 0
    const loss = Math.max(0, -state.realizedProfit)
    return Math.max(0, Math.min(100, (loss / state.riskLimit) * 100))
  }, [state])

  if (!config.systemEnabled) {
    return null
  }

  // ---------- LOCKED VIEW ----------
  if (state && state.status === "locked") {
    const remaining = state.lockUntil ? state.lockUntil - Date.now() : 0
    return (
      <Card className="bg-card border-destructive/50 soft-glow overflow-hidden">
        <div className="p-5 sm:p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15 border border-destructive/40">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-xl font-mono font-bold text-destructive mb-1">PROFIT LOCK ACTIVE</h3>
          <p className="text-muted-foreground font-mono text-sm mb-1">{state.lockReason}</p>
          <p className="text-muted-foreground font-mono text-xs mb-4">
            Congratulations — you hit your goal. The panel is locked to protect your winnings.
          </p>

          <div className="mb-4 grid grid-cols-2 gap-3 max-w-md mx-auto">
            <div className="rounded border border-border bg-card/60 p-3">
              <div className="text-xs font-mono text-muted-foreground">REALIZED PROFIT</div>
              <div className="text-lg font-mono font-bold text-primary">{formatMoney(state.realizedProfit)}</div>
            </div>
            <div className="rounded border border-border bg-card/60 p-3">
              <div className="text-xs font-mono text-muted-foreground">FINAL BALANCE</div>
              <div className="text-lg font-mono font-bold text-accent">{formatMoney(state.balance)}</div>
            </div>
          </div>

          {state.lockUntil && (
            <div className="mb-4">
              <div className="text-xs font-mono text-muted-foreground mb-1">AUTO-UNLOCK IN</div>
              <div className="text-3xl font-mono font-bold text-destructive tabular-nums">
                {formatCountdown(remaining)}
              </div>
            </div>
          )}

          {state.unlockStatus === "pending" ? (
            <div className="rounded border border-accent/40 bg-accent/10 p-3 max-w-md mx-auto">
              <p className="text-accent font-mono text-sm flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Unlock request sent — waiting for admin approval
              </p>
            </div>
          ) : state.unlockStatus === "denied" ? (
            <div className="max-w-md mx-auto space-y-3">
              <div className="rounded border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-destructive font-mono text-sm">
                  Admin denied early unlock. Panel opens when the timer ends.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <p className="text-muted-foreground font-mono text-xs">
                Need it back now? Send an unlock request to the admin.
              </p>
              <Input
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                placeholder="Reason (optional)"
                className="font-mono text-sm bg-card border-border"
              />
              <Button
                onClick={() => requestUnlock(unlockNote)}
                className="w-full bg-destructive/20 border border-destructive text-destructive hover:bg-destructive/40 font-mono"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                REQUEST UNLOCK FROM ADMIN
              </Button>
            </div>
          )}
        </div>
      </Card>
    )
  }

  // ---------- SETUP VIEW ----------
  if (!state || state.status === "inactive") {
    return (
      <Card className="bg-card border-primary/30 soft-glow">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-mono font-bold text-primary">PROFIT LOCK</h3>
          </div>
          <p className="text-muted-foreground font-mono text-xs mb-4">
            Set your capital, profit goal and risk. When you hit your target, the panel auto-locks for{" "}
            {config.lockDurationHours}h to protect your profit.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <Label className="text-xs font-mono text-muted-foreground">CAPITAL</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={capital}
                onChange={(e) => {
                  setCapital(e.target.value)
                  const cap = Number(e.target.value)
                  if (cap > 0) {
                    const limits = ProfitLockManager.riskPresetLimits(preset, cap)
                    setProfitTarget(String(limits.profitTarget))
                    setRiskLimit(String(limits.riskLimit))
                  }
                }}
                placeholder={`min ${config.minCapital}`}
                className="font-mono bg-card border-border text-base"
              />
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">PROFIT TARGET</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={profitTarget}
                onChange={(e) => setProfitTarget(e.target.value)}
                placeholder="target profit"
                className="font-mono bg-card border-border text-base"
              />
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">RISK / STOP-LOSS</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={riskLimit}
                onChange={(e) => setRiskLimit(e.target.value)}
                placeholder="max loss"
                className="font-mono bg-card border-border text-base"
              />
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-xs font-mono text-muted-foreground mb-2 block">RISK PRESET</Label>
            <div className="grid grid-cols-3 gap-2">
              {RISK_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`rounded border p-2 text-left transition-colors ${
                    preset === p.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card/50 text-muted-foreground hover:bg-primary/5"
                  }`}
                >
                  <div className="font-mono text-sm font-bold">{p.label}</div>
                  <div className="font-mono text-[10px] opacity-70 leading-tight">{p.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {formError && <p className="text-destructive font-mono text-xs mb-3">{formError}</p>}

          <Button onClick={handleSetup} className="w-full bg-primary/20 border border-primary text-primary hover:bg-primary/40 font-mono">
            <Lock className="h-4 w-4 mr-2" />
            ACTIVATE PROFIT LOCK
          </Button>
        </div>
      </Card>
    )
  }

  // ---------- ACTIVE TRACKER VIEW ----------
  const nearStopLoss = config.lossRecoveryAlerts && riskPct >= 70
  return (
    <Card className="bg-card border-primary/30 soft-glow">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-mono font-bold text-primary">PROFIT LOCK ACTIVE</h3>
          </div>
          <Badge className="bg-primary/20 text-primary border-primary/30 font-mono uppercase text-[10px]">
            {state.riskPreset}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded border border-border bg-card/60 p-3">
            <div className="text-[10px] font-mono text-muted-foreground">CAPITAL</div>
            <div className="text-base font-mono font-bold text-foreground">{formatMoney(state.capital)}</div>
          </div>
          <div className="rounded border border-border bg-card/60 p-3">
            <div className="text-[10px] font-mono text-muted-foreground">BALANCE</div>
            <div className="text-base font-mono font-bold text-accent">{formatMoney(state.balance)}</div>
          </div>
          <div className="rounded border border-border bg-card/60 p-3">
            <div className="text-[10px] font-mono text-muted-foreground">PROFIT</div>
            <div className={`text-base font-mono font-bold ${state.realizedProfit >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatMoney(state.realizedProfit)}
            </div>
          </div>
          <div className="rounded border border-border bg-card/60 p-3">
            <div className="text-[10px] font-mono text-muted-foreground">TARGET</div>
            <div className="text-base font-mono font-bold text-foreground">{formatMoney(state.profitTarget)}</div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Target progress
              </span>
              <span className="text-primary">{Math.round(targetPct)}%</span>
            </div>
            <Progress value={targetPct} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Risk used
              </span>
              <span className={riskPct >= 70 ? "text-destructive" : "text-accent"}>{Math.round(riskPct)}%</span>
            </div>
            <Progress value={riskPct} className="h-2" />
          </div>
        </div>

        {nearStopLoss && (
          <div className="mb-4 rounded border border-destructive/40 bg-destructive/10 p-2">
            <p className="text-destructive font-mono text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Warning: close to your stop-loss limit.
            </p>
          </div>
        )}

        <div className="mb-3">
          <Label className="text-xs font-mono text-muted-foreground">TRADE AMOUNT</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={tradeAmount}
            onChange={(e) => setTradeAmount(e.target.value)}
            placeholder="amount for this round"
            className="font-mono bg-card border-border text-base"
          />
        </div>

        {formError && <p className="text-destructive font-mono text-xs mb-3">{formError}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleTrade("win")}
            className="bg-primary/20 border border-primary text-primary hover:bg-primary/40 font-mono"
          >
            <TrendingUp className="h-4 w-4 mr-2" /> WIN
          </Button>
          <Button
            onClick={() => handleTrade("loss")}
            className="bg-destructive/20 border border-destructive text-destructive hover:bg-destructive/40 font-mono"
          >
            <TrendingDown className="h-4 w-4 mr-2" /> LOSS
          </Button>
        </div>

        <button
          type="button"
          onClick={reset}
          className="mt-3 w-full text-center text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <RotateCcw className="h-3 w-3" /> reconfigure
        </button>
      </div>
    </Card>
  )
}

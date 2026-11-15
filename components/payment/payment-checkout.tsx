"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePaymentMethods } from "@/hooks/use-payment-methods"
import { useUserAccess } from "@/hooks/use-user-access"
import { PaymentManager, type PaymentMethod } from "@/lib/payment-manager"
import { SubscriptionManager, type SubscriptionTier } from "@/lib/subscription-manager"
import {
  ArrowLeft,
  Crown,
  Star,
  Shield,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  QrCode,
  Landmark,
  Bitcoin,
  Wallet,
  Smartphone,
} from "lucide-react"

const TIER_ICONS: Record<string, typeof Crown> = {
  basic: Shield,
  premium: Star,
  vip: Crown,
}

const subscribeToHydration = () => () => {}
const getHydratedSnapshot = () => true
const getServerHydrationSnapshot = () => false

function methodIcon(type: PaymentMethod["type"]) {
  switch (type) {
    case "upi":
      return Smartphone
    case "bank":
      return Landmark
    case "qr":
      return QrCode
    case "crypto":
      return Bitcoin
    case "wallet":
      return Wallet
    default:
      return Wallet
  }
}

export function PaymentCheckout() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  )
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTier = (searchParams.get("tier") || "basic") as SubscriptionTier
  const { currentUser } = useUserAccess()
  const { activeMethods, plans, createRequest } = usePaymentMethods()

  const plan = useMemo(() => plans.find((p) => p.tier === requestedTier), [plans, requestedTier])

  const [selectedMethodId, setSelectedMethodId] = useState<string>("")
  const [transactionId, setTransactionId] = useState("")
  const [note, setNote] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const selectedMethod = activeMethods.find((m) => m.id === selectedMethodId)
  const TierIcon = TIER_ICONS[requestedTier] || Crown

  if (!isHydrated) {
    return (
      <main className="black-diamond-surface min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Card className="dashboard-card grid min-h-32 place-items-center p-6 text-center">
            <p className="text-sm text-muted-foreground" role="status">Loading payment details…</p>
          </Card>
        </div>
      </main>
    )
  }

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // ignore clipboard errors
    }
  }

  const handleSubmit = () => {
    if (!currentUser || !plan || !selectedMethod || !transactionId.trim()) return
    createRequest({
      userId: currentUser.userId,
      userName: currentUser.name,
      tier: requestedTier,
      amount: plan.price,
      methodId: selectedMethod.id,
      methodName: selectedMethod.name,
      transactionId: transactionId.trim(),
      note: note.trim() || undefined,
    })
    setSubmitted(true)
  }

  return (
    <main className="black-diamond-surface min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-6 font-mono text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <TierIcon className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-mono text-2xl font-bold text-balance">Complete Your Payment</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Upgrade to the {SubscriptionManager.getTierDisplayName(requestedTier)} plan
          </p>
        </header>

        {submitted ? (
          <Card className="border-primary/40 bg-card p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-primary" />
            <h2 className="font-mono text-xl font-bold">Payment Submitted</h2>
            <p className="mx-auto mt-2 max-w-md font-mono text-sm leading-relaxed text-muted-foreground">
              Your payment is now pending admin verification. Once approved, your{" "}
              {SubscriptionManager.getTierDisplayName(requestedTier)} subscription will activate automatically.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-1.5 font-mono text-xs text-yellow-500">
              <Clock className="h-3.5 w-3.5" />
              STATUS: PENDING REVIEW
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => router.push("/")} className="font-mono">
                Return Home
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Order summary */}
            <Card className="border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Selected Plan</p>
                  <p className="font-mono text-lg font-bold">
                    {SubscriptionManager.getTierDisplayName(requestedTier)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold text-primary">
                    {plan ? `₹${plan.price}` : "N/A"}
                  </p>
                  {plan && (
                    <p className="font-mono text-xs text-muted-foreground">for {plan.durationDays} days</p>
                  )}
                </div>
              </div>
            </Card>

            {!currentUser && (
              <Card className="border-yellow-500/40 bg-yellow-500/5 p-4 text-center">
                <p className="font-mono text-sm text-yellow-600 dark:text-yellow-400">
                  Please log in with your access code before making a payment.
                </p>
              </Card>
            )}

            {/* Payment methods */}
            <Card className="border-border bg-card p-5">
              <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Select Payment Method
              </h2>

              {activeMethods.length === 0 ? (
                <p className="font-mono text-sm text-muted-foreground">
                  No payment methods are available right now. Please contact the admin.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeMethods.map((method) => {
                    const Icon = methodIcon(method.type)
                    const active = method.id === selectedMethodId
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethodId(method.id)}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15">
                          <Icon className="h-4 w-4 text-primary" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-mono text-sm font-bold">{method.name}</span>
                          <span className="block font-mono text-xs text-muted-foreground">
                            {PaymentManager.getMethodTypeLabel(method.type)}
                          </span>
                        </span>
                        {active && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Selected method details */}
            {selectedMethod && (
              <Card className="border-primary/30 bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Badge className="border-primary/40 bg-primary/10 text-primary">{selectedMethod.name}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {PaymentManager.getMethodTypeLabel(selectedMethod.type)}
                  </span>
                </div>

                {selectedMethod.qrImageUrl && (
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-lg border border-border bg-background p-2">
                      <Image
                        src={selectedMethod.qrImageUrl || "/placeholder.svg"}
                        alt={`${selectedMethod.name} QR code`}
                        width={180}
                        height={180}
                        className="h-44 w-44 object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">Pay to</p>
                      <p className="truncate font-mono text-sm font-bold">{selectedMethod.identifier}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-mono"
                      onClick={() => handleCopy(selectedMethod.identifier, "id")}
                    >
                      {copied === "id" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  {selectedMethod.holder && (
                    <p className="font-mono text-xs text-muted-foreground">Account name: {selectedMethod.holder}</p>
                  )}
                </div>

                {selectedMethod.instructions && (
                  <p className="mt-3 rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                    {selectedMethod.instructions}
                  </p>
                )}

                {/* Confirmation form */}
                <div className="mt-5 space-y-4 border-t border-border pt-5">
                  <div>
                    <Label htmlFor="txn" className="font-mono text-xs">
                      Transaction ID / UTR
                    </Label>
                    <Input
                      id="txn"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 4021XXXXXX87"
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="note" className="font-mono text-xs">
                      Note (optional)
                    </Label>
                    <Textarea
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Any additional details for the admin"
                      className="mt-1 font-mono"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={!currentUser || !plan || !transactionId.trim()}
                    className="w-full font-mono"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    I&apos;ve Paid — Submit for Verification
                  </Button>
                  <p className="text-center font-mono text-xs text-muted-foreground">
                    Your subscription activates after the admin verifies your payment.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
